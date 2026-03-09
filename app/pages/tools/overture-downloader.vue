<template>
  <div class="od-page">

    <!-- ── Map (full-bleed) ───────────────────────────────────────────── -->
    <div id="od-map" class="od-map" />

    <!-- ── Left FAB ──────────────────────────────────────────────────── -->
    <button v-if="!showPanel" class="od-fab od-fab--left" @click="showPanel = true" title="Open Overture Downloader">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    </button>

    <!-- ── Location search (above left panel) ───────────────────────── -->
    <div v-if="showPanel" class="od-search-wrapper" ref="searchWrapperRef">
      <div class="od-search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search location…"
          class="od-search-input"
          @input="fetchSuggestions"
          @keyup.enter="searchLocation"
          @focus="showSuggestions = true"
        />
        <button v-if="searchQuery" class="od-search-btn od-search-clear" @click="clearSearch" title="Clear">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <button class="od-search-btn" @click="searchLocation" title="Search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
      </div>
      <div v-if="showSuggestions && suggestions.length > 0" class="od-suggestions">
        <div
          v-for="s in suggestions"
          :key="s.id"
          class="od-suggestion"
          @click="selectSuggestion(s)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span class="od-suggestion-name">{{ s.place_name }}</span>
        </div>
      </div>
    </div>

    <!-- ── Left panel ────────────────────────────────────────────────── -->
    <transition name="od-slide-left">
      <aside v-if="showPanel" class="od-panel">
        <div class="od-panel-header">
          <div class="od-header">
            <h1 class="od-title">Overture Downloader</h1>
            <p class="od-subtitle">Extract Overture Maps data to Parquet</p>
            <span v-if="viewCount !== null" class="od-view-count">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              {{ viewCount.toLocaleString() }} views
            </span>
          </div>
          <button class="od-chevron-btn" @click="showPanel = false" title="Collapse">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>
        <div class="od-panel-inner">

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
            <div class="od-result-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ result.rows.toLocaleString() }} rows saved</span>
            </div>
            <div class="od-result-row od-result-secondary">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span class="od-result-file-group">
                <span class="od-result-file">{{ result.fileName }}</span>
                <span class="od-result-size">{{ (result.sizeBytes / 1e6).toFixed(2) }} MB</span>
              </span>
            </div>
          </div>
          <div v-if="result && status === 'error'" class="od-msg od-msg-error">
            ✗ {{ result.error }}
          </div>
        </section>

        </div>

        <!-- ── Panel footer ─────────────────────────────────────────── -->
        <div class="od-panel-footer">
          <button class="od-bug-btn" @click="showBugModal = true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2h8"/><path d="M9 3H7a3 3 0 0 0-3 3v2a5 5 0 0 0 5 5h4a5 5 0 0 0 5-5V6a3 3 0 0 0-3-3h-2"/><path d="M2 13h4"/><path d="M18 13h4"/><path d="M12 19v3"/><path d="M8 19a4 4 0 0 0 8 0"/></svg>
            Report a bug
          </button>
        </div>
      </aside>
    </transition>

    <!-- ── Bug report modal ──────────────────────────────────────────── -->
    <teleport to="body">
      <transition name="od-fade">
        <div v-if="showBugModal" class="od-modal-overlay" @click.self="closeBugModal">
          <div class="od-modal">
            <div class="od-modal-header">
              <h2 class="od-modal-title">Report a Bug</h2>
              <button class="od-chevron-btn" @click="closeBugModal" title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="od-modal-body">
              <div class="od-bug-context">
                <span><strong>Page:</strong> /tools/overture-downloader</span>
                <span><strong>Theme:</strong> {{ selectedTheme }}</span>
                <span><strong>Release:</strong> {{ release }}</span>
              </div>
              <label class="od-label" style="margin-top: 0.75rem; display: block">Description <span style="color: #ef4444">*</span></label>
              <textarea
                v-model="bugDescription"
                class="od-bug-textarea"
                placeholder="Describe what happened and what you expected…"
                rows="5"
              />
              <label class="od-label" style="margin-top: 0.75rem; display: block">Email <span style="opacity:0.5; text-transform:none; font-weight:400">(optional — for follow-up)</span></label>
              <input v-model="bugEmail" type="email" class="od-bug-input" placeholder="you@example.com" />
            </div>
            <div class="od-modal-footer">
              <div v-if="bugStatus === 'success'" class="od-msg od-msg-success" style="flex:1; margin:0">✓ Report received — thanks!</div>
              <div v-else-if="bugStatus === 'error'" class="od-msg od-msg-error" style="flex:1; margin:0">✗ Failed to send. Please try again.</div>
              <template v-if="bugStatus !== 'success'">
                <UButton variant="outline" size="sm" @click="closeBugModal">Cancel</UButton>
                <UButton
                  variant="primary"
                  size="sm"
                  :disabled="!bugDescription.trim() || bugStatus === 'submitting'"
                  @click="submitBugReport"
                >
                  {{ bugStatus === 'submitting' ? 'Sending…' : 'Submit report' }}
                </UButton>
              </template>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- ── Right FAB (layers button) ────────────────────────────── -->
    <button v-if="mapLayers.length > 0 && !showLayers" class="od-fab od-fab--right" @click="showLayers = true" title="Show layers">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
      <span class="od-fab-badge">{{ mapLayers.length }}</span>
    </button>

    <!-- ── Layers panel (right) ──────────────────────────────────── -->
    <transition name="od-slide-right">
      <aside v-if="mapLayers.length > 0 && showLayers" class="od-layers-panel">
        <div class="od-layers-header">
          <span class="od-label">Layers</span>
          <button class="od-chevron-btn" @click="showLayers = false" title="Collapse layers">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div class="od-layer-list">
          <div v-for="layer in mapLayers" :key="layer.id" class="od-layer-row-wrap">
            <div class="od-layer-row">
              <button
                class="od-layer-swatch od-layer-swatch--btn"
                :style="{ background: layer.color }"
                @click="colorPickerOpenId = colorPickerOpenId === layer.id ? null : layer.id"
                title="Change color"
              />
              <div class="od-layer-info">
                <span class="od-layer-name">{{ layer.label }}</span>
                <span class="od-layer-meta">{{ layer.rows.toLocaleString() }} features &middot; {{ layer.theme }}</span>
              </div>
              <USwitch :modelValue="layer.visible" @update:modelValue="toggleMapLayer(layer.id)" />
              <button
                class="od-layer-btn od-layer-btn--remove"
                @click="removeMapLayer(layer.id)"
                title="Remove layer"
              >×</button>
            </div>

            <!-- Color palette popover -->
            <div v-if="colorPickerOpenId === layer.id" class="od-color-picker">
              <button
                v-for="c in LAYER_PALETTE"
                :key="c"
                class="od-color-swatch"
                :class="{ 'od-color-swatch--active': layer.color === c }"
                :style="{ background: c }"
                @click="changeLayerColor(layer.id, c, true)"
              />
              <label class="od-color-custom" title="Custom color">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <input
                  type="color"
                  :value="layer.color"
                  @input="changeLayerColor(layer.id, ($event.target as HTMLInputElement).value)"
                  class="od-color-input"
                />
              </label>
            </div>
          </div>
        </div>
      </aside>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import UButton from '~/components/ui/Button.vue'
import UInput  from '~/components/ui/Input.vue'
import USwitch from '~/components/ui/Switch.vue'
import {
  OVERTURE_PLACES_TAXONOMY,
  childrenAt,
  getPathLabels,
  getAllDescendantIds,
  type TaxonomyNode,
} from '~/config/overtureTaxonomy'

const { viewCount } = usePageViews()
const config = useRuntimeConfig()

// ── Location search ─────────────────────────────────────────────────────────
const searchWrapperRef  = ref<HTMLElement | null>(null)
const searchQuery       = ref('')
const suggestions       = ref<any[]>([])
const showSuggestions   = ref(false)
let   searchDebounce: ReturnType<typeof setTimeout> | null = null

function fetchSuggestions() {
  if (searchDebounce) clearTimeout(searchDebounce)
  if (!searchQuery.value.trim()) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }
  searchDebounce = setTimeout(async () => {
    const token = (config.public as any).mapboxToken
    if (!token) return
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery.value)}.json?access_token=${token}&limit=5&autocomplete=true`
      )
      const data = await res.json()
      suggestions.value = data.features ?? []
      showSuggestions.value = true
    } catch { suggestions.value = [] }
  }, 300)
}

function placeSearchMarker(lng: number, lat: number) {
  if (!map) return
  const geojson = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] } }],
  }
  if (map.getSource('od-search-marker')) {
    map.getSource('od-search-marker').setData(geojson)
  } else {
    map.addSource('od-search-marker', { type: 'geojson', data: geojson })
    map.addLayer({
      id: 'od-search-marker-halo',
      type: 'circle',
      source: 'od-search-marker',
      paint: { 'circle-radius': 11, 'circle-color': '#ffffff', 'circle-opacity': 0.9 },
    })
    map.addLayer({
      id: 'od-search-marker-dot',
      type: 'circle',
      source: 'od-search-marker',
      paint: { 'circle-radius': 5, 'circle-color': '#f97316', 'circle-opacity': 1 },
    })
  }
}

function clearSearchMarker() {
  if (!map) return
  if (map.getLayer('od-search-marker-dot'))  map.removeLayer('od-search-marker-dot')
  if (map.getLayer('od-search-marker-halo')) map.removeLayer('od-search-marker-halo')
  if (map.getSource('od-search-marker'))     map.removeSource('od-search-marker')
}

function clearSearch() {
  searchQuery.value = ''
  suggestions.value = []
  showSuggestions.value = false
  clearSearchMarker()
}

function selectSuggestion(s: any) {
  searchQuery.value = s.place_name
  suggestions.value = []
  showSuggestions.value = false
  const [lng, lat] = s.center
  placeSearchMarker(lng, lat)
  map?.flyTo({ center: [lng, lat], zoom: 10, essential: true })
}

async function searchLocation() {
  if (!searchQuery.value.trim()) return
  showSuggestions.value = false
  const token = (config.public as any).mapboxToken
  if (!token) return
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery.value)}.json?access_token=${token}&limit=1`
    )
    const data = await res.json()
    if (data.features?.length) {
      const [lng, lat] = data.features[0].center
      placeSearchMarker(lng, lat)
      map?.flyTo({ center: [lng, lat], zoom: 10, essential: true })
    }
  } catch {}
}

function handleSearchClickOutside(e: MouseEvent) {
  if (searchWrapperRef.value && !searchWrapperRef.value.contains(e.target as Node)) {
    showSuggestions.value = false
  }
}

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
const bbox = ref({ min_lon: 151.18, min_lat: -33.92, max_lon: 151.24, max_lat: -33.85 })
const bboxDrawn = ref(true)

const useMapView = () => {
  if (!map) return
  const b = map.getBounds()
  bbox.value = {
    min_lon: parseFloat(b.getWest().toFixed(4)),
    min_lat: parseFloat(b.getSouth().toFixed(4)),
    max_lon: parseFloat(b.getEast().toFixed(4)),
    max_lat: parseFloat(b.getNorth().toFixed(4)),
  }
  bboxDrawn.value = true
}

const fitMapToBbox = () => {
  if (!map) return
  map.fitBounds(
    [[bbox.value.min_lon, bbox.value.min_lat], [bbox.value.max_lon, bbox.value.max_lat]],
    { padding: 60, duration: 600 },
  )
}

const updateBboxRect = () => {
  if (!map || !bboxDrawn.value) return
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

// ── Layer Map state ─────────────────────────────────────────────────────────
interface MapLayer {
  id: string
  label: string
  theme: string
  category: string | null
  color: string
  rows: number
  visible: boolean
  mapLayerIds: string[]
}

let   layerCounter = 0
let   popup: any = null
const mapLayers         = ref<MapLayer[]>([])
const showPanel         = ref(true)
const showLayers        = ref(true)
const colorPickerOpenId = ref<string | null>(null)

// ── Bug report ───────────────────────────────────────────────────────────
const showBugModal   = ref(false)
const bugDescription = ref('')
const bugEmail       = ref('')
const bugStatus      = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')

function closeBugModal() {
  showBugModal.value = false
  bugStatus.value = 'idle'
  bugDescription.value = ''
  bugEmail.value = ''
}

async function submitBugReport() {
  if (!bugDescription.value.trim()) return
  const { upstashRedisUrl, upstashRedisToken } = config.public as {
    upstashRedisUrl?: string
    upstashRedisToken?: string
  }
  if (!upstashRedisUrl || !upstashRedisToken) {
    bugStatus.value = 'error'
    return
  }
  bugStatus.value = 'submitting'
  const payload = JSON.stringify({
    page: '/tools/overture-downloader',
    timestamp: new Date().toISOString(),
    release: release.value,
    theme: selectedTheme.value,
    bbox: bbox.value,
    description: bugDescription.value.trim(),
    email: bugEmail.value.trim() || null,
    userAgent: navigator.userAgent,
  })
  try {
    const res = await fetch(upstashRedisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashRedisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['LPUSH', 'bugs:/tools/overture-downloader', payload]),
    })
    if (!res.ok) throw new Error('non-2xx')
    bugStatus.value = 'success'
    bugDescription.value = ''
    bugEmail.value = ''
    setTimeout(closeBugModal, 2500)
  } catch {
    bugStatus.value = 'error'
  }
}

// Sequential palette — each new layer gets the next distinct colour, cycling after 12
const LAYER_PALETTE = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#f97316', // orange
  '#8b5cf6', // violet
  '#22c55e', // green
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#a855f7', // purple
  '#14b8a6', // teal
  '#fb923c', // light-orange
]

const THEME_COLORS: Record<string, string> = {
  buildings:      '#f59e0b',
  transportation: '#60a5fa',
  addresses:      '#34d399',
  base:           '#a78bfa',
}

const getThemeColor = (theme: string): string => THEME_COLORS[theme] ?? '#9ca3af'

// Build GeoJSON from the in-browser parquet file (LIMIT 5000 for map display)
const buildGeoJSONForMap = async (fileName: string, theme: string, cat: string | null, conn: any, layerColor: string) => {
  const isPoint = theme === 'places' || theme === 'addresses'

  if (isPoint) {
    const propSelect = theme === 'places'
      ? 'longitude, latitude, name, category, website, phone, address, city, brand'
      : 'longitude, latitude, id'
    const tbl = await conn.query(
      `SELECT ${propSelect} FROM read_parquet('${fileName}') WHERE longitude IS NOT NULL LIMIT 5000`
    )
    const arr = tbl.toArray()
    // layerColor is pre-assigned sequentially — same value used for the layer list swatch
    const features = arr.map((row: any) => {
      const lon = Number(row.longitude)
      const lat = Number(row.latitude)
      if (!isFinite(lon) || !isFinite(lat)) return null
      const rowCat = String(row.category ?? '')
      const props: any = { _color: layerColor }
      if (theme === 'places') {
        props.name     = String(row.name     ?? '')
        props.category = rowCat
        props.website  = String(row.website  ?? '')
        props.phone    = String(row.phone    ?? '')
        props.address  = String(row.address  ?? '')
        props.city     = String(row.city     ?? '')
        props.brand    = String(row.brand    ?? '')
      } else {
        props.id = String(row.id ?? '')
      }
      return { type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: props }
    }).filter(Boolean)
    return { geojson: { type: 'FeatureCollection', features }, displayRows: features.length }
  }

  // Polygon / Line — needs spatial extension for WKB → GeoJSON
  try {
    await conn.query('INSTALL spatial; LOAD spatial;')
    const tbl = await conn.query(
      `SELECT CAST(id AS VARCHAR) AS id, ST_AsGeoJSON(geometry) AS _geom FROM read_parquet('${fileName}') LIMIT 5000`
    )
    const arr = tbl.toArray()
    const features = arr.map((row: any) => {
      const geomStr = String(row._geom ?? '')
      if (!geomStr) return null
      let geom: any
      try { geom = JSON.parse(geomStr) } catch { return null }
      return { type: 'Feature', geometry: geom, properties: { _color: layerColor, id: String(row.id ?? '') } }
    }).filter(Boolean)
    return { geojson: { type: 'FeatureCollection', features }, displayRows: features.length }
  } catch {
    return { geojson: null, displayRows: 0 }
  }
}

// Add a GeoJSON FeatureCollection to the map and register hover tooltip
const addLayerToMap = (entry: MapLayer, geojson: any): string[] => {
  if (!map) return []
  const { id: sourceId, theme, category, color } = entry
  const isPoint = theme === 'places' || theme === 'addresses'
  const isLine  = theme === 'transportation'
  const addedIds: string[] = []

  map.addSource(sourceId, { type: 'geojson', data: geojson })

  const getPopup = () => {
    if (!popup) popup = new window.maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: '280px' })
    return popup
  }

  if (isPoint) {
    const circleId = `${sourceId}-circle`
    map.addLayer({
      id: circleId, type: 'circle', source: sourceId,
      paint: {
        'circle-color':        ['coalesce', ['get', '_color'], color],
        'circle-radius':       3,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 0.5,
        'circle-opacity':      0.9,
      },
    })
    addedIds.push(circleId)
    map.on('mouseenter', circleId, (e: any) => {
      map.getCanvas().style.cursor = 'pointer'
      const p = e.features[0].properties
      const lines = [
        p.name     && `<strong>${p.name}</strong>`,
        p.brand    && `<span style="opacity:.65">${p.brand}</span>`,
        p.category && `<em style="opacity:.8">${p.category.replace(/_/g,' ')}</em>`,
        p.address  && p.address,
        p.city     && p.city,
        p.phone    && p.phone,
        p.website  && `<a href="${p.website}" target="_blank" style="color:#60a5fa;word-break:break-all">${p.website.replace(/^https?:\/\//, '')}</a>`,
        p.id       && `<span style="opacity:.5;font-size:.65rem">${p.id}</span>`,
      ].filter(Boolean)
      getPopup().setLngLat(e.features[0].geometry.coordinates.slice())
        .setHTML(`<div class="od-popup">${lines.join('<br>')}</div>`)
        .addTo(map)
    })
    map.on('mouseleave', circleId, () => { map.getCanvas().style.cursor = ''; popup?.remove() })

  } else if (isLine) {
    const lineId = `${sourceId}-line`
    map.addLayer({
      id: lineId, type: 'line', source: sourceId,
      paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 0.8 },
    })
    addedIds.push(lineId)
    map.on('mouseenter', lineId, (e: any) => {
      map.getCanvas().style.cursor = 'pointer'
      const p = e.features[0].properties
      getPopup().setLngLat(e.lngLat)
        .setHTML(`<div class="od-popup"><em>Transportation</em>${p.id ? `<br><span style="opacity:.6;font-size:.65rem">${p.id}</span>` : ''}</div>`)
        .addTo(map)
    })
    map.on('mouseleave', lineId, () => { map.getCanvas().style.cursor = ''; popup?.remove() })

  } else {
    const fillId = `${sourceId}-fill`
    const lineId = `${sourceId}-line`
    map.addLayer({ id: fillId, type: 'fill',   source: sourceId, paint: { 'fill-color': color, 'fill-opacity': 0.4 } })
    map.addLayer({ id: lineId, type: 'line',   source: sourceId, paint: { 'line-color': color, 'line-width': 1 } })
    addedIds.push(fillId, lineId)
    map.on('mouseenter', fillId, (e: any) => {
      map.getCanvas().style.cursor = 'pointer'
      const p = e.features[0].properties
      getPopup().setLngLat(e.lngLat)
        .setHTML(`<div class="od-popup"><em>${theme}</em>${p.id ? `<br><span style="opacity:.6;font-size:.65rem">${p.id}</span>` : ''}</div>`)
        .addTo(map)
    })
    map.on('mouseleave', fillId, () => { map.getCanvas().style.cursor = ''; popup?.remove() })
  }

  return addedIds
}

const removeMapLayer = (id: string) => {
  const idx = mapLayers.value.findIndex(l => l.id === id)
  if (idx === -1) return
  const layer = mapLayers.value[idx]
  if (map) {
    for (const lid of layer.mapLayerIds) { if (map.getLayer(lid)) map.removeLayer(lid) }
    if (map.getSource(id)) map.removeSource(id)
  }
  mapLayers.value.splice(idx, 1)
}

const toggleMapLayer = (id: string) => {
  const layer = mapLayers.value.find(l => l.id === id)
  if (!layer || !map) return
  layer.visible = !layer.visible
  const vis = layer.visible ? 'visible' : 'none'
  for (const lid of layer.mapLayerIds) {
    if (map.getLayer(lid)) map.setLayoutProperty(lid, 'visibility', vis)
  }
}

const changeLayerColor = (id: string, newColor: string, close = false) => {
  const layer = mapLayers.value.find(l => l.id === id)
  if (!layer) return
  layer.color = newColor
  if (close) colorPickerOpenId.value = null
  if (!map) return
  for (const lid of layer.mapLayerIds) {
    if (!map.getLayer(lid)) continue
    if      (lid.endsWith('-circle')) map.setPaintProperty(lid, 'circle-color', newColor)
    else if (lid.endsWith('-fill'))   map.setPaintProperty(lid, 'fill-color',   newColor)
    else if (lid.endsWith('-line'))   map.setPaintProperty(lid, 'line-color',   newColor)
  }
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

    // Use all descendant ids so selecting a parent category (e.g. "eat_and_drink")
    // returns all children (restaurant, cafe, bar, …) not just exact matches
    let catWhere = ''
    if (selectedTheme.value === 'places' && selectedPath.value.length > 0) {
      const ids = getAllDescendantIds(selectedPath.value)
      const inList = ids.map(id => `'${id}'`).join(', ')
      catWhere = `categories.primary IN (${inList}) AND `
    }
    // For point features (places/addresses) derive lon/lat from bbox struct — no spatial ext needed
    const isPoint   = theme === 'places' || theme === 'addresses'
    // For places: flatten the most useful nested fields into top-level columns
    // names.primary → name, websites[1] → website, phones[1] → phone,
    // categories.primary → category, addresses[1].freeform → address
    const geoSelect = theme === 'places'
      ? `id,
         names.primary AS name,
         categories.primary AS category,
         categories.alternate[1] AS category_alt,
         confidence,
         websites[1] AS website,
         phones[1] AS phone,
         emails[1] AS email,
         addresses[1].freeform AS address,
         addresses[1].locality AS city,
         addresses[1].region AS state,
         addresses[1].postcode AS postcode,
         addresses[1].country AS country,
         brand.names.primary AS brand,
         operating_status,
         bbox.xmin AS longitude,
         bbox.ymin AS latitude,
         sources[1].dataset AS source,
         geometry`
      : isPoint
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

    // Build in-browser GeoJSON from the parquet and add to map (max 5 000 features)
    try {
      const sourceId   = `od-data-${layerCounter}`
      // Sequential colour: places cycle through LAYER_PALETTE; other themes use fixed theme colour
      const layerColor = theme === 'places'
        ? LAYER_PALETTE[layerCounter % LAYER_PALETTE.length]
        : getThemeColor(theme)
      layerCounter++
      const { geojson, displayRows } = await buildGeoJSONForMap(fileName, theme, cat, conn, layerColor)
      if (geojson && displayRows > 0) {
        const themeLabel = THEMES.find(t => t.id === theme)?.label ?? theme
        const label = cat ? `${themeLabel} — ${cat.replace(/_/g, ' ')}` : themeLabel
        const entry: MapLayer = {
          id: sourceId, label, theme, category: cat,
          color: layerColor,
          rows: displayRows, visible: true, mapLayerIds: [],
        }
        mapLayers.value.push(entry)
        entry.mapLayerIds = addLayerToMap(entry, geojson)
        showLayers.value = true
      }
    } catch { /* map preview failures are non-fatal */ }
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
    center: [151.2093, -33.8688],
    zoom: 10,
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
    // Don't draw bbox on load — only show it after user draws or sets one
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
    bboxDrawn.value = true
  })
}

onMounted(() => {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = MAPLIBRE_CSS
  document.head.appendChild(link)

  loadScript(MAPLIBRE_JS).then(initMap).catch(console.error)
  document.addEventListener('click', handleSearchClickOutside)
})

onUnmounted(() => {
  map?.remove()
  map = null
  document.removeEventListener('click', handleSearchClickOutside)
  if (searchDebounce) clearTimeout(searchDebounce)
})
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.od-page {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #0a0a12;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Figtree', 'Segoe UI', system-ui, sans-serif;
}

/* Map fills the whole page */
.od-map {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ── Left floating panel ──────────────────────────────────────────────── */
.od-search-wrapper {
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 340px;
  z-index: 20;
}

.od-search-container {
  display: flex;
  align-items: center;
  gap: 4px;
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
}

.od-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: hsl(var(--foreground));
  font-size: 0.82rem;
  padding: 0.45rem 0.6rem;
  font-family: inherit;
}
.od-search-input::placeholder {
  color: hsl(var(--muted-foreground));
  opacity: 0.7;
}

.od-search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}
.od-search-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

.od-search-clear {
  color: hsl(var(--muted-foreground));
  opacity: 0.7;
}
.od-search-clear:hover {
  opacity: 1;
  color: hsl(var(--foreground));
  background: hsl(var(--accent));
}

.od-suggestions {
  margin-top: 6px;
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.35);
  overflow: hidden;
}

.od-suggestion {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.78rem;
  color: hsl(var(--foreground));
  cursor: pointer;
  border-bottom: 1px solid hsl(var(--border));
  transition: background 0.12s;
}
.od-suggestion:last-child { border-bottom: none; }
.od-suggestion:hover { background: hsl(var(--accent) / 0.5); }
.od-suggestion svg { color: hsl(var(--muted-foreground)); margin-top: 2px; }

.od-suggestion-name {
  flex: 1;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.od-panel {
  position: absolute;
  top: calc(1rem + 48px + 0.75rem);
  left: 1rem;
  bottom: 1rem;
  width: 340px;
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 10;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2);
}

.od-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem 1rem 0.85rem;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
  gap: 0.5rem;
}

.od-panel-header .od-header {
  padding-bottom: 0;
  border-bottom: none;
  margin-bottom: 0;
}

.od-chevron-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid hsl(var(--border));
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 2px;
  transition: background 0.15s, color 0.15s;
}
.od-chevron-btn:hover {
  background: hsl(var(--border));
  color: hsl(var(--foreground));
}

.od-panel-inner {
  flex: 1;
  overflow-y: auto;
  padding: 0 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── FAB toggle buttons ───────────────────────────────────────────────── */
.od-fab {
  position: absolute;
  top: 1rem;
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
.od-fab:hover {
  background: hsl(var(--card));
  box-shadow: 0 4px 18px rgba(0,0,0,0.4);
}
.od-fab--left  { left: 1rem; }
.od-fab--right { right: 1rem; }

.od-fab-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  font-size: 0.55rem;
  font-weight: 700;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid hsl(var(--background));
}

/* ── Right layers panel ──────────────────────────────────────────────────── */
.od-layers-panel {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 340px;
  max-height: calc(100vh - 2rem);
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 10;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2);
}

.od-layers-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.od-layer-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.od-layer-list::-webkit-scrollbar { width: 4px; }
.od-layer-list::-webkit-scrollbar-track { background: transparent; }
.od-layer-list::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

.od-layer-row-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.od-layer-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.25rem 0.15rem;
}

.od-layer-swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.12);
}

.od-layer-swatch--btn {
  border: none;
  padding: 0;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
}
.od-layer-swatch--btn:hover {
  transform: scale(1.35);
  box-shadow: 0 0 0 2px rgba(255,255,255,0.35);
}

/* Color palette popover */
.od-color-picker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: 0.4rem 0.5rem;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.od-color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.1);
  transition: transform 0.1s, border-color 0.1s;
  flex-shrink: 0;
}
.od-color-swatch:hover  { transform: scale(1.3); }
.od-color-swatch--active {
  border-color: #fff;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.6);
  transform: scale(1.15);
}

.od-color-custom {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  transition: background 0.12s;
}
.od-color-custom:hover { background: hsl(var(--border)); }

.od-color-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  border: none;
  padding: 0;
}

.od-layer-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.od-layer-name {
  font-size: 0.68rem;
  font-weight: 500;
  color: hsl(var(--foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.od-layer-meta {
  font-size: 0.6rem;
  color: hsl(var(--muted-foreground));
}

.od-layer-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
  font-size: 0.85rem;
  padding: 0.1rem 0.2rem;
  border-radius: 4px;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.od-layer-btn:hover { color: hsl(var(--foreground)); background: hsl(var(--border)); }
.od-layer-btn--muted { opacity: 0.35; }
.od-layer-btn--remove:hover { color: #ef4444; background: rgba(239,68,68,0.12); }

/* slide transitions */
.od-slide-left-enter-active,
.od-slide-left-leave-active {
  transition: transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease;
}
.od-slide-left-enter-from,
.od-slide-left-leave-to {
  transform: translateX(-1.5rem);
  opacity: 0;
}

.od-slide-right-enter-active,
.od-slide-right-leave-active {
  transition: transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease;
}
.od-slide-right-enter-from,
.od-slide-right-leave-to {
  transform: translateX(1.5rem);
  opacity: 0;
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

.od-view-count {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  color: hsl(var(--muted-foreground));
  margin-top: 0.25rem;
  opacity: 0.75;
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
  font-size: 0.74rem;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Figtree', 'Segoe UI', system-ui, sans-serif;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.od-msg-info    { background: hsl(var(--muted) / 0.6); color: hsl(var(--muted-foreground)); border: 1px solid hsl(var(--border)); }
.od-msg-warn    { background: rgba(245,158,11,0.08); color: #b45309; border: 1px solid rgba(245,158,11,0.3); }
.od-msg-success { background: hsl(var(--muted) / 0.6); color: hsl(var(--foreground)); border: 1px solid hsl(var(--border)); }
.od-msg-error   { background: rgba(220,38,38,0.08);  color: #dc2626; border: 1px solid rgba(220,38,38,0.3); }

.od-result-row {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  font-size: 0.74rem;
  font-family: inherit;
}

.od-result-secondary {
  color: hsl(var(--muted-foreground));
  font-size: 0.68rem;
}

.od-result-file-group {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.od-result-file {
  word-break: break-all;
  font-family: inherit;
}

.od-result-size {
  font-family: inherit;
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

/* ── MapLibre popup ──────────────────────────────────────────────────────── */
:global(.maplibregl-popup-content) {
  background: rgba(10,10,22,0.92) !important;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1) !important;
  border-radius: 8px !important;
  padding: 0.5rem 0.65rem !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.55) !important;
}
:global(.maplibregl-popup-tip) {
  display: none !important;
}
:global(.od-popup) {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Figtree', 'Segoe UI', system-ui, sans-serif;
  font-size: 0.72rem;
  line-height: 1.6;
  color: #e2e8f0;
}

/* ── Panel footer ─────────────────────────────────────────────────────────── */
.od-panel-footer {
  flex-shrink: 0;
  padding: 0.65rem 1rem;
  border-top: 1px solid hsl(var(--border));
  display: flex;
  align-items: center;
}

.od-bug-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0;
  opacity: 0.6;
  transition: opacity 0.15s, color 0.15s;
}
.od-bug-btn:hover {
  opacity: 1;
  color: hsl(var(--foreground));
}

/* ── Bug report modal ─────────────────────────────────────────────────────── */
.od-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.od-modal {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Figtree', 'Segoe UI', system-ui, sans-serif;
}

.od-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid hsl(var(--border));
}

.od-modal-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0;
}

.od-modal-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

.od-bug-context {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.75rem;
  font-size: 0.68rem;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 0.4);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  margin-bottom: 0.25rem;
}

.od-bug-textarea,
.od-bug-input {
  width: 100%;
  margin-top: 0.4rem;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  color: hsl(var(--foreground));
  font-size: 0.8rem;
  padding: 0.5rem 0.65rem;
  box-sizing: border-box;
  outline: none;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.15s;
}
.od-bug-textarea:focus,
.od-bug-input:focus {
  border-color: hsl(var(--ring));
}
.od-bug-input {
  resize: none;
}

.od-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid hsl(var(--border));
}

/* ── Modal fade transition ───────────────────────────────────────────────── */
.od-fade-enter-active,
.od-fade-leave-active {
  transition: opacity 0.18s ease;
}
.od-fade-enter-from,
.od-fade-leave-to {
  opacity: 0;
}
</style>
