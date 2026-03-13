<template>
  <!-- ── FAB ──────────────────────────────────────────────────────────────── -->
  <button
    v-show="!isOpen"
    class="ad-fab"
    :style="{ top: fabTop }"
    :title="'Add local data'"
    @click="isOpen = true"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  </button>

  <!-- ── Panel ─────────────────────────────────────────────────────────────── -->
  <transition name="ad-slide-left">
    <aside v-if="isOpen" class="ad-panel">

      <!-- Header -->
      <div class="ad-header">
        <div class="ad-title-wrap">
          <span class="ad-title">Add Local Data</span>
          <span class="ad-subtitle">Load files into map</span>
        </div>
        <button class="ad-close" @click="close" title="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="ad-body">

        <!-- Drop zone -->
        <div
          class="ad-dropzone"
          :class="{ 'ad-dropzone--over': dragOver, 'ad-dropzone--loading': isLoading }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
          @click="!isLoading && fileInput?.click()"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".parquet"
            class="ad-hidden"
            @change="onFileChange"
          />

          <template v-if="isLoading">
            <div class="ad-spinner">◌</div>
            <div class="ad-drop-status">{{ loadingLabel }}</div>
          </template>
          <template v-else>
            <svg class="ad-drop-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M24 32V16M16 24l8-8 8 8M8 36v2a2 2 0 002 2h28a2 2 0 002-2v-2"/>
            </svg>
            <div class="ad-drop-title">Drop a Parquet file</div>
            <div class="ad-drop-sub">GeoParquet · Parquet</div>
            <div class="ad-drop-hint">or click to browse</div>
          </template>
        </div>

        <!-- Error -->
        <div v-if="loadError" class="ad-error">⚠ {{ loadError }}</div>

        <!-- Loaded files list -->
        <div v-if="loadedFiles.length > 0" class="ad-files">
          <div class="ad-files-label">Loaded</div>
          <div v-for="f in loadedFiles" :key="f.id" class="ad-file-row">
            <div class="ad-file-swatch" :style="{ background: f.color }"></div>
            <div class="ad-file-info">
              <span class="ad-file-name">{{ f.name }}</span>
              <span class="ad-file-meta">{{ f.featureCount.toLocaleString() }} features · {{ f.geomCategory }}</span>
            </div>
            <button class="ad-file-remove" title="Remove from map" @click="removeLoadedFile(f.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// ── Props / Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  esriBotPx?: number   // how many px from top the ESRI FAB sits (so we go below it)
  open?: boolean
}>()

const emit = defineEmits<{
  openChange: [open: boolean]
  layerLoaded: [payload: {
    id: string
    label: string
    geomCategory: 'polygon' | 'line' | 'point'
    featureCount: number
    geojson: { type: 'FeatureCollection'; features: any[] }
    color: string
  }]
  layerRemoved: [id: string]
}>()

// ── State ─────────────────────────────────────────────────────────────────────
const isOpen      = ref(props.open ?? false)
const dragOver    = ref(false)
const isLoading   = ref(false)
const loadingLabel = ref('Loading…')
const loadError   = ref('')
const fileInput   = ref<HTMLInputElement | null>(null)

interface LoadedFile {
  id: string
  name: string
  featureCount: number
  geomCategory: 'polygon' | 'line' | 'point'
  color: string
  fileKey: string
  geoExpr: string
  geoCol: string
  propCols: string[]
}
const loadedFiles = ref<LoadedFile[]>([])

// ── Positioning ───────────────────────────────────────────────────────────────
const fabTop = computed(() => {
  const base = props.esriBotPx != null ? `${props.esriBotPx + 8}px` : 'calc(1rem + 96px)'
  return base
})

// ── Open / close ──────────────────────────────────────────────────────────────
function close() {
  isOpen.value = false
}

watch(isOpen, v => emit('openChange', v))
watch(() => props.open, v => {
  if (typeof v === 'boolean' && v !== isOpen.value) isOpen.value = v
})

function removeLoadedFile(id: string) {
  const entry = loadedFiles.value.find(f => f.id === id)
  loadedFiles.value = loadedFiles.value.filter(f => f.id !== id)
  if (entry?.fileKey) {
    _db?.dropFile(entry.fileKey).catch(() => {})
  }
  emit('layerRemoved', id)
}

// ── Colours ───────────────────────────────────────────────────────────────────
const PALETTE: string[] = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6']
let _colorIdx = 0
function nextColor() { return PALETTE[_colorIdx++ % PALETTE.length] ?? '#6366f1' }

// ── Geometry detection ────────────────────────────────────────────────────────
const GEO_NAMES = new Set(['geometry','geom','wkb_geometry','wkt','the_geom','shape','geo','geom_wkb'])
const RX_GEOMETRY = /^(BLOB|GEOMETRY|WKB_BLOB)/i

// ── DuckDB ────────────────────────────────────────────────────────────────────
let _db: any   = null
let _conn: any = null

async function getDuckDB() {
  if (_db) return _db
  const duckdb = await import('@duckdb/duckdb-wasm')
  const bundles = duckdb.getJsDelivrBundles()
  const bundle  = await duckdb.selectBundle(bundles)
  const workerResp = await fetch(bundle.mainWorker!)
  const workerBlob = await workerResp.blob()
  const workerUrl  = URL.createObjectURL(workerBlob)
  const worker     = new Worker(workerUrl)
  const logger     = new duckdb.VoidLogger()
  _db = new duckdb.AsyncDuckDB(logger, worker)
  await _db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  URL.revokeObjectURL(workerUrl)
  return _db
}

async function getConn() {
  const db = await getDuckDB()
  if (!_conn) {
    _conn = await db.connect()
    await _conn.query(`LOAD httpfs;`)
    try { await _conn.query(`LOAD spatial;`) } catch { /* may be unavailable */ }
  }
  return _conn
}

// ── File handling ─────────────────────────────────────────────────────────────
function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) loadFile(file)
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) loadFile(file)
  ;(e.target as HTMLInputElement).value = ''
}

async function loadFile(file: File) {
  loadError.value = ''
  isLoading.value = true
  loadingLabel.value = 'Initialising DuckDB…'

  let fileKey = ''
  let keepFile = false
  try {
    const db   = await getDuckDB()
    const conn = await getConn()

    // Register with a unique name to avoid stale VFS state across loads
    fileKey = `input-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.parquet`
    loadingLabel.value = 'Reading file…'
    const buf = await file.arrayBuffer()
    await db.registerFileBuffer(fileKey, new Uint8Array(buf))

    // Detect columns
    loadingLabel.value = 'Detecting geometry…'
    const descRes = await conn.query(`DESCRIBE SELECT * FROM read_parquet('${fileKey}') LIMIT 0`)
    const descRows = descRes.toArray()

    let geoCol: string | null = null
    let geoType = ''
    const otherCols: string[] = []
    for (const row of descRows) {
      const name = String(row.column_name ?? row.Field ?? '')
      const type = String(row.column_type ?? row.Type ?? '')
      if (GEO_NAMES.has(name.toLowerCase()) || RX_GEOMETRY.test(type)) {
        geoCol = name
        geoType = type
        break
      }
    }

    if (geoCol) {
      for (const row of descRows) {
        const name = String(row.column_name ?? row.Field ?? '')
        if (name && name !== geoCol) otherCols.push(`"${name}"`)
      }
    }

    if (!geoCol) {
      loadError.value = 'No geometry column detected in this Parquet file.'
      return
    }

    // Count features
    loadingLabel.value = 'Counting features…'
    const countRes = await conn.query(`SELECT COUNT(*) AS n FROM read_parquet('${fileKey}') WHERE "${geoCol}" IS NOT NULL`)
    const total = Number(countRes.toArray()[0]?.n ?? 0)

    // Extract GeoJSON (limit to 20k features for performance)
    loadingLabel.value = 'Extracting features…'
    const LIMIT = 20_000
    const rawType = geoType.toUpperCase()
    const geoExpr = rawType === 'GEOMETRY'
      ? `"${geoCol}"`
      : (rawType === 'VARCHAR' || rawType === 'TEXT')
        ? `ST_GeomFromText("${geoCol}")`
        : `ST_GeomFromWKB("${geoCol}")`

    const propColsSql = otherCols.length ? `, ${otherCols.join(', ')}` : ''
    const geoRes = await conn.query(
      `SELECT ST_AsGeoJSON(${geoExpr}) AS _geom${propColsSql}
       FROM read_parquet('${fileKey}')
       WHERE "${geoCol}" IS NOT NULL
       LIMIT ${LIMIT}`
    )
    const rows = geoRes.toArray()

    const features: any[] = []
    let geomCategory: 'polygon' | 'line' | 'point' = 'point'
    let geomTypeSeen = ''

    const normalizeValue = (value: unknown) => {
      if (typeof value === 'bigint') {
        const asNumber = Number(value)
        return Number.isSafeInteger(asNumber) ? asNumber : value.toString()
      }
      return value
    }

    for (const row of rows) {
      try {
        const geom = JSON.parse(String(row._geom ?? '{}'))
        if (!geomTypeSeen && geom.type) geomTypeSeen = geom.type
        const { _geom, ...props } = row as Record<string, unknown>
        const safeProps: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(props)) safeProps[k] = normalizeValue(v)
        features.push({ type: 'Feature', geometry: geom, properties: safeProps })
      } catch { /* skip malformed */ }
    }

    if (features.length === 0) {
      loadError.value = 'No valid geometries found in this Parquet file.'
      return
    }

    // Classify geometry
    const t = geomTypeSeen.toLowerCase()
    if (t.includes('polygon')) geomCategory = 'polygon'
    else if (t.includes('linestring') || t.includes('line')) geomCategory = 'line'
    else geomCategory = 'point'

    const color = nextColor()
    const id    = `ad-local-${Date.now()}`
    const label = file.name.replace(/\.parquet$/i, '')

    loadedFiles.value.push({
      id,
      name: label,
      featureCount: features.length,
      geomCategory,
      color,
      fileKey,
      geoExpr,
      geoCol,
      propCols: otherCols,
    })
    keepFile = true

    emit('layerLoaded', {
      id,
      label,
      geomCategory,
      featureCount: total,
      geojson: { type: 'FeatureCollection', features },
      color,
    })

  } catch (err: any) {
    loadError.value = err?.message ?? 'Failed to load file'
  } finally {
    if (fileKey && !keepFile) {
      try { await _db?.dropFile(fileKey) } catch { /* best effort */ }
    }
    isLoading.value = false
    loadingLabel.value = 'Loading…'
  }
}

async function appendLocalLayer(id: string, bbox: [number, number, number, number], limit = 5000) {
  const entry = loadedFiles.value.find(f => f.id === id)
  if (!entry) return [] as any[]
  const conn = await getConn()

  const [w, s, e, n] = bbox
  if (![w, s, e, n].every(v => Number.isFinite(v))) return [] as any[]

  const propColsSql = entry.propCols.length ? `, ${entry.propCols.join(', ')}` : ''

  const normalizeValue = (value: unknown) => {
    if (typeof value === 'bigint') {
      const asNumber = Number(value)
      return Number.isSafeInteger(asNumber) ? asNumber : value.toString()
    }
    return value
  }

  try {
    const res = await conn.query(
      `SELECT ST_AsGeoJSON(${entry.geoExpr}) AS _geom${propColsSql}
       FROM read_parquet('${entry.fileKey}')
       WHERE "${entry.geoCol}" IS NOT NULL
         AND ST_Intersects(${entry.geoExpr}, ST_MakeEnvelope(${w}, ${s}, ${e}, ${n}))
       LIMIT ${limit}`
    )
    const rows = res.toArray()
    const features: any[] = []
    for (const row of rows) {
      try {
        const geom = JSON.parse(String((row as any)._geom ?? '{}'))
        const { _geom, ...props } = row as Record<string, unknown>
        const safeProps: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(props)) safeProps[k] = normalizeValue(v)
        features.push({ type: 'Feature', geometry: geom, properties: safeProps })
      } catch { /* skip malformed */ }
    }
    return features
  } catch {
    return [] as any[]
  }
}

defineExpose({ appendLocalLayer })
</script>

<style scoped>
/* ── FAB ─────────────────────────────────────────────────────────────────────── */
.ad-fab {
  position: absolute;
  left: 1rem;
  z-index: 20;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  color: hsl(var(--foreground));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, box-shadow 0.15s;
}
.ad-fab:hover {
  background: hsl(var(--card));
  box-shadow: 0 4px 18px rgba(0,0,0,0.4);
}

/* ── Panel ───────────────────────────────────────────────────────────────────── */
.ad-panel {
  position: absolute;
  top: 1rem;
  left: calc(1rem + 40px + 8px);
  width: 320px;
  height: calc(100% - 2rem);
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(16px);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  z-index: 30;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2);
  overflow: hidden;
}

/* ── Transition ──────────────────────────────────────────────────────────────── */
.ad-slide-left-enter-active,
.ad-slide-left-leave-active {
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s;
}
.ad-slide-left-enter-from,
.ad-slide-left-leave-to {
  transform: translateX(-105%);
  opacity: 0;
}

/* ── Header ──────────────────────────────────────────────────────────────────── */
.ad-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}
.ad-title-wrap { display: flex; flex-direction: column; gap: 0.1rem; }
.ad-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}
.ad-subtitle {
  font-size: 0.72rem;
  color: hsl(var(--muted-foreground));
}
.ad-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.ad-close:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }

/* ── Body ────────────────────────────────────────────────────────────────────── */
.ad-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Drop zone ───────────────────────────────────────────────────────────────── */
.ad-hidden { display: none; }

.ad-dropzone {
  border: 2px dashed hsl(var(--border));
  border-radius: 10px;
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  text-align: center;
  user-select: none;
}
.ad-dropzone:hover,
.ad-dropzone--over {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.05);
}
.ad-dropzone--loading { cursor: default; animation: none; }

.ad-drop-icon {
  width: 40px;
  height: 40px;
  color: hsl(var(--muted-foreground));
  opacity: 0.7;
}
.ad-drop-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}
.ad-drop-sub {
  font-size: 0.72rem;
  color: hsl(var(--muted-foreground));
}
.ad-drop-hint {
  font-size: 0.68rem;
  color: hsl(var(--muted-foreground));
  opacity: 0.7;
  margin-top: 0.2rem;
}
.ad-drop-status {
  font-size: 0.78rem;
  color: hsl(var(--muted-foreground));
}

/* ── Spinner ─────────────────────────────────────────────────────────────────── */
.ad-spinner {
  font-size: 1.5rem;
  animation: ad-spin 1s linear infinite;
  color: hsl(var(--muted-foreground));
}
@keyframes ad-spin { to { transform: rotate(360deg); } }

/* ── Error ───────────────────────────────────────────────────────────────────── */
.ad-error {
  font-size: 0.75rem;
  color: #ef4444;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
}

/* ── Loaded files ────────────────────────────────────────────────────────────── */
.ad-files { display: flex; flex-direction: column; gap: 0.4rem; }
.ad-files-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: hsl(var(--muted-foreground));
  padding-bottom: 0.2rem;
}
.ad-file-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  background: hsl(var(--card));
}
.ad-file-swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ad-file-info { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.ad-file-name {
  font-size: 0.78rem;
  font-weight: 500;
  color: hsl(var(--foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ad-file-meta {
  font-size: 0.68rem;
  color: hsl(var(--muted-foreground));
}
.ad-file-remove {
  margin-left: auto;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.ad-file-remove:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
  border-color: hsl(var(--accent));
}
</style>
