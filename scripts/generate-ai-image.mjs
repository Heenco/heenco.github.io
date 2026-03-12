#!/usr/bin/env node
/**
 * generate-ai-image.mjs
 *
 * Generates cinematic background images for each video using FLUX.1.
 * - Default: HuggingFace FLUX.1-schnell (free, no API key) via router.huggingface.co
 * - Upgrade:  fal.ai FLUX.1 Pro (faster, if FAL_API_KEY is set)
 *
 * Groq drafts a cinematic image prompt from the [HOOK] section of each script.
 * Output images are used as backgrounds in generate-thumbnail.mjs.
 *
 * Input:  promote/campaigns/{id}/scripts/{videoId}_{slug}.md
 * Output: promote/campaigns/{id}/images/bg_{videoId}.png
 *
 * Run order: after generate-voiceover, before generate-captions
 *
 * Usage:
 *   node scripts/generate-ai-image.mjs --campaign=001 [--video=v1]
 * Env (optional):
 *   GROQ_API_KEY    — for smarter cinematic prompt generation
 *   FAL_API_KEY     — use fal.ai FLUX.1 Pro instead of HuggingFace free tier
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
  console.error('Usage: node scripts/generate-ai-image.mjs --campaign=<id> [--video=<id>]')
  process.exit(1)
}
const campaignId = arg.split('=')[1]
const videoArg   = process.argv.find(a => a.startsWith('--video='))?.split('=')[1]

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
const imagesDir   = join(campaignDir, 'images')
await mkdir(imagesDir, { recursive: true })

// ── Provider selection ────────────────────────────────────────────────────────

const FAL_API_KEY  = process.env.FAL_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY
const HF_TOKEN     = process.env.HF_TOKEN

if (!FAL_API_KEY && !HF_TOKEN) {
  console.error([
    '',
    '❌  No image generation credentials found.',
    '    Add one of these to your .env:',
    '',
    '    HF_TOKEN=hf_...   ← free at huggingface.co/settings/tokens',
    '                        Create token → enable "Make calls to Inference Providers"',
    '    FAL_API_KEY=...   ← paid, fal.ai (~$0.005/img)',
    '',
  ].join('\n'))
  process.exit(1)
}

const provider = FAL_API_KEY ? 'fal' : 'huggingface'
console.log(`\n🖼  Image provider: ${provider === 'fal' ? 'fal.ai FLUX.1 Pro' : 'HuggingFace FLUX.1-schnell (HF_TOKEN)'}`)

// ── Prompt helpers ────────────────────────────────────────────────────────────

/**
 * Extract the HOOK section text from a script markdown file.
 */
function extractHook(markdown) {
  const lines  = markdown.split('\n')
  let inHook   = false
  const result = []

  for (const raw of lines) {
    const line = raw.trim()
    if (/\[HOOK/i.test(line)) { inHook = true; continue }
    if (inHook) {
      // Stop at next section heading
      if (/^\[|^#+\s/.test(line) && result.length) break
      const clean = line.replace(/^\[.*?\]\s*/, '').trim()
      if (clean.length > 3) result.push(clean)
    }
  }
  return result.join(' ').slice(0, 500)
}

/**
 * Ask Groq to turn a hook snippet into a short cinematic image prompt.
 * Falls back to a template if GROQ_API_KEY is not set.
 */
async function buildImagePrompt(hookText, videoId) {
  if (GROQ_API_KEY) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 120,
        messages: [
          {
            role: 'system',
            content: [
              'You write concise Stable Diffusion / FLUX image prompts.',
              'Return ONLY the prompt — no preamble, no quotes, no commentary.',
              'Style: cinematic, aerial, dark-tech, midnight-blue data-map aesthetic,',
              'glowing city lights, abstract geospatial grid overlay, ultra-wide, photorealistic.',
              'Keep under 80 words. Focus on geography, data, and spatial insight themes.',
            ].join(' '),
          },
          {
            role: 'user',
            content: `Create an image prompt for a YouTube thumbnail background based on this hook:\n\n"${hookText}"`,
          },
        ],
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const prompt = data.choices?.[0]?.message?.content?.trim()
      if (prompt) return prompt
    } else {
      console.warn(`  ⚠  Groq prompt generation failed (${res.status}) — using fallback`)
    }
  }

  // Fallback: derive from campaign name
  const tool = campaign.name || 'geospatial data'
  return [
    `Cinematic aerial view of a glowing city at night, dark midnight-blue sky,`,
    `abstract geospatial data grid overlaid, soft blue and orange glow, ultra-wide,`,
    `photorealistic, professional data visualization aesthetic for ${tool}`,
  ].join(' ')
}

// ── Image generation ──────────────────────────────────────────────────────────

/**
 * Generate via HuggingFace Inference API (FLUX.1-schnell, free).
 * Returns raw PNG bytes as Buffer.
 */
async function generateHuggingFace(prompt) {
  const res = await fetch(
    'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          width:               1280,
          height:              720,
          num_inference_steps: 4,    // schnell is optimized for 4 steps
          guidance_scale:      0,    // schnell ignores CFG
        },
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    if (res.status === 403) {
      throw new Error(
        `HuggingFace 403: token lacks inference permissions.\n` +
        `    Go to huggingface.co/settings/tokens → edit your token → ` +
        `enable "Make calls to Inference Providers"`
      )
    }
    throw new Error(`HuggingFace API error ${res.status}: ${text}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('image') && !contentType.includes('octet-stream')) {
    // Model may return JSON with error or loading status
    const text = await res.text()
    let parsed
    try { parsed = JSON.parse(text) } catch { /* not json */ }
    if (parsed?.error) throw new Error(`HuggingFace: ${parsed.error}`)
    if (parsed?.estimated_time) {
      console.log(`  ⏳  Model loading, estimated wait ${Math.ceil(parsed.estimated_time)}s — retrying in 20s`)
      await new Promise(r => setTimeout(r, 20_000))
      return generateHuggingFace(prompt)
    }
    throw new Error(`HuggingFace unexpected response: ${text.slice(0, 200)}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Generate via fal.ai FLUX.1 Pro (~$0.005/image).
 * Returns raw PNG bytes as Buffer.
 */
async function generateFal(prompt) {
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size:          'landscape_16_9',
      num_inference_steps: 4,
      num_images:          1,
      enable_safety_checker: true,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`fal.ai API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const imageUrl = data?.images?.[0]?.url
  if (!imageUrl) throw new Error(`fal.ai: no image URL in response — ${JSON.stringify(data)}`)

  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error(`fal.ai: failed to download image from ${imageUrl}`)

  const arrayBuffer = await imgRes.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Build a map of videoId → imagePrompt from campaign.json (set by parse-strategy.mjs)
const strategyPrompts = {}
for (const v of campaign.videos ?? []) {
  if (v.imagePrompt) strategyPrompts[v.id] = v.imagePrompt
}

const scriptFiles = await readdir(scriptsDir)
const scriptEntries = scriptFiles
  .filter(f => f.endsWith('.md') && !f.includes('social_captions'))
  .filter(f => videoArg ? f.startsWith(`${videoArg}_`) : true)
  // Deduplicate: one entry per videoId (take first file found)
  .filter((f, _, arr) => arr.findIndex(x => x.split('_')[0] === f.split('_')[0]) === arr.indexOf(f))

if (!scriptEntries.length) {
  console.error(`No script files found in ${scriptsDir}` + (videoArg ? ` for video ${videoArg}` : ''))
  process.exit(1)
}

for (const filename of scriptEntries) {
  // Extract videoId from filename like "v1_hook-teaser.md"
  const videoId = filename.split('_')[0]

  const outPath = join(imagesDir, `bg_${videoId}.png`)

  if (existsSync(outPath)) {
    console.log(`\n⏭  bg_${videoId}.png — already exists, skipping`)
    continue
  }

  console.log(`\n🎨  Generating image for ${videoId} (${filename})`)

  // Use imagePrompt from strategy if available — skip Groq entirely
  let prompt
  if (strategyPrompts[videoId]) {
    prompt = strategyPrompts[videoId]
    console.log(`  Using strategy imagePrompt (${prompt.length} chars)`)
  } else {
    const markdown = await readFile(join(scriptsDir, filename), 'utf-8')
    const hookText = extractHook(markdown)
    if (!hookText) console.warn(`  ⚠  No [HOOK] section found — using campaign name as fallback`)
    prompt = await buildImagePrompt(hookText || campaign.name, videoId)
  }
  console.log(`  Prompt: ${prompt.slice(0, 100)}…`)

  let imageBytes
  try {
    imageBytes = provider === 'fal'
      ? await generateFal(prompt)
      : await generateHuggingFace(prompt)
  } catch (err) {
    if (provider === 'fal') {
      console.warn(`  ⚠  fal.ai failed: ${err.message} — falling back to HuggingFace`)
      imageBytes = await generateHuggingFace(prompt)
    } else {
      throw err
    }
  }

  await writeFile(outPath, imageBytes)
  console.log(`  ✅  Saved ${outPath} (${(imageBytes.length / 1024).toFixed(0)} KB)`)
}

console.log('\n✅  generate-ai-image complete\n')
