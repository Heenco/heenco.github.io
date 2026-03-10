/**
 * GET /api/spatial-search/discover?q=<query>
 *
 * Uses Perplexity Sonar (web search) to find real ArcGIS REST layer endpoints
 * matching the query, then probes each URL to verify it is alive.
 *
 * Strategy:
 *   1. Ask Sonar to find ArcGIS endpoint URLs (explicit spatial query)
 *   2. Sonar may return prose - regex-extract all ArcGIS URLs from the response
 *   3. Also try JSON parse in case the model cooperates
 *   4. Probe each discovered URL to enrich with metadata
 */

export interface SpatialLayerResult {
  name: string
  url: string
  serviceType: string
  layerId: number | null
  description: string
  source: string
  sourceUrl: string
  confidence: 'high' | 'medium' | 'low'
  alive?: boolean
  featureCount?: number | null
  bbox?: { xmin: number; ymin: number; xmax: number; ymax: number } | null
  fields?: string[]
}

// Matches ArcGIS REST layer URLs ending in /FeatureServer/N or /MapServer/N
const ESRI_URL_RE = /https?:\/\/[^\s"'<>\]\)]+\/(?:FeatureServer|MapServer)\/?\d*/gi

const SYSTEM_PROMPT = `You are a GIS data discovery assistant.
The user wants to find publicly accessible ArcGIS REST FeatureServer or MapServer endpoints for a specific topic and location.
Search the web for exact ArcGIS REST service URLs. Focus on government portals (.gov.au, .gov, councils, state agencies).
List every ArcGIS REST URL you find - include full URLs ending in /FeatureServer/0 or /MapServer/16 etc.
Do NOT describe what the data contains - just list the URL, the organisation name, and the layer name.`

function extractEsriUrls(text: string): string[] {
  const matches = [...text.matchAll(ESRI_URL_RE)].map(m => m[0].replace(/[.,;:)\]]+$/, ''))
  return [...new Set(matches)]
}

function tryParseResults(raw: string): SpatialLayerResult[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* fall through */ }
  return []
}

function urlToResult(url: string): SpatialLayerResult {
  const typeMatch = url.match(/(FeatureServer|MapServer)/i)
  const layerMatch = url.match(/\/(FeatureServer|MapServer)\/?(\d+)/i)
  const serviceType = typeMatch?.[1] ?? 'FeatureServer'
  const layerId = layerMatch?.[2] != null ? parseInt(layerMatch[2]) : null
  const parts = url.split('/arcgis/rest/services/').pop()?.split('/') ?? []
  const name = parts.slice(0, -2).join(' > ') || url
  return {
    name,
    url,
    serviceType,
    layerId,
    description: '',
    source: new URL(url).hostname,
    sourceUrl: url,
    confidence: 'medium',
  }
}

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event) as { q?: string }
  if (!q?.trim()) {
    throw createError({ statusCode: 400, message: 'q parameter is required' })
  }

  const config = useRuntimeConfig()
  if (!config.perplexityApiKey) {
    throw createError({ statusCode: 500, message: 'PERPLEXITY_API_KEY not configured' })
  }

  const spatialQuery = `Find ArcGIS REST FeatureServer or MapServer URLs for "${q.trim()}". Search government portals, data.gov.au, and ArcGIS Online. List exact endpoint URLs including full paths like /arcgis/rest/services/.../FeatureServer/0`

  let raw = ''
  try {
    const res = await $fetch<any>('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: 'sonar',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: spatialQuery },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      },
    })
    raw = res.choices?.[0]?.message?.content ?? ''
  } catch (e: any) {
    throw createError({ statusCode: 502, message: `Perplexity API error: ${e?.message}` })
  }

  let results: SpatialLayerResult[] = tryParseResults(raw)

  if (results.length === 0) {
    const urls = extractEsriUrls(raw)
    results = urls.map(urlToResult)
  }

  if (results.length === 0) {
    console.warn('[spatial-search] No URLs extracted. Raw response:', raw.slice(0, 800))
    return { results: [], raw }
  }

  const probed: SpatialLayerResult[] = await Promise.all(
    results.slice(0, 10).map(async (r): Promise<SpatialLayerResult> => {
      if (!r.url) return r
      try {
        const meta: Record<string, any> | null = await $fetch<Record<string, any>>(`${r.url}?f=json`, { timeout: 8000 }).catch(() => null)
        if (!meta || meta['error']) return { ...r, alive: false }

        let featureCount: number | null = null
        try {
          const countRes: Record<string, any> = await $fetch<Record<string, any>>(`${r.url}/query`, {
            query: { where: '1=1', returnCountOnly: 'true', f: 'json' },
            timeout: 6000,
          })
          featureCount = countRes['count'] ?? null
        } catch { /* optional */ }

        const extent: Record<string, any> | null = meta['extent'] ?? null
        const bbox: { xmin: number; ymin: number; xmax: number; ymax: number } | null = extent ? {
          xmin: Number(extent['xmin']), ymin: Number(extent['ymin']),
          xmax: Number(extent['xmax']), ymax: Number(extent['ymax']),
        } : null

        return {
          ...r,
          alive: true,
          name: (meta['name'] as string) || r.name || r.url,
          description: r.description || (meta['description'] as string) || '',
          confidence: featureCount != null ? 'high' : 'medium',
          featureCount,
          bbox,
          fields: ((meta['fields'] ?? []) as any[]).map((f: any) => f.name as string),
        }
      } catch {
        return { ...r, alive: false }
      }
    })
  )

  const live: SpatialLayerResult[] = probed.filter((r: SpatialLayerResult) => r.alive !== false)
  return { results: live, raw }
})

