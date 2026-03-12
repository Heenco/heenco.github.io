#!/usr/bin/env node
/**
 * generate-captions.mjs
 *
 * Generates SRT caption files for each video.
 *
 * Strategy:
 *   1. If a voiceover MP3 exists → transcribe with Groq Whisper (accurate timing)
 *   2. Otherwise → generate synthetic SRT from the markdown script timestamps
 *
 * Usage:
 *   node scripts/generate-captions.mjs --campaign=001 [--video=v1]
 * Env:
 *   GROQ_API_KEY
 */

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')

// ── Args ──────────────────────────────────────────────────────────────────────

const arg = process.argv.find(a => a.startsWith('--campaign='))
if (!arg) {
  console.error('Usage: node scripts/generate-captions.mjs --campaign=<id> [--video=<id>]')
  process.exit(1)
}
const campaignId = arg.split('=')[1]
const videoArg   = process.argv.find(a => a.startsWith('--video='))?.split('=')[1]

// ── API key ───────────────────────────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY
if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY is not set.')
  process.exit(1)
}

// ── Load campaign ─────────────────────────────────────────────────────────────

const campaignsDir = join(ROOT, 'promote', 'campaigns')
const entries      = await readdir(campaignsDir)
const folder       = entries.find(e => e.startsWith(`${campaignId}-`) || e === campaignId)
if (!folder) {
  console.error(`Campaign ${campaignId} not found`)
  process.exit(1)
}

const campaignDir = join(campaignsDir, folder)
const campaign    = JSON.parse(await readFile(join(campaignDir, 'campaign.json'), 'utf-8'))
const scriptsDir  = join(campaignDir, 'scripts')
const audioDir    = join(campaignDir, 'audio')
const captionsDir = join(campaignDir, 'captions')
await mkdir(captionsDir, { recursive: true })

// ── Groq Whisper transcription ────────────────────────────────────────────────

/**
 * Sends a voiceover MP3 to Groq Whisper and returns an SRT string.
 * Uses verbose_json (Groq doesn't support response_format=srt) and converts segments to SRT.
 */
async function whisperTranscribe(audioPath) {
  const audioBuffer = await readFile(audioPath)
  const blob        = new Blob([audioBuffer], { type: 'audio/mpeg' })
  const form        = new FormData()
  form.append('file', blob, 'voiceover.mp3')
  form.append('model', 'whisper-large-v3-turbo')
  form.append('response_format', 'verbose_json')
  form.append('language', 'en')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: form,
  })
  if (!res.ok) {
    throw new Error(`Groq Whisper ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  const segments = data.segments ?? []
  if (!segments.length) return ''
  return segments.map((seg, i) =>
    `${i + 1}\n${formatSRTTime(seg.start)} --> ${formatSRTTime(seg.end)}\n${seg.text.trim()}`
  ).join('\n\n')
}

// ── Synthetic SRT generation ──────────────────────────────────────────────────

function formatSRTTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s},000`
}

/**
 * Parses a markdown script with [SECTION start–ends] headers and generates
 * a synthetic SRT where each section maps to one caption cue.
 */
function syntheticSRT(markdown) {
  // Match [LABEL START–ENDs] — handles en-dash (–), hyphen (-), and em-dash (—)
  const tsRe     = /\[([^\]]+?)\s+(\d+)\s*[–\-\u2013\u2014]\s*(\d+)\s*s?\]/i
  const lines    = markdown.split('\n')
  const sections = []
  let cur        = null
  let buf        = []

  for (const raw of lines) {
    // Strip markdown heading markers
    const line = raw.replace(/^#{1,4}\s*/, '').trim()
    if (!line) continue

    const m = tsRe.exec(line)
    if (m) {
      if (cur && buf.length) {
        sections.push({ ...cur, text: buf.join(' ') })
      }
      cur = { label: m[1].trim(), start: +m[2], end: +m[3] }
      buf = []
    } else if (cur) {
      // Strip any inline tag-like brackets, keep the text
      const clean = line.replace(/\[[^\]]*\]/g, '').trim()
      if (clean) buf.push(clean)
    }
  }
  if (cur && buf.length) sections.push({ ...cur, text: buf.join(' ') })

  return sections
    .map((s, i) =>
      `${i + 1}\n${formatSRTTime(s.start)} --> ${formatSRTTime(s.end)}\n${s.text}`
    )
    .join('\n\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

const videos = campaign.videos.filter(v => videoArg ? v.id === videoArg : true)

console.log(`\n📝  Generating captions — campaign ${campaign.id} | ${videos.length} video(s)\n`)

let updated = false

for (const video of videos) {
  if (!video.selectedScript) {
    console.warn(`  ⚠ ${video.id}: no selectedScript, skipping`)
    continue
  }

  const outPath = join(captionsDir, `${video.id}.srt`)
  if (existsSync(outPath)) {
    console.log(`  ✓ ${video.id}: SRT already exists — delete to regenerate`)
    continue
  }

  const audioPath  = join(audioDir, `voiceover_${video.id}.mp3`)
  const scriptPath = join(scriptsDir, `${video.selectedScript}.md`)

  let srt = ''

  if (existsSync(audioPath)) {
    console.log(`  → ${video.id}: transcribing with Groq Whisper...`)
    try {
      srt = await whisperTranscribe(audioPath)
      const cueCount = srt.split('\n\n').filter(Boolean).length
      console.log(`  ✓ ${video.id}: Whisper SRT (${cueCount} cues)`)
    } catch (err) {
      console.warn(`  ⚠ ${video.id}: Whisper failed (${err.message}) → falling back to synthetic SRT`)
    }
  }

  if (!srt) {
    if (!existsSync(scriptPath)) {
      console.warn(`  ⚠ ${video.id}: no audio and no script found, skipping`)
      continue
    }
    const md = await readFile(scriptPath, 'utf-8')
    srt = syntheticSRT(md)
    const cueCount = srt.split('\n\n').filter(Boolean).length
    console.log(`  → ${video.id}: synthetic SRT from script timestamps (${cueCount} cues)`)
  }

  await writeFile(outPath, srt, 'utf-8')
  console.log(`  ✓ Saved captions/${video.id}.srt`)
  video.captionsPath = `captions/${video.id}.srt`
  updated = true
}

if (updated) {
  await writeFile(join(campaignDir, 'campaign.json'), JSON.stringify(campaign, null, 2))
  console.log('\nUpdated campaign.json with caption paths.')
}

console.log('\nDone.')
