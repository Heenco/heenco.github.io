# Heenco — Content Promotion Playbook
> Applies to: **tools · maps · blog articles · standalone videos**  
> Cadence: 1 content piece featured per month · multiple audience campaigns per month  
> Last updated: 2026-03-11
> Dashboard: **`/promote`** — live campaign management UI built into the Nuxt app

---

## Table of Contents

**Part A — Framework**
1. [Global Decisions](#1-global-decisions)
2. [Content Types Supported](#2-content-types-supported)
3. [Target Audience Master List](#3-target-audience-master-list)
4. [Pipeline Overview](#4-pipeline-overview)
5. [Step 1 — Recording](#5-step-1--recording)
6. [Step 2 — Script Generation (Automated)](#6-step-2--script-generation-automated)
   - [6a. Research-First Strategy (Perplexity / Claude prompt)](#6a-research-first-strategy-manual--perplexity--claude)
7. [Step 3 — Music Selection (Automated)](#7-step-3--music-selection-automated)
8. [Step 4 — Voiceover Generation (Automated)](#8-step-4--voiceover-generation-automated)
9. [Step 5 — AI Image Generation (Automated)](#9-step-5--ai-image-generation-automated)
10. [Step 6 — Captions & Thumbnails (Automated)](#10-step-6--captions--thumbnails-automated)
11. [Video Generation Toolchain](#11-video-generation-toolchain--decision)
12. [Step 7 — Video Assembly (Automated)](#12-step-7--video-assembly-automated)
13. [Step 8 — YouTube A/B Upload & Experiment](#13-step-8--youtube-ab-upload--experiment)
14. [Step 9 — Stats & Winner Detection (Automated)](#14-step-9--stats--winner-detection-automated)
15. [Step 10 — Cross-platform Distribution](#15-step-10--cross-platform-distribution)
16. [Platform Specs](#16-platform-specs)
17. [UTM Tracking Convention](#17-utm-tracking-convention)
18. [Automation vs Manual Summary](#18-automation-vs-manual-summary)
19. [Scripts & File Registry](#19-scripts--file-registry)
20. [Campaign Dashboard](#20-campaign-dashboard)

**Part B — Campaigns**
- [Campaign 001 — Overture Downloader](#campaign-001--overture-downloader-march-2026)
- [Campaign Template](#campaign-template--copy-for-new-campaigns)

**Meta**
- [Changelog](#changelog)

---

# Part A — Framework

---

## 1. Global Decisions

These decisions apply to **all campaigns** unless a campaign overrides them.

| Decision | Choice | Notes |
|---|---|---|
| **Voiceover** | AI — **ElevenLabs free tier** · fallback: **Kokoro TTS** (local, zero-cost) | Voice tone selected per audience automatically by `generate-voiceover.mjs` |
| **Branding** | Heenco logo at **end only** (last 2–3s) | Hook must land first — brand can wait. Logo outro PNG created once in **Canva** (see §10a) |
| **Caption style** | **TikTok-native** — bold, word-by-word pop captions, high contrast, bottom-centre safe zone | Works well on all platforms; styled via Puppeteer HTML template |
| **Music** | Curated library in `promote/assets/music/` tagged by mood · **AI selects** based on script tone | See §7. Source: Pixabay Music (free) + Artlist (if budget) |
| **Thumbnail** | 3 variants generated **automatically** via Puppeteer HTML template | See §9. No Figma/Canva needed |
| **TikTok publishing** | **Deferred** — revisit when business account + Content API access confirmed | Not a blocker |
| **YouTube A/B** | Upload unlisted → Studio experiment → auto-detect winner via Analytics API | See §11–12 |
| **Cross-platform** | Winner distributed via **Metricool** (free tier = manual UI · paid = API) | See §13 |
| **Analytics** | YouTube Analytics API (automated) + Metricool dashboard (manual weekly) | — |

---

## 2. Content Types & Video Formats

### 2a. Content types

Each campaign declares a `type`. The pipeline adapts based on it.

| Type | Recording source | Primary platform |
|---|---|---|
| `tool` | Playwright screen recording | YouTube, LinkedIn |
| `map` | Playwright screen recording | YouTube, Instagram |
| `article` | Static slides / text cards | LinkedIn, YouTube |
| `video` | Manual recording or stock | All |

### 2b. Video formats — the missing piece

A single campaign produces **multiple video formats** targeting different purposes.
Not every video shows the tool. Many talk *about* the problem, the audience pain,
the "why" — and never open the UI at all. These are fully AI-generatable from script alone.

| Format | Has screen recording? | Has narration? | Generated from | Best for |
|---|---|---|---|---|
| **Demo** | ✅ Yes — Playwright | ✅ Voiceover over demo | Recording + script | Product pages, YouTube long-form |
| **Problem story** | ❌ No | ✅ Voiceover-only | Script + text cards (FFmpeg) | Hooks, TikTok, Reels, Shorts |
| **Explainer** | ⚠️ Optional b-roll | ✅ Voiceover + animated text | Script + motion cards (Puppeteer→FFmpeg) | LinkedIn, YouTube mid-funnel |
| **Hook teaser** | ❌ No | ❌ No voice — text only | Script → bold text cards | TikTok silent, Twitter/X |
| **Data story** | ⚠️ Chart/screenshot | ✅ Voiceover | Script + static chart image | LinkedIn, Twitter/X |

#### Format descriptions

**Demo** — the screen recording path we already have. Shows the tool doing the job.
Best for: audiences who are already curious and want to see it work.

**Problem story** — *no screen recording needed*. Pure voiceover narrating the pain.
Example: *"Every week, urban planners spend hours in ArcGIS just downloading the same
background data — roads, buildings, places — for every single study area. Here's why
that's broken, and what the alternative looks like."*
Generated entirely by: Groq script → ElevenLabs voice → FFmpeg assembles text cards + music.

**Explainer** — educational context video. Answers "what IS Overture Maps?" or
"why does geospatial data cost so much?". Builds trust before the demo.
Generated by: Groq script → ElevenLabs → Puppeteer animated text slides → FFmpeg.

**Hook teaser** — pure text on screen, no voice, just music + bold captions.
Designed for silent autoplay (TikTok, LinkedIn feed, Twitter). 15–20s only.
Generated entirely by: Groq hook line → FFmpeg text overlay → music.

**Data story** — leads with a surprising stat or map screenshot, then narrates insight.
Example: *"There are 847 cafés within 2km of this intersection. Here's how we know."*

#### Each campaign targets multiple formats

For Campaign 001 (Overture Downloader), the full video set is:

| # | Format | Title / angle | Audience | Platform |
|---|---|---|---|---|
| V1 | Demo | "Download Overture Maps data in 30 seconds" | GIS students | YouTube long |
| V2 | Problem story | "Why GIS data access is still broken in 2026" | Urban planners | LinkedIn, YouTube |
| V3 | Hook teaser | "2 billion places. Free. In your browser." | Broad / no-code | TikTok, Reels, Shorts |
| V4 | Explainer | "What is Overture Maps and why should you care?" | GIS students, engineers | YouTube, LinkedIn |
| V5 | Problem story | "Before you sign a lease, know your competition" | Business site selectors | Instagram, YouTube |
| V6 | Data story | "We mapped every café in Brisbane in under a minute" | No-code / general | TikTok, Twitter/X |

V1 (Demo) uses the Playwright recording. **V2–V6 are fully AI-generated — no screen recording needed.**

A new campaign is started by creating `promote/campaigns/{id}-{slug}/campaign.json`.

---

## 3. Target Audience Master List

One campaign = one primary audience. Pick from this list. Each gets its own hook, script tone, and CTA framing.

### Tier 1 — High-intent (will use the tool immediately)

| ID | Audience | Pain point | Primary platforms |
|---|---|---|---|
| `gis-students` | GIS students & academics | ArcGIS/QGIS data export = paywalled. This is free, in-browser. | YouTube, LinkedIn |
| `urban-planners` | Urban planners | POI + building + road data for a suburb takes hours in ESRI. Here: 30s. | LinkedIn, YouTube |
| `env-consultants` | Environmental consultants | Land-use + place data for EIS reports without commercial licence. | LinkedIn |
| `heritage-consultants` | Land & heritage consultants | Rapid site context — places, infrastructure, addresses — globally free. | LinkedIn |
| `eco-consultants` | Ecological consultants | Flora/fauna assessment background layers without ArcGIS Online credits. | LinkedIn, YouTube |

### Tier 2 — Business / commercial

| ID | Audience | Pain point | Primary platforms |
|---|---|---|---|
| `site-selectors` | Business site selectors | "Where's my next location?" — competitor density, amenity access, foot traffic proxy. | Instagram, YouTube |
| `loc-advertisers` | Location-based advertisers | POI density + audience clustering without expensive proprietary data. | LinkedIn |
| `property-devs` | Property developers | Infrastructure proximity + address density for  reports. | LinkedIn |

### Tier 3 — Enthusiast / no-code

| ID | Audience | Pain point | Primary platforms |
|---|---|---|---|
| `nocode-gis` | No-code GIS users | Never accessed raw geospatial data. This is the easiest on-ramp. | TikTok, Reels, Shorts |
| `open-data` | Open data advocates | Passionate about Overture Maps specifically. | Twitter/X, Reddit (manual) |
| `data-engineers` | Data engineers & analysts | Want Parquet files for DuckDB / Arrow pipelines. | Twitter/X, YouTube |

---

## 4. Pipeline Overview

```
 INPUT
 ┌────────────────────────────────────────────────────────────────────┐
 │  campaign.json  (type, slug, audiences, url, videos[])             │
 └────────────────────────────┬───────────────────────────────────────┘
                              │
          ┌───────────────────▼────────────────────────────────────┐
          │  2. SCRIPT GENERATION  🔧                              │
          │  Groq generates per video format:                      │
          │  • Demo script (narrates over screen recording)        │
          │  • Problem story script (no recording needed)          │
          │  • Explainer script (educational narrative)            │
          │  • Hook teaser script (text-only, 15–20s)              │
          │  • Data story script (stat-led narrative)              │
          │  + platform social captions for each                   │
          └──────────────┬──────────┬──────────────────────────────┘
                         │          │
              ┌──────────▼──┐  ┌────▼───────────────────────────────┐
              │  3. MUSIC   │  │  1. RECORDING (demo format only)   │
              │  SELECT  🔧 │  │  Playwright (.webm) or manual      │
              │ mood→track  │  │  Not needed for other formats      │
              └──────────┬──┘  └────┬───────────────────────────────┘
                         │          │
                    ┌────▼──────────▼──────────────┐
                    │  4. VOICEOVER  🔧             │
                    │  ElevenLabs → .mp3            │
                    │  (all formats except teaser)  │
                    └────────────────┬──────────────┘
                                     │
          ┌──────────────────────────▼────────────────────────────┐
          │  5. AI IMAGE GENERATION  🔧                           │
          │  FLUX.1 (HuggingFace free / fal.ai paid)              │
          │  • Thumbnail background scene (per video)             │
          │  • Data story hero image                              │
          │  • B-roll prompt visual references                    │
          │  Output → images/bg_{videoId}.png                     │
          └──────────────────────────┬────────────────────────────┘
                                     │
          ┌──────────────────────────▼────────────────────────────┐
          │  6. CAPTIONS & THUMBNAILS  🔧                         │
          │  Captions: Groq Whisper → SRT (or synthetic)          │
          │  Thumbnails: Playwright → HTML template + AI bg → PNG │
          └──────────────────────────┬────────────────────────────┘
                                     │
          ┌──────────────────────────▼────────────────────────────┐
          │  7. VIDEO ASSEMBLY  🔧  (per format, per hook)         │
          │                                                        │
          │  Demo:          recording + voiceover + captions       │
          │  Problem story: AI B-roll + voiceover + music          │
          │  Explainer:     AI B-roll + voiceover + music          │
          │  Hook teaser:   bold text overlay + music only         │
          │  Data story:    AI image/clip + voiceover + music      │
          │                                                        │
          │  All → 16:9 · 9:16 · 1:1 exports                      │
          └──────────────────────────┬────────────────────────────┘
                                     │
          ┌──────────────────────────▼────────────────────────────┐
          │  7. YOUTUBE UPLOAD  🔧                                 │
          │  Demo: unlisted A/B → experiment                       │
          │  Other formats: uploaded directly (or scheduled)       │
          └──────────────────────────┬────────────────────────────┘
                                     │
          ┌──────────────────────────▼────────────────────────────┐
          │  8. A/B EXPERIMENT (demo format only)                  │
          │  Setup: YouTube Studio  👤 (5 min)                     │
          │  Monitoring + winner detection: Analytics API  🔧      │
          └──────────────────────────┬────────────────────────────┘
                                     │
          ┌──────────────────────────▼────────────────────────────┐
          │  9. DISTRIBUTION                                       │
          │  Publish winners public  🔧                            │
          │  Cross-post all formats: Metricool  👤 / API  🔧       │
          └───────────────────────────────────────────────────────┘
```

---

## 5. Step 1 — Recording (Demo format only)

Only the **Demo** video format requires a recording. All other formats (problem story,
explainer, hook teaser, data story) are assembled entirely from AI-generated content.

| Content type | How | Command / tool |
|---|---|---|
| `tool` | Playwright automated recording | `npm run record:{slug}` → `test-results/*/video.webm` |
| `map` | Playwright automated recording | `npm run record:{slug}` → `test-results/*/video.webm` |
| `article` | Static slide images — no recording needed | Generated by Puppeteer from markdown |
| `video` | Manual screen / camera recording | Place final MP4 at `promote/campaigns/{id}/recording.mp4` |

Playwright config: 1280×800, `slowMo: 350`, video always on. Output WebM is the source of truth.

> For non-demo formats, skip this step entirely — proceed straight to Step 2.

---

## 6. Step 2 — Script Generation (Automated)

**Script:** `scripts/generate-script.mjs`  
**Run:** `node scripts/generate-script.mjs --campaign=001`  
**Dashboard:** ▶ button on Phase 3  
**Requires:** `GROQ_API_KEY` in `.env`

Reads `campaign.json` → calls **Groq** (llama-3.3-70b-versatile) → generates
**one complete script per video format** in the campaign's `videos[]` list, plus social captions.
All saved to `promote/campaigns/{id}/scripts/`. Also updates `selectedScript` in `campaign.json`.

### What gets generated per video format

| Format | Script contains | Length | Output file(s) |
|---|---|---|---|
| **Demo** | Hook A (wow-first) + Hook B (problem-first), each with narration + CTA | 60–75s | `{id}_demo_hook_a.md` + `hook_b.md` |
| **Problem story** | Hook → pain → shift → result → CTA, voiceover only | 50–60s | `{id}_problem_story_{audience}.md` |
| **Explainer** | Title card → question → context → answer → tool reveal → CTA | 60–90s | `{id}_explainer.md` |
| **Hook teaser** | 3 text-card variants (silent autoplay) | 15–20s | `{id}_hook_teaser.md` |
| **Data story** | Stat card → insight → tool bridge → CTA | 35–45s | `{id}_data_story.md` |

Each video also gets: `{id}_social_captions.md` (LinkedIn · Twitter/X · Instagram · TikTok)

### Audience-aware generation

The script tailors language, pain points, and CTA based on the `audience` field in each video entry. Audience pain points are hardcoded in the script's `AUDIENCE_PAIN` map covering all 12 audience IDs from §3.

### Hook formula types

| Hook type | Trigger emotion | Best for |
|---|---|---|
| Problem-first (hook B) | Frustration relief | Consultants, planners |
| Wow-first (hook A) | Surprise / delight | General, no-code |
| Curiosity gap | FOMO / intrigue | Broad, students |
| Business ROI | Fear of missing out | Site selectors, advertisers |

**Manual gate after running:** review scripts in `scripts/` folder → edit `videos[].title` fields in `campaign.json` → mark phase done → proceed to Phase 4.

### 6a. Research-First Strategy (Manual — Perplexity / Claude)

Before or instead of running `generate-script.mjs`, paste the following prompt into **Perplexity** or **Claude** to get research-backed scripts, image prompts, audio direction, and social captions in one pass.

**Important:** Claude must output a strict JSON block so `parse-strategy.mjs` can ingest it without guessing. The prompt enforces this.

Save the output `.md` file to `promote/assets/{slug}_video_strategy.md`.

````
I've built a free browser-based GIS tool called the [TOOL NAME] at [TOOL URL].
[One sentence describing what it does.]

**Step 1 — Research (do this first, cite your sources)**
Search the web and YouTube to understand:
- Who needs [WHAT THE TOOL DOES] and what their daily frustrations are
- Who the real target audience is — search Reddit (r/gis, r/urbanplanning, r/geography),
  GIS Stack Exchange, and YouTube comments on similar tool videos. Find the exact language
  people use when describing this problem
- What similar tools and videos already exist, their view counts, and what angles are underserved
- What search queries people use when looking for [TOOL CATEGORY]

Write a brief research summary (free prose, 200–400 words) covering what you found.

**Step 2 — Structured output (strict JSON, required)**
After your research summary, output the following JSON block exactly.
Do not deviate from the schema. Do not add extra keys. Use double quotes only.

```json
{
  "tool": "[TOOL NAME]",
  "url": "[TOOL URL]",
  "audiences": [
    {
      "id": "segment-1-slug",
      "label": "Segment label",
      "pain": "One sentence describing their specific frustration"
    }
  ],
  "videos": [
    {
      "id": "v1",
      "format": "demo",
      "platform": "youtube-16x9",
      "targetDuration": 65,
      "audience": "segment-1-slug",
      "hook": "First 3-second sentence that stops the scroll.",
      "script": "Full narration script with [SECTION Xs] timestamps. Written in the audience's exact voice.",
      "thumbnailText": "BOLD TEXT OVERLAY FOR THUMBNAIL",
      "thumbnailStyle": "Visual style description for the thumbnail designer.",
      "imagePrompt": "Cinematic FLUX.1 / Stable Diffusion prompt. Midnight-blue, geospatial aesthetic, photorealistic.",
      "audioMood": "Mood description",
      "audioTempo": 110,
      "audioFeel": "Instrument and energy description. Reference track if relevant.",
      "captions": {
        "youtube": {
          "title": "YouTube title max 60 chars",
          "description": "First 3 lines of YouTube description (shown before More button).\nLine 2.\nLine 3.",
          "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
        },
        "linkedin": "Full LinkedIn caption, 150–200 words, professional tone. 4–5 #hashtags at end.",
        "twitter": "Under 280 chars. Punchy. 2–3 #hashtags.",
        "instagram": "Visual hook first line. 100–150 words. 8–10 #hashtags at end.",
        "tiktok": "Casual, Gen Z aware. 80–100 words. 5 #trending hashtags at end.",
        "reddit": "Conversational. No hashtags. Lead with the problem not the tool. 80–150 words."
      }
    }
  ]
}
```

Rules:
- `format` must be one of: demo, problem-story, explainer, hook-teaser, data-story, comparison, tutorial
- `platform` must be one of: youtube-16x9, youtube-shorts-9x16, tiktok-9x16, instagram-reel-9x16, linkedin-16x9
- `targetDuration` is in seconds
- `audioTempo` is in BPM (integer)
- Produce exactly 5 video objects
- Write each script in the exact language the audience uses — not marketing speak
- `imagePrompt` must be self-contained and ready to paste into FLUX.1 or Stable Diffusion
````

**Example filled prompt for Overture Downloader:**
> Replace `[TOOL NAME]` → `Overture Downloader`  
> Replace `[TOOL URL]` → `heenco.com/tools/overture-downloader`  
> Replace `[One sentence…]` → `It lets users download Overture Maps datasets (places, buildings, roads, etc.) by drawing a bounding box — no installs, no ArcGIS credits needed.`  
> Replace `[WHAT THE TOOL DOES]` → `free spatial data downloads`  
> Replace `[TOOL CATEGORY]` → `free GIS data downloads`

**After generating:** save the full Claude output (research prose + JSON block) as `promote/assets/{slug}_video_strategy.md`, then run:
```
node scripts/parse-strategy.mjs --campaign=001 --file=promote/assets/overture-downloader_video_strategy.md
```
The parser extracts the JSON block, writes `videos[]` into `campaign.json`, and saves all scripts + social captions to `campaigns/{id}/scripts/`.
*(see §6b — parse-strategy.mjs, planned)*

---

## 7. Step 3 — Music Selection (Automated)

**Script:** `scripts/select-music.mjs`  
**Run:** `node scripts/select-music.mjs --campaign=001`  
**Dashboard:** ▶ button on Phase 4 (via `generate-assets.mjs`)

> **Status: Implemented ✅**

### Music library

Source royalty-free tracks from [Pixabay Music](https://pixabay.com/music/), ccMixter, or Free Music Archive.  
Place MP3s in `promote/assets/music/` and catalogue them in `promote/assets/music-index.json`.

```json
// promote/assets/music-index.json
{
  "tracks": [
    {
      "id": "calm-minimal-01",
      "file": "promote/assets/music/calm-minimal-01.mp3",
      "title": "Track Name",
      "artist": "Artist Name",
      "mood": "calm",          // inspirational | energetic | calm | dramatic | playful | professional
      "energy": "low",         // low | medium | high
      "bpm": 90,
      "duration_s": 120,
      "tags": ["minimal", "professional", "tech"],
      "source": "Pixabay Music",
      "license": "Pixabay License",
      "url": "https://pixabay.com/music/..."
    }
  ]
}
```

### How it works
1. Reads each video's selected script
2. Sends first ~1500 chars to **Groq** → returns `{ mood, energy, tags }`
3. Scores all tracks in `music-index.json` (mood match +3, energy match +2, tag overlap +1 each)
4. Records winning `trackId` + `file` path in `campaign.json` — **no file copy** (use paths as-is in FFmpeg assembly step)
5. Build to 10+ tracks covering all mood categories before first campaign

---

### Music library structure
```
promote/assets/music/
├── calm_minimal_01.mp3        # mood: calm · energy: 2 · tags: professional, minimal
├── calm_minimal_02.mp3
├── upbeat_productive_01.mp3   # mood: upbeat · energy: 4 · tags: productive, tech
├── curious_light_01.mp3       # mood: curious · energy: 3 · tags: discovery, open
├── energetic_punchy_01.mp3    # mood: energetic · energy: 5 · tags: tiktok, gen-z
└── music-index.json           # catalogue of all tracks with mood/energy/tags
```

### How it works
1. Reads the selected hook script text
2. Sends to **Groq**: "Classify the mood of this script, return: mood, energy (1-5), and 2-3 tags from: calm, upbeat, curious, energetic, professional, playful"
3. Matches result against `music-index.json`
4. Copies best-match track to `promote/campaigns/{id}/assets/music.mp3`
5. Writes selection rationale to campaign log

Sources for the library (all royalty-free, no attribution):
- **Pixabay Music** — free download, commercial use allowed
- **ccMixter** — CC0 / CC-BY tracks
- Build to 15–20 tracks covering all mood categories before first campaign

---

## 8. Step 4 — Voiceover Generation (Automated)

**Script:** `scripts/generate-voiceover.mjs`  
**Run:** `node scripts/generate-voiceover.mjs --campaign=001 [--video=v1]`  
**Dashboard:** ▶ button on Phase 4 (via `generate-assets.mjs`)  
**Env:** `ELEVENLABS_API_KEY`

> **Status: Implemented ✅** — add `ELEVENLABS_API_KEY` to `.env` to activate

**Hook-teaser** format is skipped (text-overlay only, no narration needed).

### Voice selection

Voices mapped from `video.audience` in `campaign.json`:

| Audience | ElevenLabs Voice | Style |
|---|---|---|
| gis-students, data-engineers, nocode-gis, general | Rachel (`21m00Tcm4TlvDq8ikWAM`) | Clear, friendly |
| urban-planners, heritage/env/eco-consultants | Adam (`pNInz6obpgDQGcFmaJgB`) | Authoritative, measured |
| property-devs, site-selectors, loc-advertisers | Antoni (`ErXwobaYiN019PkySvjV`) | Confident, direct |
| open-data | Domi (`AZnzlk1XvdvUeBnXmlld`) | Enthusiastic |

### Free tier limits
- **ElevenLabs free**: 10,000 chars/month ≈ 11 full voiceovers at no cost
- **Model**: `eleven_turbo_v2_5` (fast, high quality)

Output: `promote/campaigns/{id}/audio/voiceover_{videoId}.mp3`

---

### Voice selection logic
| Audience tier | Voice style | ElevenLabs voice suggestion |
|---|---|---|
| Consultants / planners (Tier 1) | Calm, authoritative, measured | "Daniel" or "Callum" |
| Business / commercial (Tier 2) | Confident, direct, slightly energetic | "Adam" or "Antoni" |
| No-code / enthusiast (Tier 3) | Friendly, approachable, upbeat | "Bella" or "Rachel" |

Voice is selected based on `campaign.json → audience` field — no manual selection needed.

### Free tier limits (ElevenLabs)
- 10,000 characters/month free
- A 60s script ≈ 700–900 characters → ~11 full voiceovers/month at no cost
- Fallback: **Kokoro TTS** (local, open-source, zero cost, good quality)

Output: `promote/campaigns/{id}/audio/voiceover_hook_{a|b}.mp3`

---

## 9. Step 5 — AI Image Generation (Automated)

**Script:** `scripts/generate-ai-image.mjs`  
**Run:** `node scripts/generate-ai-image.mjs --campaign=001`  
**Dashboard:** ▶ button on Phase 4 (via `generate-assets.mjs`) — runs before thumbnail + broll

> **Status: Planned — not yet built**

Generates **photorealistic background images** for each video — used as:
- Background layer in the Playwright thumbnail template (replaces the flat dark colour)
- Hero image for data-story format (when a Kling clip isn't needed)
- Visual reference prompts fed into `generate-broll.mjs` for B-roll consistency

### Services & free tier options

| Service | API? | Free tier | Best for | Cost | Verdict |
|---|---|---|---|---|---|
| **HuggingFace FLUX.1-schnell** | ✅ REST | ✅ Unlimited (slower queue) | Photorealistic scenes | Free | **Best free automated option** |
| **fal.ai FLUX.1 Pro** | ✅ REST | ❌ ($5 to start) | Fast, high-res, production | ~$0.005/img | **Best paid automated option** |
| **Replicate** | ✅ REST | ✅ $5 free credit on signup | FLUX, SD3, many models | ~$0.003–0.01/img | Good flexible fallback |
| **Together AI** | ✅ REST | ✅ $5 free credit | Fast FLUX.1 inference | ~$0.003/img | Fast + cheap |
| **Stability AI** | ✅ REST | ✅ 25 free credits on signup | Stable Diffusion 3.5 | Credit-based | Reliable fallback |
| **DALL-E 3 (OpenAI)** | ✅ REST | ❌ | Stylised illustrations, data-viz | ~$0.04/img | Good fallback, prompt-flexible |
| **Ideogram 2.0** | ✅ REST | ✅ 10/day free | Images with embedded text | Credit-based | Best when text must appear in image |
| **Bing Image Creator** | ✅ Web UI | ✅ Free (DALL-E 3 engine) | Manual one-offs | Free | Best free manual option |
| **Leonardo.ai** | ✅ Web UI | ✅ 150 tokens/day | High quality, consistent styles | Free tier | Good for manual brand-asset work |
| **Adobe Firefly** | ✅ Web UI | ✅ 25 credits/month | Commercially licensed output | Free tier | Safe for commercial use |
| **Midjourney v7** | ⚠️ Discord only | ❌ ($10/mo flat) | Highest aesthetic quality | $10/mo | Best manual, no automation |
| **Canva AI (Magic Media)** | ✅ Web UI | ✅ limited on free plan | Brand-consistent assets, logo work | Free/Pro | **Use for logo_outro.png** |
| **Stable Diffusion (local)** | ✅ ComfyUI | ✅ Unlimited | Experiments, batch runs | Free (GPU) | Good if you have an NVIDIA card |

### Decision: HuggingFace free → fal.ai paid

The script uses **HuggingFace FLUX.1-schnell** by default (free, no key needed for public inference) and falls back to **fal.ai** if `FAL_API_KEY` is set. This means:
- Zero cost out of the box during development
- Upgrade to fal.ai for speed in production (no code change needed)

**Env var (optional):** `FAL_API_KEY` — get at [fal.ai](https://fal.ai) → Dashboard → API Keys

### How it works

1. Reads each video's `selectedScript` → extracts the `[HOOK]` section
2. Groq generates a **cinematic image prompt** from the hook + campaign type + audience
3. Sends to HuggingFace FLUX.1-schnell (or fal.ai if key present) → downloads 1280×720 PNG
4. Saves to `promote/campaigns/{id}/images/bg_{videoId}.png`
5. `generate-thumbnail.mjs` detects the file and uses it as the HTML template background
6. `generate-broll.mjs` reads the same prompt for visual consistency across B-roll clips

```js
// HuggingFace Inference API — free, no key needed for public models
const response = await fetch(
  'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
  {
    method: 'POST',
    headers: {
      // Authorization: `Bearer ${process.env.HF_TOKEN}`,  // optional — adds priority queue
      'Content-Type': 'application/json',
      Accept: 'image/png',
    },
    body: JSON.stringify({
      inputs: 'Urban planner studying spatial data on monitor, modern office, cinematic lighting, 16:9',
      parameters: { width: 1280, height: 720 },
    }),
  },
)
// Returns raw PNG bytes → write to file
const buffer = Buffer.from(await response.arrayBuffer())
await writeFile(outPath, buffer)
```

### Output

```
promote/campaigns/{id}/images/
├── bg_v1.png   # thumbnail background for demo video
├── bg_v2.png   # thumbnail background + hero for problem-story
└── bg_v3.png   # thumbnail background for hook-teaser
```

---

## 10. Step 6 — Captions & Thumbnails (Automated)

### Captions

**Script:** `scripts/generate-captions.mjs`  
**Run:** `node scripts/generate-captions.mjs --campaign=001 [--video=v1]`  
**Dashboard:** ▶ button on Phase 4 (via `generate-assets.mjs`)

> **Status: Implemented ✅**

Strategy:
1. **If** voiceover MP3 exists → Groq Whisper (`whisper-large-v3-turbo`) transcribes to SRT (accurate timing)
2. **Else** → synthetic SRT generated from `[SECTION start–end s]` timestamp markers in the markdown script

Output: `promote/campaigns/{id}/captions/{videoId}.srt`

---

### Thumbnails

**Script:** `scripts/generate-thumbnail.mjs`  
**Run:** `node scripts/generate-thumbnail.mjs --campaign=001`  
**Dashboard:** ▶ button on Phase 4 (via `generate-assets.mjs`) — runs after `generate-ai-image.mjs`

> **Status: Implemented ✅** — uses Playwright Chromium (already installed)

Uses **Playwright** (not Puppeteer) to render HTML templates → 1280×720 PNG.

- **Template A** (`promote/templates/thumbnail-a.html`) — dark bg (or AI bg if `images/bg_{id}.png` exists), blue accent stripe, for all videos
- **Template B** (`promote/templates/thumbnail-b.html`) — radial glow gradient, for `abTest: true` videos only

Hook text extracted from the `[HOOK]` section of the selected script.  
HTML variables injected: `__HEADLINE__`, `__TOOL__`, `__CATEGORY__`.

Output: `promote/campaigns/{id}/thumbnails/thumb_{videoId}_{a|b}.png`

---

### How it works
1. Extracts a keyframe from the recording at the most visually interesting moment (FFmpeg `select` filter at 30% duration)
2. Renders 3 HTML template variants with injected data:
   - Campaign title, hook headline text, keyframe as background
3. Screenshots each at 1280×720 → saves to `promote/campaigns/{id}/thumbnails/`

### Template variants
| Variant | Layout | Headline style |
|---|---|---|
| A — Split | Left: problem screenshot · Right: tool UI | "Before / After" framing |
| B — Map focus | Full-bleed map keyframe + overlaid text | Bold white on dark overlay |
| C — Text-first | Dark background, large bold headline, small logo | Quote / stat style |

### Template files
```
promote/templates/
├── thumbnail-a.html    # split template
├── thumbnail-b.html    # map focus template
├── thumbnail-c.html    # text-first template
└── thumbnail.css       # shared brand styles (Figtree font, Heenco colours)
```

---

## 11. Video Generation Toolchain — Decision

> **Decision: Hybrid — Playwright + FFmpeg for Demo & Hook Teaser · Kling AI for Problem Story, Explainer, Data Story**

The key insight: **not every format benefits equally from AI video generation**. The Demo must show the real UI (AI can't fake it). The Hook Teaser is intentionally minimal (bold text + music). But Problem Story, Explainer, and Data Story benefit enormously from cinematic AI-generated B-roll instead of static slide cards.

---

### Tool comparison

| Tool | API? | What it produces | Best for | Cost | Decision |
|---|---|---|---|---|---|
| **Playwright + FFmpeg** | ✅ (in-house) | Pixel-perfect branded motion graphics, screen recordings | Demo, Hook Teaser | Free | Use for demo + hook teaser |
| **Kling AI (Kling v2)** | ✅ REST API | Cinematic 5–10s B-roll clips from text prompts | Problem story, Explainer, Data story | Credit-based (~$0.14/5s clip) | **Primary AI video tool** |
| **Veo 3 (Google)** | ✅ Vertex AI | High-quality video + native audio from prompts | Explainer, Data story | Per-second pricing (Vertex) | **Secondary / Veo 3 audio advantage** |
| Runway Gen-4 | ✅ REST API | Cinematic B-roll | Any non-demo | ~$0.05/s | Viable alternative to Kling |
| HeyGen / Synthesia | ✅ | Avatar presenter | — | ~$29/mo | Rejected — looks corporate/AI |
| Pika | Limited API | Short clips | — | — | Not mature enough |

---

### Per-format strategy

| Format | Visual source | Tool | Rationale |
|---|---|---|---|
| **Demo** | `recording.webm` (Playwright) | FFmpeg only | Must show the real tool UI — AI can't fake it |
| **Problem story** | AI-generated B-roll (person at desk, frustrated, map data, city scenes) | **Kling** → FFmpeg composite | 4–6 clips × 5s, voiceover narrates over them |
| **Explainer** | AI-generated contextual B-roll (data flows, geospatial imagery, earth views) | **Kling or Veo 3** → FFmpeg | Veo 3 better for abstract/data visuals |
| **Hook teaser** | Bold text on gradient background | FFmpeg `drawtext` | 15–20s text-only — AI video would add nothing |
| **Data story** | AI-generated city/map aerial + stat card overlay | **Kling** → FFmpeg composite | Cinematic establishing shot + stat card burned in |

---

### Kling AI API

**Docs:** https://docs.klingai.com/  
**Base URL:** `https://api.klingai.com/v1/`  
**Auth:** JWT token signed with Access Key ID + Secret Key (HS256, 30-min TTL)  
**Env var:** `KLING_ACCESS_KEY_ID`, `KLING_SECRET_KEY`

#### Text-to-video endpoint

```http
POST https://api.klingai.com/v1/videos/text2video
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "model_name": "kling-v2",
  "prompt": "A frustrated urban planner staring at a complex ESRI console, dimly lit office, cinematic",
  "negative_prompt": "text, watermark, logo, cartoon",
  "cfg_scale": 0.5,
  "mode": "std",        // std (5s) or pro (10s)
  "duration": "5",      // "5" or "10"
  "aspect_ratio": "16:9"
}

// Response: { "task_id": "xxx", "task_status": "submitted" }
```

#### Polling for result

```http
GET https://api.klingai.com/v1/videos/text2video/{task_id}
// Poll every 5s until task_status === "succeed"
// Response includes: task_result.videos[0].url  (CDN URL, expires in 30 days)
```

#### Key numbers
- `kling-v2` 5s clip in `std` mode: ~0.14 credits (~$0.14)
- A problem story video needs ~5 clips → ~$0.70 per video
- Monthly budget for 4 campaigns × 3 AI videos × 5 clips = ~$8.40/month

---

### Veo 3 (Google Vertex AI)

**Docs:** https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos  
**SDK:** `@google-cloud/aiplatform`  
**Auth:** Google application default credentials (`GOOGLE_APPLICATION_CREDENTIALS` JSON key)  
**Env var:** `GOOGLE_CLOUD_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS`

**Veo 3 advantage:** It generates **video + audio together** from a prompt — including ambient sound, music tone, and speech-like narration. For an Explainer video with abstract data visuals, Veo 3's native audio is excellent background texture.

```js
import { VertexAI } from '@google-cloud/vertexai'

const vertexAI = new VertexAI({ project: process.env.GOOGLE_CLOUD_PROJECT, location: 'us-central1' })
const model    = vertexAI.preview.getGenerativeModel({ model: 'veo-3.0-generate-preview' })

const response = await model.generateVideo({
  contents: [{ role: 'user', parts: [{ text: 'Aerial timelapse of a global city at dusk with data point overlays, cinematic, 4K' }] }],
  generationConfig: { durationSeconds: 8, aspectRatio: '16:9' },
})
// Returns a signed GCS URI: gs://...
```

> ⚠️ Veo 3 requires Vertex AI allowlist approval. Check quota at console.cloud.google.com before building. Veo 2 (`veo-2.0-generate-001`) is more broadly available.

---

### New script: `generate-broll.mjs`

This Phase 4 sub-script generates AI B-roll clips for supported formats.  
**Status: Not yet built** (next step after `process-video.mjs`).

```
Input:  campaign.json → videos[].format + videos[].selectedScript
Output: promote/campaigns/{id}/broll/{videoId}/clip_{n}.mp4
        (one clip per [SECTION] in the script)
```

The script:
1. Reads each script section's text
2. Sends to Groq to generate a cinematic visual prompt ("urban planner frustrated at desk, dim office, photorealistic")
3. Sends prompt to Kling API → polls until complete → downloads clip
4. Skips demo + hook-teaser formats (not applicable)
5. Records clip paths in `campaign.json`

`process-video.mjs` then uses these clips as the visual layer instead of PNG slide frames.

---

### `generate-assets.mjs` run order

The Phase 4 orchestrator runs scripts in this sequence so each step feeds the next:

```
1. select-music.mjs          → picks track, writes to campaign.json
2. generate-voiceover.mjs    → ElevenLabs MP3s
3. generate-ai-image.mjs     → FLUX.1 background PNGs (feeds thumbnail + broll prompts)
4. generate-captions.mjs     → Groq Whisper SRT (or synthetic)
5. generate-thumbnail.mjs    → Playwright renders HTML template with AI bg
6. generate-broll.mjs        → Kling AI B-roll clips using prompts from step 3
```

Steps 3 and 6 are **not yet built** — they slot into the existing orchestrator once complete.

---

### Cost summary

| Format | Method | Cost per video |
|---|---|---|
| Demo | Playwright (free) | $0 |
| Hook teaser | FFmpeg (free) | $0 |
| Problem story | Kling (~5 clips × 5s) | ~$0.70 |
| Explainer | Kling or Veo 3 (~6 clips × 5s) | ~$0.85 |
| Data story | Kling (~3 clips × 5s + stat card) | ~$0.45 |

**Per campaign (all 5 formats):** ~$2 in AI video credits. Very viable.

---

## 10a. Branding Assets — Manual One-offs

Assets created once and reused across all campaigns — not automated.

### `logo_outro.png` — Canva

Used in the FFmpeg outro overlay (last 2–3s of every video).

**Steps:**
1. Open [canva.com](https://canva.com) → **Create design → Custom size → 1280 × 720 px**
2. Set background to **transparent** (File → Background → remove / set to none)
3. Add the Heenco logo (upload SVG or recreate: circle mark + HEENCO wordmark + "Location Intelligence Lab" tagline)
4. Style: dark charcoal `#1f2937` circle mark, white wordmark, grey tagline — match `HeencoLogo.vue`
5. Centre on canvas with some breathing room
6. Export → **PNG** → tick **Transparent background** → Download
7. Save to `promote/assets/logo_outro.png`

> Save the Canva design to the Heenco brand kit for fast re-export.

### Manual high-quality thumbnails — Midjourney

For campaigns where the thumbnail needs maximum visual impact. Discord-based — no code.

```
/imagine prompt: An urban planner reviewing geospatial maps on a large screen, 
modern office, blue data overlays, cinematic depth of field, 16:9 --ar 16:9 
--style raw --v 7
```

Download upscaled → use as `bg_{videoId}.png` in `promote/campaigns/{id}/images/` — `generate-thumbnail.mjs` will pick it up automatically.

---

## 12. Step 7 — Video Assembly (Automated)

**Script:** `scripts/process-video.mjs`  
**Run:** `node scripts/process-video.mjs --campaign=001 --video=demo-hook-a`

The assembly pipeline differs per format. The script reads `format` from `campaign.json`
and routes to the right FFmpeg pipeline automatically.

### Per-format assembly logic

| Format | Visuals | Audio layers | Captions |
|---|---|---|---|
| **Demo** | Playwright WebM (trimmed) | music (20%) + voiceover (100%) | Whisper SRT |
| **Problem story** | Kling AI B-roll clips (5s each, one per section) → FFmpeg concat | music (30%) + voiceover (100%) | Whisper SRT |
| **Explainer** | Kling / Veo 3 AI B-roll clips → FFmpeg concat | music (25%) + voiceover (100%) | Whisper SRT |
| **Hook teaser** | FFmpeg bold text overlay on gradient background | music (60%), no voice | Hardcoded text (no SRT needed) |
| **Data story** | Kling aerial/city clip + Playwright stat card overlay → FFmpeg composite | music (25%) + voiceover (100%) | Whisper SRT |

### How AI B-roll videos are assembled (problem story / explainer / data story)

```
1. generate-script.mjs splits script into [SECTION] blocks
2. generate-broll.mjs: Groq generates a cinematic visual prompt per section
   → sends to Kling API → polls → downloads clip_{n}.mp4 to broll/{videoId}/
3. FFmpeg concat: broll clips → continuous video (crossfade between clips)
4. voiceover + music mixed in → captions burned → logo outro → final MP4
```

Full FFmpeg pipeline — runs end to end from source to all platform formats:

```bash
# Stage 1: Convert + trim
ffmpeg -i recording.webm -t 90 -c:v libx264 -crf 20 -c:a aac stage1_base.mp4

# Stage 2: Mix in background music at 20% volume
ffmpeg -i stage1_base.mp4 -i music.mp3 \
  -filter_complex "[1:a]volume=0.2[a];[0:a][a]amix=inputs=2:duration=first[out]" \
  -map 0:v -map "[out]" stage2_music.mp4

# Stage 3: Overlay voiceover (replaces or layers on top of music)
ffmpeg -i stage2_music.mp4 -i voiceover_hook_a.mp3 \
  -filter_complex "[0:a][1:a]amix=inputs=2:weights=0.2 1:duration=first[out]" \
  -map 0:v -map "[out]" stage3_voiced.mp4

# Stage 4: Burn TikTok-native captions
ffmpeg -i stage3_voiced.mp4 \
  -vf "subtitles=hook_a.srt:force_style='FontName=Figtree,FontSize=28,Bold=1,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=60'" \
  stage4_captions.mp4

# Stage 5: Add logo outro (last 3s PNG overlay, fade in)
ffmpeg -i stage4_captions.mp4 -i logo_outro.png \
  -filter_complex "[0:v][1:v]overlay=W-w-40:H-h-40:enable='between(t,eof-3,eof)',fade=t=in:st=eof-3:d=1[out]" \
  -map "[out]" -map 0:a stage5_final.mp4

# Stage 6a: Export 16:9 (YouTube long, LinkedIn)
ffmpeg -i stage5_final.mp4 -vf "scale=1280:720" hook_a_16x9.mp4

# Stage 6b: Export 9:16 (Shorts, Reels, TikTok)
ffmpeg -i stage5_final.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black" \
  hook_a_9x16.mp4

# Stage 6c: Export 1:1 (LinkedIn square, Facebook)
ffmpeg -i stage5_final.mp4 \
  -vf "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black" \
  hook_a_1x1.mp4
```

All outputs saved to `promote/campaigns/{id}/output/`.

---

## 11. Step 7 — YouTube A/B Upload & Experiment

**Scripts:** `scripts/youtube-upload.mjs`  
**Run:** `node scripts/youtube-upload.mjs --campaign=001`

Uploads both hook variants as **unlisted**, attaches thumbnails A/B/C, and saves returned video IDs to `campaign.json → youtubeIds`.

### One-time Google Cloud setup (manual, do once)
1. Create project at console.cloud.google.com
2. Enable **YouTube Data API v3** + **YouTube Analytics API v2**
3. Create OAuth 2.0 Desktop credentials → download `client_secret.json`
4. Place at `promote/auth/client_secret.json` (gitignored)
5. Run any upload script once — browser opens for OAuth → `token.json` saved

### A/B Experiment setup (manual, 5 min per campaign)
1. Open YouTube Studio → Content → click the uploaded video
2. Select "Run an experiment" → choose the hook B variant as the challenger
3. Set experiment duration: 14 days
4. YouTube Studio has no API for this step — it is unavoidably manual

---

## 12. Step 8 — Stats & Winner Detection (Automated)

**Script:** `scripts/youtube-stats.mjs`  
**Run:** `node scripts/youtube-stats.mjs --campaign=001`

Calls **YouTube Analytics API v2** to pull:
- Views, impressions, CTR, average view duration, watch-time per video ID

Outputs a comparison table to terminal and saves to `promote/campaigns/{id}/analytics.json`.

**Auto-flags a winner** if one video meets all conditions after ≥7 days:
- CTR difference ≥ 15% in favour of one variant, AND
- Average view duration difference ≥ 10%

If no clear winner after 14 days, outputs "inconclusive — extend or choose manually."

**Publish winner script:** `scripts/youtube-publish-winner.mjs`  
**Run:** `node scripts/youtube-publish-winner.mjs --campaign=001 --hook=a`  
Sets `privacyStatus: 'public'` on the winning video ID via YouTube Data API.

---

## 13. Step 9 — Cross-platform Distribution

### Via Metricool (recommended)

| Plan | Upload method | Scheduling |
|---|---|---|
| **Free** | Manual UI upload | Manual in Metricool calendar |
| **Paid (~$22/mo)** | Metricool REST API | Fully automated via `scripts/metricool-schedule.mjs` |

**Free tier workflow (manual, ~20 min per campaign):**
1. Log in to metricool.com
2. Upload `hook_winner_9x16.mp4` → assign to Instagram Reels, YouTube Shorts
3. Upload `hook_winner_16x9.mp4` → assign to LinkedIn, YouTube
4. Paste Groq-generated captions (from `promote/campaigns/{id}/scripts/social_*.md`)
5. Schedule at platform-optimal times (Metricool shows best times in-app)

**Paid tier automation** (`scripts/metricool-schedule.mjs`):
- Reads winner video path + captions from campaign folder
- POSTs to Metricool REST API for each platform
- Schedules at optimal times using Metricool's recommended slots

### Platform-by-platform API access (for direct automation if needed)

| Platform | API | Access | Cost |
|---|---|---|---|
| YouTube | YouTube Data API v3 | Free, OAuth | Free |
| LinkedIn | LinkedIn Marketing API | Free, Business account approval | Free |
| Instagram | Meta Graph API | Free, Business account | Free |
| Twitter/X | X API v2 | Basic write access | $100/mo — not worth it |
| TikTok | Content Posting API | Business approval required | Deferred |

---

## 14. Platform Specs

| Platform | Format | Duration | Ratio | Max file | Key note |
|---|---|---|---|---|---|
| YouTube long | MP4 H.264 | 60–90s | 16:9 | 256 GB | Use chapter timestamps in description |
| YouTube Shorts | MP4 H.264 | ≤60s | 9:16 | 256 GB | Hook must land in first 3s |
| TikTok | MP4 H.264 | 15–60s | 9:16 | 4 GB | 85% watch muted — captions non-optional |
| Instagram Reels | MP4 H.264 | 15–90s | 9:16 | 4 GB | Keep text in centre 80% safe zone |
| LinkedIn Video | MP4 H.264 | 30–90s | 16:9 or 1:1 | 5 GB | Autoplay muted — captions critical |
| Twitter/X | MP4 H.264 | ≤140s | 16:9 | 512 MB | 30s performs best |

---

## 15. UTM Tracking Convention

All CTA and description links carry UTM params. Pattern:

```
https://heenco.io/{type}/{slug}?utm_source={platform}&utm_medium={medium}&utm_campaign={id}-{slug}&utm_content=hook_{x}
```

Examples for Campaign 001:
```
YouTube long:   ?utm_source=youtube&utm_medium=video&utm_campaign=001-overture-downloader&utm_content=hook_b
YouTube Shorts: ?utm_source=youtube&utm_medium=shorts&utm_campaign=001-overture-downloader
LinkedIn:       ?utm_source=linkedin&utm_medium=video&utm_campaign=001-overture-downloader
Instagram:      ?utm_source=instagram&utm_medium=reels&utm_campaign=001-overture-downloader
Twitter/X:      ?utm_source=twitter&utm_medium=video&utm_campaign=001-overture-downloader
TikTok:         ?utm_source=tiktok&utm_medium=video&utm_campaign=001-overture-downloader
```

---

## 16. Automation vs Manual Summary

| Step | Status | Script(s) | Manual effort |
|---|---|---|---|
| Screen recording (tool/map) | 🔧 Fully automated | `npm run record:{slug}` | None |
| Script + hook generation | 🔧 Fully automated | `generate-script.mjs` | Review + select 2 hooks (5 min) |
| Platform social captions | 🔧 Fully automated | `generate-script.mjs` | Review before posting (5 min) |
| Music selection | 🔧 Fully automated | `select-music.mjs` | Build library once (1–2 hrs total) |
| Voiceover generation | 🔧 Fully automated | `generate-voiceover.mjs` | ElevenLabs account setup once |
| Caption (.srt) generation | 🔧 Fully automated | `generate-captions.mjs` | None |
| Thumbnail generation | 🔧 Fully automated | `generate-thumbnail.mjs` | Template HTML design once |
| Video processing (all formats) | 🔧 Fully automated | `process-video.mjs` | None after setup |
| YouTube upload (unlisted) | 🔧 Fully automated | `youtube-upload.mjs` | Google Cloud + OAuth setup once |
| YouTube A/B experiment setup | 👤 Manual (5 min) | YouTube Studio UI only | No API for this feature |
| YouTube stats + winner flag | 🔧 Fully automated | `youtube-stats.mjs` | Review terminal output |
| Publish winner to public | 🔧 Fully automated | `youtube-publish-winner.mjs` | Trigger manually after review |
| Cross-platform upload (free) | 👤 Manual (~20 min) | Metricool UI | Upload + schedule per platform |
| Cross-platform upload (paid) | 🔧 Automatable | `metricool-schedule.mjs` | Needs Metricool paid plan |
| Thumbnail upload to YouTube | 🔧 Automatable | `youtube-upload.mjs` | Included in upload script |
| Analytics review | 👤 Manual (weekly) | Metricool + youtube-stats.mjs | 15 min/week |
| Article/video recording | 👤 Manual | — | Content-type `article`/`video` |

**Truly unavoidable manual steps:** YouTube A/B experiment setup · content review gate (scripts/hooks) · cross-platform distribution on free plan · article/video recording

---

## 17. Scripts & File Registry

### Scripts (`scripts/`)

| File | Purpose | Inputs | Outputs |
|---|---|---|---|
| `generate-script.mjs` | Groq: hook variants + social captions | `--campaign` | `campaigns/{id}/scripts/*.md` |
| `generate-assets.mjs` | **Phase 4 orchestrator** — runs all sub-scripts in sequence | `--campaign` | stdout summary |
| `select-music.mjs` | Groq mood → best music track from `music-index.json` | `--campaign` | Selection written to `campaign.json` |
| `generate-voiceover.mjs` | ElevenLabs TTS: script → MP3 (skips hook-teaser) | `--campaign`, `[--video=id]` | `campaigns/{id}/audio/voiceover_{videoId}.mp3` |
| `generate-captions.mjs` | Groq Whisper or synthetic SRT from timestamps | `--campaign`, `[--video=id]` | `campaigns/{id}/captions/{videoId}.srt` |
| `generate-thumbnail.mjs` | Playwright Chromium: HTML template → 1280×720 PNG | `--campaign` | `campaigns/{id}/thumbnails/thumb_{videoId}_{a\|b}.png` |
| `generate-broll.mjs` | **Kling AI / Veo 3**: Groq→visual prompt → AI B-roll clips (problem-story, explainer, data-story only) | `--campaign`, `[--video=id]` | `campaigns/{id}/broll/{videoId}/clip_{n}.mp4` |
| `process-video.mjs` | FFmpeg: B-roll or recording + audio + captions → MP4 | `--campaign` | `campaigns/{id}/output/*.mp4` |
| `youtube-upload.mjs` | YouTube API: upload unlisted | `--campaign` | Video IDs saved to `campaign.json` |
| `youtube-stats.mjs` | YouTube Analytics: CTR/views/duration | `--campaign` | `campaigns/{id}/analytics.json` |
| `youtube-publish-winner.mjs` | YouTube API: set public | `--campaign` | — |

### Folder structure

```
promote/
├── assets/
│   └── music/
│       ├── music-index.json              # mood/energy/tags catalogue
│       ├── calm_minimal_01.mp3
│       ├── upbeat_productive_01.mp3
│       ├── curious_light_01.mp3
│       └── energetic_punchy_01.mp3
├── auth/
│   ├── client_secret.json               # gitignored — Google OAuth
│   └── token.json                       # gitignored — OAuth token
├── templates/
│   ├── thumbnail-a.html                 # Split template
│   ├── thumbnail-b.html                 # Map-focus template
│   ├── thumbnail-c.html                 # Text-first template
│   └── thumbnail.css                    # Brand styles
└── campaigns/
    └── 001-overture-downloader/         # One folder per campaign
        ├── campaign.json                # Config + status
        ├── recording.webm               # Source recording (symlink or copy)
        ├── assets/
        │   └── music.mp3               # AI-selected track
        ├── audio/
        │   ├── voiceover_hook_a.mp3
        │   └── voiceover_hook_b.mp3
        ├── captions/
        │   ├── hook_a.srt
        │   ├── hook_b.srt
        │   └── social_linkedin.md
        ├── output/                      # gitignored
        │   ├── hook_a_16x9.mp4
        │   ├── hook_a_9x16.mp4
        │   ├── hook_a_1x1.mp4
        │   ├── hook_b_16x9.mp4
        │   ├── hook_b_9x16.mp4
        │   └── hook_b_1x1.mp4
        ├── broll/                       # AI-generated B-roll (gitignored)
        │   ├── v2/                      # problem-story clips
        │   │   ├── clip_0.mp4           # Kling AI clip per [SECTION]
        │   │   ├── clip_1.mp4
        │   │   └── clip_2.mp4
        │   └── v3/                      # explainer clips (Kling or Veo 3)
        │       └── clip_0.mp4
        ├── scripts/
        │   ├── hook_a_wow-first.md
        │   ├── hook_b_problem-first.md
        │   └── hook_c_curiosity-gap.md
        ├── thumbnails/
        │   ├── thumb_a.png
        │   ├── thumb_b.png
        │   └── thumb_c.png
        └── analytics.json               # YouTube stats output
```

### `campaign.json` schema

```json
{
  "id": "001",
  "type": "tool",
  "name": "Overture Downloader",
  "slug": "overture-downloader",
  "url": "https://heenco.io/tools/overture-downloader",
  "month": "2026-03",
  "recordingCmd": "npm run record:overture",
  "recordingSrc": "test-results/demo-overture-*/video.webm",
  "audiences": ["gis-students", "urban-planners", "site-selectors"],
  "videos": [
    {
      "id": "v1",
      "format": "demo",
      "audience": "gis-students",
      "title": "Download Overture Maps data in 30 seconds",
      "selectedScript": "demo_hook_b",
      "abTest": true,
      "youtubeIds": { "hook_a": null, "hook_b": null },
      "winnerHook": null,
      "status": "not-started"
    },
    {
      "id": "v2",
      "format": "problem-story",
      "audience": "urban-planners",
      "title": "Why GIS data access is still broken in 2026",
      "selectedScript": "problem_story_urban-planners",
      "abTest": false,
      "youtubeIds": { "main": null },
      "status": "not-started"
    },
    {
      "id": "v3",
      "format": "hook-teaser",
      "audience": "nocode-gis",
      "title": "2 billion places. Free. In your browser.",
      "selectedScript": "hook_teaser_wow",
      "abTest": false,
      "youtubeIds": { "main": null },
      "status": "not-started"
    },
    {
      "id": "v4",
      "format": "explainer",
      "audience": "gis-students",
      "title": "What is Overture Maps and why should you care?",
      "selectedScript": "explainer_overture-maps",
      "abTest": false,
      "youtubeIds": { "main": null },
      "status": "not-started"
    },
    {
      "id": "v5",
      "format": "problem-story",
      "audience": "site-selectors",
      "title": "Before you sign a lease, know your competition",
      "selectedScript": "problem_story_site-selectors",
      "abTest": false,
      "youtubeIds": { "main": null },
      "status": "not-started"
    },
    {
      "id": "v6",
      "format": "data-story",
      "audience": "nocode-gis",
      "title": "We mapped every café in Brisbane in under a minute",
      "selectedScript": "data_story_cafe-brisbane",
      "abTest": false,
      "youtubeIds": { "main": null },
      "status": "not-started"
    }
  ],
  "status": "in-progress"
}
```

---

## 18. Campaign Dashboard

A built-in Nuxt page at **`/promote`** provides a full GUI for managing all campaigns.
It is hidden from the public nav (header is suppressed on `/promote*`).

### What the dashboard shows

| Section | Description |
|---|---|
| **Stats row** | Total campaigns · videos planned · published · pending actions |
| **Pending Actions** | Yellow alert strip — all manual tasks for any phase currently `in-progress` across all campaigns |
| **Campaign cards** | Phase progress bar (8 phases), status pill, video count, expandable detail |
| **Phase checklist** | Click ▶ Start → ✓ Done per phase to advance its status in memory (future: persisted back to `campaign.json`) |
| **Video list** | Per-video: format tag, audience, A/B indicator, status pill |
| **Info panel** | URL, month, audiences, recording command per campaign |
| **New Campaign wizard** | Type → Name → Slug (auto-derived) → URL → Month → Audiences → POSTs to server API, creates folder + `campaign.json` |

### Architecture

| Layer | File | Role |
|---|---|---|
| Page | `app/pages/promote/index.vue` | Full SPA-style dashboard, scoped CSS, no external UI deps |
| API (read) | `server/api/promote/campaigns.get.ts` | Reads all `promote/campaigns/*/campaign.json` and returns array |
| API (create) | `server/api/promote/campaigns.post.ts` | Scaffolds new campaign folder + `campaign.json`, auto-assigns ID |
| Header suppression | `app/app.vue` | `isMapPage` extended to include `/promote*` |

### Creating a campaign

**Via dashboard (recommended):**
1. Open `http://localhost:3000/promote`
2. Click **New Campaign**
3. Fill in type / name / slug / URL / month / audiences → Submit
4. Folder + `campaign.json` created automatically at `promote/campaigns/{id}-{slug}/`

**Via CLI (alternative):**
```bash
npm run new:campaign
```
(Runs `scripts/new-campaign.mjs` — see §17)

### Phase status lifecycle

Each phase cycles: `not-started` → `in-progress` → `done`

When a phase is `in-progress`, its manual action items surface in the **Pending Actions** strip.
Mark a phase `done` once all tasks in that phase are complete.

---

# Part B — Campaigns

---

## Campaign 001 — Overture Downloader (March 2026)

> Type: `tool` · URL: `https://heenco.io/tools/overture-downloader`  
> Primary audience: GIS students & academics → Urban planners → Business site selectors  
> Folder: `promote/campaigns/001-overture-downloader/`

> Legend: ✅ Done · 🔄 In Progress · ⬜ Not Started · 🔧 Automated · 👤 Manual

### Phase 1 — Setup

| # | Task | Command / file | Type | Status |
|---|---|---|---|---|
| 1.1 | Create campaign folder + `campaign.json` | `promote/campaigns/001-overture-downloader/campaign.json` | 👤 | ✅ |
| 1.2 | Confirm FFmpeg installed | `ffmpeg -version` | 👤 | ✅ FFmpeg 8.0.1 |
| 1.3 | Build music library (5+ tracks, tag in `music-index.json`) | `promote/assets/music/` | 👤 | ⚠️ Placeholder only — needs real MP3s |
| 1.4 | Create thumbnail HTML templates | `promote/templates/thumbnail-{a,b,c}.html` | 👤 | ✅ a+b done |
| 1.5 | Create logo outro PNG in Canva → export transparent PNG | `promote/assets/logo_outro.png` | 👤 | ⬜ See §10a for steps |

### Phase 2 — Recording

| # | Task | Command / file | Type | Status |
|---|---|---|---|---|
| 2.1 | Run Playwright recording | `npm run record:overture` | 🔧 | ✅ |
| 2.2 | Confirm output WebM exists | `test-results/demo-overture-*/video.webm` | 🔧 | ✅ |
| 2.3 | Symlink/copy WebM to campaign folder | `promote/campaigns/001-overture-downloader/recording.webm` | 👤 | ✅ Auto-copied by `run.post.ts` |

### Phase 3 — Scripts for All Video Formats

| # | Task | Command | Type | Status |
|---|---|---|---|---|
| 3.1 | Generate scripts for all video formats + social captions | `node scripts/generate-script.mjs --campaign=001` | 🔧 | ✅ 7 files generated |
| 3.2 | Review all generated scripts | `promote/campaigns/001/scripts/*.md` | 👤 | ✅ |
| 3.3 | Select final script per video, record in `campaign.json → videos[].selectedScript` | Edit `campaign.json` | 👤 | ✅ `selectedScript` populated for v1, v2, v3 |

### Phase 4 — Music, Voiceover, Thumbnails

| # | Task | Command | Type | Status |
|---|---|---|---|---|
| 4.1 | Set up ElevenLabs free tier account | elevenlabs.io | 👤 | ⬜ Tomorrow |
| 4.2 | Add `ELEVENLABS_API_KEY` to `.env` | `.env` + `.env.example` | 👤 | ⬜ Tomorrow |
| 4.3 | Auto-select music per video (mood-matched) | `node scripts/select-music.mjs --campaign=001` | 🔧 | ✅ Ran (placeholder track selected — needs real library) |
| 4.4 | Generate voiceover for all videos (skip hook teaser V3) | `node scripts/generate-voiceover.mjs --campaign=001` | 🔧 | ⚠️ Blocked — needs `ELEVENLABS_API_KEY` |
| 4.5 | Generate SRT captions from voiceovers | `node scripts/generate-captions.mjs --campaign=001` | 🔧 | ✅ Synthetic SRT generated (v1.srt, v2.srt, v3.srt) |
| 4.6 | Generate thumbnails per video | `node scripts/generate-thumbnail.mjs --campaign=001` | 🔧 | ✅ 4 PNGs: thumb_v1_a, v1_b, v2_a, v3_a |
| 4.7 | Build B-roll clips for AI video formats | `node scripts/generate-broll.mjs --campaign=001` | 🔧 | ⬜ Script not built yet — Tomorrow |

### Phase 5 — Video Assembly (All Formats)

| # | Video | Format | Command | Type | Status |
|---|---|---|---|---|---|
| 5.1 | V1 Demo hook A | demo | `node scripts/process-video.mjs --campaign=001 --video=v1 --hook=a` | 🔧 | ⬜ Blocked — `process-video.mjs` not built |
| 5.2 | V1 Demo hook B | demo | `node scripts/process-video.mjs --campaign=001 --video=v1 --hook=b` | 🔧 | ⬜ |
| 5.3 | V2 Problem story — gis-students | problem-story | `node scripts/process-video.mjs --campaign=001 --video=v2` | 🔧 | ⬜ Also needs B-roll |
| 5.4 | V3 Hook teaser (text-only) | hook-teaser | `node scripts/process-video.mjs --campaign=001 --video=v3` | 🔧 | ⬜ |
| 5.5 | Spot-check all output videos | `promote/campaigns/001/output/` | 👤 | ⬜ |

### Phase 6 — YouTube Upload

| # | Task | Command / location | Type | Status |
|---|---|---|---|---|
| 6.1 | Google Cloud project + YouTube API + OAuth setup | console.cloud.google.com | 👤 | ⬜ |
| 6.2 | Install dependencies | `npm install googleapis @google-cloud/local-auth puppeteer` | 👤 | ⬜ |
| 6.3 | Upload V1 demo hooks A+B as unlisted + thumbnails (A/B test) | `node scripts/youtube-upload.mjs --campaign=001 --video=v1` | 🔧 | ⬜ Script not built |
| 6.4 | Upload V2–V3 as unlisted directly | `node scripts/youtube-upload.mjs --campaign=001` | 🔧 | ⬜ |
| 6.5 | Open YouTube Studio → Run experiment on V1 only | YouTube Studio UI | 👤 | ⬜ |
| 6.6 | Wait 7–14 days | — | ⏳ | ⬜ |
| 6.7 | Check V1 stats + auto-flag winner | `node scripts/youtube-stats.mjs --campaign=001` | 🔧 | ⬜ Script not built |
| 6.8 | Publish all videos to public (winner hook for V1, main for others) | `node scripts/youtube-publish-winner.mjs --campaign=001` | 🔧 | ⬜ Script not built |

---

## Session Log

### Session 1 — 2026-03-11 ✅ Done

| Area | What was done |
|---|---|
| Playbook | `promote.md` created and iterated — 8 major revisions in one session |
| Infrastructure | Campaign Dashboard built at `/promote` (Nuxt page + 3 server API routes) |
| Infrastructure | New Campaign wizard with format multi-select and auto-defaults by content type |
| Infrastructure | `server/api/promote/run.post.ts` — script runner, action whitelist, 15-min timeout, WebM auto-copy |
| Campaign 001 | Created via dashboard wizard — folder + `campaign.json` scaffolded |
| Phase 2 | ✅ `recording.webm` captured via Playwright and auto-copied to campaign folder |
| Phase 3 | ✅ 7 script files generated by Groq (`generate-script.mjs`) |
| Phase 4 | ✅ Captions: 3 synthetic SRT files generated (v1.srt, v2.srt, v3.srt) |
| Phase 4 | ✅ Thumbnails: 4 PNGs generated (thumb_v1_a, v1_b, v2_a, v3_a) |
| Phase 4 | ⚠️ Voiceover: `generate-voiceover.mjs` built but blocked — needs `ELEVENLABS_API_KEY` |
| Phase 4 | ⚠️ Music: `select-music.mjs` ran — placeholder track only, real library needed |
| Toolchain | Decided: Kling AI v2 for B-roll (problem-story/explainer/data-story) + Playwright+FFmpeg for demo/hook-teaser |
| Toolchain | Documented Veo 3 (Vertex AI) as secondary option with native-audio advantage |

**Scripts built this session:**
- `scripts/generate-script.mjs` ✅
- `scripts/generate-voiceover.mjs` ✅ (blocked on API key)
- `scripts/generate-captions.mjs` ✅
- `scripts/select-music.mjs` ✅
- `scripts/generate-thumbnail.mjs` ✅
- `scripts/generate-assets.mjs` ✅ (orchestrator for Phase 4)

**Templates + assets created:**
- `promote/templates/thumbnail-a.html` ✅
- `promote/templates/thumbnail-b.html` ✅
- `promote/assets/music-index.json` ✅ (placeholder — needs real tracks)

---

### Session 2 — Tomorrow · Priority Order

> Legend: 🔑 Requires API key/credential · 🛠️ Requires new script · ⚡ Quick win (< 15 min) · 👤 Manual

| # | Tag | Task | Notes |
|---|---|---|---|
| 1 | ✅ | `ELEVENLABS_API_KEY` was already in `.env` — voiceovers generated | v1.mp3 (1.3MB), v2.mp3 (0.9MB) confirmed |
| 2 | 👤⚡ | Create `promote/assets/logo_outro.png` in Canva | 1280×720 transparent PNG — see §10a for step-by-step |
| 3 | 🛠️ | Build `scripts/process-video.mjs` — FFmpeg assembly (Phase 5) | Demo: WebM + voiceover + music + SRT → MP4. Hook-teaser: FFmpeg drawtext |
| 4 | ⚡ | Add real music tracks to `promote/assets/music/` | Download 5+ CC0 tracks from Pixabay Music, update `music-index.json` |
| 5 | 🛠️🔑 | Build `scripts/generate-broll.mjs` + get Kling API keys | JWT → POST text2video → poll → download MP4 to `broll/` |
| 6 | 🛠️ | Build `scripts/generate-ai-image.mjs` (FLUX.1 thumbnail backgrounds) | See §10a — unlocks photographic backgrounds for thumbnail templates |
| 7 | (deferred) | Build YouTube upload scripts (`youtube-upload.mjs` etc.) | After Phase 5 is producing real MP4 output |

**Environment variables to add to `.env`:**
```
KLING_ACCESS_KEY_ID=       # klingai.com → API → Access Keys
KLING_SECRET_KEY=          # klingai.com → API → Access Keys
FAL_API_KEY=               # fal.ai → Dashboard → API Keys (for FLUX.1 image gen)
```

---

### Phase 7 — Cross-platform Distribution

| # | Task | Command / location | Type | Status |
|---|---|---|---|---|
| 7.1 | Sign up for Metricool (free tier) | metricool.com | 👤 | ⬜ |
| 7.2 | Connect: Instagram, LinkedIn, Twitter/X | Metricool dashboard | 👤 | ⬜ |
| 7.3 | Upload V1 winner 9:16 → Reels, Shorts, TikTok | Metricool UI | 👤 | ⬜ |
| 7.4 | Upload V3 hook teaser 9:16 → TikTok, Reels (leads traffic to V1) | Metricool UI | 👤 | ⬜ |
| 7.5 | Upload V2 problem story 16:9 → LinkedIn (urban planners) | Metricool UI | 👤 | ⬜ |
| 7.6 | Upload V5 problem story 16:9 → LinkedIn (site selectors) | Metricool UI | 👤 | ⬜ |
| 7.7 | Upload V6 data story 9:16 → TikTok, Twitter/X | Metricool UI | 👤 | ⬜ |
| 7.8 | Paste AI-generated captions per platform, schedule staggered (3–5 days apart) | Metricool UI | 👤 | ⬜ |

### Phase 8 — Stagger & Monitor

| # | Task | Status |
|---|---|---|
| 8.1 | Post V3 hook teaser first (generates curiosity before demo lands) | ⬜ |
| 8.2 | Post V2/V5 problem stories to LinkedIn 2–3 days later | ⬜ |
| 8.3 | Post V1 demo winner publicly after A/B resolves | ⬜ |
| 8.4 | Post V4 explainer + V6 data story in week 3 | ⬜ |
| 8.5 | Check analytics weekly: `node scripts/youtube-stats.mjs --campaign=001` | ⬜ |
| 8.6 | Record learnings in Changelog | ⬜ |

---

## Campaign Template — Copy for New Campaigns

```markdown
## Campaign {ID} — {Name} ({Month YYYY})

> Type: `{tool|map|article|video}` · URL: `https://heenco.io/{type}/{slug}`
> Primary audience: {audience-id}
> Folder: `promote/campaigns/{id}-{slug}/`

### Phase 1 — Setup
- [ ] 1.1 Create `campaign.json`
- [ ] 1.2 Confirm recording source exists

### Phase 2 — Recording
- [ ] 2.1 `npm run record:{slug}` (tool/map) OR place manual recording

### Phase 3 — Script, Music, Voiceover, Thumbnails
- [ ] 3.1 `node scripts/generate-script.mjs --campaign={id}`
- [ ] 3.2 Review + select 2 hooks (manual gate)
- [ ] 3.3 `node scripts/select-music.mjs --campaign={id}`
- [ ] 3.4 `node scripts/generate-voiceover.mjs --campaign={id}`
- [ ] 3.5 `node scripts/generate-captions.mjs --campaign={id}`
- [ ] 3.6 `node scripts/generate-thumbnail.mjs --campaign={id}`

### Phase 4 — Video Processing
- [ ] 4.1 `node scripts/process-video.mjs --campaign={id} --hook=a`
- [ ] 4.2 `node scripts/process-video.mjs --campaign={id} --hook=b`
- [ ] 4.3 Spot-check outputs

### Phase 5 — YouTube A/B
- [ ] 5.1 `node scripts/youtube-upload.mjs --campaign={id}`
- [ ] 5.2 YouTube Studio → Run experiment (manual)
- [ ] 5.3 Wait 7–14 days
- [ ] 5.4 `node scripts/youtube-stats.mjs --campaign={id}`
- [ ] 5.5 `node scripts/youtube-publish-winner.mjs --campaign={id} --hook={x}`

### Phase 6 — Distribution
- [ ] 6.1 Upload winner cuts to Metricool
- [ ] 6.2 Schedule posts with AI-generated captions
```

---

## Session Log

### Session 1 — 2026-03-11 ✅ Done

| Area | What was done |
|---|---|
| Playbook | `promote.md` created and iterated — 8 major revisions |
| Infrastructure | Dashboard built at `/promote` (Nuxt page + 3 server API routes) |
| Infrastructure | New Campaign wizard with format multi-select and auto-defaults |
| Infrastructure | `server/api/promote/run.post.ts` — script runner, whitelist, 15-min timeout, WebM auto-copy |
| Campaign 001 | Created via dashboard wizard — folder + `campaign.json` scaffolded |
| Phase 2 | ✅ `recording.webm` captured via Playwright, auto-copied to campaign folder |
| Phase 3 | ✅ 7 script files generated by Groq (`generate-script.mjs`) |
| Phase 4 | ✅ Captions: 3 synthetic SRT files generated |
| Phase 4 | ✅ Thumbnails: 4 PNGs generated (thumb_v1_a, v1_b, v2_a, v3_a) |
| Phase 4 | ⚠️ Voiceover: `generate-voiceover.mjs` built but blocked — needs `ELEVENLABS_API_KEY` |
| Phase 4 | ⚠️ Music: `select-music.mjs` ran — placeholder track only, real library needed |
| Toolchain | Decided: Kling AI v2 for B-roll (problem-story/explainer/data-story) + Playwright+FFmpeg for demo/hook-teaser |
| Toolchain | Documented: Veo 3 (Vertex AI) as secondary option |

**Scripts built this session:**
- `scripts/generate-script.mjs` ✅
- `scripts/generate-voiceover.mjs` ✅ (blocked on API key)
- `scripts/generate-captions.mjs` ✅
- `scripts/select-music.mjs` ✅
- `scripts/generate-thumbnail.mjs` ✅
- `scripts/generate-assets.mjs` ✅ (orchestrator)

**Templates + assets created:**
- `promote/templates/thumbnail-a.html` ✅
- `promote/templates/thumbnail-b.html` ✅
- `promote/assets/music-index.json` ✅ (placeholder — needs real tracks)

---

### Session 2 — Tomorrow · Priority Order

> Legend: 🔑 Requires API key/credential · 🛠️ Requires new script · ⚡ Quick win (< 15 min) · 👤 Manual

| # | Priority | Task | Notes |
|---|---|---|---|
| 1 | ✅ | `ELEVENLABS_API_KEY` was already in `.env` — voiceovers confirmed | v1.mp3 (1.3MB), v2.mp3 (0.9MB) in `audio/` |
| 2 | 👤⚡ | Create `promote/assets/logo_outro.png` in Canva | 1280×720 transparent PNG — see §10a for step-by-step |
| 3 | 🛠️ | Build `scripts/process-video.mjs` — FFmpeg assembly (Phase 5) | Demo: WebM + voiceover + music + SRT → MP4; Hook-teaser: FFmpeg drawtext |
| 4 | ⚡ | Add real music tracks to `promote/assets/music/` | Download 5+ CC0 tracks from Pixabay Music, update `music-index.json` |
| 5 | 🛠️🔑 | Build `scripts/generate-broll.mjs` + get Kling API keys | JWT → POST text2video → poll → download MP4 to `broll/` |
| 6 | 🛠️ | Build `scripts/generate-ai-image.mjs` (FLUX.1 thumbnail backgrounds) | See §10a — unlocks photographic backgrounds for thumbnail templates |
| 7 | (deferred) | Build YouTube upload scripts (`youtube-upload.mjs` etc.) | After Phase 5 is producing real MP4 output |

**Environment variables to add to `.env`:**
```
KLING_ACCESS_KEY_ID=       # klingai.com → API → Access Keys
KLING_SECRET_KEY=          # klingai.com → API → Access Keys
FAL_API_KEY=               # fal.ai → Dashboard → API Keys (for FLUX.1 image gen)
```

---

## Changelog

| Date | Change |
|---|---|
| 2026-03-11 | Playbook created. Decisions resolved. Campaign 001 planned. |
| 2026-03-11 | Redesigned as general playbook (tool/map/article/video). Automation expanded: thumbnail generation (Puppeteer), music selection (Groq mood analysis), YouTube stats + winner detection (Analytics API), campaign.json schema added. |
| 2026-03-11 | Added video formats system (demo, problem story, explainer, hook teaser, data story). Pipeline now generates 6 distinct videos per campaign — only 1 requires a screen recording. campaign.json updated with `videos[]` array. |
| 2026-03-11 | Built Campaign Dashboard (`/promote`): live Nuxt page with campaign list, phase checklist, video tracking, pending actions, New Campaign wizard, server API routes (`campaigns.get.ts`, `campaigns.post.ts`). |
| 2026-03-11 | Built `scripts/generate-script.mjs`: Groq-powered script generator for all 5 video formats. Generates hook A+B for demo, problem story, explainer, hook teaser, data story, and social captions per video. Wired to dashboard ▶ button on Phase 3. |
| 2026-03-11 | Built Phase 4 asset pipeline: `generate-voiceover.mjs` (ElevenLabs `eleven_turbo_v2_5`, voice per audience), `generate-captions.mjs` (Groq Whisper → SRT, falls back to synthetic SRT from script timestamps), `select-music.mjs` (Groq mood classification → music-index.json matching), `generate-thumbnail.mjs` (Playwright Chromium → 1280×720 PNG, 2 templates). Orchestrated by `generate-assets.mjs`. Dashboard Phase 4 ▶ now wired to `generate-assets`. Timeout raised to 15 min. |
| 2026-03-11 | Added §10 Video Generation Toolchain: Decision to use Playwright + FFmpeg (not external AI video APIs). Documented per-format visual generation strategy and Playwright→FFmpeg slide pipeline. Added format multi-select to New Campaign wizard — formats field drives `videos[]` scaffolding instead of type-based hardcoding. Updated `campaigns.post.ts` scaffolder accordingly. |
| 2026-03-11 | **Revised §10**: Upgraded decision to hybrid approach — Kling AI (v2) for problem-story, explainer, data-story B-roll; Playwright+FFmpeg kept for demo and hook-teaser. Documented Kling REST API (JWT auth, text2video endpoint, polling pattern, ~$0.14/5s clip). Documented Veo 3 via Vertex AI (advantage: native audio generation, requires allowlist). Added `generate-broll.mjs` to plan (not yet built). Updated assembly table §11. Added broll/ folder to campaign structure. Estimated ~$2/campaign in AI video credits. |
| 2026-03-11 | **Session 1 wrap-up**: Updated Campaign 001 phase checklist with actual statuses. Added Session Log section (what was done + tomorrow's priority plan). Phase 2 ✅, Phase 3 ✅, Phase 4 partially done (captions + thumbnails ✅, voiceover blocked on ElevenLabs key, B-roll blocked on generate-broll.mjs). Phases 5–8 not started. |
| 2026-03-12 | Added **§10a AI Static Image Generation**: FLUX.1 Pro (fal.ai), DALL-E 3, Ideogram 2.0, Midjourney v7, Canva AI compared by use case. Documented `generate-ai-image.mjs` (planned). Clarified logo_outro.png is a **Canva manual task** (not code), added Canva step-by-step. Updated Global Decisions `Branding` row, Campaign 001 Phase 1.5, and both Session 2 priority plans. Discovered ElevenLabs key was already set — voiceovers for v1+v2 already generated (confirmed). |