#!/usr/bin/env node
/**
 * generate-thumbnail.mjs
 *
 * Renders YouTube thumbnail PNGs (1280×720) using Playwright Chromium.
 * - Template A (dark, vertical accent stripe) — all videos
 * - Template B (gradient glow) — abTest videos only
 *
 * Input:  promote/templates/thumbnail-{a,b}.html
 * Output: promote/campaigns/{id}/thumbnails/thumb_{videoId}_{a|b}.png
 *
 * Usage:
 *   node scripts/generate-thumbnail.mjs --campaign=001
 */

import { readFile, writeFile, readdir, mkdir, unlink } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { chromium } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')

// ── Args ──────────────────────────────────────────────────────────────────────

const arg = process.argv.find(a => a.startsWith('--campaign='))
if (!arg) {
  console.error('Usage: node scripts/generate-thumbnail.mjs --campaign=<id>')
  process.exit(1)
}
const campaignId = arg.split('=')[1]

// ── Load campaign ─────────────────────────────────────────────────────────────

const campaignsDir  = join(ROOT, 'promote', 'campaigns')
const entries       = await readdir(campaignsDir)
const folder        = entries.find(e => e.startsWith(`${campaignId}-`) || e === campaignId)
if (!folder) {
  console.error(`Campaign ${campaignId} not found`)
  process.exit(1)
}

const campaignDir   = join(campaignsDir, folder)
const campaign      = JSON.parse(await readFile(join(campaignDir, 'campaign.json'), 'utf-8'))
const scriptsDir    = join(campaignDir, 'scripts')
const thumbnailsDir = join(campaignDir, 'thumbnails')
const templatesDir  = join(ROOT, 'promote', 'templates')

await mkdir(thumbnailsDir, { recursive: true })

// ── Load templates ────────────────────────────────────────────────────────────

const templateAPath = join(templatesDir, 'thumbnail-a.html')
const templateBPath = join(templatesDir, 'thumbnail-b.html')

for (const p of [templateAPath, templateBPath]) {
  if (!existsSync(p)) {
    console.error(`Template not found: ${p}`)
    console.error('Run the dev server once to let Nuxt generate templates, or create them manually.')
    process.exit(1)
  }
}

const templateA = await readFile(templateAPath, 'utf-8')
const templateB = await readFile(templateBPath, 'utf-8')

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_LABEL = {
  tool:    'Free GIS Tool',
  map:     'Interactive Map',
  article: 'Data Deep Dive',
  video:   'Video Guide',
}

/**
 * Finds the HOOK section in the script markdown and returns the first
 * non-empty line of text beneath it — suitable for a thumbnail headline.
 */
function extractHook(markdown) {
  const lines    = markdown.split('\n')
  let   inHook   = false
  const maxWords = 9

  for (const raw of lines) {
    const line = raw.replace(/^#{1,4}\s*/, '').trim()
    if (!line) continue
    if (/\[HOOK/i.test(line)) { inHook = true; continue }
    if (inHook) {
      const clean = line.replace(/\[[^\]]*\]/g, '').trim()
      if (clean.length > 5) {
        const words = clean.split(/\s+/)
        return words.length > maxWords
          ? words.slice(0, maxWords).join(' ') + '…'
          : clean
      }
    }
  }
  return campaign.name
}

function buildHTML(template, { headline, tool, category, bgImageDataUrl }) {
  let html = template
    .replace(/__HEADLINE__/g, escapeHTML(headline))
    .replace(/__TOOL__/g,     escapeHTML(tool))
    .replace(/__CATEGORY__/g, escapeHTML(category))
  if (bgImageDataUrl) {
    html = html.replace(/__BG_IMAGE__/g, bgImageDataUrl)
  } else {
    // Remove any bg-image style blocks so the template falls back to its own background
    html = html.replace(/url\(__BG_IMAGE__\)/g, 'none')
  }
  return html
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Playwright render ─────────────────────────────────────────────────────────

/**
 * Writes HTML to a temp file, navigates Playwright to it, screenshots.
 * Using file:// avoids serving a dev server; Google Fonts load normally.
 */
async function renderHTML(browser, html, outPath) {
  const tempFile = join(tmpdir(), `heenco_thumb_${Date.now()}_${Math.random().toString(36).slice(2)}.html`)
  await writeFile(tempFile, html, 'utf-8')

  // Windows: convert backslashes and prepend triple-slash
  const fileUrl = 'file:///' + tempFile.replace(/\\/g, '/')

  const page = await browser.newPage()
  try {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(fileUrl)
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: outPath, type: 'png' })
  } finally {
    await page.close()
    await unlink(tempFile).catch(() => {})
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n🖼  Generating thumbnails — campaign ${campaign.id}\n`)

const browser = await chromium.launch({ headless: true })
let updated = false

try {
  for (const video of campaign.videos) {
    const scriptPath = video.selectedScript
      ? join(scriptsDir, `${video.selectedScript}.md`)
      : null
    const script   = scriptPath && existsSync(scriptPath) ? await readFile(scriptPath, 'utf-8') : ''
    const category = CATEGORY_LABEL[campaign.type] ?? 'Tool'

    // Use thumbnailText from strategy JSON if available, else extract hook from script
    const headline = video.thumbnailText
      ? video.thumbnailText.replace(/\n/g, ' · ')  // flatten multi-line into single headline
      : extractHook(script)

    // Inject AI-generated background if available from generate-ai-image.mjs
    const bgImagePath = join(campaignDir, 'images', `bg_${video.id}.png`)
    let bgImageDataUrl = null
    if (existsSync(bgImagePath)) {
      const bgBytes = await readFile(bgImagePath)
      bgImageDataUrl = `data:image/png;base64,${bgBytes.toString('base64')}`
      console.log(`  🖼  Using AI background: images/bg_${video.id}.png`)
    }

    const vars = { headline, tool: campaign.name, category, bgImageDataUrl }

    // ── Template A (all videos) ──────────────────────────────────────────────

    const outA = join(thumbnailsDir, `thumb_${video.id}_a.png`)
    if (existsSync(outA)) {
      console.log(`  ✓ ${video.id} A: already exists`)
    } else {
      await renderHTML(browser, buildHTML(templateA, vars), outA)
      console.log(`  ✓ ${video.id} A: thumbnails/thumb_${video.id}_a.png`)
      video.thumbnails = video.thumbnails ?? {}
      video.thumbnails.a = `thumbnails/thumb_${video.id}_a.png`
      updated = true
    }

    // ── Template B (abTest videos only) ─────────────────────────────────────

    if (video.abTest) {
      const outB = join(thumbnailsDir, `thumb_${video.id}_b.png`)
      if (existsSync(outB)) {
        console.log(`  ✓ ${video.id} B: already exists`)
      } else {
        await renderHTML(browser, buildHTML(templateB, vars), outB)
        console.log(`  ✓ ${video.id} B: thumbnails/thumb_${video.id}_b.png`)
        video.thumbnails = video.thumbnails ?? {}
        video.thumbnails.b = `thumbnails/thumb_${video.id}_b.png`
        updated = true
      }
    }
  }
} finally {
  await browser.close()
}

if (updated) {
  await writeFile(join(campaignDir, 'campaign.json'), JSON.stringify(campaign, null, 2))
  console.log('\nUpdated campaign.json with thumbnail paths.')
}

console.log('\nDone.')
