#!/usr/bin/env node
/**
 * generate-assets.mjs
 *
 * Phase 4 orchestrator — runs all asset generation sub-scripts in sequence:
 *   1. select-music          — Groq mood analysis → music-index.json matching
 *   2. generate-voiceover    — ElevenLabs TTS → MP3 per video (skipped if no API key)
 *   3. generate-ai-image     — FLUX.1 (HuggingFace free / fal.ai paid) → background PNGs
 *                              feeds into: thumbnail backgrounds + broll visual prompts
 *                              (PLANNED — skipped if script doesn't exist yet)
 *   4. generate-captions     — Groq Whisper transcription or synthetic SRT
 *   5. generate-thumbnail    — Playwright Chromium → PNG 1280×720 (uses AI bg if present)
 *   6. generate-broll        — Kling AI B-roll clips (PLANNED — skipped if no Kling keys)
 *
 * Each step is run as a separate Node.js process so failures are isolated.
 *
 * Usage:
 *   node scripts/generate-assets.mjs --campaign=001
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const execFileAsync = promisify(execFile)
const __dirname     = dirname(fileURLToPath(import.meta.url))
const ROOT          = join(__dirname, '..')

// ── Env loading ──────────────────────────────────────────────────────────────

async function loadDotEnv() {
  const envPath = join(ROOT, '.env')
  if (!existsSync(envPath)) return

  const text = await readFile(envPath, 'utf-8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const eqIndex = line.indexOf('=')
    if (eqIndex === -1) continue

    const key = line.slice(0, eqIndex).trim()
    if (!key || process.env[key] != null) continue

    let value = line.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

// ── Args ──────────────────────────────────────────────────────────────────────

const arg = process.argv.find(a => a.startsWith('--campaign='))
if (!arg) {
  console.error('Usage: node scripts/generate-assets.mjs --campaign=<id>')
  process.exit(1)
}
const campaignId = arg.split('=')[1]

await loadDotEnv()

// ── Runner ────────────────────────────────────────────────────────────────────

const SEPARATOR = '─'.repeat(60)

async function run(scriptName) {
  const scriptPath = join(ROOT, 'scripts', scriptName)
  console.log(`\n${SEPARATOR}`)
  console.log(`▶  ${scriptName}  (--campaign=${campaignId})`)
  console.log(SEPARATOR)

  try {
    const { stdout, stderr } = await execFileAsync(
      'node',
      [scriptPath, `--campaign=${campaignId}`],
      {
        env:       process.env,
        shell:     true,             // needed on Windows for node.cmd resolution
        maxBuffer: 10 * 1024 * 1024, // 10 MB
        // No timeout — sub-scripts can be slow (Playwright, ElevenLabs)
      },
    )
    if (stdout) process.stdout.write(stdout)
    if (stderr) process.stderr.write(stderr)
    return { script: scriptName, ok: true }
  } catch (err) {
    const out = (err.stdout ?? '') + (err.stderr ?? '')
    process.stderr.write(out || err.message + '\n')
    return { script: scriptName, ok: false, error: err.message }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

// ── Find campaign (needed for done-checks) ────────────────────────────────────

const campaignsDir = join(ROOT, 'promote', 'campaigns')
const entries      = await readdir(campaignsDir)
const folder       = entries.find(e => e.startsWith(`${campaignId}-`) || e === campaignId)
if (!folder) {
  console.error(`Campaign ${campaignId} not found`)
  process.exit(1)
}
const campaignDir = join(campaignsDir, folder)
const campaign    = JSON.parse(await readFile(join(campaignDir, 'campaign.json'), 'utf-8'))
const videos      = campaign.videos ?? []

console.log(`\n🚀  Phase 4 — Asset Generation | Campaign ${campaignId}\n`)

// Steps marked optional:true are skipped if the script file doesn't exist yet.
// Steps with a done() fn are skipped when all expected outputs already exist.
const steps = [
  {
    script: 'select-music.mjs',
    done:   () => videos.every(v => v.musicTrack),
  },
  {
    script: 'generate-voiceover.mjs',
    done:   () => videos.filter(v => v.selectedScript)
                        .every(v => existsSync(join(campaignDir, 'audio', `voiceover_${v.id}.mp3`))),
  },
  {
    script:   'generate-ai-image.mjs',
    optional: true,
    done:     () => videos.every(v => existsSync(join(campaignDir, 'images', `bg_${v.id}.png`))),
  },
  {
    script: 'generate-captions.mjs',
    done:   () => videos.every(v => existsSync(join(campaignDir, 'captions', `${v.id}.srt`))),
  },
  {
    script: 'generate-thumbnail.mjs',
    done:   () => videos.every(v => existsSync(join(campaignDir, 'thumbnails', `thumb_${v.id}_a.png`))),
  },
  {
    script:   'generate-broll.mjs',
    optional: true,
    done:     () => videos.every(v => existsSync(join(campaignDir, 'broll', `${v.id}.mp4`))),
  },
]

const results = []
for (const { script, optional, done } of steps) {
  const scriptPath = join(ROOT, 'scripts', script)
  if (optional && !existsSync(scriptPath)) {
    console.log(`\n⏭  ${script}  — not yet built, skipping`)
    results.push({ script, skipped: true, reason: 'not built' })
    continue
  }
  if (done?.()) {
    console.log(`\n⏭  ${script}  — all outputs exist, skipping`)
    results.push({ script, skipped: true, reason: 'outputs exist' })
    continue
  }
  const result = await run(script)
  results.push(result)
}

console.log(`\n${SEPARATOR}`)
console.log('Summary')
console.log(SEPARATOR)
for (const r of results) {
  if (r.skipped) {
    console.log(`  ⏭  ${r.script}  (${r.reason})`)
  } else {
    const icon = r.ok ? '✅' : '❌'
    console.log(`  ${icon}  ${r.script}${r.error ? `  (${r.error})` : ''}`)
  }
}
console.log()

const allOk = results.filter(r => !r.skipped).every(r => r.ok)
process.exit(allOk ? 0 : 1)
