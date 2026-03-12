#!/usr/bin/env node
/**
 * select-music.mjs
 *
 * Uses Groq (chat) to classify the mood/energy of each video script,
 * then matches against promote/assets/music-index.json to pick the best track.
 *
 * Does NOT copy audio files — just records the selection in campaign.json.
 * Source royalty-free tracks from Pixabay Music (pixabay.com/music/) and
 * add them to promote/assets/music/ with entries in music-index.json.
 *
 * Usage:
 *   node scripts/select-music.mjs --campaign=001
 * Env:
 *   GROQ_API_KEY
 */

import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')

// ── Args ──────────────────────────────────────────────────────────────────────

const arg = process.argv.find(a => a.startsWith('--campaign='))
if (!arg) {
  console.error('Usage: node scripts/select-music.mjs --campaign=<id>')
  process.exit(1)
}
const campaignId = arg.split('=')[1]

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

// ── Music index ───────────────────────────────────────────────────────────────

const musicIndexPath = join(ROOT, 'promote', 'assets', 'music-index.json')
if (!existsSync(musicIndexPath)) {
  console.error('promote/assets/music-index.json not found.')
  console.error('Create it and add tracks — see promote.md §7 for format.')
  process.exit(1)
}

const { tracks } = JSON.parse(await readFile(musicIndexPath, 'utf-8'))
if (!tracks || tracks.length === 0) {
  console.error('music-index.json has no tracks. Add some MP3s first.')
  process.exit(1)
}

// ── Groq mood analysis ────────────────────────────────────────────────────────

async function classifyMood(scriptText) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a music supervisor. Given a video script excerpt, respond ONLY with a valid JSON object on one line. Schema: { "mood": "inspirational"|"energetic"|"calm"|"dramatic"|"playful"|"professional", "energy": "low"|"medium"|"high", "tags": ["word","word","word"] }',
        },
        {
          role: 'user',
          content: `Script:\n\n${scriptText.slice(0, 1500)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 120,
    }),
  })

  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`)
  const data    = await res.json()
  const raw     = data.choices?.[0]?.message?.content ?? '{}'
  const cleaned = raw.replace(/^```json\s*|^```\s*|```$/gm, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return { mood: 'professional', energy: 'medium', tags: [] }
  }
}

// ── Track scoring ─────────────────────────────────────────────────────────────

function scoreTrack(track, { mood, energy, tags = [] }) {
  let score = 0
  if (track.mood   === mood)   score += 3
  if (track.energy === energy) score += 2
  for (const tag of tags) {
    if (track.tags?.includes(tag)) score += 1
  }
  return score
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n🎵  Selecting music — campaign ${campaign.id}\n`)

let updated = false

for (const video of campaign.videos) {
  if (video.musicTrack) {
    console.log(`  ✓ ${video.id}: already has music "${video.musicTrack}"`)
    continue
  }

  if (!video.selectedScript) {
    console.warn(`  ⚠ ${video.id}: no selectedScript, skipping`)
    continue
  }

  const scriptPath = join(scriptsDir, `${video.selectedScript}.md`)
  if (!existsSync(scriptPath)) {
    console.warn(`  ⚠ ${video.id}: script not found at ${scriptPath}`)
    continue
  }

  const script = await readFile(scriptPath, 'utf-8')

  let analysis = { mood: 'professional', energy: 'medium', tags: [] }
  try {
    analysis = await classifyMood(script)
    console.log(`  ${video.id} mood analysis: ${JSON.stringify(analysis)}`)
  } catch (err) {
    console.warn(`  ⚠ ${video.id}: mood analysis failed (${err.message}) — using defaults`)
  }

  const scored = tracks
    .map(t => ({ ...t, _score: scoreTrack(t, analysis) }))
    .sort((a, b) => b._score - a._score)

  const pick = scored[0]
  console.log(`  ✓ ${video.id}: selected "${pick.title}" by ${pick.artist} (score ${pick._score})`)

  video.musicTrack = pick.id
  video.musicFile  = pick.file
  updated = true
}

if (updated) {
  await writeFile(join(campaignDir, 'campaign.json'), JSON.stringify(campaign, null, 2))
  console.log('\nUpdated campaign.json with music selections.')
}

console.log('\nDone.')
