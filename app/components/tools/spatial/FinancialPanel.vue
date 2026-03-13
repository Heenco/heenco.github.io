<template>
  <!-- ─── Financial FAB ────────────────────────────────────────────────────── -->
  <button
    v-show="!hidden"
    class="fp-fab"
    :class="{ 'fp-fab--active': isOpen }"
    :style="{ top: fabTop }"
    @click="isOpen = !isOpen"
    :title="isOpen ? 'Close Financial Analysis' : 'Property Financial Analysis'"
  >
    <!-- Dollar / property icon -->
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
    <span v-if="verdict && !isOpen" class="fp-fab-badge">{{ verdict.rating }}</span>
  </button>

  <!-- ─── Financial Panel ──────────────────────────────────────────────────── -->
  <transition name="fp-drop">
    <div v-if="isOpen" class="fp-panel" :style="{ top: panelTop, maxHeight: panelMaxHeight, width: panelWidth + 'px' }">
      <div class="fp-resize-handle" @mousedown.prevent="startResize" />

      <!-- Header -->
      <div class="fp-header">
        <div class="fp-title-wrap">
          <span class="fp-title">Financial Analysis</span>
          <span class="fp-subtitle">Property &amp; Market Insights</span>
        </div>
        <div class="fp-tabs">
          <button class="fp-tab" :class="{ 'fp-tab--on': view === 'report' }" @click="view = 'report'">Report</button>
          <button class="fp-tab" :class="{ 'fp-tab--on': view === 'sales' }" @click="view = 'sales'">Sales</button>
        </div>
        <button class="fp-close" @click="isOpen = false" title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="fp-body">

        <!-- No point hint -->
        <div v-if="!point" class="fp-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Search an address to analyse a property location
        </div>

        <template v-else>

          <!-- Address pill + Run -->
          <div class="fp-address-row">
            <span class="fp-address-pill">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              {{ point.label || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}` }}
            </span>
            <button class="fp-run" :disabled="running" @click="runAnalysis">
              <svg v-if="!running" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="fp-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              {{ running ? 'Analysing…' : 'Analyse' }}
            </button>
          </div>

          <!-- Agent progress (while running) -->
          <div v-if="running" class="fp-agents">
            <div v-for="ag in agents" :key="ag.id" class="fp-agent" :class="{ 'fp-agent--done': ag.done }">
              <span class="fp-agent-icon" v-html="ag.icon"></span>
              <span class="fp-agent-label">{{ ag.label }}</span>
              <span v-if="ag.done" class="fp-agent-check">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <span v-else class="fp-agent-shimmer"></span>
            </div>
          </div>

          <!-- ── REPORT VIEW ────────────────────────────────────────────── -->
          <template v-if="view === 'report' && hasResults">

            <!-- Verdict card -->
            <div v-if="verdict" class="fp-verdict">
              <div class="fp-verdict-ring" :class="ratingClass(verdict.rating)">
                <span class="fp-verdict-num">{{ verdict.rating }}</span>
              </div>
              <div class="fp-verdict-body">
                <span class="fp-verdict-headline">{{ verdict.headline }}</span>
                <div class="fp-verdict-tags">
                  <span v-for="p in verdict.buyerProfiles" :key="p" class="fp-vtag">{{ p }}</span>
                </div>
              </div>
            </div>

            <!-- Risk chips -->
            <div v-if="verdict?.risks?.length" class="fp-risks">
              <span
                v-for="r in verdict.risks"
                :key="r.flag"
                class="fp-risk"
                :class="`fp-risk--${r.severity}`"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {{ r.flag }}
              </span>
            </div>

            <!-- Metric cards -->
            <div v-if="metrics.length" class="fp-metrics">
              <div
                v-for="(m, i) in metrics"
                :key="m.label"
                class="fp-metric"
                :style="{ animationDelay: `${i * 40}ms` }"
              >
                <span class="fp-metric-value">
                  {{ m.value }}
                  <svg v-if="m.trend === 'up'" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                  <svg v-else-if="m.trend === 'down'" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
                <span class="fp-metric-label">{{ m.label }}</span>
                <span v-if="m.sub" class="fp-metric-sub">{{ m.sub }}</span>
                <span class="fp-metric-src" :class="`fp-metric-src--${m.confidence}`">{{ m.source }}</span>
              </div>
            </div>

            <!-- Narrative sections -->
            <div v-for="sec in sections" :key="sec.id" class="fp-section">
              <div class="fp-section-header">
                <span class="fp-section-title">{{ sec.title }}</span>
              </div>
              <p class="fp-section-body">{{ sec.text }}<span v-if="sec.streaming" class="fp-cursor">|</span></p>
            </div>

          </template>

          <!-- ── SALES VIEW ────────────────────────────────────────────── -->
          <template v-if="view === 'sales' && hasResults">
            <div v-if="sales.length === 0 && !running" class="fp-empty">No recent sales data found</div>
            <div v-for="s in sales" :key="s.address + s.date" class="fp-sale">
              <div class="fp-sale-top">
                <span class="fp-sale-type" :class="`fp-sale-type--${s.type.toLowerCase()}`">{{ s.type }}</span>
                <span class="fp-sale-price">{{ formatPrice(s.price) }}</span>
                <a v-if="s.url" :href="s.url" target="_blank" rel="noopener" class="fp-sale-link" title="View listing">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
              <div class="fp-sale-addr">{{ s.address }}</div>
              <div class="fp-sale-meta">
                <span v-if="s.bedrooms">{{ s.bedrooms }}bd</span>
                <span v-if="s.bathrooms">{{ s.bathrooms }}ba</span>
                <span class="fp-sale-date">{{ formatDate(s.date) }}</span>
              </div>
            </div>
          </template>

          <!-- Error -->
          <div v-if="error" class="fp-error">⚠ {{ error }}</div>

        </template>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SpatialPoint { lng: number; lat: number; label?: string; suburb?: string; state?: string; postcode?: string }

interface Metric {
  label: string; value: string; trend?: 'up' | 'down' | 'flat'
  sub?: string; source: string; confidence: 'high' | 'medium' | 'low'
}
interface Sale {
  address: string; price: number | null; date: string
  bedrooms: number | null; bathrooms: number | null
  type: string; url: string | null
}
interface Section { id: string; title: string; text: string; streaming: boolean }
interface Verdict {
  headline: string; rating: number
  buyerProfiles: string[]; risks: Array<{ flag: string; severity: string }>
}
interface Agent { id: string; label: string; icon: string; done: boolean }

// ── Props / emit ──────────────────────────────────────────────────────────────
const props = defineProps<{
  point: SpatialPoint | null
  reachBotPx?: number
  layersPanelBottom?: number
  layersFabVisible?: boolean
  hidden?: boolean
}>()

const emit = defineEmits<{
  openChange: [open: boolean]
}>()

// ── UI state ──────────────────────────────────────────────────────────────────
const isOpen = ref(false)
const view   = ref<'report' | 'sales'>('report')
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

// ── Positioning (stack below Reach FAB) ───────────────────────────────────────
const fabTop = computed(() => {
  if (props.reachBotPx) return `${props.reachBotPx + 8}px`
  if (props.layersPanelBottom) return `${props.layersPanelBottom + 8 + 40 + 8 + 40 + 8 + 40 + 8}px`
  if (props.layersFabVisible)  return 'calc(1rem + 144px + 48px)'
  return 'calc(1rem + 144px)'
})
const panelTop = computed(() => {
  if (props.reachBotPx) return `${props.reachBotPx + 8 + 40 + 8}px`
  return 'calc(1rem + 196px)'
})
const panelMaxHeight = computed(() => `calc(100vh - ${panelTop.value} - 1rem)`)

// ── Analysis state ────────────────────────────────────────────────────────────
const running  = ref(false)
const error    = ref('')
const metrics  = ref<Metric[]>([])
const sales    = ref<Sale[]>([])
const sections = ref<Section[]>([])
const verdict  = ref<Verdict | null>(null)

const hasResults = computed(() => metrics.value.length > 0 || sections.value.length > 0 || sales.value.length > 0)

const agents = ref<Agent[]>([
  { id: 'profile', label: 'Suburb Profile',  icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>', done: false },
  { id: 'market',  label: 'Market Metrics',  icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', done: false },
  { id: 'sales',   label: 'Recent Sales',    icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>', done: false },
])

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPrice(n: number | null) {
  if (!n) return '—'
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1000).toFixed(0)}k`
}

function formatDate(d: string) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
  } catch { return d }
}

function ratingClass(r: number) {
  if (r >= 70) return 'fp-verdict-ring--high'
  if (r >= 45) return 'fp-verdict-ring--med'
  return 'fp-verdict-ring--low'
}

// ── Run analysis ──────────────────────────────────────────────────────────────
async function runAnalysis() {
  if (!props.point) return
  running.value = true
  error.value   = ''
  metrics.value  = []
  sales.value    = []
  sections.value = []
  verdict.value  = null
  view.value     = 'report'

  // Reset agents
  for (const a of agents.value) a.done = false

  // Derive suburb/state/postcode from label if available
  const label = props.point.label ?? ''
  // Try to parse "Street, Suburb State Postcode" — best effort
  const suburMatch = label.match(/,\s*([^,]+?)\s+([A-Z]{2,3})\s+(\d{4})\s*$/)
  const suburb  = props.point.suburb  ?? suburMatch?.[1] ?? label.split(',').slice(-2, -1)[0]?.trim() ?? ''
  const state   = props.point.state   ?? suburMatch?.[2] ?? 'AU'
  const postcode= props.point.postcode?? suburMatch?.[3] ?? ''

  try {
    const res = await fetch('/api/property/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address:  label,
        suburb,
        state,
        postcode,
        lat: props.point.lat,
        lng: props.point.lng,
      }),
    })

    if (!res.ok || !res.body) throw new Error(`Server error ${res.status}`)

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const blocks = buf.split('\n\n')
      buf = blocks.pop() ?? ''
      for (const block of blocks) {
        const lines = block.split('\n')
        const eventLine = lines.find(l => l.startsWith('event: '))
        const dataLine  = lines.find(l => l.startsWith('data: '))
        if (!eventLine || !dataLine) continue
        const evtType = eventLine.slice(7).trim()
        let evtData: any
        try { evtData = JSON.parse(dataLine.slice(6)) } catch { continue }
        handleEvent(evtType, evtData)
      }
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Analysis failed'
  } finally {
    running.value = false
    // Clear any leftover streaming cursors
    for (const s of sections.value) s.streaming = false
  }
}

function handleEvent(type: string, data: any) {
  switch (type) {
    case 'agent:done': {
      const ag = agents.value.find(a => a.id === data.id)
      if (ag) ag.done = true
      break
    }
    case 'metric':
      metrics.value.push(data as Metric)
      break
    case 'sale':
      sales.value.push(data as Sale)
      break
    case 'stream:start': {
      sections.value.push({ id: data.section, title: data.title ?? data.section, text: '', streaming: true })
      break
    }
    case 'stream:chunk': {
      const sec = sections.value.find(s => s.id === data.section)
      if (sec) sec.text += data.text
      break
    }
    case 'stream:end': {
      const sec = sections.value.find(s => s.id === data.section)
      if (sec) sec.streaming = false
      break
    }
    case 'verdict':
      verdict.value = data as Verdict
      break
    case 'error':
      console.warn('[FinancialPanel] agent error', data)
      break
  }
}

// Clear when point changes
watch(() => props.point, () => {
  metrics.value  = []
  sales.value    = []
  sections.value = []
  verdict.value  = null
  error.value    = ''
})
</script>

<style scoped>
/* ── FAB ─────────────────────────────────────────────────────────────────── */
.fp-fab {
  position: absolute;
  right: 1rem;
  z-index: 20;
  width: 40px; height: 40px;
  border-radius: 50%;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(10px);
  color: hsl(var(--foreground));
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, border-color 0.15s, opacity 0.2s, transform 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
}
.fp-fab:hover { background: hsl(var(--muted)); }
.fp-fab--active {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
.fp-fab-badge {
  position: absolute;
  top: -4px; right: -4px;
  font-size: 0.59rem; font-weight: 700;
  background: #f59e0b; color: #000;
  border-radius: 20px; padding: 0.05rem 0.28rem;
  min-width: 16px; text-align: center;
  line-height: 1.5;
  border: 1.5px solid hsl(var(--card));
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
.fp-panel {
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
.fp-drop-enter-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.fp-drop-leave-active { transition: opacity 0.14s ease, transform 0.14s ease; }
.fp-drop-enter-from, .fp-drop-leave-to { opacity: 0; transform: translateY(-6px) scale(0.98); }

.fp-resize-handle {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 5px;
  cursor: ew-resize;
  z-index: 10;
  border-radius: 12px 0 0 12px;
  transition: background 0.15s;
}
.fp-resize-handle:hover, .fp-resize-handle:active {
  background: hsl(var(--primary) / 0.2);
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.fp-header {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 0.65rem 0.35rem;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}
.fp-title-wrap { display: flex; flex-direction: column; margin-right: auto; }
.fp-title { font-size: 0.85rem; font-weight: 400; color: hsl(var(--foreground)); line-height: 1.1; display: flex; align-items: center; gap: 0.3rem; }
.fp-subtitle { font-size: 0.74rem; color: hsl(var(--muted-foreground)); }
.fp-tabs { display: flex; gap: 0.15rem; background: hsl(var(--muted)/0.4); border-radius: 6px; padding: 2px; }
.fp-tab {
  font-size: 0.77rem; font-weight: 500; padding: 0.18rem 0.55rem;
  border-radius: 4px; border: none; background: transparent;
  color: hsl(var(--muted-foreground)); cursor: pointer; transition: all 0.12s;
}
.fp-tab:hover { background: hsl(var(--muted) / 0.5); }
.fp-tab--on { background: hsl(var(--card)); color: hsl(var(--foreground)); box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
.fp-close {
  width: 22px; height: 22px; border-radius: 50%; border: none;
  background: transparent; cursor: pointer;
  color: hsl(var(--muted-foreground)); display: flex; align-items: center; justify-content: center;
  transition: background 0.12s;
}
.fp-close:hover { background: hsl(var(--muted)); }

/* ── Body ────────────────────────────────────────────────────────────────── */
.fp-body {
  overflow-y: auto; padding: 0.6rem 0.65rem;
  display: flex; flex-direction: column; gap: 0.5rem;
  scrollbar-width: thin; flex: 1;
}

/* ── Hint ────────────────────────────────────────────────────────────────── */
.fp-hint {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.76rem; color: hsl(var(--muted-foreground));
  padding: 2rem 0.5rem 1.5rem;
  text-align: center; justify-content: center; flex-direction: column;
}

/* ── Address row ─────────────────────────────────────────────────────────── */
.fp-address-row { display: flex; align-items: center; gap: 0.4rem; }
.fp-address-pill {
  flex: 1; display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.77rem; color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 0.4); border-radius: 20px;
  padding: 0.22rem 0.55rem;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.fp-run {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.79rem; font-weight: 600;
  padding: 0.28rem 0.65rem; border-radius: 20px; border: none;
  background: #f59e0b; color: #000; cursor: pointer;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.fp-run:disabled { opacity: 0.55; cursor: not-allowed; }
@keyframes fp-spin { to { transform: rotate(360deg); } }
.fp-spin { animation: fp-spin 0.8s linear infinite; }

/* ── Agents ──────────────────────────────────────────────────────────────── */
.fp-agents { display: flex; flex-direction: column; gap: 0.3rem; }
.fp-agent {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.74rem; color: hsl(var(--muted-foreground));
  padding: 0.25rem 0.4rem; border-radius: 6px;
  background: hsl(var(--muted) / 0.25);
  transition: background 0.2s;
}
.fp-agent--done { background: hsl(var(--muted) / 0.12); color: hsl(var(--foreground)); }
.fp-agent-icon { opacity: 0.6; display: flex; }
.fp-agent--done .fp-agent-icon { opacity: 1; }
.fp-agent-label { flex: 1; }
.fp-agent-check { color: #22c55e; display: flex; }
@keyframes fp-shimmer {
  0%   { opacity: 0.3; }
  50%  { opacity: 0.9; }
  100% { opacity: 0.3; }
}
.fp-agent-shimmer {
  width: 40px; height: 4px; border-radius: 2px;
  background: hsl(var(--muted)); animation: fp-shimmer 1.2s ease-in-out infinite;
}

/* ── Verdict ─────────────────────────────────────────────────────────────── */
.fp-verdict {
  display: flex; align-items: center; gap: 0.65rem;
  padding: 0.6rem 0.65rem; border-radius: 10px;
  background: hsl(var(--muted) / 0.35);
  border: 1px solid hsl(var(--border) / 0.5);
}
.fp-verdict-ring {
  width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.80rem; font-weight: 500;
  border: 2.5px solid currentColor;
}
.fp-verdict-ring--high { color: #22c55e; }
.fp-verdict-ring--med  { color: #f59e0b; }
.fp-verdict-ring--low  { color: #ef4444; }
.fp-verdict-num { line-height: 1; }
.fp-verdict-body { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
.fp-verdict-headline { font-size: 0.77rem; font-weight: 600; color: hsl(var(--foreground)); line-height: 1.3; }
.fp-verdict-tags { display: flex; flex-wrap: wrap; gap: 0.2rem; }
.fp-vtag {
  font-size: 0.64rem; font-weight: 600; padding: 0.06rem 0.32rem;
  border-radius: 20px; background: hsl(var(--primary) / 0.12);
  color: hsl(var(--primary));
}

/* ── Risks ───────────────────────────────────────────────────────────────── */
.fp-risks { display: flex; flex-direction: column; gap: 0.22rem; }
.fp-risk {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.76rem; padding: 0.22rem 0.45rem; border-radius: 6px;
  font-weight: 500;
}
.fp-risk--high   { background: #ef444422; color: #f87171; }
.fp-risk--medium { background: #f59e0b22; color: #fbbf24; }
.fp-risk--low    { background: hsl(var(--muted)/0.4); color: hsl(var(--muted-foreground)); }

/* ── Metric cards ────────────────────────────────────────────────────────── */
.fp-metrics {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;
}
@keyframes fp-pop {
  from { opacity: 0; transform: scale(0.94) translateY(4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.fp-metric {
  background: hsl(var(--muted) / 0.25); border-radius: 8px;
  padding: 0.45rem 0.5rem; display: flex; flex-direction: column; gap: 0.1rem;
  border: 1px solid hsl(var(--border) / 0.3);
  animation: fp-pop 0.2s ease both;
}
.fp-metric-value {
  font-size: 0.89rem; font-weight: 700; color: hsl(var(--foreground));
  display: flex; align-items: center; gap: 0.2rem;
}
.fp-metric-label { font-size: 0.79rem; color: hsl(var(--muted-foreground)); line-height: 1.2; }
.fp-metric-sub   { font-size: 0.76rem; color: hsl(var(--muted-foreground) / 0.7); }
.fp-metric-src {
  font-size: 0.59rem; margin-top: 0.15rem; opacity: 0.5;
}
.fp-metric-src--high   { color: #22c55e; }
.fp-metric-src--medium { color: #f59e0b; }
.fp-metric-src--low    { color: #9ca3af; }

/* ── Narrative sections ──────────────────────────────────────────────────── */
.fp-section { display: flex; flex-direction: column; gap: 0.25rem; }
.fp-section-header { display: flex; align-items: center; }
.fp-section-title {
  font-size: 0.79rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: hsl(var(--muted-foreground));
}
.fp-section-body {
  font-size: 0.76rem; color: hsl(var(--foreground)); line-height: 1.6;
  margin: 0;
}
@keyframes fp-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.fp-cursor { animation: fp-blink 0.8s step-end infinite; color: #f59e0b; }

/* ── Recent sales ────────────────────────────────────────────────────────── */
.fp-empty { font-size: 0.74rem; color: hsl(var(--muted-foreground)); text-align: center; padding: 1rem; }
.fp-sale {
  display: flex; flex-direction: column; gap: 0.18rem;
  padding: 0.45rem 0.5rem; border-radius: 8px;
  background: hsl(var(--muted) / 0.2);
  border: 1px solid hsl(var(--border) / 0.3);
}
.fp-sale-top { display: flex; align-items: center; gap: 0.4rem; }
.fp-sale-type {
  font-size: 0.76rem; font-weight: 700; padding: 0.05rem 0.3rem;
  border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em;
}
.fp-sale-type--house     { background: #6366f122; color: #818cf8; }
.fp-sale-type--unit      { background: #0ea5e922; color: #38bdf8; }
.fp-sale-type--townhouse { background: #8b5cf622; color: #a78bfa; }
.fp-sale-type--land      { background: #16a34a22; color: #4ade80; }
.fp-sale-type--other     { background: hsl(var(--muted)/0.4); color: hsl(var(--muted-foreground)); }
.fp-sale-price { flex: 1; font-size: 0.87rem; font-weight: 700; color: hsl(var(--foreground)); }
.fp-sale-link {
  color: hsl(var(--muted-foreground)); display: flex; padding: 0.15rem;
  border-radius: 4px; transition: color 0.12s, background 0.12s;
}
.fp-sale-link:hover { color: hsl(var(--foreground)); background: hsl(var(--muted) / 0.5); }
.fp-sale-addr { font-size: 0.79rem; color: hsl(var(--foreground)); line-height: 1.3; }
.fp-sale-meta { display: flex; align-items: center; gap: 0.4rem; font-size: 0.74rem; color: hsl(var(--muted-foreground)); }
.fp-sale-date { margin-left: auto; }

/* ── Error ───────────────────────────────────────────────────────────────── */
.fp-error {
  font-size: 0.74rem; color: #f87171;
  background: #ef444415; border-radius: 6px; padding: 0.4rem 0.5rem;
}
</style>
