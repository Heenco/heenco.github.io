#!/usr/bin/env node
/**
 * generate-voiceover.mjs
 *
 * Reads each video's selected script, extracts spoken text, calls ElevenLabs TTS,
 * and saves an MP3 to promote/campaigns/{id}/audio/voiceover_{videoId}.mp3
 *
 * Usage:
 *   node scripts/generate-voiceover.mjs --campaign=001 [--video=v1]
 * Env:
 *   ELEVENLABS_API_KEY
 */

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Args ──────────────────────────────────────────────────────────────────────

const arg = process.argv.find(a => a.startsWith('--campaign='))
if (!arg) {
  console.error('Usage: node scripts/generate-voiceover.mjs --campaign=<id> [--video=<id>]')
  process.exit(1)
}
const campaignId = arg.split('=')[1]
const videoArg   = process.argv.find(a => a.startsWith('--video='))?.split('=')[1]

// ── Load campaign ─────────────────────────────────────────────────────────────

const campaignsDir = join(ROOT, 'promote', 'campaigns')
const entries      = await readdir(campaignsDir)
const folder       = entries.find(e => e.startsWith(`${campaignId}-`) || e === campaignId)
if (!folder) {
  console.error(`Campaign ${campaignId} not found in ${campaignsDir}`)
  process.exit(1)
}

const campaignDir = join(campaignsDir, folder)
const campaign    = JSON.parse(await readFile(join(campaignDir, 'campaign.json'), 'utf-8'))
const scriptsDir  = join(campaignDir, 'scripts')
const audioDir    = join(campaignDir, 'audio')
await mkdir(audioDir, { recursive: true })

// ── ElevenLabs ───────────────────────────────────────────────────────────────

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
if (!ELEVENLABS_API_KEY) {
  console.error('ELEVENLABS_API_KEY is not set. Add it to .env and restart the dev server.')
  process.exit(1)
}

// Premade ElevenLabs voice IDs — matched to audience tone
// List: https://api.elevenlabs.io/v1/voices
const VOICE_BY_AUDIENCE = {
  'gis-students':         '21m00Tcm4TlvDq8ikWAM', // Rachel — clear, friendly
  'data-engineers':       '21m00Tcm4TlvDq8ikWAM', // Rachel
  'nocode-gis':           '21m00Tcm4TlvDq8ikWAM', // Rachel
  'urban-planners':       'pNInz6obpgDQGcFmaJgB', // Adam  — authoritative
  'heritage-consultants': 'pNInz6obpgDQGcFmaJgB', // Adam
  'env-consultants':      'pNInz6obpgDQGcFmaJgB', // Adam
  'eco-consultants':      'pNInz6obpgDQGcFmaJgB', // Adam
  'property-devs':        'ErXwobaYiN019PkySvjV', // Antoni — confident
  'site-selectors':       'ErXwobaYiN019PkySvjV', // Antoni
  'loc-advertisers':      'ErXwobaYiN019PkySvjV', // Antoni
  'open-data':            'AZnzlk1XvdvUeBnXmlld', // Domi  — enthusiastic
  'general':              '21m00Tcm4TlvDq8ikWAM', // Rachel (default)
}

// ── Text extraction ───────────────────────────────────────────────────────────

/**
 * Strips markdown headings and [SECTION 0-10s] timestamp markers.
 * Returns clean spoken text as a single string.
 */
function extractSpokenText(markdown) {
  return markdown
    .split('\n')
    .filter(line => !line.trimStart().startsWith('#'))
    // Remove [SECTION 0–10s] style markers (en-dash or hyphen)
    .map(line => line.replace(/\[[^\]]*\d+[\s]*[–\-\u2013][\s]*\d+\s*s?\]/gi, '').trim())
    .filter(line => line.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── ElevenLabs TTS ────────────────────────────────────────────────────────────

async function tts(text, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  })
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Skip hook-teaser (text-only, no narration). Optionally filter by --video.
const videos = campaign.videos.filter(v => {
  if (v.format === 'hook-teaser') return false
  if (videoArg && v.id !== videoArg) return false
  return true
})

console.log(`\n🎙  Generating voiceovers — campaign ${campaign.id} | ${videos.length} video(s)\n`)

let updated = false

for (const video of videos) {
  if (!video.selectedScript) {
    console.warn(`  ⚠ ${video.id}: no selectedScript set, skipping`)
    continue
  }

  const scriptPath = join(scriptsDir, `${video.selectedScript}.md`)
  if (!existsSync(scriptPath)) {
    console.warn(`  ⚠ ${video.id}: script not found at ${scriptPath}`)
    continue
  }

  const outPath = join(audioDir, `voiceover_${video.id}.mp3`)
  if (existsSync(outPath)) {
    console.log(`  ✓ ${video.id}: already exists — delete file to regenerate`)
    continue
  }

  const scriptContent = await readFile(scriptPath, 'utf-8')
  const text          = extractSpokenText(scriptContent)
  const voiceId       = VOICE_BY_AUDIENCE[video.audience] ?? VOICE_BY_AUDIENCE.general

  console.log(`  → ${video.id} (${video.format}, audience: ${video.audience})`)
  console.log(`    voice: ${voiceId} | ${text.length} chars`)

  try {
    const mp3 = await tts(text, voiceId)
    await writeFile(outPath, mp3)
    console.log(`  ✓ Saved ${(mp3.length / 1024).toFixed(0)} KB → audio/voiceover_${video.id}.mp3`)
    video.voiceoverPath = `audio/voiceover_${video.id}.mp3`
    updated = true
  } catch (err) {
    console.error(`  ✗ ${video.id} failed: ${err.message}`)
  }
}

if (updated) {
  await writeFile(join(campaignDir, 'campaign.json'), JSON.stringify(campaign, null, 2))
  console.log('\nUpdated campaign.json with voiceover paths.')
}

console.log('\nDone.')
