<template>
  <!-- ─── Charts FAB ──────────────────────────────────────────────────── -->
  <button
    v-show="!hidden"
    class="lc-fab"
    :class="{ 'lc-fab--active': isOpen }"
    :style="{ top: fabTop }"
    @click="isOpen = !isOpen"
    :title="isOpen ? 'Close Layer Charts' : 'Layer Charts'"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="10" width="4" height="10" />
      <rect x="10" y="6" width="4" height="14" />
      <rect x="17" y="3" width="4" height="17" />
    </svg>
  </button>

  <!-- ─── Charts Panel ───────────────────────────────────────────────── -->
  <transition name="lc-slide">
    <aside v-if="isOpen" class="lc-panel" :style="{ top: panelTop, maxHeight: panelMaxHeight, width: panelWidth + 'px' }">
      <div class="lc-resize-handle" @mousedown.prevent="startResize" />

      <div class="lc-header">
        <div class="lc-title-wrap">
          <span class="lc-title">Layer Charts</span>
          <span class="lc-subtitle">Local data only</span>
        </div>
        <button class="lc-close" @click="isOpen = false" title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="lc-body">
        <div v-if="loadedLayers.length === 0" class="lc-empty">
          Add a layer to the map to start charting.
        </div>

        <template v-else>
          <div v-for="chart in charts" :key="chart.id" class="lc-card">
            <div class="lc-card-toolbar">
              <div class="lc-type-pills">
                <button
                  v-for="t in CHART_TYPES" :key="t.id"
                  class="lc-type-pill"
                  :class="{
                    'lc-type-pill--active': chart.type === t.id,
                    'lc-type-pill--disabled': colsForType(chart.layerId, t.id).length === 0
                  }"
                  :disabled="colsForType(chart.layerId, t.id).length === 0"
                  :title="t.label"
                  @click="changeType(chart, t.id)"
                  v-html="t.icon"
                ></button>
              </div>
              <button class="lc-card-close" @click="removeChart(chart.id)" title="Remove">×</button>
            </div>

            <div class="lc-card-selects">
              <select class="lc-select" v-model="chart.layerId" @change="reloadChart(chart)">
                <option value="">— layer —</option>
                <option v-for="l in loadedLayers" :key="l.id" :value="l.id">{{ l.label }}</option>
              </select>
              <select class="lc-select" v-model="chart.col" @change="reloadChart(chart)">
                <option value="">— column —</option>
                <option v-for="c in colsForType(chart.layerId, chart.type)" :key="c.name" :value="c.name">{{ c.name }}</option>
              </select>
              <template v-if="needsY(chart.type)">
                <select class="lc-select" v-model="chart.col2" @change="reloadChart(chart)">
                  <option value="">{{ chart.type === 'line' ? '— Y (optional, avg) —' : '— Y axis —' }}</option>
                  <option v-for="c in numericCols(chart.layerId)" :key="c.name" :value="c.name">{{ c.name }}</option>
                </select>
              </template>
              <template v-if="chart.type === 'bubble'">
                <select class="lc-select" v-model="chart.col3" @change="reloadChart(chart)">
                  <option value="">— size —</option>
                  <option v-for="c in numericCols(chart.layerId)" :key="c.name" :value="c.name">{{ c.name }}</option>
                </select>
              </template>
            </div>

            <div v-if="chart.type === 'count' && chart.col" class="lc-count-display">
              <div class="lc-count-big">{{ getColStats(chart.layerId, chart.col)?.nonNull.toLocaleString() ?? '—' }}</div>
              <div class="lc-count-sub">non-null in <em>{{ chart.col }}</em></div>
              <div class="lc-count-pills">
                <span>{{ getLayerTotal(chart.layerId).toLocaleString() }} total</span>
                <span>{{ getColStats(chart.layerId, chart.col)?.nullPct.toFixed(1) }}% null</span>
                <span>{{ getColStats(chart.layerId, chart.col)?.approxUnique.toLocaleString() }} unique</span>
              </div>
              <div v-if="getColKind(chart.layerId, chart.col) === 'numeric' && getColStats(chart.layerId, chart.col)" class="lc-count-pills">
                <span>min {{ fmtNum(getColStats(chart.layerId, chart.col)?.min) }}</span>
                <span>max {{ fmtNum(getColStats(chart.layerId, chart.col)?.max) }}</span>
                <span v-if="getColStats(chart.layerId, chart.col)?.mean != null">avg {{ fmtNum(getColStats(chart.layerId, chart.col)?.mean) }}</span>
              </div>
            </div>
            <div v-else-if="chart.type === 'count' && !chart.col" class="lc-card-placeholder">
              <span class="lc-card-hint">Select a column above</span>
            </div>

            <template v-else>
              <div v-if="chart.loading" class="lc-card-placeholder">
                <div class="lc-card-spinner"></div>
              </div>
              <div v-else-if="chart.error" class="lc-card-placeholder">
                <span class="lc-card-error">{{ chart.error }}</span>
              </div>
              <div
                v-else-if="chart.data"
                :ref="(el) => setChartEl(chart.id, el as HTMLElement | null)"
                class="lc-chart-canvas"
              ></div>
              <div v-else class="lc-card-placeholder">
                <span class="lc-card-hint">{{ chart.col ? 'Select Y axis to continue' : 'Select a column above' }}</span>
              </div>
            </template>

            <div class="lc-pal-anchor" @mouseleave="onPaletteLeave(chart.id)">
              <div
                v-if="openPaletteId === chart.id || lockedPaletteId === chart.id"
                class="lc-pal-pop"
                @mouseenter="openPaletteId = chart.id"
              >
                <button
                  v-for="p in PALETTES" :key="p.id"
                  class="lc-swatch"
                  :class="{ 'lc-swatch--active': chart.palette === p.id }"
                  :title="p.label"
                  :style="{ background: p.swatch }"
                  @click.stop="setChartPalette(chart, p.id)"
                ></button>
              </div>
              <button
                class="lc-palette-dot"
                :class="{ 'lc-palette-dot--locked': lockedPaletteId === chart.id }"
                :style="{ background: PALETTES.find(p => p.id === chart.palette)?.swatch ?? '#3f3f46' }"
                title="Click to pin colour picker"
                @mouseenter="openPaletteId = chart.id"
                @click.stop="togglePaletteLock(chart.id)"
              ></button>
            </div>
          </div>

          <div class="lc-card lc-card--add">
            <div class="lc-add-title">Add Chart</div>
            <div class="lc-add-types">
              <button
                v-for="t in CHART_TYPES" :key="t.id"
                class="lc-add-type"
                :class="{
                  'lc-add-type--active': draftType === t.id,
                  'lc-add-type--disabled': colsForType(draftLayerId, t.id).length === 0
                }"
                :disabled="colsForType(draftLayerId, t.id).length === 0"
                @click="selectDraftType(t.id)"
              >
                <span class="lc-add-type-icon" v-html="t.icon"></span>
                <span class="lc-add-type-label">{{ t.label }}</span>
              </button>
            </div>

            <div class="lc-add-selects">
              <div class="lc-add-select-row">
                <label class="lc-add-select-label">Layer</label>
                <select class="lc-select lc-select--full" v-model="draftLayerId">
                  <option value="">— select —</option>
                  <option v-for="l in loadedLayers" :key="l.id" :value="l.id">{{ l.label }}</option>
                </select>
              </div>
              <div class="lc-add-select-row">
                <label class="lc-add-select-label">{{ draftXLabel }}</label>
                <select class="lc-select lc-select--full" v-model="draftCol">
                  <option value="">— select —</option>
                  <option v-for="c in colsForType(draftLayerId, draftType)" :key="c.name" :value="c.name">{{ c.name }}</option>
                </select>
              </div>
              <div v-if="needsY(draftType)" class="lc-add-select-row">
                <label class="lc-add-select-label">{{ draftType === 'line' ? 'Y (optional, avg)' : 'Y axis' }}</label>
                <select class="lc-select lc-select--full" v-model="draftCol2">
                  <option value="">{{ draftType === 'line' ? '— count (default) —' : '— select —' }}</option>
                  <option v-for="c in numericCols(draftLayerId)" :key="c.name" :value="c.name">{{ c.name }}</option>
                </select>
              </div>
              <div v-if="draftType === 'bubble'" class="lc-add-select-row">
                <label class="lc-add-select-label">Size</label>
                <select class="lc-select lc-select--full" v-model="draftCol3">
                  <option value="">— select —</option>
                  <option v-for="c in numericCols(draftLayerId)" :key="c.name" :value="c.name">{{ c.name }}</option>
                </select>
              </div>
            </div>

            <button class="lc-add-btn" :disabled="!canAddChart" @click="commitAddChart">+ Add</button>
          </div>
        </template>
      </div>
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'

// ── Types ─────────────────────────────────────────────────────────────────────
interface LayerLike {
  id: string
  label: string
  pending?: boolean
  fetchError?: string
  accumulatedFeatures?: any[]
  geojson?: { type: 'FeatureCollection'; features: any[] }
}

type ColKind = 'categorical' | 'numeric' | 'datetime'

type ChartType = 'bar' | 'histogram' | 'line' | 'scatter' | 'bubble' | 'count'

interface ColStats {
  nonNull: number; nullPct: number; approxUnique: number
  min: number | null; max: number | null; mean: number | null
}

interface Column {
  name: string; kind: ColKind; stats: ColStats | null
}

interface ChartConfig {
  id: string; type: ChartType; palette: string
  layerId: string; col: string; col2: string; col3: string
  data: any; loading: boolean; error: string
}

// ── Props / Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  layers: LayerLike[]
  hidden?: boolean
}>()

const emit = defineEmits<{
  openChange: [open: boolean]
}>()

// ── Chart types & palettes ───────────────────────────────────────────────────
const CHART_TYPES: ReadonlyArray<{ id: ChartType; label: string; icon: string }> = [
  {
    id: 'bar', label: 'Bar',
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="9" width="3" height="6"/><rect x="6" y="5" width="3" height="10"/><rect x="11" y="2" width="3" height="13"/></svg>`,
  },
  {
    id: 'histogram', label: 'Histogram',
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="7" width="2.5" height="8"/><rect x="3.5" y="4" width="2.5" height="11"/><rect x="6" y="2" width="2.5" height="13"/><rect x="8.5" y="5" width="2.5" height="10"/><rect x="11" y="8" width="2.5" height="7"/><rect x="13.5" y="10" width="1.5" height="5"/></svg>`,
  },
  {
    id: 'line', label: 'Line',
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,12 4,7 7,10 10,4 13,8 15,5"/></svg>`,
  },
  {
    id: 'scatter', label: 'Scatter',
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="12" r="1.5"/><circle cx="7" cy="5" r="1.5"/><circle cx="11" cy="9" r="1.5"/><circle cx="5" cy="7" r="1.5"/><circle cx="13" cy="3" r="1.5"/><circle cx="9" cy="13" r="1.5"/></svg>`,
  },
  {
    id: 'bubble', label: 'Bubble',
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" opacity="0.85"><circle cx="4" cy="11" r="2.5"/><circle cx="11" cy="8" r="4"/><circle cx="7" cy="4" r="1.5"/></svg>`,
  },
  {
    id: 'count', label: 'Count',
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="6" y1="2" x2="4" y2="14"/><line x1="12" y1="2" x2="10" y2="14"/><line x1="3" y1="6" x2="13" y2="6"/><line x1="2" y1="10" x2="12" y2="10"/></svg>`,
  },
]

interface Palette {
  id: string; label: string; swatch: string
  primary: string; secondary: string; area: string
  secondary2: string; secondary3: string
}
const PALETTES: ReadonlyArray<Palette> = [
  { id: 'zinc',  label: 'Zinc',  swatch: '#3f3f46', primary: '#18181b', secondary: '#3f3f46', area: 'rgba(24,24,27,0.07)',  secondary2: '#71717a', secondary3: '#a1a1aa' },
  { id: 'blue',  label: 'Blue',  swatch: '#2563eb', primary: '#1d4ed8', secondary: '#2563eb', area: 'rgba(37,99,235,0.08)',  secondary2: '#3b82f6', secondary3: '#93c5fd' },
  { id: 'teal',  label: 'Teal',  swatch: '#0d9488', primary: '#0f766e', secondary: '#0d9488', area: 'rgba(13,148,136,0.08)', secondary2: '#14b8a6', secondary3: '#5eead4' },
  { id: 'violet',label: 'Violet',swatch: '#7c3aed', primary: '#6d28d9', secondary: '#7c3aed', area: 'rgba(124,58,237,0.08)', secondary2: '#8b5cf6', secondary3: '#a78bfa' },
  { id: 'rose',  label: 'Rose',  swatch: '#be123c', primary: '#be123c', secondary: '#e11d48', area: 'rgba(190,18,60,0.07)',  secondary2: '#f43f5e', secondary3: '#fda4af' },
  { id: 'amber', label: 'Amber', swatch: '#b45309', primary: '#b45309', secondary: '#d97706', area: 'rgba(180,83,9,0.07)',   secondary2: '#f59e0b', secondary3: '#fcd34d' },
]

// ── UI state ──────────────────────────────────────────────────────────────────
const isOpen = ref(false)
const panelWidth = ref(360)
const openPaletteId = ref<string | null>(null)
const lockedPaletteId = ref<string | null>(null)
const charts = ref<ChartConfig[]>([])
let _chartIdSeq = 0

// Draft state
const draftType = ref<ChartType | null>(null)
const draftLayerId = ref('')
const draftCol = ref('')
const draftCol2 = ref('')
const draftCol3 = ref('')

// ── Positioning ───────────────────────────────────────────────────────────────
const fabTop = computed(() => 'calc(1rem + 240px)')
const panelTop = computed(() => '1rem')
const panelMaxHeight = computed(() => 'calc(100vh - 2rem)')

// ── Layer/column cache ───────────────────────────────────────────────────────
const layerMeta = new Map<string, Column[]>()
const layerTotals = new Map<string, number>()

const loadedLayers = computed(() =>
  props.layers.filter(l => !l.pending && !l.fetchError)
)

function getLayerFeatures(layerId: string): any[] {
  const layer = props.layers.find(l => l.id === layerId)
  if (!layer) return []
  return layer.accumulatedFeatures ?? layer.geojson?.features ?? []
}

function analyzeLayer(layerId: string): Column[] {
  if (layerMeta.has(layerId)) return layerMeta.get(layerId) ?? []
  const features = getLayerFeatures(layerId)
  const MAX_SAMPLE = 10000
  const sample = features.slice(0, MAX_SAMPLE)
  const colMap = new Map<string, { total: number; nonNull: number; numeric: number; datetime: number; uniques: Set<string>; min: number; max: number; sum: number }>()

  for (const f of sample) {
    const props = f?.properties ?? {}
    for (const key of Object.keys(props)) {
      const v = (props as any)[key]
      let entry = colMap.get(key)
      if (!entry) {
        entry = { total: 0, nonNull: 0, numeric: 0, datetime: 0, uniques: new Set(), min: Infinity, max: -Infinity, sum: 0 }
        colMap.set(key, entry)
      }
      entry.total += 1
      if (v == null || v === '') continue
      entry.nonNull += 1
      const num = Number(v)
      if (!Number.isNaN(num) && Number.isFinite(num)) {
        entry.numeric += 1
        entry.min = Math.min(entry.min, num)
        entry.max = Math.max(entry.max, num)
        entry.sum += num
      } else {
        const dt = new Date(v)
        if (!Number.isNaN(dt.getTime())) entry.datetime += 1
      }
      if (entry.uniques.size < 10000) entry.uniques.add(String(v))
    }
  }

  const cols: Column[] = []
  for (const [name, v] of colMap.entries()) {
    const nonNull = v.nonNull
    let kind: ColKind = 'categorical'
    if (nonNull > 0 && v.numeric / nonNull >= 0.9) kind = 'numeric'
    else if (nonNull > 0 && v.datetime / nonNull >= 0.9) kind = 'datetime'

    const stats: ColStats | null = {
      nonNull,
      nullPct: v.total > 0 ? ((v.total - nonNull) / v.total) * 100 : 0,
      approxUnique: v.uniques.size,
      min: Number.isFinite(v.min) ? v.min : null,
      max: Number.isFinite(v.max) ? v.max : null,
      mean: kind === 'numeric' && nonNull > 0 ? v.sum / nonNull : null,
    }
    cols.push({ name, kind, stats })
  }

  layerMeta.set(layerId, cols)
  layerTotals.set(layerId, features.length)
  return cols
}

function getLayerTotal(layerId: string): number {
  if (layerTotals.has(layerId)) return layerTotals.get(layerId) ?? 0
  const total = getLayerFeatures(layerId).length
  layerTotals.set(layerId, total)
  return total
}

function numericCols(layerId: string): Column[] {
  return analyzeLayer(layerId).filter(c => c.kind === 'numeric')
}

function colsForType(layerId: string, type: ChartType | null): Column[] {
  if (!layerId || !type) return []
  const cols = analyzeLayer(layerId)
  switch (type) {
    case 'bar':
    case 'line':
    case 'count':
      return cols
    case 'histogram':
    case 'scatter':
    case 'bubble':
      return cols.filter(c => c.kind === 'numeric')
    default:
      return cols
  }
}

function getColStats(layerId: string, colName: string): ColStats | null {
  return analyzeLayer(layerId).find(c => c.name === colName)?.stats ?? null
}

function getColKind(layerId: string, colName: string): ColKind | null {
  return analyzeLayer(layerId).find(c => c.name === colName)?.kind ?? null
}

function needsY(type: ChartType | null): boolean {
  return type === 'scatter' || type === 'bubble' || type === 'line'
}

function fmtNum(v: any): string {
  if (v == null) return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  if (Number.isInteger(n)) return n.toLocaleString()
  return parseFloat(n.toFixed(4)).toString()
}

// ── ECharts (lazy CDN) ───────────────────────────────────────────────────────
let _echartsPromise: Promise<any> | null = null
const getECharts = (): Promise<any> => {
  if (_echartsPromise) return _echartsPromise
  _echartsPromise = new Promise((resolve) => {
    if ((window as any).echarts) { resolve((window as any).echarts); return }
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js'
    s.onload = () => resolve((window as any).echarts)
    s.onerror = () => resolve(null)
    document.head.appendChild(s)
  })
  return _echartsPromise
}

const chartEls = new Map<string, HTMLElement>()
const chartInstances = new Map<string, any>()

function newId() { return `chart-${++_chartIdSeq}` }

function setChartEl(id: string, el: HTMLElement | null) {
  if (el) {
    chartEls.set(id, el)
    const chart = charts.value.find(c => c.id === id)
    if (chart?.data) renderChart(id)
  } else {
    chartInstances.get(id)?.dispose()
    chartInstances.delete(id)
    chartEls.delete(id)
  }
}

async function renderChart(id: string) {
  const el = chartEls.get(id)
  const chart = charts.value.find(c => c.id === id)
  if (!el || !chart?.data) return
  const ec = await getECharts()
  if (!ec) return
  let inst = chartInstances.get(id)
  if (!inst) {
    inst = ec.init(el, null, { renderer: 'canvas' })
    chartInstances.set(id, inst)
  }
  inst.setOption(buildOption(chart), true)
}

function getChartPalette(chart: ChartConfig): Palette {
  return PALETTES.find(p => p.id === chart.palette) ?? PALETTES[0]!
}

function setChartPalette(chart: ChartConfig, id: string) {
  chart.palette = id
  openPaletteId.value = null
  lockedPaletteId.value = null
  nextTick(() => { if (chart.data && !chart.loading) renderChart(chart.id) })
}

function onPaletteLeave(id: string) {
  if (lockedPaletteId.value !== id) openPaletteId.value = null
}

function togglePaletteLock(id: string) {
  lockedPaletteId.value = lockedPaletteId.value === id ? null : id
  openPaletteId.value = id
}

function buildOption(chart: ChartConfig): any {
  const pal = getChartPalette(chart)
  const axLabel = { color: '#71717a', fontSize: 11 }
  const splitLine = { lineStyle: { color: '#f0f0f1' } }
  const d = chart.data

  if (chart.type === 'bar') {
    return {
      backgroundColor: 'transparent',
      grid: { left: 4, right: 16, top: 6, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true },
      xAxis: { type: 'value', axisLabel: axLabel, splitLine },
      yAxis: {
        type: 'category',
        data: [...d.labels].reverse(),
        axisLabel: { ...axLabel, width: 120, overflow: 'truncate', formatter: (v: string) => v.length > 18 ? v.slice(0, 16) + '…' : v },
      },
      series: [{ type: 'bar', data: [...d.values].reverse(), itemStyle: { color: pal.primary, borderRadius: 2 }, emphasis: { itemStyle: { color: pal.secondary } } }],
    }
  }

  if (chart.type === 'histogram') {
    return {
      backgroundColor: 'transparent',
      grid: { left: 4, right: 8, top: 6, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true },
      xAxis: { type: 'category', data: d.labels, axisLabel: { ...axLabel, rotate: 30 }, splitLine: { show: false } },
      yAxis: { type: 'value', axisLabel: axLabel, splitLine },
      series: [{ type: 'bar', data: d.values, barWidth: '95%', itemStyle: { color: pal.secondary, borderRadius: [2, 2, 0, 0] }, emphasis: { itemStyle: { color: pal.primary } } }],
    }
  }

  if (chart.type === 'line') {
    return {
      backgroundColor: 'transparent',
      grid: { left: 4, right: 8, top: 6, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', confine: true },
      xAxis: { type: 'category', data: d.labels, axisLabel: { ...axLabel, rotate: 30 } },
      yAxis: { type: 'value', axisLabel: axLabel, splitLine },
      series: [{ type: 'line', data: d.values, smooth: true, symbol: 'none', lineStyle: { color: pal.primary, width: 2 }, areaStyle: { color: pal.area } }],
    }
  }

  if (chart.type === 'scatter') {
    const trunc = (s: string) => s.length > 12 ? s.slice(0, 10) + '…' : s
    return {
      backgroundColor: 'transparent',
      grid: { left: 4, right: 8, top: 6, bottom: 4, containLabel: true },
      tooltip: { trigger: 'item', confine: true, formatter: (p: any) => `${chart.col}: ${fmtNum(p.value[0])}<br>${chart.col2}: ${fmtNum(p.value[1])}` },
      xAxis: { type: 'value', name: trunc(chart.col), nameLocation: 'end', nameTextStyle: { color: '#a1a1aa', fontSize: 10 }, axisLabel: axLabel, splitLine },
      yAxis: { type: 'value', name: trunc(chart.col2), nameLocation: 'end', nameTextStyle: { color: '#a1a1aa', fontSize: 10 }, axisLabel: axLabel, splitLine },
      series: [{ type: 'scatter', data: d, symbolSize: 5, itemStyle: { color: pal.secondary, opacity: 0.65 } }],
    }
  }

  if (chart.type === 'bubble') {
    const trunc = (s: string) => s.length > 10 ? s.slice(0, 8) + '…' : s
    const maxZ = Math.max(...(d as number[][]).map(r => r[2] ?? 0))
    const scale = maxZ > 0 ? 30 / Math.sqrt(maxZ) : 1
    return {
      backgroundColor: 'transparent',
      grid: { left: 4, right: 8, top: 6, bottom: 4, containLabel: true },
      tooltip: { trigger: 'item', confine: true, formatter: (p: any) => `${chart.col}: ${fmtNum(p.value[0])}<br>${chart.col2}: ${fmtNum(p.value[1])}<br>${chart.col3}: ${fmtNum(p.value[2])}` },
      xAxis: { type: 'value', name: trunc(chart.col), nameLocation: 'end', nameTextStyle: { color: '#a1a1aa', fontSize: 10 }, axisLabel: axLabel, splitLine },
      yAxis: { type: 'value', name: trunc(chart.col2), nameLocation: 'end', nameTextStyle: { color: '#a1a1aa', fontSize: 10 }, axisLabel: axLabel, splitLine },
      series: [{
        type: 'scatter', data: d,
        symbolSize: (row: number[]) => Math.max(4, Math.sqrt(row[2] ?? 0) * scale),
        itemStyle: { color: pal.secondary2, opacity: 0.65 },
      }],
    }
  }

  return {}
}

// ── Data prep ─────────────────────────────────────────────────────────────────
const MAX_POINTS = 50000

function collectValues(layerId: string, col: string): any[] {
  const feats = getLayerFeatures(layerId)
  const out: any[] = []
  for (const f of feats) {
    const v = f?.properties?.[col]
    if (v == null) continue
    out.push(v)
    if (out.length >= MAX_POINTS) break
  }
  return out
}

function collectPairs(layerId: string, colA: string, colB: string, colC?: string): number[][] {
  const feats = getLayerFeatures(layerId)
  const out: number[][] = []
  for (const f of feats) {
    const a = Number(f?.properties?.[colA])
    const b = Number(f?.properties?.[colB])
    const c = colC ? Number(f?.properties?.[colC]) : 0
    if (!Number.isFinite(a) || !Number.isFinite(b) || (colC && !Number.isFinite(c))) continue
    out.push(colC ? [a, b, Math.abs(c)] : [a, b])
    if (out.length >= MAX_POINTS) break
  }
  return out
}

function bucketMonth(v: any): string | null {
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

async function queryChart(id: string) {
  const chart = charts.value.find(c => c.id === id)
  if (!chart || chart.type === 'count') return

  chart.loading = true
  chart.error = ''
  chart.data = null

  try {
    const col = chart.col
    const col2 = chart.col2
    const col3 = chart.col3
    let data: any

    if (chart.type === 'bar') {
      const vals = collectValues(chart.layerId, col)
      const counts = new Map<string, number>()
      for (const v of vals) {
        const key = String(v ?? '(empty)')
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
      data = { labels: rows.map(r => r[0]), values: rows.map(r => r[1]) }
    }

    else if (chart.type === 'histogram') {
      const vals = collectValues(chart.layerId, col).map(Number).filter(n => Number.isFinite(n))
      if (!vals.length) throw new Error('No numeric values')
      const min = Math.min(...vals)
      const max = Math.max(...vals)
      const bins = 20
      const step = min === max ? 1 : (max - min) / bins
      const counts = new Array(bins).fill(0)
      for (const v of vals) {
        const idx = min === max ? 0 : Math.min(bins - 1, Math.floor((v - min) / step))
        counts[idx] += 1
      }
      const labels = counts.map((_, i) => fmtNum(min + i * step))
      data = { labels, values: counts }
    }

    else if (chart.type === 'line') {
      const kind = getColKind(chart.layerId, col)
      const vals = getLayerFeatures(chart.layerId)
      const map = new Map<string, { sum: number; count: number }>()
      for (const f of vals) {
        const v = f?.properties?.[col]
        if (v == null) continue
        let key: string | null
        if (kind === 'datetime') key = bucketMonth(v)
        else key = String(v)
        if (!key) continue
        const yVal = col2 ? Number(f?.properties?.[col2]) : 1
        if (col2 && !Number.isFinite(yVal)) continue
        const entry = map.get(key) ?? { sum: 0, count: 0 }
        entry.sum += col2 ? yVal : 1
        entry.count += 1
        map.set(key, entry)
      }
      const rows = [...map.entries()]
      if (kind === 'datetime') rows.sort((a, b) => a[0].localeCompare(b[0]))
      else rows.sort((a, b) => b[1].count - a[1].count)
      const labels = rows.map(r => r[0])
      const values = rows.map(r => col2 ? r[1].sum / r[1].count : r[1].count)
      data = { labels, values }
    }

    else if (chart.type === 'scatter' && col2) {
      data = collectPairs(chart.layerId, col, col2)
    }

    else if (chart.type === 'bubble' && col2 && col3) {
      data = collectPairs(chart.layerId, col, col2, col3)
    }

    const c = charts.value.find(c => c.id === id)
    if (c) { c.data = data ?? null; c.loading = false }

    if (data) { await nextTick(); await renderChart(id) }

  } catch (err: any) {
    const c = charts.value.find(c => c.id === id)
    if (c) { c.error = err?.message ?? String(err); c.loading = false }
  }
}

function reloadChart(chart: ChartConfig) {
  if (!chart.layerId || !chart.col) return
  if (chart.type === 'scatter' && !chart.col2) return
  if (chart.type === 'bubble' && (!chart.col2 || !chart.col3)) return
  queryChart(chart.id)
}

function changeType(chart: ChartConfig, type: ChartType) {
  chart.type = type
  if (!colsForType(chart.layerId, type).find(c => c.name === chart.col)) {
    chart.col = colsForType(chart.layerId, type)[0]?.name ?? ''
  }
  if (!needsY(type)) { chart.col2 = ''; chart.col3 = '' }
  if (type !== 'bubble') chart.col3 = ''

  chartInstances.get(chart.id)?.clear()
  chart.data = null
  chart.error = ''

  if (chart.type === 'count') return
  if (!chart.col) return
  if (type === 'scatter' && !chart.col2) return
  if (type === 'bubble' && (!chart.col2 || !chart.col3)) return
  queryChart(chart.id)
}

function removeChart(id: string) {
  chartInstances.get(id)?.dispose()
  chartInstances.delete(id)
  chartEls.delete(id)
  charts.value = charts.value.filter(c => c.id !== id)
}

function selectDraftType(type: ChartType) {
  draftType.value = type
  if (draftCol.value && !colsForType(draftLayerId.value, type).find(c => c.name === draftCol.value)) draftCol.value = ''
  if (!needsY(type)) { draftCol2.value = ''; draftCol3.value = '' }
  if (type !== 'bubble') draftCol3.value = ''
}

const canAddChart = computed(() => {
  if (!draftType.value || !draftLayerId.value || !draftCol.value) return false
  if (draftType.value === 'scatter' && !draftCol2.value) return false
  if (draftType.value === 'bubble' && (!draftCol2.value || !draftCol3.value)) return false
  return true
})

const draftXLabel = computed(() => {
  if (!draftType.value) return 'Column'
  if (['scatter', 'bubble', 'line'].includes(draftType.value)) return 'X axis'
  return 'Column'
})

async function commitAddChart() {
  if (!canAddChart.value || !draftType.value) return
  const id = newId()
  charts.value.push({ id, type: draftType.value, palette: 'zinc', layerId: draftLayerId.value, col: draftCol.value, col2: draftCol2.value, col3: draftCol3.value, data: null, loading: false, error: '' })
  draftType.value = null
  draftLayerId.value = ''
  draftCol.value = ''
  draftCol2.value = ''
  draftCol3.value = ''
  await queryChart(id)
}

async function autoAddInitialCharts() {
  if (charts.value.length || loadedLayers.value.length === 0) return
  const layerId = loadedLayers.value[0]!.id
  const cols = analyzeLayer(layerId)
  const catCol = cols.find(c => c.kind === 'categorical')
  const numCol = cols.find(c => c.kind === 'numeric')
  const dtCol = cols.find(c => c.kind === 'datetime')
  const toAdd: Array<{ type: ChartType; col: string }> = []
  if (catCol) toAdd.push({ type: 'bar', col: catCol.name })
  if (numCol) toAdd.push({ type: 'histogram', col: numCol.name })
  else if (dtCol) toAdd.push({ type: 'line', col: dtCol.name })

  const ids: string[] = []
  for (const t of toAdd.slice(0, 2)) {
    const id = newId()
    ids.push(id)
    charts.value.push({ id, type: t.type, palette: 'zinc', layerId, col: t.col, col2: '', col3: '', data: null, loading: false, error: '' })
  }
  await Promise.all(ids.map(id => queryChart(id)))
}

// ── Resizing ─────────────────────────────────────────────────────────────────
function startResize(e: MouseEvent) {
  const startX = e.clientX
  const startW = panelWidth.value
  const onMove = (ev: MouseEvent) => {
    panelWidth.value = Math.max(240, Math.min(600, startW + (startX - ev.clientX)))
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

// ── Watches ──────────────────────────────────────────────────────────────────
watch(isOpen, v => emit('openChange', v))
watch(() => props.hidden, v => { if (v) isOpen.value = false })
watch([isOpen, loadedLayers], ([open, layers]) => {
  if (!layers.length) return
  if (!draftLayerId.value) draftLayerId.value = layers[0]!.id
  for (const c of charts.value) {
    if (!c.layerId || !layers.find(l => l.id === c.layerId)) {
      c.layerId = layers[0]!.id
      c.col = ''
      c.col2 = ''
      c.col3 = ''
    }
  }
  if (open) autoAddInitialCharts()
})

onBeforeUnmount(() => {
  for (const inst of chartInstances.values()) inst.dispose()
  chartInstances.clear()
  chartEls.clear()
})
</script>

<style scoped>
:deep(*) { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Figtree', 'Segoe UI', system-ui, sans-serif; }

/* ── FAB ─────────────────────────────────────────────────────────────────── */
.lc-fab {
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
.lc-fab:hover { background: hsl(var(--card)); box-shadow: 0 4px 18px rgba(0,0,0,0.4); }
.lc-fab--active { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); }

/* ── Panel ───────────────────────────────────────────────────────────────── */
.lc-panel {
  position: absolute;
  top: 1rem;
  right: calc(1rem + 40px + 8px);
  bottom: 1rem;
  z-index: 19;
  min-width: 240px;
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(14px);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.lc-resize-handle {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 5px;
  cursor: ew-resize;
  z-index: 10;
  border-radius: 8px 0 0 8px;
  transition: background 0.15s;
}
.lc-resize-handle:hover, .lc-resize-handle:active {
  background: hsl(var(--primary) / 0.2);
}

.lc-slide-enter-active, .lc-slide-leave-active { transition: opacity 0.18s, transform 0.18s; }
.lc-slide-enter-from, .lc-slide-leave-to { opacity: 0; transform: translateX(8px); }

/* ── Header ───────────────────────────────────────────────────────────────── */
.lc-header {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}
.lc-title-wrap { display: flex; flex-direction: column; gap: 0.1rem; margin-right: auto; }
.lc-title { font-size: 0.9rem; font-weight: 600; color: hsl(var(--foreground)); line-height: 1.1; }
.lc-subtitle { font-size: 0.72rem; color: hsl(var(--muted-foreground)); }

.lc-close {
  width: 28px; height: 28px; border-radius: 6px; border: none;
  background: transparent; color: hsl(var(--muted-foreground));
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.lc-close:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }

/* ── Body ────────────────────────────────────────────────────────────────── */
.lc-body {
  overflow-y: auto;
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  flex: 1;
}

.lc-empty {
  font-size: 0.78rem;
  color: hsl(var(--muted-foreground));
  padding: 0.6rem 0.2rem;
}

/* ── Cards ─────────────────────────────────────────────────────────────── */
.lc-card {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
}

.lc-card--add {
  border-style: dashed;
  background: transparent;
}

.lc-card-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.lc-type-pills {
  display: flex; gap: 0.25rem; flex-wrap: wrap;
}

.lc-type-pill {
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px; border: 1px solid hsl(var(--border));
  background: hsl(var(--card)); color: hsl(var(--muted-foreground));
  cursor: pointer; transition: all 0.12s;
}
.lc-type-pill--active { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); }
.lc-type-pill--disabled { opacity: 0.4; cursor: not-allowed; }

.lc-card-close {
  border: none; background: transparent; color: hsl(var(--muted-foreground));
  font-size: 1rem; cursor: pointer;
}

.lc-card-selects {
  display: grid; grid-template-columns: 1fr; gap: 0.35rem;
}

.lc-select {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  color: hsl(var(--foreground));
  font-size: 0.74rem;
  padding: 0.35rem 0.5rem;
  outline: none;
  font-family: inherit;
}
.lc-select--full { width: 100%; }

.lc-count-display {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 0.6rem;
  display: flex; flex-direction: column; gap: 0.25rem;
}
.lc-count-big { font-size: 1.2rem; font-weight: 600; }
.lc-count-sub { font-size: 0.75rem; color: hsl(var(--muted-foreground)); }
.lc-count-pills { display: flex; gap: 0.35rem; flex-wrap: wrap; font-size: 0.65rem; color: hsl(var(--muted-foreground)); }

.lc-card-placeholder {
  height: 140px;
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: hsl(var(--muted-foreground));
}
.lc-card-hint { font-size: 0.75rem; }
.lc-card-error { font-size: 0.75rem; color: #ef4444; }
.lc-card-spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid hsl(var(--border)); border-top-color: hsl(var(--foreground));
  animation: lc-spin 0.8s linear infinite;
}

.lc-chart-canvas { width: 100%; height: 180px; }

@keyframes lc-spin { to { transform: rotate(360deg); } }

/* ── Palette ─────────────────────────────────────────────────────────── */
.lc-pal-anchor { position: absolute; right: 8px; bottom: 8px; }
.lc-pal-pop {
  position: absolute; right: 0; bottom: 26px;
  background: hsl(var(--card)); border: 1px solid hsl(var(--border));
  border-radius: 8px; padding: 6px; display: grid; grid-template-columns: repeat(3, 16px); gap: 6px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
}
.lc-swatch { width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.2); cursor: pointer; }
.lc-swatch--active { outline: 2px solid hsl(var(--foreground)); outline-offset: 1px; }

.lc-palette-dot {
  width: 16px; height: 16px; border-radius: 50%; border: none; cursor: pointer;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
}
.lc-palette-dot--locked { box-shadow: 0 0 0 2px hsl(var(--foreground)); }

/* ── Add chart card ───────────────────────────────────────────────────── */
.lc-add-title { font-size: 0.85rem; font-weight: 600; color: hsl(var(--foreground)); }
.lc-add-types { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem; }

.lc-add-type {
  display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
  border: 1px solid hsl(var(--border)); background: hsl(var(--card));
  border-radius: 8px; padding: 0.45rem 0.35rem; cursor: pointer; transition: all 0.12s;
}
.lc-add-type--active { border-color: hsl(var(--primary)); box-shadow: 0 0 0 1px hsl(var(--primary)); }
.lc-add-type--disabled { opacity: 0.4; cursor: not-allowed; }

.lc-add-type-icon { color: hsl(var(--foreground)); }
.lc-add-type-label { font-size: 0.65rem; color: hsl(var(--muted-foreground)); }

.lc-add-selects { display: flex; flex-direction: column; gap: 0.4rem; }
.lc-add-select-row { display: flex; flex-direction: column; gap: 0.25rem; }
.lc-add-select-label { font-size: 0.65rem; color: hsl(var(--muted-foreground)); }

.lc-add-btn {
  margin-top: 0.2rem;
  width: 100%;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.6rem;
  font-size: 0.75rem;
  cursor: pointer;
}
.lc-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
