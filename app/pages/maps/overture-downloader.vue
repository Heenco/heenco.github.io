<template>
  <div class="od-page">

    <!-- ── Left panel ─────────────────────────────────────────────────── -->
    <aside class="od-panel">
      <div class="od-panel-inner">

        <!-- Header -->
        <div class="od-header">
          <h1 class="od-title">Overture Downloader</h1>
          <p class="od-subtitle">Extract Overture Maps data to Parquet</p>
        </div>

        <!-- Release -->
        <section class="od-section">
          <label class="od-label">Release</label>
          <UInput v-model="release" type="text" placeholder="2026-01-21.0" />
        </section>

        <!-- Bounding Box -->
        <section class="od-section">
          <div class="od-section-row">
            <label class="od-label">Bounding Box</label>
            <div class="od-section-actions">
              <UButton variant="outline" size="sm" @click="useMapView" title="Set bbox to current map view">
                Use map view
              </UButton>
              <UButton variant="outline" size="sm" @click="fitMapToBbox" title="Zoom map to bbox">
                Fit map
              </UButton>
            </div>
          </div>
          <div class="od-bbox-grid">
            <div class="od-field">
              <span class="od-field-label">W (min lon)</span>
              <UInput v-model.number="bbox.min_lon" type="number" step="0.0001" @change="updateBboxRect" />
            </div>
            <div class="od-field">
              <span class="od-field-label">S (min lat)</span>
              <UInput v-model.number="bbox.min_lat" type="number" step="0.0001" @change="updateBboxRect" />
            </div>
            <div class="od-field">
              <span class="od-field-label">E (max lon)</span>
              <UInput v-model.number="bbox.max_lon" type="number" step="0.0001" @change="updateBboxRect" />
            </div>
            <div class="od-field">
              <span class="od-field-label">N (max lat)</span>
              <UInput v-model.number="bbox.max_lat" type="number" step="0.0001" @change="updateBboxRect" />
            </div>
          </div>
          <!-- Draw mode toggle -->
          <UButton
            variant="outline"
            size="sm"
            :style="drawMode ? 'border-color: rgba(245,158,11,0.5); background: rgba(245,158,11,0.12); color: #f59e0b' : null"
            @click="toggleDrawMode"
          >
            {{ drawMode ? '✕ Cancel draw' : '⬚ Draw bbox on map' }}
          </UButton>
        </section>

        <!-- Theme -->
        <section class="od-section">
          <label class="od-label">Theme</label>
          <select v-model="selectedTheme" class="od-select" @change="selectedPath = []">
            <option v-for="t in THEMES" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
        </section>

        <!-- Category (places only) -->
        <section v-if="selectedTheme === 'places'" class="od-section">
          <div class="od-section-row">
            <label class="od-label">Category</label>
            <UButton v-if="selectedPath.length > 0" variant="outline" size="sm" @click="selectedPath = []">
              Clear
            </UButton>
          </div>
          <div class="od-dropdowns">
            <select
              v-for="(level, i) in dropdownLevels"
              :key="i"
              class="od-select"
              :value="selectedPath[i] ?? ''"
              @change="(e) => selectAtLevel(i, (e.target as HTMLSelectElement).value)"
            >
              <option value="">{{ i === 0 ? '— select category —' : '— all (or drill down) —' }}</option>
              <option v-for="opt in level" :key="opt.id" :value="opt.id">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- Breadcrumb path -->
          <div v-if="selectedPath.length > 0" class="od-path">
            <span class="od-path-id">{{ selectedCategory }}</span>
            <span class="od-path-breadcrumb">
              {{ pathLabels.join(' › ') }}
            </span>
          </div>
          <div v-else class="od-hint">
            Select a category above, or leave empty to download all places in the bbox.
          </div>
        </section>

        <!-- Extract -->
        <section class="od-section">
          <div v-if="validationError" class="od-msg od-msg-warn">{{ validationError }}</div>
          <UButton
            variant="primary"
            :disabled="status === 'loading' || !!validationError"
            style="width: 100%"
            @click="extract"
          >
            <span v-if="status === 'loading'" class="od-spinner">◌</span>
            {{ status === 'loading' ? 'Extracting…' : 'Extract to Parquet' }}
          </UButton>

          <div v-if="status === 'loading'" class="od-msg od-msg-info">
            DuckDB WASM querying Overture S3 directly in your browser.<br>
            Large bboxes may take a few minutes.
          </div>
          <div v-if="result && status === 'success'" class="od-msg od-msg-success">
            <div>✓ <strong>{{ result.rows.toLocaleString() }}</strong> rows saved</div>
            <div class="od-result-file">{{ result.fileName }}</div>
            <div class="od-result-meta">{{ (result.sizeBytes / 1e6).toFixed(2) }} MB</div>
          </div>
          <div v-if="result && status === 'error'" class="od-msg od-msg-error">
            ✗ {{ result.error }}
          </div>
        </section>

      </div>
    </aside>

    <!-- ── Map ────────────────────────────────────────────────────────── -->
    <div id="od-map" class="od-map" />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import UButton from '~/components/ui/Button.vue'
import UInput from '~/components/ui/Input.vue'
import {
  OVERTURE_PLACES_TAXONOMY,
  childrenAt,
  getPathLabels,
  type TaxonomyNode,
} from '~/config/overtureTaxonomy'

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap' },
  ]
})

// ── Map setup ───────────────────────────────────────────────────────────────
const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'
const MAPLIBRE_JS  = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'

let map: any = null

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })

// ── Config ──────────────────────────────────────────────────────────────────
const OVERTURE_RELEASE = '2026-01-21.0'
const release = ref(OVERTURE_RELEASE)

const THEMES = [
  { id: 'places',         label: 'Places' },
  { id: 'buildings',      label: 'Buildings' },
  { id: 'transportation', label: 'Transportation' },
  { id: 'addresses',      label: 'Addresses' },
  { id: 'base',           label: 'Base (Land)' },
]

// ── Bbox ────────────────────────────────────────────────────────────────────
const bbox = ref({ min_lon: 113.0, min_lat: -44.0, max_lon: 154.0, max_lat: -10.0 })

const useMapView = () => {
  if (!map) return
  const b = map.getBounds()
  bbox.value = {
    min_lon: parseFloat(b.getWest().toFixed(4)),
    min_lat: parseFloat(b.getSouth().toFixed(4)),
    max_lon: parseFloat(b.getEast().toFixed(4)),
    max_lat: parseFloat(b.getNorth().toFixed(4)),
  }
}

const fitMapToBbox = () => {
  if (!map) return
  map.fitBounds(
    [[bbox.value.min_lon, bbox.value.min_lat], [bbox.value.max_lon, bbox.value.max_lat]],
    { padding: 60, duration: 600 },
  )
}

const updateBboxRect = () => {
  if (!map) return
  const s = map.getSource('od-bbox')
  if (!s) return
  const { min_lon, min_lat, max_lon, max_lat } = bbox.value
  s.setData({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[min_lon, min_lat], [max_lon, min_lat], [max_lon, max_lat], [min_lon, max_lat], [min_lon, min_lat]]],
    },
  })
}

watch(bbox, updateBboxRect, { deep: true })

// ── Draw mode ───────────────────────────────────────────────────────────────
const drawMode = ref(false)
let drawStart: { lng: number; lat: number } | null = null

const toggleDrawMode = () => {
  if (!map) return
  drawMode.value = !drawMode.value
  if (drawMode.value) {
    map.dragPan.disable()
    map.getCanvas().style.cursor = 'crosshair'
  } else {
    map.dragPan.enable()
    map.getCanvas().style.cursor = ''
    drawStart = null
  }
}

// ── Theme & Category ────────────────────────────────────────────────────────
const selectedTheme = ref('places')
const selectedPath  = ref<string[]>([])

const selectAtLevel = (level: number, id: string) => {
  if (!id) {
    selectedPath.value = selectedPath.value.slice(0, level)
  } else {
    selectedPath.value = [...selectedPath.value.slice(0, level), id]
  }
}

/** Dropdown options for each level based on current selection */
const dropdownLevels = computed<TaxonomyNode[][]>(() => {
  const levels: TaxonomyNode[][] = [OVERTURE_PLACES_TAXONOMY]
  for (let i = 0; i < selectedPath.value.length; i++) {
    const children = childrenAt(selectedPath.value.slice(0, i + 1))
    if (children.length === 0) break
    levels.push(children)
  }
  return levels
})

const selectedCategory = computed(() =>
  selectedPath.value.length > 0 ? selectedPath.value[selectedPath.value.length - 1] : null,
)

const pathLabels = computed(() => getPathLabels(selectedPath.value))

// ── Validation ──────────────────────────────────────────────────────────────
const validationError = computed(() => {
  const { min_lon, min_lat, max_lon, max_lat } = bbox.value
  if (min_lon >= max_lon || min_lat >= max_lat) return 'Bbox min must be less than max'
  return null
})

// ── DuckDB WASM (browser-side, lazy init) ───────────────────────────────────
let _db: any = null
let _conn: any = null

const getDuckDB = async () => {
  if (_conn) return _conn

  // Dynamic import so WASM is only loaded when first needed
  const duckdb = await import('@duckdb/duckdb-wasm')
  const bundles = duckdb.getJsDelivrBundles()
  const bundle  = await duckdb.selectBundle(bundles)

  // Browsers block cross-origin Workers — fetch the script and re-host as a blob URL
  const workerResp = await fetch(bundle.mainWorker!)
  const workerBlob = await workerResp.blob()
  const workerUrl  = URL.createObjectURL(workerBlob)
  const worker     = new Worker(workerUrl)

  const logger = new duckdb.VoidLogger()
  _db = new duckdb.AsyncDuckDB(logger, worker)
  await _db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  _conn = await _db.connect()

  URL.revokeObjectURL(workerUrl)

  // Load httpfs so we can read from S3
  await _conn.query(`LOAD httpfs; SET s3_region='us-west-2';`)
  return _conn
}

// ── Extract ─────────────────────────────────────────────────────────────────
const status = ref<null | 'loading' | 'success' | 'error'>(null)
const result = ref<any>(null)

const THEME_S3: Record<string, string> = {
  places:         'theme=places/type=place',
  buildings:      'theme=buildings/type=building',
  transportation: 'theme=transportation/type=segment',
  addresses:      'theme=addresses/type=address',
  base:           'theme=base/type=land',
}

const extract = async () => {
  if (validationError.value) return
  status.value = 'loading'
  result.value = null

  try {
    const conn = await getDuckDB()
    const { min_lon, min_lat, max_lon, max_lat } = bbox.value
    const rel   = release.value
    const theme = selectedTheme.value
    const cat   = selectedTheme.value === 'places' ? selectedCategory.value : null
    const slug  = cat ? `${theme}_${cat}` : theme
    const fileName = `${slug}_${Date.now()}.parquet`

    const s3 = `s3://overturemaps-us-west-2/release/${rel}/${THEME_S3[theme]}/**/*.parquet`

    const bboxWhere = `bbox.xmin < ${max_lon} AND bbox.xmax > ${min_lon} AND bbox.ymin < ${max_lat} AND bbox.ymax > ${min_lat}`
    const catWhere  = cat ? `categories.primary = '${cat}' AND ` : ''
    // For point features (places/addresses) derive lon/lat from bbox struct — no spatial ext needed
    const isPoint   = theme === 'places' || theme === 'addresses'
    const geoSelect = isPoint
      ? `* EXCLUDE (geometry), bbox.xmin AS longitude, bbox.ymin AS latitude, geometry`
      : `* EXCLUDE (geometry), geometry`

    const sql = `
      COPY (
        SELECT ${geoSelect}
        FROM read_parquet('${s3}')
        WHERE ${catWhere}${bboxWhere}
      ) TO '${fileName}' (FORMAT PARQUET, COMPRESSION ZSTD)
    `

    await conn.query(sql)

    const buffer  = await _db.copyFileToBuffer(fileName)
    const rows    = Number((await conn.query(`SELECT COUNT(*) AS cnt FROM read_parquet('${fileName}')`)).getChildAt(0).get(0))

    // Trigger browser download
    const blob = new Blob([buffer], { type: 'application/octet-stream' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    result.value = { rows, fileName, sizeBytes: buffer.byteLength }
    status.value = 'success'
  } catch (err: any) {
    result.value = { error: err?.message ?? 'Unknown error' }
    status.value = 'error'
  }
}

// ── Map init ────────────────────────────────────────────────────────────────
const initMap = () => {
  if (!window.maplibregl) return

  map = new window.maplibregl.Map({
    container: 'od-map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [133.5, -27.0],
    zoom: 3.5,
    attributionControl: false,
  })

  map.on('load', () => {
    // Add bbox source + layers
    map.addSource('od-bbox', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } },
    })
    map.addLayer({
      id: 'od-bbox-fill',
      type: 'fill',
      source: 'od-bbox',
      paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.08 },
    })
    map.addLayer({
      id: 'od-bbox-line',
      type: 'line',
      source: 'od-bbox',
      paint: { 'line-color': '#f59e0b', 'line-width': 2, 'line-dasharray': [5, 3] },
    })
    updateBboxRect()
  })

  // Draw bbox interactions
  map.on('mousedown', (e: any) => {
    if (!drawMode.value) return
    drawStart = { lng: e.lngLat.lng, lat: e.lngLat.lat }
  })

  map.on('mousemove', (e: any) => {
    if (!drawMode.value || !drawStart) return
    const end = { lng: e.lngLat.lng, lat: e.lngLat.lat }
    bbox.value = {
      min_lon: parseFloat(Math.min(drawStart.lng, end.lng).toFixed(4)),
      min_lat: parseFloat(Math.min(drawStart.lat, end.lat).toFixed(4)),
      max_lon: parseFloat(Math.max(drawStart.lng, end.lng).toFixed(4)),
      max_lat: parseFloat(Math.max(drawStart.lat, end.lat).toFixed(4)),
    }
  })

  map.on('mouseup', () => {
    if (!drawMode.value) return
    drawMode.value = false
    drawStart = null
    map.dragPan.enable()
    map.getCanvas().style.cursor = ''
  })
}

onMounted(() => {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = MAPLIBRE_CSS
  document.head.appendChild(link)

  loadScript(MAPLIBRE_JS).then(initMap).catch(console.error)
})

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.od-page {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #0a0a12;
  font-family: 'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.od-panel {
  width: 340px;
  flex-shrink: 0;
  background: hsl(var(--card));
  border-right: 1px solid hsl(var(--border));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 10;
  box-shadow: 2px 0 8px rgba(0,0,0,0.06);
}

.od-panel-inner {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.od-map {
  flex: 1;
}

/* ── Scrollbar ───────────────────────────────────────────────────────────── */
.od-panel-inner::-webkit-scrollbar { width: 4px; }
.od-panel-inner::-webkit-scrollbar-track { background: transparent; }
.od-panel-inner::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

/* ── Header ──────────────────────────────────────────────────────────────── */
.od-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid hsl(var(--border));
  margin-bottom: 0.25rem;
}

.od-title {
  font-size: 1rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 0.2rem;
  letter-spacing: 0.01em;
}

.od-subtitle {
  font-size: 0.72rem;
  color: hsl(var(--muted-foreground));
  margin: 0;
}

/* ── Sections ────────────────────────────────────────────────────────────── */
.od-section {
  padding: 0.9rem 0;
  border-bottom: 1px solid hsl(var(--border));
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.od-section:last-child {
  border-bottom: none;
}

.od-section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.od-section-actions {
  display: flex;
  gap: 0.35rem;
}

/* ── Labels ──────────────────────────────────────────────────────────────── */
.od-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
}

.od-hint {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.5;
}

/* ── Select ─────────────────────────────────────────────────────────────── */
.od-select {
  width: 100%;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  color: hsl(var(--foreground));
  font-size: 0.8rem;
  padding: 0.4rem 0.6rem;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.6rem center;
  padding-right: 2rem;
  cursor: pointer;
}

.od-select:focus {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.25);
}

/* ── Bbox grid ───────────────────────────────────────────────────────────── */
.od-bbox-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}

.od-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.od-field-label {
  font-size: 0.65rem;
  color: hsl(var(--muted-foreground));
}

/* ── Category dropdowns ──────────────────────────────────────────────────── */
.od-dropdowns {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

/* ── Path breadcrumb ─────────────────────────────────────────────────────── */
.od-path {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  background: rgba(245, 158, 11, 0.07);
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: 6px;
  padding: 0.45rem 0.6rem;
}

.od-path-id {
  font-size: 0.75rem;
  font-weight: 600;
  color: #f59e0b;
  font-family: monospace;
}

.od-path-breadcrumb {
  font-size: 0.68rem;
  color: hsl(var(--muted-foreground));
}

/* ── Result messages ─────────────────────────────────────────────────────── */
.od-msg {
  font-size: 0.75rem;
  border-radius: 6px;
  padding: 0.55rem 0.7rem;
  line-height: 1.5;
}

.od-msg-info    { background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); }
.od-msg-warn    { background: rgba(245,158,11,0.08); color: #b45309; border: 1px solid rgba(245,158,11,0.3); }
.od-msg-success { background: rgba(22,163,74,0.08);  color: #15803d; border: 1px solid rgba(22,163,74,0.3); }
.od-msg-error   { background: rgba(220,38,38,0.08);  color: #dc2626; border: 1px solid rgba(220,38,38,0.3); }

.od-result-file {
  font-family: monospace;
  font-size: 0.68rem;
  word-break: break-all;
  opacity: 0.8;
}

.od-result-meta {
  opacity: 0.65;
  font-size: 0.7rem;
}

/* ── Spinner ─────────────────────────────────────────────────────────────── */
.od-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
