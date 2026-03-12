import { mkdir, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

interface NewCampaignBody {
  type: 'tool' | 'map' | 'article' | 'video'
  name: string
  slug: string
  url: string
  month: string
  audiences: string[]
  formats: string[]
}

const DEFAULT_FORMATS: Record<string, string[]> = {
  tool:    ['demo', 'problem-story', 'hook-teaser'],
  map:     ['demo', 'problem-story', 'hook-teaser'],
  article: ['explainer', 'problem-story', 'hook-teaser'],
  video:   ['explainer', 'hook-teaser'],
}

const PHASE_DEFAULTS = {
  '1_setup': 'not-started',
  '2_recording': 'not-started',
  '3_scripts': 'not-started',
  '4_assets': 'not-started',
  '5_assembly': 'not-started',
  '6_youtube': 'not-started',
  '7_distribution': 'not-started',
  '8_reporting': 'not-started',
}

export default defineEventHandler(async (event) => {
  const body = await readBody<NewCampaignBody>(event)

  const { type, name, slug, url, month, audiences, formats } = body

  if (!type || !name || !slug || !url || !month) {
    throw createError({ statusCode: 400, message: 'Missing required fields: type, name, slug, url, month' })
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw createError({ statusCode: 400, message: 'Slug must be lowercase letters, numbers, and hyphens only' })
  }

  const campaignsDir = join(process.cwd(), 'promote', 'campaigns')

  if (!existsSync(campaignsDir)) {
    await mkdir(campaignsDir, { recursive: true })
  }

  // Determine next campaign ID
  let existingIds: number[] = []
  try {
    const entries = await readdir(campaignsDir)
    existingIds = entries
      .map(e => parseInt(e.split('-')[0] ?? '', 10))
      .filter(n => !isNaN(n))
  } catch {
    // ignore
  }

  const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1
  const idPadded = String(nextId).padStart(3, '0')
  const folderName = `${idPadded}-${slug}`
  const campaignDir = join(campaignsDir, folderName)
  const strategyFile = `promote/campaigns/${folderName}/VideoStrategy.json`

  if (existsSync(campaignDir)) {
    throw createError({ statusCode: 409, message: `Campaign folder already exists: ${folderName}` })
  }

  // Create folder structure
  const subfolders = ['scripts', 'output', 'audio', 'thumbnails', 'captions', 'broll']
  await mkdir(campaignDir, { recursive: true })
  for (const sub of subfolders) {
    await mkdir(join(campaignDir, sub), { recursive: true })
  }

  // Build videos array from selected formats (or fall back to type defaults)
  const selectedFormats = (formats && formats.length > 0)
    ? formats
    : (DEFAULT_FORMATS[type] ?? DEFAULT_FORMATS.tool ?? [])
  const defaultVideos = buildDefaultVideos(type, slug, audiences ?? [], selectedFormats)

  const campaign = {
    id: idPadded,
    type,
    name,
    slug,
    url,
    month,
    recordingCmd: type === 'tool' || type === 'map' ? `npm run record:${slug.split('-')[0]}` : null,
    recordingSrc: type === 'tool' || type === 'map' ? `test-results/demo-${slug}-*/video.webm` : null,
    audiences: audiences ?? [],
    phases: { ...PHASE_DEFAULTS },
    pendingActions: [],
    videos: defaultVideos,
    status: 'not-started',
    createdAt: new Date().toISOString(),
    strategyFile,
  }

  await writeFile(
    join(campaignDir, 'campaign.json'),
    JSON.stringify(campaign, null, 2),
    'utf-8'
  )

  await writeFile(
    join(campaignDir, 'VideoStrategy.json'),
    JSON.stringify({
      tool: name,
      url,
      audiences: [],
      videos: [],
    }, null, 2),
    'utf-8'
  )

  return campaign
})

function buildDefaultVideos(type: string, _slug: string, audiences: string[], formats: string[]) {
  const primaryAudience = audiences?.[0] ?? 'general'

  const videos = formats.map((format, i) => {
    // hook-teaser targets broad audience; everything else uses primary audience
    const audience = format === 'hook-teaser' ? 'general' : (audiences?.[i] ?? primaryAudience)
    const isDemo   = format === 'demo'

    return {
      id: `v${i + 1}`,
      format,
      audience,
      title: '',
      selectedScript: null,
      abTest: isDemo, // A/B test on demo only (hook_a vs hook_b)
      youtubeIds: isDemo ? { hook_a: null, hook_b: null } : { main: null },
      ...(isDemo ? { winnerHook: null } : {}),
      status: 'not-started',
    }
  })

  return videos
}
