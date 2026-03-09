<template>
  <div class="od-page">

    <!-- ── Left panel ─────────────────────────────────────────────────── -->
    <aside class="od-panel">
      <div class="od-panel-inner">

        <!-- Header -->
        <div class="od-header">
          <h1 class="od-title">OSM Downloader</h1>
          <p class="od-subtitle">Extract OpenStreetMap data to Parquet</p>
        </div>

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
          <UButton
            variant="outline"
            size="sm"
            :style="drawMode ? 'border-color: rgba(245,158,11,0.5); background: rgba(245,158,11,0.08); color: #b45309' : null"
            @click="toggleDrawMode"
          >
            {{ drawMode ? '✕ Cancel draw' : '⬚ Draw bbox on map' }}
          </UButton>
        </section>

        <!-- Element Types -->
        <section class="od-section">
          <label class="od-label">Element Types</label>
          <div class="od-toggles">
            <button
              v-for="t in ELEMENT_TYPES"
              :key="t.id"
              class="od-toggle"
              :class="{ active: elementTypes.includes(t.id) }"
              @click="toggleType(t.id)"
            >
              {{ t.label }}
            </button>
          </div>
          <p class="od-hint">Ways are represented by their center point.</p>
        </section>

        <!-- Tag Key -->
        <section class="od-section">
          <label class="od-label">Tag Key</label>
          <select v-model="selectedKey" class="od-select" @change="selectedValue = ''">
            <option value="">— select a key —</option>
            <option v-for="k in OSM_TAGS" :key="k.key" :value="k.key">{{ k.label }}</option>
          </select>
        </section>

        <!-- Tag Value -->
        <section v-if="selectedKey" class="od-section">
          <label class="od-label">Tag Value</label>
          <select v-model="selectedValue" class="od-select">
            <option value="">— all values —</option>
            <option v-for="v in currentValues" :key="v.value" :value="v.value">{{ v.label }}</option>
          </select>
          <p v-if="!selectedValue" class="od-hint">
            Leave empty to download all <code>{{ selectedKey }}</code> features in the bbox.
          </p>
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
            {{ status === 'loading' ? 'Downloading…' : 'Extract to Parquet' }}
          </UButton>

          <div v-if="status === 'loading'" class="od-msg od-msg-info">
            Querying Overpass API then writing Parquet in your browser.<br>
            Large areas may take a minute.
          </div>
          <div v-if="result && status === 'success'" class="od-msg od-msg-success">
            <div>✓ <strong>{{ result.rows.toLocaleString() }}</strong> features saved</div>
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
    <div id="osm-map" class="od-map" />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import UButton from '~/components/ui/Button.vue'
import UInput from '~/components/ui/Input.vue'
import { OSM_TAGS } from '~/config/osmTags'

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap' },
  ],
})

// ── Map setup ────────────────────────────────────────────────────────────────
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

// ── Element types ────────────────────────────────────────────────────────────
const ELEMENT_TYPES = [
  { id: 'node',     label: 'Nodes' },
  { id: 'way',      label: 'Ways' },
  { id: 'relation', label: 'Relations' },
]

const elementTypes = ref<string[]>(['node', 'way'])

const toggleType = (id: string) => {
  const i = elementTypes.value.indexOf(id)
  if (i >= 0) {
    if (elementTypes.value.length === 1) return // keep at least one
    elementTypes.value.splice(i, 1)
  } else {
    elementTypes.value.push(id)
  }
}

// ── Tag selection ────────────────────────────────────────────────────────────
const selectedKey   = ref('')
const selectedValue = ref('')

const currentValues = computed(() =>
  OSM_TAGS.find(k => k.key === selectedKey.value)?.values ?? [],
)

// ── Bbox ─────────────────────────────────────────────────────────────────────
const bbox = ref({ min_lon: 150.8, min_lat: -33.95, max_lon: 151.35, max_lat: -33.7 })

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
  const s = map.getSource('osm-bbox')
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

// ── Draw mode ────────────────────────────────────────────────────────────────
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

// ── Validation ───────────────────────────────────────────────────────────────
const validationError = computed(() => {
  const { min_lon, min_lat, max_lon, max_lat } = bbox.value
  if (min_lon >= max_lon || min_lat >= max_lat) return 'Bbox min must be less than max'
  if (!selectedKey.value) return 'Select a tag key'
  if (elementTypes.value.length === 0) return 'Select at least one element type'
  return null
})

// ── DuckDB WASM (lazy init) ──────────────────────────────────────────────────
let _db: any = null
let _conn: any = null

const getDuckDB = async () => {
  if (_conn) return _conn

  const duckdb  = await import('@duckdb/duckdb-wasm')
  const bundles = duckdb.getJsDelivrBundles()
  const bundle  = await duckdb.selectBundle(bundles)

  const workerResp = await fetch(bundle.mainWorker!)
  const workerBlob = await workerResp.blob()
  const workerUrl  = URL.createObjectURL(workerBlob)
  const worker     = new Worker(workerUrl)

  const logger = new duckdb.VoidLogger()
  _db = new duckdb.AsyncDuckDB(logger, worker)
  await _db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  _conn = await _db.connect()
  URL.revokeObjectURL(workerUrl)
  return _conn
}

// ── OSM element flattening ───────────────────────────────────────────────────
const flattenElement = (el: any) => {
  const tags = el.tags ?? {}

  // nodes have lat/lon directly; ways/relations use center from `out center`
  const lat = el.lat  ?? el.center?.lat ?? null
  const lon = el.lon  ?? el.center?.lon ?? null

  const {
    name,
    'name:en':          name_en,
    website,
    'contact:website':  contact_website,
    phone,
    'contact:phone':    contact_phone,
    email,
    'contact:email':    contact_email,
    opening_hours,
    'addr:housenumber': addr_housenumber,
    'addr:street':      addr_street,
    'addr:suburb':      addr_suburb,
    'addr:city':        addr_city,
    'addr:postcode':    addr_postcode,
    'addr:state':       addr_state,
    'addr:country':     addr_country,
    ...rest
  } = tags

  return {
    osm_id:           el.id,
    osm_type:         el.type,
    name:             name             ?? null,
    name_en:          name_en          ?? null,
    latitude:         lat,
    longitude:        lon,
    website:          website          ?? contact_website ?? null,
    phone:            phone            ?? contact_phone   ?? null,
    email:            email            ?? contact_email   ?? null,
    opening_hours:    opening_hours    ?? null,
    addr_housenumber: addr_housenumber ?? null,
    addr_street:      addr_street      ?? null,
    addr_suburb:      addr_suburb      ?? null,
    addr_city:        addr_city        ?? null,
    addr_postcode:    addr_postcode    ?? null,
    addr_state:       addr_state       ?? null,
    addr_country:     addr_country     ?? null,
    tags:             JSON.stringify(rest),
  }
}

// ── Extract ──────────────────────────────────────────────────────────────────
const status = ref<null | 'loading' | 'success' | 'error'>(null)
const result = ref<any>(null)

const extract = async () => {
  if (validationError.value) return
  status.value = 'loading'
  result.value = null

  try {
    const { min_lon, min_lat, max_lon, max_lat } = bbox.value
    const key   = selectedKey.value
    const value = selectedValue.value

    // Build Overpass QL
    const tagFilter  = value ? `["${key}"="${value}"]` : `["${key}"]`
    const bboxFilter = `(${min_lat},${min_lon},${max_lat},${max_lon})`
    const unionLines = elementTypes.value.map(t => `  ${t}${tagFilter}${bboxFilter};`).join('\n')
    const query = `[out:json][timeout:120];\n(\n${unionLines}\n);\nout center qt;`

    // POST to Overpass API
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`Overpass error ${resp.status}: ${text.slice(0, 300)}`)
    }

    const data = await resp.json()

    if (data.remark) {
      console.warn('Overpass remark:', data.remark)
      if (/exceeded|timeout/i.test(data.remark)) {
        throw new Error(`Query exceeded Overpass limits — try a smaller bbox. (${data.remark})`)
      }
    }

    const elements: any[] = data.elements ?? []
    if (elements.length === 0) {
      result.value = { error: 'No features found in this area with the selected filter.' }
      status.value = 'error'
      return
    }

    // Flatten OSM elements to plain rows
    const rows = elements.map(flattenElement)

    // Register NDJSON in DuckDB virtual filesystem
    const ndjson = rows.map(r => JSON.stringify(r)).join('\n')
    const conn   = await getDuckDB()
    await _db.registerFileText('osm_raw.ndjson', ndjson)

    // Write Parquet
    const slug     = value ? `osm_${key}_${value}` : `osm_${key}`
    const fileName = `${slug}_${Date.now()}.parquet`

    await conn.query(`
      COPY (
        SELECT * FROM read_json_auto('osm_raw.ndjson')
      ) TO '${fileName}' (FORMAT PARQUET, COMPRESSION ZSTD)
    `)

    const buffer = await _db.copyFileToBuffer(fileName)

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

    result.value = { rows: rows.length, fileName, sizeBytes: buffer.byteLength }
    status.value = 'success'
  } catch (err: any) {
    result.value = { error: err?.message ?? 'Unknown error' }
    status.value = 'error'
  }
}

// ── Map init ─────────────────────────────────────────────────────────────────
const initMap = () => {
  const w = window as any
  if (!w.maplibregl) return

  map = new w.maplibregl.Map({
    container: 'osm-map',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    center: [151.2093, -33.8688],
    zoom: 11,
    attributionControl: false,
  })

  map.on('load', () => {
    map.addSource('osm-bbox', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } },
    })
    map.addLayer({
      id: 'osm-bbox-fill',
      type: 'fill',
      source: 'osm-bbox',
      paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.08 },
    })
    map.addLayer({
      id: 'osm-bbox-line',
      type: 'line',
      source: 'osm-bbox',
      paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [5, 3] },
    })
    updateBboxRect()
  })

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

.od-map { flex: 1; }

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

.od-section:last-child { border-bottom: none; }

.od-section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.od-section-actions { display: flex; gap: 0.35rem; }

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

.od-hint code {
  font-family: monospace;
  font-size: 0.85em;
  background: hsl(var(--muted));
  padding: 0.1em 0.3em;
  border-radius: 3px;
}

/* ── Bbox grid ───────────────────────────────────────────────────────────── */
.od-bbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
.od-field { display: flex; flex-direction: column; gap: 0.2rem; }
.od-field-label { font-size: 0.65rem; color: hsl(var(--muted-foreground)); }

/* ── Element type toggles ────────────────────────────────────────────────── */
.od-toggles { display: flex; gap: 0.35rem; }

.od-toggle {
  flex: 1;
  font-size: 0.75rem;
  font-family: inherit;
  padding: 0.3rem 0;
  border-radius: 6px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.od-toggle:hover {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.od-toggle.active {
  background: hsl(var(--foreground));
  color: hsl(var(--background));
  border-color: hsl(var(--foreground));
}

/* ── Select ──────────────────────────────────────────────────────────────── */
.od-select {
  width: 100%;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  color: hsl(var(--foreground));
  font-size: 0.8rem;
  font-family: inherit;
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

.od-result-file { font-family: monospace; font-size: 0.68rem; word-break: break-all; opacity: 0.8; }
.od-result-meta { opacity: 0.65; font-size: 0.7rem; }

/* ── Spinner ─────────────────────────────────────────────────────────────── */
.od-spinner { display: inline-block; animation: spin 1s linear infinite; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
