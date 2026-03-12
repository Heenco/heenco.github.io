#!/usr/bin/env node
/**
 * generate-script.mjs
 * 
 * Reads promote/campaigns/{id}-{slug}/campaign.json
 * Calls Groq (llama-3.3-70b) to generate a script for each video in videos[]
 * Writes output to promote/campaigns/{id}-{slug}/scripts/
 * Also generates platform social captions.
 *
 * Usage:
 *   node scripts/generate-script.mjs --campaign=001
 */

import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Args ──────────────────────────────────────────────────────────────────────

const arg = process.argv.find(a => a.startsWith('--campaign='))
if (!arg) {
  console.error('Usage: node scripts/generate-script.mjs --campaign=<id>')
  process.exit(1)
}
const campaignId = arg.split('=')[1]

// ── Load campaign.json ────────────────────────────────────────────────────────

const campaignsDir = join(ROOT, 'promote', 'campaigns')
const entries = await readdir(campaignsDir)
const folder = entries.find(e => e.startsWith(`${campaignId}-`) || e === campaignId)
if (!folder) {
  console.error(`Campaign ${campaignId} not found in ${campaignsDir}`)
  process.exit(1)
}

const campaignDir = join(campaignsDir, folder)
const campaign = JSON.parse(await readFile(join(campaignDir, 'campaign.json'), 'utf-8'))
const scriptsDir = join(campaignDir, 'scripts')

// ── Groq API key ──────────────────────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY
if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY environment variable is not set.')
  process.exit(1)
}

// ── Groq helper ───────────────────────────────────────────────────────────────

async function groq(systemPrompt, userPrompt, temperature = 0.7) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: 1500,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Groq API error ${res.status}: ${text}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ── Audience pain map ─────────────────────────────────────────────────────────

const AUDIENCE_PAIN = {
  'gis-students':        'Students using ArcGIS/QGIS struggle with paywalled data exports and credits.',
  'urban-planners':      'Urban planners spend hours in ESRI downloading the same background layers for every study area.',
  'env-consultants':     'Environmental consultants need land-use and place data for EIS reports but lack commercial licences.',
  'heritage-consultants':'Heritage consultants need rapid site context — places, infrastructure, addresses — globally and for free.',
  'eco-consultants':     'Ecological consultants need background layers for flora/fauna assessments without burning ArcGIS Online credits.',
  'site-selectors':      'Business site selectors need competitor density and amenity access data quickly for location decisions.',
  'loc-advertisers':     'Location-based advertisers need POI density and audience clustering data without expensive licences.',
  'property-devs':       'Property developers need infrastructure proximity and address density for feasibility reports.',
  'nocode-gis':          'Non-technical users want to access geospatial data without GIS software or APIs.',
  'open-data':           'Open data advocates are passionate about Overture Maps and want accessible tools.',
  'data-engineers':      'Data engineers want Parquet files ready for DuckDB and Arrow pipelines.',
  'general':             'People who are curious about maps and data but have no GIS background.',
}

const CONTENT_CONTEXT = {
  tool: `The tool is "${campaign.name}" at ${campaign.url}. It works in the browser with no install required.`,
  map:  `The map is "${campaign.name}" at ${campaign.url}. It visualises geospatial data interactively.`,
  article: `The article is "${campaign.name}" at ${campaign.url}.`,
  video: `The video is "${campaign.name}" at ${campaign.url}.`,
}

const contentContext = CONTENT_CONTEXT[campaign.type] ?? CONTENT_CONTEXT.tool

// ── Script generators per format ──────────────────────────────────────────────

const FORMAT_SYSTEM_PROMPT = `You are an expert social media video scriptwriter specialising in short-form content for technical and spatial data audiences. Write engaging, punchy scripts with clear structure. Use plain spoken English — no jargon unless the audience expects it. Always include timestamps in [SECTION Xs] format. Output markdown only.`

async function generateDemoScript(video, hookVariant) {
  const audience = AUDIENCE_PAIN[video.audience] ?? AUDIENCE_PAIN.general
  const hookStyles = {
    a: 'wow-first: open with an impressive result or surprising number',
    b: 'problem-first: open by naming the specific pain the audience feels every week',
  }
  const hookStyle = hookStyles[hookVariant] ?? hookStyles.a

  return groq(
    FORMAT_SYSTEM_PROMPT,
    `Write a 60–75 second demo video script for a screen recording of the following tool.

Tool context: ${contentContext}
Target audience: ${video.audience} — ${audience}
Hook style: ${hookStyle}

Structure:
[HOOK 0–4s] — single punchy sentence, ${hookStyle}
[CONTEXT 4–10s] — what the tool does, who it's for
[DEMO NARRATION 10–55s] — narrate what's happening on screen as if talking the viewer through it; step by step, natural pace
[RESULT 55–65s] — what the viewer just saw achieved; make them feel it
[CTA 65–75s] — "It's free at heenco.io — link below."

Output as markdown with clear section headers.`
  )
}

async function generateProblemStoryScript(video) {
  const audience = AUDIENCE_PAIN[video.audience] ?? AUDIENCE_PAIN.general
  return groq(
    FORMAT_SYSTEM_PROMPT,
    `Write a 50–60 second problem story video script. No screen recording — pure voiceover over text cards.

Tool context: ${contentContext}
Target audience: ${video.audience} — ${audience}

Structure:
[HOOK 0–4s] — open with the specific pain point as a statement or question
[PAIN 4–20s] — paint the picture of the weekly frustration vividly; be specific
[SHIFT 20–35s] — introduce the existence of the solution (don't oversell yet)
[RESULT 35–50s] — what life looks like after; concrete and tangible
[CTA 50–60s] — "Free at heenco.io — link below."

Do NOT show the tool UI — this is narration only. Output as markdown.`
  )
}

async function generateExplainerScript(video) {
  const audience = AUDIENCE_PAIN[video.audience] ?? AUDIENCE_PAIN.general
  return groq(
    FORMAT_SYSTEM_PROMPT,
    `Write a 60–90 second educational explainer video script. Animated text cards, voiceover.

Tool context: ${contentContext}
Target audience: ${video.audience} — ${audience}

Structure:
[TITLE CARD 0–3s] — bold question or concept title
[HOOK QUESTION 3–8s] — "Have you ever wondered why..."
[CONTEXT 8–30s] — educational background; what the problem space is
[ANSWER 30–60s] — explain the solution clearly, step by step
[TOOL REVEAL 60–75s] — briefly introduce the tool as the answer
[CTA 75–90s] — "Try it free at heenco.io"

Tone: educational but conversational, not a lecture. Output as markdown.`
  )
}

async function generateHookTeaserScript(video) {
  const audience = AUDIENCE_PAIN[video.audience] ?? AUDIENCE_PAIN.general
  return groq(
    FORMAT_SYSTEM_PROMPT,
    `Write 3 alternative hook teaser scripts. Each is 15–20 seconds. Text-only display, no voiceover, silent autoplay.

Tool context: ${contentContext}
Target audience: ${video.audience} — ${audience}

Each variant should be a single punchy statement or sequence of 3–4 bold text cards.
Make them scroll-stopping. Use numbers, stats, or provocative questions.

Format as:
## Variant A
[card 1 text] / [card 2 text] / [card 3 text]

## Variant B  
...

## Variant C
...`
  )
}

async function generateDataStoryScript(video) {
  const audience = AUDIENCE_PAIN[video.audience] ?? AUDIENCE_PAIN.general
  return groq(
    FORMAT_SYSTEM_PROMPT,
    `Write a 35–45 second data story video script. Opens with a surprising stat or finding, narrates the insight.

Tool context: ${contentContext}
Target audience: ${video.audience} — ${audience}

Structure:
[STAT CARD 0–5s] — the surprising number or finding shown on screen
[HOOK 5–10s] — "Here's what that means..."
[INSIGHT 10–30s] — narrate why this stat is interesting and what you can do with it
[TOOL BRIDGE 30–40s] — "We found this in under 60 seconds using..."
[CTA 40–45s] — "Try it at heenco.io"

Be specific. Invent a plausible example stat if needed (e.g. number of cafés, hospitals, etc near a location). Output as markdown.`
  )
}

// ── Social captions generator ─────────────────────────────────────────────────

async function generateSocialCaptions(video, scriptContent) {
  return groq(
    `You are a social media copywriter. Write platform-optimised captions for the same video. Be concise. Include relevant hashtags. Output markdown only.`,
    `Based on this video script, write captions for each platform:

Script:
${scriptContent.slice(0, 800)}

Target audience: ${video.audience}
Tool URL: ${campaign.url}

Write:

## LinkedIn (150–200 words, professional, story-led, 3–5 hashtags)

## Twitter/X (280 chars max, punchy, 2–3 hashtags)

## Instagram (100–150 words, visual hook, 5–8 hashtags)

## TikTok (50–80 words, casual, trend-aware, 4–6 hashtags)`,
    0.8
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n🎬 Generating scripts for Campaign ${campaign.id} — ${campaign.name}`)
console.log(`   ${campaign.videos.length} video(s) to generate\n`)

const updatedVideos = [...campaign.videos]

for (let i = 0; i < campaign.videos.length; i++) {
  const video = campaign.videos[i]
  console.log(`  [${i + 1}/${campaign.videos.length}] ${video.id.toUpperCase()} — ${video.format} — audience: ${video.audience}`)

  let scriptContent = ''
  let filename = ''

  try {
    switch (video.format) {
      case 'demo': {
        console.log('    → Generating hook A…')
        const hookA = await generateDemoScript(video, 'a')
        await writeFile(join(scriptsDir, `${video.id}_demo_hook_a.md`), hookA, 'utf-8')

        console.log('    → Generating hook B…')
        const hookB = await generateDemoScript(video, 'b')
        await writeFile(join(scriptsDir, `${video.id}_demo_hook_b.md`), hookB, 'utf-8')

        scriptContent = hookA
        filename = `${video.id}_demo_hook_a.md`
        updatedVideos[i] = { ...video, selectedScript: `${video.id}_demo_hook_a` }
        console.log(`    ✓ Saved ${video.id}_demo_hook_a.md + hook_b.md`)
        break
      }
      case 'problem-story': {
        console.log('    → Generating problem story…')
        scriptContent = await generateProblemStoryScript(video)
        filename = `${video.id}_problem_story_${video.audience}.md`
        await writeFile(join(scriptsDir, filename), scriptContent, 'utf-8')
        updatedVideos[i] = { ...video, selectedScript: filename.replace('.md', '') }
        console.log(`    ✓ Saved ${filename}`)
        break
      }
      case 'explainer': {
        console.log('    → Generating explainer…')
        scriptContent = await generateExplainerScript(video)
        filename = `${video.id}_explainer.md`
        await writeFile(join(scriptsDir, filename), scriptContent, 'utf-8')
        updatedVideos[i] = { ...video, selectedScript: filename.replace('.md', '') }
        console.log(`    ✓ Saved ${filename}`)
        break
      }
      case 'hook-teaser': {
        console.log('    → Generating hook teaser variants…')
        scriptContent = await generateHookTeaserScript(video)
        filename = `${video.id}_hook_teaser.md`
        await writeFile(join(scriptsDir, filename), scriptContent, 'utf-8')
        updatedVideos[i] = { ...video, selectedScript: filename.replace('.md', '') }
        console.log(`    ✓ Saved ${filename}`)
        break
      }
      case 'data-story': {
        console.log('    → Generating data story…')
        scriptContent = await generateDataStoryScript(video)
        filename = `${video.id}_data_story.md`
        await writeFile(join(scriptsDir, filename), scriptContent, 'utf-8')
        updatedVideos[i] = { ...video, selectedScript: filename.replace('.md', '') }
        console.log(`    ✓ Saved ${filename}`)
        break
      }
      default:
        console.log(`    ⚠ Unknown format "${video.format}" — skipping`)
        continue
    }

    // Generate social captions for each video
    console.log('    → Generating social captions…')
    const captions = await generateSocialCaptions(video, scriptContent)
    await writeFile(join(scriptsDir, `${video.id}_social_captions.md`), captions, 'utf-8')
    console.log(`    ✓ Saved ${video.id}_social_captions.md`)

  } catch (err) {
    console.error(`    ✗ Error generating script for ${video.id}: ${err.message}`)
  }
}

// ── Update campaign.json with selected scripts ────────────────────────────────

campaign.videos = updatedVideos
await writeFile(join(campaignDir, 'campaign.json'), JSON.stringify(campaign, null, 2), 'utf-8')
console.log('\n✓ campaign.json updated with selectedScript fields')
console.log(`\n📁 Scripts saved to: promote/campaigns/${folder}/scripts/`)
console.log('\n👤 Next: review scripts → edit titles in campaign.json → ▶ Phase 4 (Assets)\n')
