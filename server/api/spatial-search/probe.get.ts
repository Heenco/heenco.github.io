/**
 * GET /api/spatial-search/probe?url=<esri-layer-url>
 *
 * Validates that a given ArcGIS REST layer URL is alive and returns
 * basic metadata: name, type, feature count, extent.
 */
export default defineEventHandler(async (event) => {
  const { url } = getQuery(event) as { url?: string }

  if (!url || !url.startsWith('http')) {
    throw createError({ statusCode: 400, message: 'url parameter is required' })
  }

  // Normalise — strip trailing slash / layer id so we always hit the layer endpoint
  const cleanUrl = url.replace(/\/+$/, '')

  try {
    const metaUrl = `${cleanUrl}?f=json`
    const res: Record<string, any> | null = await $fetch<Record<string, any>>(metaUrl, { timeout: 8000 }).catch(() => null)

    if (!res || res['error']) {
      return { alive: false, url: cleanUrl }
    }

    // Try to get feature count cheaply
    let featureCount: number | null = null
    try {
      const countRes: Record<string, any> = await $fetch<Record<string, any>>(`${cleanUrl}/query`, {
        query: { where: '1=1', returnCountOnly: 'true', f: 'json' },
        timeout: 6000,
      })
      featureCount = countRes['count'] ?? null
    } catch { /* count is optional */ }

    const extent = res.extent ?? null
    const bbox = extent ? {
      xmin: extent.xmin,
      ymin: extent.ymin,
      xmax: extent.xmax,
      ymax: extent.ymax,
      wkid: extent.spatialReference?.wkid ?? 4326,
    } : null

    return {
      alive: true,
      url: cleanUrl,
      name: res.name ?? res.serviceName ?? null,
      type: res.type ?? res.serviceType ?? null,
      geometryType: res.geometryType ?? null,
      description: res.description ?? null,
      featureCount,
      bbox,
      fields: (res.fields ?? []).map((f: any) => f.name),
    }
  } catch (e: any) {
    return { alive: false, url: cleanUrl, error: e?.message }
  }
})
