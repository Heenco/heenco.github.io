/**
 * POST /api/property/analyse
 *
 * Body: { address: string; suburb: string; state: string; postcode: string; lat: number; lng: number }
 *
 * Runs three Perplexity sonar-pro agents in parallel:
 *   A — Suburb profile (demographics, character, council, zoning)
 *   B — Market metrics (median price, growth, rental yield, days on market, vacancy)
 *   C — Recent sales (last 10–15 sales with addresses, prices, dates, links)
 *
 * Then streams a structured SSE report assembled by a fourth reasoning call.
 *
 * SSE event types:
 *   agent:start   { id }
 *   agent:done    { id }
 *   metric        { label, value, trend?, sub?, source, confidence }
 *   sale          { address, price, date, bed, bath, type, url? }
 *   stream:start  { section }   – narrative text is about to stream
 *   stream:chunk  { section, text }
 *   stream:end    { section }
 *   verdict       { headline, rating, buyerProfiles, risks }
 *   error         { message }
 *   done          {}
 */

import { defineEventHandler, readBody, setHeader, sendStream } from 'h3'
import { Readable } from 'stream'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnalyseBody {
  address: string
  suburb: string
  state: string
  postcode: string
  lat: number
  lng: number
}

interface AgentResult {
  id: string
  raw: string
  citations?: string[]
}

// ── Perplexity helper ─────────────────────────────────────────────────────────
async function callPerplexity(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<{ content: string; citations: string[] }> {
  const res = await $fetch<any>('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature ?? 0.15,
      max_tokens: options.maxTokens ?? 2000,
    },
  })
  return {
    content: res.choices?.[0]?.message?.content ?? '',
    citations: res.citations ?? [],
  }
}

// ── Streaming Perplexity helper ───────────────────────────────────────────────
async function streamPerplexity(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void,
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<void> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1500,
    }),
  })

  if (!res.ok || !res.body) throw new Error(`Perplexity stream error ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const data = line.startsWith('data: ') ? line.slice(6).trim() : null
      if (!data || data === '[DONE]') continue
      try {
        const j = JSON.parse(data)
        const text = j.choices?.[0]?.delta?.content
        if (text) onChunk(text)
      } catch {}
    }
  }
}

// ── Agent prompts ─────────────────────────────────────────────────────────────
const METRIC_SYSTEM = `You are a precise property data extraction agent for Australian real estate.
Extract ONLY factual, numeric data. Return ONLY valid JSON matching the exact schema provided.
If a data point is unavailable, use null. Do not add commentary or markdown fences.`

const PROFILE_SYSTEM = `You are an Australian suburb research agent.
Return ONLY valid JSON. No markdown, no explanation outside the JSON.`

const SALES_SYSTEM = `You are an Australian property sales data agent.
Find recent property sales. Return ONLY valid JSON with an array of sale objects.
Include real.com.au or domain.com.au listing URLs where possible.`

const ASSEMBLER_SYSTEM = `You are a senior Australian property investment advisor writing a concise briefing.
You will be given structured data from three research agents. Synthesise this into a clear, direct narrative.
Write in present tense, be specific (use the numbers you're given), and identify both opportunities and risks.
Do not hedge excessively — give a clear view. Aim for 200–280 words total across all sections.`

// ── SSE helper ────────────────────────────────────────────────────────────────
function sseEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const body = await readBody<AnalyseBody>(event)
  const { address, suburb, state, postcode } = body

  const config = useRuntimeConfig()
  const apiKey = config.perplexityApiKey as string
  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'PERPLEXITY_API_KEY not configured' })
  }

  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  const readable = new Readable({ read() {} })
  sendStream(event, readable)

  const push = (type: string, data: unknown) => {
    readable.push(sseEvent(type, data))
  }

  // ── Run agents in parallel ─────────────────────────────────────────────────
  push('agent:start', { id: 'profile' })
  push('agent:start', { id: 'market' })
  push('agent:start', { id: 'sales' })

  const suburbKey = `${suburb}, ${state} ${postcode}`

  const [profileResult, marketResult, salesResult] = await Promise.allSettled([

    // Agent A: Suburb profile
    callPerplexity(apiKey, PROFILE_SYSTEM, `
Return a JSON object for the suburb "${suburbKey}" in Australia.
Schema:
{
  "overview": "2–3 sentence description of the suburb character and demographics",
  "council": "local council name",
  "distanceFromCBD": "distance and direction from nearest major CBD, e.g. 12km south of Brisbane CBD",
  "populationEstimate": number or null,
  "medianHouseholdIncome": number or null,
  "ownerOccupierPct": number or null,
  "medianAge": number or null,
  "growthDrivers": ["list of key factors driving property demand"],
  "zoning": "dominant zoning type e.g. Residential R2"
}`, { maxTokens: 600 }),

    // Agent B: Market metrics
    callPerplexity(apiKey, METRIC_SYSTEM, `
Return a JSON object with current property market data for "${suburbKey}", Australia.
Schema:
{
  "medianHousePrice": number or null,
  "medianUnitPrice": number or null,
  "priceGrowth12m": number or null,
  "priceGrowth5yr": number or null,
  "priceGrowth10yr": number or null,
  "rentalYieldHouse": number or null,
  "rentalYieldUnit": number or null,
  "medianWeeklyRentHouse": number or null,
  "daysOnMarket": number or null,
  "annualSalesVolume": number or null,
  "vacancyRate": number or null,
  "auctionClearanceRate": number or null,
  "supplyDemandRatio": "buyer's market | balanced | seller's market or null",
  "dataAsOf": "month and year of data, e.g. Feb 2025"
}`, { maxTokens: 600 }),

    // Agent C: Recent sales
    callPerplexity(apiKey, SALES_SYSTEM, `
Find the 10 most recent property sales in "${suburbKey}", Australia.
Return a JSON array. Each element:
{
  "address": "street address",
  "price": number,
  "date": "YYYY-MM-DD or approximate month-year",
  "bedrooms": number or null,
  "bathrooms": number or null,
  "type": "House | Unit | Townhouse | Land | Other",
  "url": "real.com.au or domain.com.au sold listing URL if found, else null"
}
Sort by date descending (most recent first).`, { maxTokens: 900 }),

  ])

  // ── Parse agent results ────────────────────────────────────────────────────
  function safeJSON(result: PromiseSettledResult<{ content: string; citations: string[] }>, agentId: string) {
    if (result.status === 'rejected') {
      push('error', { agent: agentId, message: String(result.reason) })
      return null
    }
    try {
      // Strip markdown fences if present
      const text = result.value.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      // Extract first JSON object or array
      const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
      return match ? JSON.parse(match[0]) : null
    } catch {
      return null
    }
  }

  const profile = safeJSON(profileResult, 'profile')
  const market  = safeJSON(marketResult, 'market')
  const sales   = safeJSON(salesResult, 'sales')

  push('agent:done', { id: 'profile' })
  push('agent:done', { id: 'market' })
  push('agent:done', { id: 'sales' })

  // ── Emit structured metrics ────────────────────────────────────────────────
  function formatPrice(n: number | null) {
    if (!n) return null
    return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1000).toFixed(0)}k`
  }
  function formatPct(n: number | null) {
    if (n === null || n === undefined) return null
    return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
  }
  function trend(n: number | null): 'up' | 'down' | 'flat' | undefined {
    if (n === null || n === undefined) return undefined
    return n > 0.5 ? 'up' : n < -0.5 ? 'down' : 'flat'
  }

  if (market) {
    const metrics = [
      { label: 'Median House Price', value: formatPrice(market.medianHousePrice), trend: trend(market.priceGrowth12m), sub: market.dataAsOf ?? undefined, source: 'Perplexity / Domain', confidence: 'medium' },
      { label: 'Median Unit Price',  value: formatPrice(market.medianUnitPrice),  source: 'Perplexity / Domain', confidence: 'medium' },
      { label: '12-Month Growth',    value: formatPct(market.priceGrowth12m),     trend: trend(market.priceGrowth12m), source: 'Perplexity', confidence: 'medium' },
      { label: '5-Year Growth',      value: formatPct(market.priceGrowth5yr),     trend: trend(market.priceGrowth5yr), source: 'Perplexity', confidence: 'medium' },
      { label: '10-Year Growth',     value: formatPct(market.priceGrowth10yr),    trend: trend(market.priceGrowth10yr), source: 'Perplexity', confidence: 'medium' },
      { label: 'House Rental Yield', value: formatPct(market.rentalYieldHouse),   source: 'Perplexity', confidence: 'medium' },
      { label: 'Unit Rental Yield',  value: formatPct(market.rentalYieldUnit),    source: 'Perplexity', confidence: 'medium' },
      { label: 'Weekly Rent (House)',value: market.medianWeeklyRentHouse ? `$${market.medianWeeklyRentHouse}/wk` : null, source: 'Perplexity', confidence: 'medium' },
      { label: 'Days on Market',     value: market.daysOnMarket ? `${market.daysOnMarket} days` : null, source: 'Perplexity', confidence: 'medium' },
      { label: 'Annual Sales Vol.',  value: market.annualSalesVolume ? `${market.annualSalesVolume} sales` : null, source: 'Perplexity', confidence: 'medium' },
      { label: 'Vacancy Rate',       value: formatPct(market.vacancyRate), source: 'Perplexity', confidence: 'medium' },
      { label: 'Market Condition',   value: market.supplyDemandRatio ?? null, source: 'Perplexity', confidence: 'low' },
    ].filter(m => m.value !== null)
    for (const m of metrics) push('metric', m)
  }

  if (profile) {
    const profileMetrics = [
      { label: 'Local Council',    value: profile.council ?? null, source: 'Perplexity', confidence: 'high' },
      { label: 'Distance to CBD',  value: profile.distanceFromCBD ?? null, source: 'Perplexity', confidence: 'medium' },
      { label: 'Median Age',       value: profile.medianAge ? `${profile.medianAge} yrs` : null, source: 'ABS / Perplexity', confidence: 'medium' },
      { label: 'Owner-Occupiers',  value: profile.ownerOccupierPct ? `${profile.ownerOccupierPct}%` : null, source: 'ABS / Perplexity', confidence: 'medium' },
      { label: 'Median Income',    value: profile.medianHouseholdIncome ? `$${(profile.medianHouseholdIncome / 1000).toFixed(0)}k/yr` : null, source: 'ABS / Perplexity', confidence: 'medium' },
    ].filter(m => m.value !== null)
    for (const m of profileMetrics) push('metric', m)
  }

  // ── Emit recent sales ──────────────────────────────────────────────────────
  if (Array.isArray(sales)) {
    for (const s of sales.slice(0, 12)) {
      push('sale', {
        address:  s.address ?? '',
        price:    s.price   ?? null,
        date:     s.date    ?? '',
        bedrooms: s.bedrooms ?? null,
        bathrooms:s.bathrooms ?? null,
        type:     s.type    ?? 'House',
        url:      s.url     ?? null,
      })
    }
  }

  // ── Stream assembler narrative ─────────────────────────────────────────────
  const sections: Array<{ id: string; title: string; prompt: string }> = [
    {
      id: 'market',
      title: 'Market Position',
      prompt: `Write a concise 60–80 word market position summary for ${suburbKey}.
Market data: ${JSON.stringify(market ?? {})}
Focus on: current price level, recent growth momentum, and supply/demand balance.`,
    },
    {
      id: 'profile',
      title: 'Suburb Character',
      prompt: `Write a concise 50–70 word suburb character description for ${suburbKey}.
Profile data: ${JSON.stringify(profile ?? {})}
Focus on: who lives here, lifestyle, and what drives demand.`,
    },
    {
      id: 'outlook',
      title: 'Investment Outlook',
      prompt: `Write a concise 70–90 word investment outlook for ${suburbKey}.
All data: ${JSON.stringify({ market: market ?? {}, profile: profile ?? {} })}
Cover: growth trajectory, yield vs growth trade-off, ideal hold period, and one key risk.`,
    },
  ]

  for (const section of sections) {
    push('stream:start', { section: section.id, title: section.title })
    try {
      await streamPerplexity(
        apiKey,
        ASSEMBLER_SYSTEM,
        section.prompt,
        (chunk) => push('stream:chunk', { section: section.id, text: chunk }),
        { temperature: 0.4, maxTokens: 250 },
      )
    } catch (e: any) {
      push('error', { agent: 'assembler', section: section.id, message: e?.message })
    }
    push('stream:end', { section: section.id })
  }

  // ── Verdict: investment score ──────────────────────────────────────────────
  try {
    const verdictRes = await callPerplexity(
      apiKey,
      `Return ONLY valid JSON. No markdown.`,
      `Given this property data for ${suburbKey}:
${JSON.stringify({ market: market ?? {}, profile: profile ?? {} })}

Return:
{
  "headline": "10–15 word headline capturing the key investment proposition",
  "rating": number between 0–100 (overall investment attractiveness),
  "buyerProfiles": ["e.g. Long-term investor", "First home buyer"],
  "risks": [{ "flag": "string", "severity": "high|medium|low" }]
}`,
      { temperature: 0.1, maxTokens: 300 },
    )

    const vText = verdictRes.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const vMatch = vText.match(/\{[\s\S]*\}/)
    if (vMatch) {
      const verdict = JSON.parse(vMatch[0])
      push('verdict', verdict)
    }
  } catch {}

  push('done', {})
  readable.push(null)
})
