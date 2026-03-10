/**
 * GET /api/spatial-search/recommend?q=<query>&layers=<json>
 *
 * Uses Groq (Llama 3.3 70B, free tier: 14,400 req/day) to reason about
 * candidate layers and produce plain-English recommendations.
 * e.g. "Use Layer A: it has 4× more features and its extent matches Brisbane"
 *
 * layers = JSON-encoded SpatialLayerResult[]
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event) as { q?: string; layers?: string }
  if (!query.q?.trim() || !query.layers) {
    throw createError({ statusCode: 400, message: 'q and layers parameters are required' })
  }

  const config = useRuntimeConfig()
  if (!config.groqApiKey) {
    throw createError({ statusCode: 500, message: 'GROQ_API_KEY not configured' })
  }

  let layers: any[]
  try {
    layers = JSON.parse(query.layers)
    if (!Array.isArray(layers)) throw new Error()
  } catch {
    throw createError({ statusCode: 400, message: 'layers must be a JSON array' })
  }

  const layerSummary = layers.map((l, i) =>
    `[${i + 1}] ${l.name} (${l.source})\n` +
    `    URL: ${l.url}\n` +
    `    Features: ${l.featureCount ?? 'unknown'}\n` +
    `    Description: ${l.description ?? 'none'}\n` +
    `    Confidence: ${l.confidence}`
  ).join('\n\n')

  const prompt = `The user searched for: "${query.q}"

These candidate layers were found:

${layerSummary}

For each layer, provide a brief 1-sentence recommendation or caveat. 
If two layers are duplicates or very similar, say which to prefer and why.
Format your response as a JSON object mapping layer index (1-based) to a recommendation string:
{ "1": "Best match — official NSW government source with 14,203 features.", "2": "Avoid — appears to be a legacy copy last updated 2019." }`

  try {
    const res = await $fetch<any>('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a helpful spatial data consultant. Be concise and precise. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      },
    })

    const raw = res.choices?.[0]?.message?.content ?? '{}'
    let recommendations: Record<string, string> = {}
    try { recommendations = JSON.parse(raw) } catch { /* best-effort */ }
    return { recommendations }
  } catch (e: any) {
    throw createError({ statusCode: 502, message: `Groq API error: ${e?.message}` })
  }
})
