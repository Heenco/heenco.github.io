<template>
  <!-- ─── SI FAB ─────────────────────────────────────────────────────────── -->
  <button
    v-show="!hidden"
    class="si-fab"
    :class="{ 'si-fab--active': isOpen }"
    :style="{ top: fabTop }"
    @click="isOpen = !isOpen"
    :title="isOpen ? 'Close Spatial Intelligence' : 'Spatial Intelligence'"
  >
    <!-- Crosshair / spatial scan icon -->
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="3" x2="12" y2="7"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
      <line x1="3" y1="12" x2="7" y2="12"/>
      <line x1="17" y1="12" x2="21" y2="12"/>
    </svg>
    <span v-if="lastHitCount > 0 && !isOpen" class="si-fab-badge">{{ lastHitCount }}</span>
  </button>

  <!-- ─── SI Panel ──────────────────────────────────────────────────────── -->
  <transition name="si-drop">
    <div v-if="isOpen" class="si-panel" :style="{ top: panelTop, maxHeight: panelMaxHeight, width: panelWidth + 'px' }">
      <div class="si-resize-handle" @mousedown.prevent="startResize" />

      <!-- Header -->
      <div class="si-header">
        <div class="si-title-wrap">
          <span class="si-title">Spatial Intelligence</span>
          <span class="si-subtitle">Layer Analysis</span>
        </div>
        <div class="si-tabs">
          <button
            class="si-tab"
            :class="{ 'si-tab--on': view === 'analysis' }"
            @click="view = 'analysis'"
          >Analysis</button>
          <button
            class="si-tab"
            :class="{ 'si-tab--on': view === 'settings' }"
            @click="openSettings"
          >Settings</button>
        </div>
        <button class="si-close" @click="isOpen = false" title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- ── Analysis ──────────────────────────────────────────────────── -->
      <div v-show="view === 'analysis'" class="si-body">

        <!-- Status hints -->
        <div v-if="!point || analyzableLayers.length === 0" class="si-hints">
          <div class="si-hint" :class="{ 'si-hint--done': !!point }">
            <span class="si-hint-dot" />
            <span>{{ point ? (point.label || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`) : 'Search an address to place a point' }}</span>
          </div>
          <div class="si-hint" :class="{ 'si-hint--done': analyzableLayers.length > 0 }">
            <span class="si-hint-dot" />
            <span>{{ analyzableLayers.length > 0 ? `${analyzableLayers.length} layer${analyzableLayers.length > 1 ? 's' : ''} ready` : 'Add layers to the layer list' }}</span>
          </div>
        </div>

        <!-- Active point pill -->
        <div v-if="point && analyzableLayers.length > 0" class="si-point-pill">
          <span class="si-point-swatch" />
          <span class="si-point-label">{{ point.label || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}` }}</span>
          <span class="si-point-meta">{{ analyzableLayers.length }} layer{{ analyzableLayers.length !== 1 ? 's' : '' }}</span>
        </div>

        <!-- Run button -->
        <button
          class="si-run"
          :disabled="!point || analyzableLayers.length === 0 || running"
          @click="runAnalysis"
        >
          <svg v-if="!running" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="si-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <span>{{ running ? `Analysing ${progress.done}/${progress.total}…` : 'Run Spatial Analysis' }}</span>
        </button>

        <!-- Results -->
        <div v-if="summaryRows.length > 0" class="si-results">
          <div class="si-section-title si-section-title--toggle" @click="summaryOpen = !summaryOpen">
            <span class="si-tree-chevron">{{ summaryOpen ? '▼' : '▶' }}</span>
            Layer hits
            <span class="si-section-count">{{ summaryRows.length }}</span>
          </div>
          <div v-if="summaryOpen" class="si-summary">
            <div class="si-summary-head">
              <span>Layer</span><span>Hits</span><span>Status</span>
            </div>
            <div
              v-for="row in summaryRows"
              :key="row.layerId"
              class="si-summary-row"
            >
              <span class="si-summary-name" :title="row.layerName">{{ row.layerName }}</span>
              <span class="si-summary-count">{{ row.count.toLocaleString() }}</span>
              <span class="si-summary-status" :class="{ 'si-summary-status--err': row.status === 'error' }">
                {{ row.status === 'ok' ? (row.count > 0 ? '✓' : '–') : '!' }}
              </span>
            </div>
          </div>

          <div v-if="detailRows.length > 0" class="si-detail">
            <div class="si-section-title">Sample <span class="si-section-sub">(up to 200 per layer)</span></div>
            <div class="si-tree">
              <div v-for="group in detailTree" :key="group.name" class="si-tree-layer">
                <!-- Layer header -->
                <div class="si-tree-layer-head" @click="treeOpenLayers[group.name] = !treeOpenLayers[group.name]">
                  <span class="si-tree-chevron">{{ treeOpenLayers[group.name] ? '▼' : '▶' }}</span>
                  <span class="si-tree-layer-name">{{ group.name }}</span>
                  <span class="si-tree-count">{{ group.records.length }}<template v-if="group.total > group.records.length"> of {{ group.total }}</template></span>
                </div>
                <!-- Records -->
                <template v-if="treeOpenLayers[group.name]">
                  <div v-for="(rec, ri) in group.records" :key="ri" class="si-tree-record">
                    <div class="si-tree-record-head" @click="toggleRecord(group.name, ri)">
                      <span class="si-tree-chevron">{{ treeOpenRecords[group.name + '-' + ri] ? '▼' : '▶' }}</span>
                      <span>Record {{ ri + 1 }}</span>
                    </div>
                    <div v-if="treeOpenRecords[group.name + '-' + ri]" class="si-tree-record-body">
                      <div v-for="(val, key) in rec" :key="key" class="si-tree-row">
                        <span class="si-tree-key">{{ key }}</span>
                        <span class="si-tree-sep">:</span>
                        <span class="si-tree-val">{{ formatCell(val) }}</span>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Settings ──────────────────────────────────────────────────── -->
      <div v-show="view === 'settings'" class="si-body">

        <div v-if="analyzableLayers.length === 0" class="si-hints">
          <div class="si-hint">
            <span class="si-hint-dot" />
            <span>No analyzable layers yet — add layers first.</span>
          </div>
        </div>

        <template v-else>
          <!-- Buffer — applies to all layers -->
          <div class="si-field">
            <label class="si-label">Search radius <span class="si-label-sub">— applies to all layers</span></label>
            <input v-model.number="bufferMeters" type="number" min="0" step="5" class="si-input" />
          </div>

          <!-- Layer selector -->
          <div class="si-field">
            <label class="si-label">Layer</label>
            <select v-model="activeLayerId" class="si-select">
              <option v-for="l in analyzableLayers" :key="l.id" :value="l.id">{{ l.label }}</option>
            </select>
          </div>

          <!-- Field picker -->
          <div class="si-field">
            <label class="si-label">Report attributes</label>
            <div v-if="settingsLoading" class="si-loading">
              <svg class="si-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Loading fields…
            </div>
            <div v-else-if="!activeMeta" class="si-loading">No metadata loaded.</div>
            <div v-else class="si-dd">
              <!-- Available -->
              <div class="si-dd-col" @dragover.prevent @drop="dropToAvailable">
                <div class="si-dd-head">Available</div>
                <div class="si-dd-list">
                  <div
                    v-for="f in availableFields"
                    :key="f"
                    class="si-chip"
                    draggable="true"
                    @dragstart="dragStart(f, 'available')"
                    :title="f"
                  >{{ f }}</div>
                  <div v-if="availableFields.length === 0" class="si-dd-empty">All selected</div>
                </div>
              </div>

              <!-- Arrow -->
              <div class="si-dd-arrow">→</div>

              <!-- Selected -->
              <div class="si-dd-col si-dd-col--selected" @dragover.prevent @drop="dropToSelected">
                <div class="si-dd-head">In report</div>
                <div class="si-dd-list">
                  <div
                    v-for="f in selectedFields"
                    :key="f"
                    class="si-chip si-chip--on"
                    draggable="true"
                    @dragstart="dragStart(f, 'selected')"
                    :title="f"
                  >{{ f }}</div>
                  <div v-if="selectedFields.length === 0" class="si-dd-empty">Drop here</div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SpatialPoint { lng: number; lat: number; label?: string }
interface SpatialLayerInput {
  id: string; label: string; queuedLayerUrl: string
  pending?: boolean; fetchError?: string
}
interface LayerMeta {
  fields: string[]
  objectIdField: string | null
}
interface SummaryRow {
  layerId: string; layerName: string; count: number; status: 'ok' | 'error'
}

// ── Props ─────────────────────────────────────────────────────────────────────
const props = defineProps<{
  point: SpatialPoint | null
  layers: SpatialLayerInput[]
  layersPanelBottom?: number   // px from top of .er-page; 0 = panel not visible
  layersFabVisible?: boolean   // true = layers FAB (not panel) is showing
  bufferMeters?: number        // externally controlled (e.g. map drag updates this)
  hidden?: boolean             // hide this FAB when another panel is open
}>()

const emit = defineEmits<{
  bufferChange: [n: number]
  openChange:   [open: boolean]
}>()

// ── UI state ──────────────────────────────────────────────────────────────────
const isOpen = ref(false)
const panelWidth = ref(340)

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
const view = ref<'analysis' | 'settings'>('analysis')

// Dynamic positioning: sit just below whatever is in the top-right corner
const fabTop = computed(() => {
  if (props.layersPanelBottom) return `${props.layersPanelBottom + 8}px`
  if (props.layersFabVisible) return 'calc(1rem + 48px)'
  return '1rem'
})
const panelTop = computed(() => {
  if (props.layersPanelBottom) return `${props.layersPanelBottom + 8 + 40 + 8}px`
  if (props.layersFabVisible) return 'calc(1rem + 96px)'
  return 'calc(1rem + 48px)'
})
const panelMaxHeight = computed(() => {
  if (props.layersPanelBottom) return `calc(100vh - ${props.layersPanelBottom + 8 + 40 + 16}px)`
  return 'calc(100vh - 2rem - 96px)'
})

// ── Analysis state ────────────────────────────────────────────────────────────
const running = ref(false)
const progress = reactive({ done: 0, total: 0 })
const summaryRows = ref<SummaryRow[]>([])
const summaryOpen = ref(true)
const detailRows = ref<Record<string, any>[]>([])
const lastHitCount = ref(0)

// ── Settings state ────────────────────────────────────────────────────────────
const activeLayerId = ref('')
const bufferMeters = ref(props.bufferMeters ?? 25)
// Sync from parent (e.g. map drag changed the radius externally)
watch(() => props.bufferMeters, v => { if (v !== undefined && v !== bufferMeters.value) bufferMeters.value = v })
watch(bufferMeters, v => emit('bufferChange', v))
const settingsLoading = ref(false)
const layerMeta = reactive<Record<string, LayerMeta>>({})
const selectedAttrsByLayer = reactive<Record<string, string[]>>({})
const drag = reactive<{ field: string | null; from: 'available' | 'selected' | null }>({ field: null, from: null })

// ── Computed ──────────────────────────────────────────────────────────────────
const analyzableLayers = computed(() =>
  props.layers.filter(l => l.queuedLayerUrl && !l.pending && !l.fetchError)
)

const activeMeta = computed(() =>
  activeLayerId.value ? (layerMeta[activeLayerId.value] ?? null) : null
)

const selectedFields = computed(() =>
  activeLayerId.value ? (selectedAttrsByLayer[activeLayerId.value] ?? []) : []
)

const availableFields = computed(() => {
  if (!activeMeta.value) return []
  const sel = new Set(selectedFields.value)
  return activeMeta.value.fields.filter(f => !sel.has(f))
})

const detailTree = computed(() => {
  const groups: Record<string, { total: number; records: Record<string, any>[] }> = {}
  for (const row of detailRows.value) {
    const layer = row._layer as string
    if (!groups[layer]) groups[layer] = { total: row._total as number ?? 0, records: [] }
    const { _layer, _total, ...attrs } = row as any
    groups[layer].records.push(attrs)
  }
  return Object.entries(groups).map(([name, { total, records }]) => ({ name, total, records }))
})

const treeOpenLayers = reactive<Record<string, boolean>>({})
const treeOpenRecords = reactive<Record<string, boolean>>({})

watch(detailTree, (tree) => {
  for (const group of tree) {
    treeOpenLayers[group.name] = true
    treeOpenRecords[`${group.name}-0`] = true
  }
})

function toggleRecord(layer: string, idx: number) {
  const key = `${layer}-${idx}`
  treeOpenRecords[key] = !treeOpenRecords[key]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCell(v: unknown) {
  if (v == null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

async function esriQuery(url: string, params: Record<string, string>) {
  const u = new URL(url)
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v))
  u.searchParams.set('f', 'json')
  const r = await fetch(u.toString())
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const d = await r.json()
  if (d?.error?.message) throw new Error(d.error.message)
  return d
}

function buildGeom(buf: number) {
  const pt = props.point!
  if (!buf || buf <= 0) {
    return {
      geometry: JSON.stringify({ x: pt.lng, y: pt.lat, spatialReference: { wkid: 4326 } }),
      geometryType: 'esriGeometryPoint',
    }
  }
  const lf = Math.max(Math.cos((pt.lat * Math.PI) / 180), 0.2)
  const dx = buf / (111320 * lf)
  const dy = buf / 110540
  return {
    geometry: JSON.stringify({
      xmin: pt.lng - dx, ymin: pt.lat - dy,
      xmax: pt.lng + dx, ymax: pt.lat + dy,
      spatialReference: { wkid: 4326 },
    }),
    geometryType: 'esriGeometryEnvelope',
  }
}

async function loadMeta(layer: SpatialLayerInput) {
  if (layerMeta[layer.id]) return
  const d = await esriQuery(layer.queuedLayerUrl, { f: 'json' })
  const fields: string[] = (d?.fields ?? [])
    .map((f: any) => f?.name)
    .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0)
  layerMeta[layer.id] = { fields, objectIdField: d?.objectIdField ?? null }
  if (!selectedAttrsByLayer[layer.id]) {
    selectedAttrsByLayer[layer.id] = fields
      .filter(f => !/^objectid$|^shape$|^shape_length$|^shape_area$/i.test(f))
      .slice(0, 6)
  }
}

// ── Settings tab ──────────────────────────────────────────────────────────────
async function openSettings() {
  view.value = 'settings'
  const layers = analyzableLayers.value
  if (!layers.length) return
  if (!activeLayerId.value || !layers.some(l => l.id === activeLayerId.value)) {
    activeLayerId.value = layers[0]!.id
  }
  settingsLoading.value = true
  await Promise.allSettled(layers.map(loadMeta))
  settingsLoading.value = false
}

// ── Drag-drop ─────────────────────────────────────────────────────────────────
function dragStart(field: string, from: 'available' | 'selected') {
  drag.field = field; drag.from = from
}
function dropToSelected() {
  if (!drag.field || drag.from !== 'available' || !activeLayerId.value) return
  const s = new Set(selectedAttrsByLayer[activeLayerId.value] ?? [])
  s.add(drag.field)
  selectedAttrsByLayer[activeLayerId.value] = [...s]
  drag.field = null; drag.from = null
}
function dropToAvailable() {
  if (!drag.field || drag.from !== 'selected' || !activeLayerId.value) return
  selectedAttrsByLayer[activeLayerId.value] =
    (selectedAttrsByLayer[activeLayerId.value] ?? []).filter(f => f !== drag.field)
  drag.field = null; drag.from = null
}

// ── Run analysis ──────────────────────────────────────────────────────────────
async function runAnalysis() {
  if (!props.point) return
  const layers = analyzableLayers.value
  if (!layers.length) return

  running.value = true
  progress.done = 0
  progress.total = layers.length
  summaryRows.value = []
  detailRows.value = []

  const { geometry, geometryType } = buildGeom(bufferMeters.value)
  const base = { geometry, geometryType, spatialRel: 'esriSpatialRelIntersects', inSR: '4326', where: '1=1' }

  for (const layer of layers) {
    try {
      await loadMeta(layer)
      const meta = layerMeta[layer.id]
      if (!meta) throw new Error('Metadata unavailable')
      const selected = selectedAttrsByLayer[layer.id] ?? []
      const outFields = selected.length ? selected.join(',') : (meta.objectIdField || 'OBJECTID')

      const countRes = await esriQuery(`${layer.queuedLayerUrl}/query`, { ...base, returnCountOnly: 'true' })
      const count = Number(countRes?.count ?? 0)
      summaryRows.value.push({ layerId: layer.id, layerName: layer.label, count, status: 'ok' })

      if (count > 0) {
        const sampleRes = await esriQuery(`${layer.queuedLayerUrl}/query`, {
          ...base, outFields, returnGeometry: 'false', resultRecordCount: '200',
        })
        detailRows.value.push(...(sampleRes?.features ?? []).map((f: any) => ({
            _layer: layer.label, _total: count, ...(f?.attributes ?? {}),
          })))
      }
    } catch {
      summaryRows.value.push({ layerId: layer.id, layerName: layer.label, count: 0, status: 'error' })
    } finally {
      progress.done += 1
    }
  }

  lastHitCount.value = summaryRows.value.filter(r => r.count > 0).length
  running.value = false
}
</script>

<style scoped>
/* ── FAB ─────────────────────────────────────────────────────────────────── */
.si-fab {
  position: absolute;
  top: calc(1rem + 48px); /* fallback; overridden by :style binding */
  right: 1rem;
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
  transition: background 0.15s, box-shadow 0.15s, color 0.15s;
}
.si-fab:hover {
  background: hsl(var(--card));
  box-shadow: 0 4px 18px rgba(0,0,0,0.4);
}
.si-fab--active {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-color: hsl(var(--primary));
}

.si-fab-badge {
  position: absolute;
  top: -4px; right: -4px;
  background: #10b981;
  color: #000;
  font-size: 0.76rem;
  font-weight: 700;
  border-radius: 50%;
  width: 14px; height: 14px;
  display: flex; align-items: center; justify-content: center;
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
.si-panel {
  position: absolute;
  top: calc(1rem + 96px); /* fallback; overridden by :style binding */
  right: 1rem;
  z-index: 11;
  min-width: 220px;
  max-height: calc(100vh - 2rem - 96px);
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(14px);
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.si-resize-handle {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 5px;
  cursor: ew-resize;
  z-index: 10;
  border-radius: 12px 0 0 12px;
  transition: background 0.15s;
}
.si-resize-handle:hover, .si-resize-handle:active {
  background: hsl(var(--primary) / 0.2);
}

/* ── Header / Tabs ───────────────────────────────────────────────────────── */
.si-header {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 0.65rem 0.35rem;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}
.si-title-wrap { display: flex; flex-direction: column; margin-right: auto; }
.si-title { font-size: 0.85rem; font-weight: 400; color: hsl(var(--foreground)); line-height: 1.1; }
.si-subtitle { font-size: 0.74rem; color: hsl(var(--muted-foreground)); }

.si-tabs { display: flex; gap: 0.15rem; background: hsl(var(--muted)/0.4); border-radius: 6px; padding: 2px; }
.si-tab {
  font-size: 0.77rem; font-weight: 500; padding: 0.18rem 0.55rem;
  border-radius: 4px; border: none; background: transparent;
  color: hsl(var(--muted-foreground)); cursor: pointer; transition: all 0.12s;
  font-family: inherit;
}
.si-tab--on { background: hsl(var(--card)); color: hsl(var(--foreground)); box-shadow: 0 1px 4px rgba(0,0,0,0.15); }

.si-close {
  width: 22px; height: 22px; border-radius: 50%; border: none;
  background: transparent; color: hsl(var(--muted-foreground));
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.12s;
}
.si-close:hover { background: hsl(var(--muted)/0.5); color: hsl(var(--foreground)); }

/* ── Body ────────────────────────────────────────────────────────────────── */
.si-body {
  overflow-y: auto; padding: 0.6rem 0.65rem;
  display: flex; flex-direction: column; gap: 0.5rem;
  flex: 1;
}
.si-body::-webkit-scrollbar { width: 4px; }
.si-body::-webkit-scrollbar-track { background: transparent; }
.si-body::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

/* ── Hints ───────────────────────────────────────────────────────────────── */
.si-hints { display: flex; flex-direction: column; gap: 0.3rem; }
.si-hint {
  display: flex; align-items: flex-start; gap: 0.4rem;
  font-size: 0.75rem; color: hsl(var(--muted-foreground)); line-height: 1.4;
}
.si-hint-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: hsl(var(--border)); flex-shrink: 0; margin-top: 0.22rem;
}
.si-hint--done .si-hint-dot { background: #10b981; }
.si-hint--done { color: hsl(var(--foreground)); }

/* ── Point pill ──────────────────────────────────────────────────────────── */
.si-point-pill {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.3rem 0.45rem;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  background: hsl(var(--muted) / 0.4);
}
.si-point-swatch {
  width: 7px; height: 7px; border-radius: 50%;
  background: #f97316; flex-shrink: 0;
}
.si-point-label {
  flex: 1; font-size: 0.75rem; color: hsl(var(--foreground));
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.si-point-meta {
  font-size: 0.76rem; color: hsl(var(--muted-foreground)); flex-shrink: 0;
}

/* ── Run button ──────────────────────────────────────────────────────────── */
.si-run {
  width: 100%; height: 2rem;
  border-radius: 6px; border: none;
  background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
  font-size: 0.79rem; font-weight: 600; font-family: inherit;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;
  transition: opacity 0.15s;
}
.si-run:hover:not(:disabled) { opacity: 0.88; }
.si-run:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Section title ───────────────────────────────────────────────────────── */
.si-section-title {
  font-size: 0.76rem; font-weight: 700;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase; letter-spacing: 0.06em;
}
.si-section-title--toggle {
  cursor: pointer; user-select: none;
  display: flex; align-items: center; gap: 0.3rem;
}
.si-section-title--toggle:hover { color: hsl(var(--foreground)); }
.si-section-count {
  background: hsl(var(--muted)); border-radius: 4px;
  padding: 0 0.3rem; font-variant-numeric: tabular-nums;
}
.si-section-sub { font-weight: 400; text-transform: none; letter-spacing: 0; color: hsl(var(--muted-foreground)); font-style: italic; }

/* ── Summary ─────────────────────────────────────────────────────────────── */
.si-results { display: flex; flex-direction: column; gap: 0.35rem; }

.si-summary {
  border: 1px solid hsl(var(--border)); border-radius: 6px; overflow: hidden;
  font-size: 0.73rem;
}
.si-summary-head, .si-summary-row {
  display: grid; grid-template-columns: 1fr auto auto;
  gap: 0.4rem; align-items: center;
  padding: 0.22rem 0.45rem;
}
.si-summary-head {
  background: hsl(var(--muted) / 0.7);
  color: hsl(var(--muted-foreground));
  font-weight: 600; font-size: 0.74rem;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.si-summary-row { border-top: 1px solid hsl(var(--border)); color: hsl(var(--foreground)); }
.si-summary-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.si-summary-count { font-weight: 700; color: hsl(var(--primary)); font-variant-numeric: tabular-nums; }
.si-summary-status { color: hsl(var(--muted-foreground)); text-align: center; }
.si-summary-status--err { color: hsl(var(--destructive, 0 72% 51%)); }

/* ── Detail tree ─────────────────────────────────────────────────────────── */
.si-detail { display: flex; flex-direction: column; gap: 0.2rem; }
.si-tree { border: 1px solid hsl(var(--border)); border-radius: 6px; overflow: hidden; font-size: 0.76rem; max-height: 220px; overflow-y: auto; }
.si-tree-layer { border-bottom: 1px solid hsl(var(--border)); }
.si-tree-layer:last-child { border-bottom: none; }
.si-tree-layer-head {
  display: flex; align-items: center; gap: 0.3rem;
  padding: 0.28rem 0.45rem; cursor: pointer;
  background: hsl(var(--muted) / 0.5); user-select: none;
}
.si-tree-layer-head:hover { background: hsl(var(--muted) / 0.8); }
.si-tree-layer-name { flex: 1; font-weight: 600; color: hsl(var(--foreground)); }
.si-tree-count {
  font-size: 0.79rem; background: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary)); border-radius: 3px; padding: 0.1rem 0.28rem; font-weight: 700;
}
.si-tree-record { border-top: 1px solid hsl(var(--border) / 0.4); }
.si-tree-record:first-child { border-top: none; }
.si-tree-record-head {
  display: flex; align-items: center; gap: 0.3rem;
  padding: 0.2rem 0.45rem 0.2rem 1.1rem;
  cursor: pointer; color: hsl(var(--muted-foreground)); user-select: none;
}
.si-tree-record-head:hover { background: hsl(var(--muted) / 0.3); color: hsl(var(--foreground)); }
.si-tree-record-body { padding: 0.12rem 0.45rem 0.18rem 1.85rem; display: flex; flex-direction: column; gap: 0.08rem; }
.si-tree-row { display: flex; gap: 0.35rem; align-items: baseline; min-width: 0; }
.si-tree-key { color: hsl(var(--muted-foreground)); flex-shrink: 0; max-width: 48%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.si-tree-sep { color: hsl(var(--muted-foreground)); flex-shrink: 0; }
.si-tree-val { color: hsl(var(--foreground)); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums; }
.si-tree-chevron { font-size: 0.76rem; color: hsl(var(--muted-foreground)); flex-shrink: 0; width: 0.65rem; text-align: center; }

/* ── Settings fields ─────────────────────────────────────────────────────── */
.si-field { display: flex; flex-direction: column; gap: 0.2rem; }
.si-label { font-size: 0.76rem; font-weight: 500; color: hsl(var(--foreground)); }
.si-label-sub { font-weight: 400; color: hsl(var(--muted-foreground)); font-style: italic; }

.si-select, .si-input {
  width: 100%; height: 2rem;
  border: 1px solid hsl(var(--border)); border-radius: 6px;
  background: hsl(var(--background)); color: hsl(var(--foreground));
  font-size: 0.79rem; font-family: inherit;
  padding: 0 0.55rem; outline: none;
  transition: border-color 0.12s;
}
.si-select:focus, .si-input:focus { border-color: hsl(var(--primary)); }

.si-loading {
  font-size: 0.75rem; color: hsl(var(--muted-foreground));
  display: flex; align-items: center; gap: 0.35rem;
}

/* ── Drag-drop ───────────────────────────────────────────────────────────── */
.si-dd { display: flex; align-items: flex-start; gap: 0.25rem; }

.si-dd-col {
  flex: 1; border: 1px solid hsl(var(--border)); border-radius: 6px; overflow: hidden;
  min-height: 64px;
}
.si-dd-col--selected { border-color: hsl(var(--primary) / 0.4); }

.si-dd-head {
  padding: 0.2rem 0.4rem; font-size: 0.74rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground)); background: hsl(var(--muted) / 0.5);
  border-bottom: 1px solid hsl(var(--border));
}

.si-dd-list {
  padding: 0.25rem; display: flex; flex-direction: column; gap: 0.18rem; min-height: 40px;
}

.si-chip {
  padding: 0.15rem 0.35rem; border-radius: 4px;
  border: 1px solid hsl(var(--border)); background: hsl(var(--muted) / 0.4);
  color: hsl(var(--foreground)); font-size: 0.76rem; font-family: inherit;
  cursor: grab; user-select: none;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: border-color 0.1s;
}
.si-chip:hover { border-color: hsl(var(--primary) / 0.6); }
.si-chip--on {
  border-color: hsl(var(--primary) / 0.5);
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}
.si-dd-empty { font-size: 0.74rem; color: hsl(var(--muted-foreground)); font-style: italic; padding: 0.1rem; }

.si-dd-arrow {
  font-size: 0.77rem; color: hsl(var(--muted-foreground));
  flex-shrink: 0; padding-top: 1.5rem;
}

/* ── Spin ────────────────────────────────────────────────────────────────── */
.si-spin { animation: _spin 1s linear infinite; }
@keyframes _spin { to { transform: rotate(360deg); } }

/* ── Transition ──────────────────────────────────────────────────────────── */
.si-drop-enter-active, .si-drop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.si-drop-enter-from, .si-drop-leave-to {
  opacity: 0; transform: translateY(-0.4rem) scale(0.98);
}
</style>
