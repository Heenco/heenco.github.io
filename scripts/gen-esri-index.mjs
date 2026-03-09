#!/usr/bin/env node
/**
 * gen-esri-index.mjs
 *
 * Crawls every ESRI REST endpoint in app/config/esriLibrary.json and writes
 * a flat, searchable layer index to public/esri-index.json.
 *
 * Auto-skips if the library JSON has not changed since the last run.
 * Pass --force to always regenerate.
 *
 * Usage:
 *   node scripts/gen-esri-index.mjs          # smart (skips if up-to-date)
 *   node scripts/gen-esri-index.mjs --force  # always regenerate
 */

import fs   from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname    = path.dirname(fileURLToPath(import.meta.url))
const ROOT         = path.resolve(__dirname, '..')
const LIBRARY_PATH = path.join(ROOT, 'app/config/esriLibrary.json')
const INDEX_PATH   = path.join(ROOT, 'public/esri-index.json')
const CONCURRENCY  = 5
const TIMEOUT_MS   = 12_000
const FORCE        = process.argv.includes('--force')
const QUERYABLE    = new Set(['FeatureServer', 'MapServer'])

// ── Staleness check ────────────────────────────────────────────────────────
const libraryMtime = fs.statSync(LIBRARY_PATH).mtimeMs

let existingIndex = null
try { existingIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')) } catch {}

if (!FORCE && existingIndex?._meta?.libraryMtime >= libraryMtime) {
  console.log('[esri-index] Index is up to date — skipping.')
  process.exit(0)
}

const library = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf8'))
console.log(`[esri-index] Regenerating index for ${library.reduce((n, g) => n + g.entries.length, 0)} endpoints…\n`)

// ── HTTP helper ────────────────────────────────────────────────────────────
async function fetchJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const u = new URL(url)
    u.searchParams.set('f', 'json')
    const res = await fetch(u.toString(), { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data?.error) throw new Error(data.error.message ?? 'API error')
    return data
  } finally {
    clearTimeout(timer)
  }
}

// Run an array of async tasks with limited concurrency, swallowing errors
async function batchRun(items, concurrency, fn) {
  const out = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch   = items.slice(i, i + concurrency)
    const settled = await Promise.allSettled(batch.map(fn))
    for (const r of settled) out.push(r.status === 'fulfilled' ? r.value : null)
  }
  return out
}

// ── Record builder ─────────────────────────────────────────────────────────
function makeRecord(endpointName, endpointUrl, serviceType, serviceName, serviceUrl, layer) {
  return {
    endpointName,
    endpointUrl,
    serviceType,
    serviceName,
    serviceUrl,
    layerId:      layer?.id           ?? null,
    layerName:    layer?.name         ?? null,
    layerUrl:     layer != null       ? `${serviceUrl}/${layer.id}` : null,
    layerType:    layer?.type         ?? null,
    geometryType: layer?.geometryType ?? null,
  }
}

// ── Index a single service URL ─────────────────────────────────────────────
async function indexService(endpointName, endpointUrl, serviceType, serviceName, serviceUrl) {
  let data
  try { data = await fetchJson(serviceUrl) } catch (e) {
    console.warn(`    ⚠ ${serviceName} (${serviceType}): ${e.message}`)
    return []
  }

  if (QUERYABLE.has(serviceType)) {
    const layers = [...(data.layers ?? []), ...(data.tables ?? [])]
    if (layers.length > 0) {
      return layers.map(l => makeRecord(endpointName, endpointUrl, serviceType, serviceName, serviceUrl, l))
    }
  }

  // Non-queryable or empty: single service-level record
  return [makeRecord(endpointName, endpointUrl, serviceType, serviceName, serviceUrl, null)]
}

// ── Crawl a root/folder endpoint ───────────────────────────────────────────
function getServicesRoot(url) {
  const m = url.match(/^(https?:\/\/.+?\/rest\/services)/i)
  return m?.[1] ?? url
}

async function crawlRoot(displayName, entryUrl, rootData) {
  const normalUrl    = entryUrl.replace(/\/+$/, '')
  const servicesRoot = getServicesRoot(normalUrl)
  const folders      = rootData.folders ?? []
  const allRaw       = [...(rootData.services ?? [])]

  console.log(`  folders: ${folders.length}  root services: ${allRaw.length}`)

  // Fetch all folders (batched)
  const folderResults = await batchRun(folders, CONCURRENCY, async folderName => {
    try {
      const fd = await fetchJson(`${normalUrl}/${encodeURIComponent(folderName)}`)
      return fd.services ?? []
    } catch { return [] }
  })
  for (const batch of folderResults) if (batch) allRaw.push(...batch)

  console.log(`  total services to index: ${allRaw.length}`)

  // Index each service (batched)
  const allRecords = []
  const svcResults = await batchRun(allRaw, CONCURRENCY, raw => {
    const parts       = raw.name.split('/')
    const serviceName = parts[parts.length - 1]
    const serviceUrl  = `${servicesRoot}/${raw.name}/${raw.type}`
    return indexService(displayName, entryUrl, raw.type, serviceName, serviceUrl)
  })
  for (const records of svcResults) if (records) allRecords.push(...records)
  return allRecords
}

// ── Auto-detect and crawl a single library entry ───────────────────────────
async function crawlEntry(group, entry) {
  const url         = entry.url.replace(/\/+$/, '')
  const displayName = `${group} — ${entry.name}`
  console.log(`\n📂 ${displayName}`)
  console.log(`   ${url}`)

  let data
  try { data = await fetchJson(url) } catch (e) {
    console.warn(`  ⚠ Failed to fetch: ${e.message}`)
    return []
  }

  // Root or folder: has folders array OR services with typed entries
  if (Array.isArray(data.folders) || (Array.isArray(data.services) && data.services.some(s => s.type))) {
    const records = await crawlRoot(displayName, url, data)
    console.log(`  ✓ ${records.length} records`)
    return records
  }

  // Specific service: has layers or tables
  if (Array.isArray(data.layers) || Array.isArray(data.tables)) {
    const parts       = url.split('/')
    const serviceType = parts[parts.length - 1]
    const serviceName = parts[parts.length - 2]
    const layers      = [...(data.layers ?? []), ...(data.tables ?? [])]
    let records
    if (QUERYABLE.has(serviceType) && layers.length > 0) {
      records = layers.map(l => makeRecord(displayName, url, serviceType, serviceName, url, l))
    } else {
      records = [makeRecord(displayName, url, serviceType, serviceName, url, null)]
    }
    console.log(`  ✓ ${records.length} records (specific service)`)
    return records
  }

  // Specific layer: has fields
  if (Array.isArray(data.fields) || data.name) {
    const parts     = url.split('/')
    const layerId   = parseInt(parts[parts.length - 1], 10)
    const svcUrl    = parts.slice(0, -1).join('/')
    const svcType   = parts[parts.length - 2]
    const svcName   = parts[parts.length - 3]
    const record = {
      endpointName: displayName,
      endpointUrl:  url,
      serviceType:  svcType,
      serviceName:  svcName,
      serviceUrl:   svcUrl,
      layerId:      isNaN(layerId) ? null : layerId,
      layerName:    data.name ?? null,
      layerUrl:     isNaN(layerId) ? null : url,
      layerType:    data.type ?? null,
      geometryType: data.geometryType ?? null,
    }
    console.log(`  ✓ 1 record (specific layer)`)
    return [record]
  }

  console.warn(`  ⚠ Unrecognized response format — skipping`)
  return []
}

// ── Main ───────────────────────────────────────────────────────────────────
const allRecords = []

for (const group of library) {
  for (const entry of group.entries) {
    try {
      const records = await crawlEntry(group.group, entry)
      allRecords.push(...records)
    } catch (e) {
      console.error(`  ✗ Unexpected error for ${entry.name}: ${e.message}`)
    }
  }
}

const index = {
  _meta: {
    generatedAt:  new Date().toISOString(),
    libraryMtime,
    totalRecords: allRecords.length,
  },
  layers: allRecords,
}

fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true })
fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8')

console.log(`\n✅ Done — ${allRecords.length} records written to ${path.relative(ROOT, INDEX_PATH)}`)
