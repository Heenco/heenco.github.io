<template>
  <!-- ─── Reach FAB ──────────────────────────────────────────────────────── -->
  <button
    v-show="!hidden"
    class="rp-fab"
    :class="{ 'rp-fab--active': isOpen }"
    :style="{ top: fabTop }"
    @click="isOpen = !isOpen"
    :title="isOpen ? 'Close Reach Analysis' : 'Reach Analysis — accessibility score'"
  >
    <!-- Walking figure / reach icon -->
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/>
      <path d="M9 12l3-7 3 7"/>
      <path d="M7 17l2-5h6l2 5"/>
      <line x1="9" y1="17" x2="7" y2="21"/>
      <line x1="15" y1="17" x2="17" y2="21"/>
    </svg>
    <span v-if="overallScore !== null && !isOpen" class="rp-fab-badge">{{ overallScore }}</span>
  </button>

  <!-- ─── Reach Panel ────────────────────────────────────────────────────── -->
  <transition name="rp-drop">
    <div v-if="isOpen" class="rp-panel" :style="{ top: panelTop, maxHeight: panelMaxHeight, width: panelWidth + 'px' }">
      <div class="rp-resize-handle" @mousedown.prevent="startResize" />

      <!-- Header -->
      <div class="rp-header">
        <div class="rp-title-wrap">
          <span class="rp-title">Reach</span>
          <span class="rp-subtitle">Accessibility Analysis</span>
        </div>
        <div class="rp-tabs">
          <button class="rp-tab" :class="{ 'rp-tab--on': view === 'analysis' }" @click="view = 'analysis'">Analysis</button>
          <button class="rp-tab" :class="{ 'rp-tab--on': view === 'settings' }" @click="view = 'settings'">Settings</button>
        </div>
        <button class="rp-close" @click="isOpen = false" title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- ── Settings ─────────────────────────────────────────────────── -->
      <div v-show="view === 'settings'" class="rp-body">
        <div class="rp-field">
          <label class="rp-label">Travel mode</label>
          <div class="rp-mode-row">
            <button
              v-for="m in MODES"
              :key="m.value"
              class="rp-mode-btn"
              :class="{ 'rp-mode-btn--on': isoProfile === m.value }"
              @click="isoProfile = m.value as 'walking' | 'cycling' | 'driving'"
            >
              <span v-html="m.svg" class="rp-mode-icon"></span>
              {{ m.label }}
            </button>
          </div>
        </div>
        <div class="rp-field">
          <label class="rp-label">Travel time (minutes)</label>
          <div class="rp-time-row">
            <button
              v-for="t in TIME_OPTIONS"
              :key="t"
              class="rp-time-btn"
              :class="{ 'rp-time-btn--on': isoMinutes === t }"
              @click="isoMinutes = t"
            >{{ t }}m</button>
          </div>
        </div>
        <div class="rp-field">
          <label class="rp-label">Categories</label>
          <div class="rp-cat-toggles">
            <div v-for="cat in CATEGORIES" :key="cat.id" class="rp-cat-toggle">
              <span class="rp-cat-icon" :style="{ color: cat.color }" v-html="cat.svg"></span>
              <span class="rp-cat-toggle-label">{{ cat.label }}</span>
              <!-- shadcn-style switch -->
              <button
                class="rp-switch"
                :class="{ 'rp-switch--on': (enabledCats as string[]).includes(cat.id) }"
                :aria-checked="(enabledCats as string[]).includes(cat.id)"
                role="switch"
                @click="toggleCat(cat.id)"
              >
                <span class="rp-switch-thumb"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Analysis ─────────────────────────────────────────────────── -->
      <div v-show="view === 'analysis'" class="rp-body">

        <!-- Hint: needs a point -->
        <div v-if="!point" class="rp-hints">
          <div class="rp-hint">
            <span class="rp-hint-dot" />
            <span>Search an address to place a point</span>
          </div>
        </div>

        <!-- Point pill + Run -->
        <template v-else>
          <div class="rp-point-pill">
            <span class="rp-point-swatch" />
            <span class="rp-point-label">{{ point.label || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}` }}</span>
            <span class="rp-point-meta">{{ isoMinutes }}m {{ isoProfile }}</span>
          </div>

          <button class="rp-run" :disabled="running" @click="runAnalysis">
            <svg v-if="!running" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rp-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <span>{{ running ? runStatus : 'Run Accessibility Analysis' }}</span>
          </button>
        </template>

        <!-- Error -->
        <div v-if="runError" class="rp-error">⚠ {{ runError }}</div>

        <!-- Results -->
        <template v-if="results.length > 0">
          <!-- Overall score -->
          <div class="rp-score-card">
            <div class="rp-score-circle" :class="scoreClass(overallScore)">
              <span class="rp-score-num">{{ overallScore }}</span>
            </div>
            <div class="rp-score-info">
              <span class="rp-score-label">{{ scoreName(overallScore) }}</span>
              <span class="rp-score-sub">{{ isoMinutes }}-min {{ isoProfile }} catchment</span>
            </div>
          </div>

          <!-- Per-category rows -->
          <div class="rp-cats">
            <div
              v-for="cat in results"
              :key="cat.id"
              class="rp-cat-row"
              @click="toggleCatDetail(cat.id)"
            >
              <span class="rp-cat-icon" :style="{ color: cat.color }" v-html="CATEGORIES.find(c => c.id === cat.id)?.svg"></span>
              <span class="rp-cat-name">{{ cat.label }}</span>
              <span class="rp-cat-badge" :class="`rp-cat-badge--${cat.grade.toLowerCase()}`">{{ cat.grade }}</span>
              <button
                class="rp-switch rp-switch--sm"
                :class="{ 'rp-switch--on': (enabledCats as string[]).includes(cat.id) }"
                :aria-checked="(enabledCats as string[]).includes(cat.id)"
                role="switch"
                @click.stop="toggleCat(cat.id)"
              >
                <span class="rp-switch-thumb"></span>
              </button>
            </div>
          </div>

          <!-- Total POI count -->
          <div class="rp-total">
            {{ totalPois.toLocaleString() }} points of interest found
            <span class="rp-toggle-link" @click="detailOpen = !detailOpen">
              {{ detailOpen ? 'Hide Details' : 'Show Details' }}
            </span>
          </div>

          <!-- Detail: category tabs + POI list -->
          <div v-if="detailOpen" class="rp-detail">
            <div class="rp-detail-tabs">
              <button
                v-for="cat in results"
                :key="cat.id"
                class="rp-detail-tab"
                :class="{ 'rp-detail-tab--on': detailCat === cat.id }"
                @click="detailCat = cat.id as CatId"
              >{{ cat.label }}</button>
            </div>
            <div class="rp-poi-list">
              <div v-for="poi in activeCatPois" :key="poi.id" class="rp-poi-row">
                <span class="rp-poi-name">{{ poi.name }}</span>
                <div class="rp-poi-right">
                  <span class="rp-poi-dist">{{ formatDist(poi.dist) }}</span>
                  <span class="rp-poi-bar" :style="{ width: poiBarWidth(poi.dist) }"></span>
                </div>
              </div>
              <div v-if="activeCatPois.length === 0" class="rp-poi-empty">No POIs found in this category</div>
              <div v-if="activeResult" class="rp-poi-footer">
                Showing {{ activeCatPois.length }} of {{ activeResult.count }} nearby {{ activeResult.label.toLowerCase() }} locations
              </div>
            </div>
          </div>
        </template>
      </div>

    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SpatialPoint { lng: number; lat: number; label?: string }
interface Poi {
  id: string; name: string; dist: number; lat: number; lng: number
  website?: string; phone?: string; hours?: string; cuisine?: string; operator?: string
}
interface CatResult {
  id: string; label: string; color: string
  grade: 'High' | 'Medium' | 'Low' | 'None'
  score: number   // 0-100
  count: number
  pois: Poi[]
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MODES = [
  { value: 'walking',  label: 'Walk',  svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="3" r="1.5"/><path d="M6 20l3.3-6.6L12 15l3-4.5"/><path d="M6.5 9.5C8 8 10 7.5 12 8l2.5 1.5L18 8"/><path d="M9.5 20.5l.8-4.5"/><path d="M14.5 16l1.5 4.5"/></svg>` },
  { value: 'cycling',  label: 'Cycle', svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 17l4-9h3l3 4h-3l-3 5"/><path d="M12 8l2 4"/><circle cx="14" cy="5" r="1.5"/></svg>` },
  { value: 'driving',  label: 'Drive', svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17H5a2 2 0 01-2-2v-3l2-6h14l2 6v3a2 2 0 01-2 2h-2"/><path d="M7 17a2 2 0 004 0"/><path d="M13 17a2 2 0 004 0"/><line x1="3" y1="11" x2="21" y2="11"/></svg>` },
]
const TIME_OPTIONS = [5, 10, 15, 20]

const CATEGORIES = [
  { id: 'grocery', label: 'Grocery', color: '#22c55e', svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`, overpass: `node["shop"~"supermarket|greengrocer|convenience|grocery|deli"](poly:"{poly}");way["shop"~"supermarket|greengrocer|convenience|grocery"](poly:"{poly}");` },
  { id: 'dining',  label: 'Dining',  color: '#f97316', svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>`, overpass: `node["amenity"~"restaurant|cafe|fast_food|food_court|bar|pub"](poly:"{poly}");way["amenity"~"restaurant|cafe|fast_food"](poly:"{poly}");` },
  { id: 'parks',   label: 'Parks',   color: '#16a34a', svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14l-5-9-5 9h4v7h2v-7z"/><path d="M7 14H3l4-7"/><path d="M21 14h-4l-4-7"/></svg>`, overpass: `node["leisure"~"park|nature_reserve|garden|playground"](poly:"{poly}");way["leisure"~"park|nature_reserve|garden|playground"](poly:"{poly}");` },
  { id: 'schools', label: 'Schools', color: '#6366f1', svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`, overpass: `node["amenity"~"school|university|college|kindergarten"](poly:"{poly}");way["amenity"~"school|university|college|kindergarten"](poly:"{poly}");` },
  { id: 'retail',  label: 'Retail',  color: '#ec4899', svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg>`, overpass: `node["shop"](poly:"{poly}");way["shop"](poly:"{poly}");` },
  { id: 'transit', label: 'Transit', color: '#0ea5e9', svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21l2-4H2"/><path d="M16 21l-2-4h8"/><line x1="2" y1="11" x2="22" y2="11"/></svg>`, overpass: `node["highway"="bus_stop"](poly:"{poly}");node["railway"~"station|halt|tram_stop"](poly:"{poly}");node["amenity"~"bus_station|ferry_terminal"](poly:"{poly}");` },
  { id: 'health',  label: 'Health',  color: '#f43f5e', svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`, overpass: `node["amenity"~"hospital|clinic|doctors|pharmacy|dentist"](poly:"{poly}");way["amenity"~"hospital|clinic|doctors"](poly:"{poly}");` },
] as const

type CatId = typeof CATEGORIES[number]['id']

// ── Props / emit ──────────────────────────────────────────────────────────────
const props = defineProps<{
  point: SpatialPoint | null
  mapboxToken: string
  siBotPx?: number          // bottom pixel of SI panel (for stacking)
  layersPanelBottom?: number
  layersFabVisible?: boolean
  hidden?: boolean          // hide this FAB when another panel is open
}>()

const emit = defineEmits<{
  isochroneGeoJSON: [geojson: any | null]
  poisUpdate: [layers: Record<string, { color: string; geojson: any }> | null]
  catVisibility: [enabled: string[]]
  openChange:   [open: boolean]
}>()

// ── UI state ──────────────────────────────────────────────────────────────────
const isOpen     = ref(false)
const panelWidth = ref(360)

function startResize(e: MouseEvent) {
  const startX = e.clientX
  const startW = panelWidth.value
  const onMove = (ev: MouseEvent) => {
    panelWidth.value = Math.max(220, Math.min(600, startW + (startX - ev.clientX)))
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

watch(isOpen, v => emit('openChange', v))
watch(() => props.hidden, v => { if (v) isOpen.value = false })
const view       = ref<'analysis' | 'settings'>('analysis')
const detailOpen = ref(true)
const detailCat  = ref<CatId>('grocery')

// ── Settings state ────────────────────────────────────────────────────────────
const isoProfile = ref<'walking' | 'cycling' | 'driving'>('walking')
const isoMinutes = ref(15)
const enabledCats = ref<CatId[]>(CATEGORIES.map(c => c.id))

function toggleCat(id: string) {
  const idx = (enabledCats.value as string[]).indexOf(id)
  if (idx === -1) enabledCats.value = [...enabledCats.value, id as CatId]
  else enabledCats.value = enabledCats.value.filter(c => c !== id)
}

// ── Run state ─────────────────────────────────────────────────────────────────
const running   = ref(false)
const runStatus = ref('')
const runError  = ref('')
const results   = ref<CatResult[]>([])

// ── Positioning (stack below SI FAB) ─────────────────────────────────────────
const fabTop = computed(() => {
  if (props.siBotPx) return `${props.siBotPx + 8}px`
  if (props.layersPanelBottom) return `${props.layersPanelBottom + 8 + 40 + 8 + 40 + 8}px`
  if (props.layersFabVisible) return 'calc(1rem + 96px + 48px)'
  return 'calc(1rem + 96px)'
})
const panelTop = computed(() => {
  if (props.siBotPx) return `${props.siBotPx + 8 + 40 + 8}px`
  if (props.layersPanelBottom) return `${props.layersPanelBottom + 8 + 40 + 8 + 40 + 8 + 40 + 8}px`
  return 'calc(1rem + 144px)'
})
const panelMaxHeight = computed(() => `calc(100vh - ${panelTop.value} - 1rem)`)

// ── Computed ──────────────────────────────────────────────────────────────────
const overallScore = computed<number | null>(() => {
  if (!results.value.length) return null
  const total = results.value.reduce((s, r) => s + r.score, 0)
  return Math.round(total / results.value.length)
})

const totalPois = computed(() => results.value.reduce((s, r) => s + r.count, 0))

const activeResult = computed(() => results.value.find(r => r.id === detailCat.value) ?? null)

const activeCatPois = computed(() => {
  const r = activeResult.value
  if (!r) return []
  return [...r.pois].sort((a, b) => a.dist - b.dist)
})

const maxPoiDist = computed(() => Math.max(...activeCatPois.value.map(p => p.dist), 1))

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`
}

function poiBarWidth(dist: number) {
  return `${Math.max(4, (1 - dist / maxPoiDist.value) * 48)}px`
}

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function gradePoi(count: number, nearestM: number): { grade: CatResult['grade']; score: number } {
  if (count === 0) return { grade: 'None', score: 0 }
  // nearest within 200m = bonus
  const nearBonus = nearestM < 200 ? 20 : nearestM < 500 ? 10 : 0
  const countScore = Math.min(count * 3, 60)
  const raw = Math.min(countScore + nearBonus, 100)
  const grade = raw >= 70 ? 'High' : raw >= 35 ? 'Medium' : 'Low'
  return { grade: grade as CatResult['grade'], score: raw }
}

function scoreClass(s: number | null) {
  if (s === null) return ''
  if (s >= 70) return 'rp-score-circle--high'
  if (s >= 40) return 'rp-score-circle--med'
  return 'rp-score-circle--low'
}

function scoreName(s: number | null) {
  if (s === null) return ''
  if (s >= 70) return 'Very Walkable'
  if (s >= 50) return 'Walkable'
  if (s >= 30) return 'Car-Dependent'
  return 'Very Car-Dependent'
}

function toggleCatDetail(id: string) {
  detailCat.value = id as CatId
  detailOpen.value = true
}

function polyToOverpassStr(coords: number[][]) {
  return coords.map(([lng, lat]) => `${lat} ${lng}`).join(' ')
}

// ── Isochrone ─────────────────────────────────────────────────────────────────
async function fetchIsochrone(): Promise<number[][] | null> {
  const { lng, lat } = props.point!
  const token = props.mapboxToken
  const url = `https://api.mapbox.com/isochrone/v1/mapbox/${isoProfile.value}/${lng},${lat}?contours_minutes=${isoMinutes.value}&polygons=true&access_token=${token}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Isochrone API ${res.status}`)
  const data = await res.json()
  const feature = data?.features?.[0]
  if (!feature) throw new Error('No isochrone returned')
  emit('isochroneGeoJSON', data)
  // Return outer ring coordinates
  return feature.geometry.coordinates[0] as number[][]
}

// ── Overpass ──────────────────────────────────────────────────────────────────
async function fetchCategory(cat: typeof CATEGORIES[number], polyStr: string, origin: SpatialPoint): Promise<CatResult> {
  const query = cat.overpass.replaceAll('{poly}', polyStr)
  const body = `[out:json][timeout:25];\n(\n${query}\n);\nout center;`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body,
  })
  if (!res.ok) throw new Error(`Overpass ${res.status} for ${cat.label}`)
  const data = await res.json()
  const elements: any[] = data.elements ?? []

  const pois: Poi[] = elements
    .filter(e => e.tags?.name)
    .map(e => {
      const lat = e.lat ?? e.center?.lat ?? 0
      const lng = e.lon ?? e.center?.lon ?? 0
      return {
        id: String(e.id),
        name: e.tags.name,
        dist: haversineDist(origin.lat, origin.lng, lat, lng),
        lat,
        lng,
        website:  e.tags.website || e.tags['contact:website'] || undefined,
        phone:    e.tags.phone   || e.tags['contact:phone']   || undefined,
        hours:    e.tags.opening_hours || undefined,
        cuisine:  e.tags.cuisine  || undefined,
        operator: e.tags.operator || undefined,
      }
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 200)

  const count = elements.length
  const nearest = pois[0]?.dist ?? Infinity
  const { grade, score } = gradePoi(count, nearest)

  return { id: cat.id, label: cat.label, color: cat.color, grade, score, count, pois }
}

// ── Run ───────────────────────────────────────────────────────────────────────
async function runAnalysis() {
  if (!props.point) return
  running.value = true
  runError.value = ''
  results.value = []
  detailOpen.value = false
  emit('isochroneGeoJSON', null)
  emit('poisUpdate', null)

  try {
    runStatus.value = 'Fetching isochrone…'
    const coords = await fetchIsochrone()
    if (!coords) throw new Error('Empty isochrone')
    const polyStr = polyToOverpassStr(coords)

    const activeCats = CATEGORIES.filter(c => (enabledCats.value as string[]).includes(c.id))
    const catResults: CatResult[] = []

    for (let i = 0; i < activeCats.length; i++) {
      const cat = activeCats[i]!
      runStatus.value = `Fetching ${cat.label} (${i + 1}/${activeCats.length})…`
      try {
        catResults.push(await fetchCategory(cat, polyStr, props.point!))
      } catch {
        catResults.push({ id: cat.id, label: cat.label, color: cat.color, grade: 'None', score: 0, count: 0, pois: [] })
      }
    }

    results.value = catResults
    if (catResults.length > 0) detailCat.value = catResults[0]!.id as CatId
    detailOpen.value = true
    emitPois(catResults)
  } catch (e: any) {
    runError.value = e?.message ?? 'Analysis failed'
    emit('isochroneGeoJSON', null)
    emit('poisUpdate', null)
  } finally {
    running.value = false
    runStatus.value = ''
  }
}

function emitPois(catResults: CatResult[]) {
  const layers: Record<string, { color: string; geojson: any }> = {}
  for (const r of catResults) {
    layers[r.id] = {
      color: r.color,
      geojson: {
        type: 'FeatureCollection',
        features: r.pois.map(p => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: {
            name: p.name,
            dist: p.dist,
            catId: r.id,
            color: r.color,
            label: r.label,
            website:  p.website  ?? null,
            phone:    p.phone    ?? null,
            hours:    p.hours    ?? null,
            cuisine:  p.cuisine  ?? null,
            operator: p.operator ?? null,
          },
        })),
      },
    }
  }
  emit('poisUpdate', layers)
  emit('catVisibility', enabledCats.value as string[])
}

// Sync switch state → layer visibility while results are showing
watch(enabledCats, (val) => {
  if (results.value.length) emit('catVisibility', val as string[])
})

// Clear results when point changes
watch(() => props.point, () => {
  results.value = []
  runError.value = ''
  detailOpen.value = false
  emit('isochroneGeoJSON', null)
  emit('poisUpdate', null)
})
</script>

<style scoped>
/* ── Global ──────────────────────────────────────────────────────────────── */
:deep(*) { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Figtree', 'Segoe UI', system-ui, sans-serif; }

/* ── FAB ─────────────────────────────────────────────────────────────────── */
.rp-fab {
  position: absolute;
  right: 1rem;
  z-index: 20;
  width: 40px; height: 40px;
  border-radius: 50%;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  color: hsl(var(--foreground));
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, box-shadow 0.15s, color 0.15s;
}
.rp-fab:hover { background: hsl(var(--card)); box-shadow: 0 4px 18px rgba(0,0,0,0.4); }
.rp-fab--active { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); }

.rp-fab-badge {
  position: absolute; top: -4px; right: -4px;
  background: #22c55e; color: #000;
  font-size: 0.60rem; font-weight: 500;
  min-width: 16px; height: 16px;
  border-radius: 8px; padding: 0 3px;
  display: flex; align-items: center; justify-content: center;
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
.rp-panel {
  position: absolute;
  right: 1rem;
  z-index: 19;
  min-width: 220px;
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(14px);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* ── Transition ──────────────────────────────────────────────────────────── */
.rp-drop-enter-active, .rp-drop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.rp-drop-enter-from, .rp-drop-leave-to { opacity: 0; transform: translateY(-6px); }
.rp-resize-handle {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 5px;
  cursor: ew-resize;
  z-index: 10;
  border-radius: 6px 0 0 6px;
  transition: background 0.15s;
}
.rp-resize-handle:hover, .rp-resize-handle:active {
  background: hsl(var(--primary) / 0.2);
}
/* ── Header ──────────────────────────────────────────────────────────────── */
.rp-header {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 0.65rem 0.35rem;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}
.rp-title-wrap { display: flex; flex-direction: column; margin-right: auto; }
.rp-title { font-size: 0.85rem; font-weight: 400; color: hsl(var(--foreground)); line-height: 1.1; }
.rp-subtitle { font-size: 0.74rem; color: hsl(var(--muted-foreground)); }

.rp-tabs { display: flex; gap: 0.15rem; background: hsl(var(--muted)/0.4); border-radius: 6px; padding: 2px; }
.rp-tab {
  font-size: 0.77rem; font-weight: 500; padding: 0.18rem 0.55rem;
  border-radius: 4px; border: none; background: transparent;
  color: hsl(var(--muted-foreground)); cursor: pointer; transition: all 0.12s;
}
.rp-tab--on { background: hsl(var(--card)); color: hsl(var(--foreground)); box-shadow: 0 1px 4px rgba(0,0,0,0.15); }

.rp-close {
  width: 22px; height: 22px; border-radius: 50%; border: none;
  background: transparent; color: hsl(var(--muted-foreground));
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.rp-close:hover { background: hsl(var(--muted)/0.5); color: hsl(var(--foreground)); }

/* ── Body ────────────────────────────────────────────────────────────────── */
.rp-body {
  overflow-y: auto; padding: 0.6rem 0.65rem;
  display: flex; flex-direction: column; gap: 0.5rem;
  flex: 1;
}

/* ── Settings ────────────────────────────────────────────────────────────── */
.rp-field { display: flex; flex-direction: column; gap: 0.22rem; }
.rp-label { font-size: 0.75rem; font-weight: 600; color: hsl(var(--foreground)); }

.rp-mode-row { display: flex; gap: 0.3rem; }
.rp-mode-btn {
  flex: 1; padding: 0.3rem 0.2rem;
  border: 1px solid hsl(var(--border)); border-radius: 7px;
  background: hsl(var(--muted)/0.3); color: hsl(var(--foreground));
  font-size: 0.77rem; font-weight: 500; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
  transition: all 0.12s;
}
.rp-mode-btn--on { border-color: hsl(var(--primary) / 0.6); background: hsl(var(--muted) / 0.6); color: hsl(var(--foreground)); }
.rp-mode-icon { line-height: 1; display: flex; align-items: center; justify-content: center; }

.rp-time-row { display: flex; gap: 0.3rem; }
.rp-time-btn {
  flex: 1; padding: 0.28rem;
  border: 1px solid hsl(var(--border)); border-radius: 6px;
  background: hsl(var(--muted)/0.3); color: hsl(var(--foreground));
  font-size: 0.77rem; font-weight: 500; cursor: pointer;
  transition: all 0.12s;
}
.rp-time-btn--on { border-color: hsl(var(--primary)); background: hsl(var(--primary)/0.12); color: hsl(var(--primary)); }

.rp-cat-toggles { display: flex; flex-direction: column; gap: 0; }
.rp-cat-toggle {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.22rem 0.1rem;
  border-bottom: 1px solid hsl(var(--border) / 0.3);
}
.rp-cat-toggle:last-child { border-bottom: none; }
.rp-cat-icon { display: flex; align-items: center; flex-shrink: 0; opacity: 0.85; }
.rp-cat-toggle-label { flex: 1; font-size: 0.75rem; color: hsl(var(--foreground)); }

/* shadcn switch */
.rp-switch {
  position: relative; flex-shrink: 0;
  width: 28px; height: 16px; border-radius: 9999px;
  border: none; cursor: pointer;
  background: hsl(var(--muted)); transition: background 0.18s;
  padding: 0;
}
.rp-switch--on { background: hsl(var(--primary)); }
.rp-switch-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 12px; height: 12px; border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  transition: transform 0.18s;
}
.rp-switch--on .rp-switch-thumb { transform: translateX(12px); }

/* ── Hints ───────────────────────────────────────────────────────────────── */
.rp-hints { display: flex; flex-direction: column; gap: 0.5rem; padding: 1.5rem 0.5rem; }
.rp-hint { display: flex; align-items: center; gap: 0.45rem; font-size: 0.75rem; color: hsl(var(--muted-foreground)); padding: 0.5rem 0; }
.rp-hint-dot { width: 6px; height: 6px; border-radius: 50%; background: hsl(var(--muted-foreground)/0.5); flex-shrink: 0; }

/* ── Point pill ──────────────────────────────────────────────────────────── */
.rp-point-pill {
  display: flex; align-items: center; gap: 0.4rem;
  background: hsl(var(--muted)/0.4); border: 1px solid hsl(var(--border));
  border-radius: 6px; padding: 0.28rem 0.5rem; font-size: 0.75rem;
}
.rp-point-swatch { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
.rp-point-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: hsl(var(--foreground)); }
.rp-point-meta { font-size: 0.74rem; color: hsl(var(--muted-foreground)); white-space: nowrap; flex-shrink: 0; }

/* ── Run button ──────────────────────────────────────────────────────────── */
.rp-run {
  width: 100%; padding: 0.45rem;
  border: none; border-radius: 7px;
  background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
  font-size: 0.77rem; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 0.35rem;
  transition: opacity 0.12s;
}
.rp-run:disabled { opacity: 0.55; cursor: not-allowed; }

.rp-error { font-size: 0.79rem; color: hsl(var(--destructive, 0 72% 51%)); }

/* ── Score card ──────────────────────────────────────────────────────────── */
.rp-score-card {
  display: flex; align-items: center; gap: 0.7rem;
  background: hsl(var(--muted)/0.3); border-radius: 10px;
  padding: 0.55rem 0.65rem;
  border: 1px solid hsl(var(--border));
}
.rp-score-circle {
  width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; border: 3px solid;
}
.rp-score-circle--high { border-color: #22c55e; background: #22c55e1a; }
.rp-score-circle--med  { border-color: #f59e0b; background: #f59e0b1a; }
.rp-score-circle--low  { border-color: #ef4444; background: #ef44441a; }
.rp-score-num { font-size: 1.1rem; font-weight: 500; color: hsl(var(--foreground)); }
.rp-score-info { display: flex; flex-direction: column; gap: 0.1rem; }
.rp-score-label { font-size: 0.85rem; font-weight: 400; color: hsl(var(--foreground)); }
.rp-score-sub { font-size: 0.74rem; color: hsl(var(--muted-foreground)); }

/* ── Category rows ───────────────────────────────────────────────────────── */
.rp-cats { display: flex; flex-direction: column; gap: 0; }
.rp-cat-row {
  display: flex; align-items: center; gap: 0.45rem;
  padding: 0.28rem 0.1rem; cursor: pointer;
  border-bottom: 1px solid hsl(var(--border)/0.4);
  font-size: 0.79rem; transition: background 0.1s; border-radius: 4px;
}
.rp-cat-row:hover { background: hsl(var(--muted)/0.3); }
.rp-cat-swatch { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.rp-cat-name { flex: 1; color: hsl(var(--foreground)); }
.rp-cat-badge {
  font-size: 0.74rem; font-weight: 500;
  padding: 0.08rem 0.35rem; border-radius: 20px;
}
.rp-cat-badge--high   { background: #22c55e22; color: #16a34a; }
.rp-cat-badge--medium { background: #f59e0b22; color: #b45309; }
.rp-cat-badge--low    { background: #ef444422; color: #b91c1c; }
.rp-cat-badge--none   { background: hsl(var(--muted)/0.4); color: hsl(var(--muted-foreground)); }
.rp-switch--sm { width: 22px; height: 13px; }
.rp-switch--sm .rp-switch-thumb { width: 9px; height: 9px; }
.rp-switch--sm.rp-switch--on .rp-switch-thumb { transform: translateX(9px); }

/* ── Total + detail link ─────────────────────────────────────────────────── */
.rp-total {
  font-size: 0.77rem; color: hsl(var(--muted-foreground));
  display: flex; align-items: center; justify-content: space-between;
}
.rp-toggle-link { color: hsl(var(--primary)); cursor: pointer; font-weight: 500; }
.rp-toggle-link:hover { text-decoration: underline; }

/* ── Detail section ──────────────────────────────────────────────────────── */
.rp-detail { display: flex; flex-direction: column; gap: 0.4rem; }
.rp-detail-tabs {
  display: flex; gap: 0.2rem; overflow-x: auto;
  padding-bottom: 0.1rem;
  scrollbar-width: none;
}
.rp-detail-tabs::-webkit-scrollbar { display: none; }
.rp-detail-tab {
  white-space: nowrap; padding: 0.18rem 0.5rem;
  border: 1px solid hsl(var(--border)); border-radius: 20px;
  background: transparent; color: hsl(var(--muted-foreground));
  font-size: 0.76rem; font-weight: 500; cursor: pointer; transition: all 0.12s;
}
.rp-detail-tab--on {
  border-color: hsl(var(--primary)); color: hsl(var(--primary));
  background: hsl(var(--primary)/0.1);
}

/* ── POI list ────────────────────────────────────────────────────────────── */
.rp-poi-list {
  border: 1px solid hsl(var(--border)); border-radius: 8px; overflow: hidden;
  max-height: 200px; overflow-y: auto;
}
.rp-poi-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.22rem 0.55rem;
  border-bottom: 1px solid hsl(var(--border)/0.4);
  font-size: 0.73rem; color: hsl(var(--foreground));
}
.rp-poi-row:last-of-type { border-bottom: none; }
.rp-poi-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rp-poi-right { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
.rp-poi-dist { color: hsl(var(--muted-foreground)); font-variant-numeric: tabular-nums; min-width: 36px; text-align: right; }
.rp-poi-bar { height: 3px; border-radius: 2px; background: hsl(var(--primary)/0.5); flex-shrink: 0; }
.rp-poi-empty, .rp-poi-footer {
  padding: 0.35rem 0.55rem; font-size: 0.76rem; color: hsl(var(--muted-foreground));
  font-style: italic; text-align: center;
}
.rp-poi-footer { border-top: 1px solid hsl(var(--border)/0.4); }

/* ── Spinner ─────────────────────────────────────────────────────────────── */
.rp-spin { animation: rp-spin 0.9s linear infinite; }
@keyframes rp-spin { to { transform: rotate(360deg); } }
</style>
