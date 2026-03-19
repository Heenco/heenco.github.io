/**
 * POST /api/vapi/call
 *
 * Proxies an outbound VAPI call request to the VAPI API.
 * The private key is kept server-side only — never exposed to the client.
 *
 * Body: { name: string, phone: string, trade: string }
 * Returns: { success: true, callId: string }
 */

/** Normalise an Australian mobile number to E.164 (+614xxxxxxxx). */
function normalizeAusPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '')
  // 04xxxxxxxx  → +614xxxxxxxx
  if (/^04\d{8}$/.test(d)) return `+61${d.slice(1)}`
  // 614xxxxxxxx → +614xxxxxxxx
  if (/^614\d{8}$/.test(d)) return `+${d}`
  // 61[45]xxxxxxxx (covers virtual 05xx numbers)
  if (/^61[45]\d{8}$/.test(d)) return `+${d}`
  return null
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const rawName  = String(body?.name  ?? '').trim().slice(0, 60)
  const rawPhone = String(body?.phone ?? '').trim()
  const rawTrade = String(body?.trade ?? '').trim().slice(0, 60)

  // ── Input validation ──────────────────────────────────────────────────────
  if (!rawName || !rawPhone || !rawTrade) {
    throw createError({ statusCode: 400, message: 'Please fill in all fields.' })
  }

  const phone = normalizeAusPhone(rawPhone)
  if (!phone) {
    throw createError({
      statusCode: 400,
      message: 'Please enter a valid Australian mobile number (e.g. 0412 345 678).',
    })
  }

  // ── Config ────────────────────────────────────────────────────────────────
  const config = useRuntimeConfig()

  if (!config.vapiPrivateKey || !config.vapiAssistantId || !config.vapiOutboundNumber) {
    console.error('[vapi/call] Missing VAPI environment variables')
    throw createError({ statusCode: 500, message: 'Call service not configured.' })
  }

  // ── Look up phone number ID from VAPI ─────────────────────────────────────
  // VAPI needs the internal ID of the provisioned phone number, not the number itself.
  let phoneNumberId: string
  try {
    const numbersRes = await fetch('https://api.vapi.ai/phone-number', {
      headers: { Authorization: `Bearer ${config.vapiPrivateKey}` },
    })
    if (!numbersRes.ok) throw new Error(`VAPI phone-number lookup failed: ${numbersRes.status}`)
    const numbers: Array<{ id: string; number: string }> = await numbersRes.json()
    const match = numbers.find(n => n.number === config.vapiOutboundNumber)
    if (!match) throw new Error(`Outbound number ${config.vapiOutboundNumber} not found in VAPI account`)
    phoneNumberId = match.id
  } catch (err: any) {
    console.error('[vapi/call] phone-number lookup error:', err?.message)
    throw createError({ statusCode: 502, message: 'Could not initialise call service. Please try again shortly.' })
  }

  // ── Fire outbound call ────────────────────────────────────────────────────
  const firstName = rawName.split(' ')[0] ?? rawName

  let callRes: Response
  try {
    callRes = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.vapiPrivateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Roxy Demo — ${rawName} (${rawTrade})`,
        assistantId: config.vapiAssistantId,
        phoneNumberId,
        customer: {
          number: phone,
          name: rawName,
        },
        // Pass variables so Roxy can personalise her greeting
        assistantOverrides: {
          variableValues: {
            customerName: firstName,
            trade: rawTrade,
          },
        },
      }),
    })
  } catch (err: any) {
    console.error('[vapi/call] call creation error:', err?.message)
    throw createError({ statusCode: 502, message: 'Failed to initiate call. Please try again.' })
  }

  if (!callRes.ok) {
    const errBody = await callRes.json().catch(() => ({})) as any
    const msg = errBody?.message ?? `VAPI error ${callRes.status}`
    console.error('[vapi/call] VAPI rejected call:', msg)
    throw createError({ statusCode: 502, message: msg })
  }

  const call = await callRes.json() as { id: string }
  return { success: true, callId: call.id }
})
