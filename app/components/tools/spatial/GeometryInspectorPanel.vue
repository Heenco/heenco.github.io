<template>
  <!-- ─── GI FAB ────────────────────────────────────────────────────────────── -->
  <button
    v-show="!hidden"
    class="gi-fab"
    :class="{ 'gi-fab--active': isOpen }"
    :style="{ top: fabTop }"
    @click="toggleOpen"
    :title="isOpen ? 'Close Geometry Inspector' : 'Geometry Inspector — polygon analysis'"
  >
    <!-- Property/lot polygon icon -->
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="7" width="16" height="10" rx="1"/>
      <path d="M4 9L8 5M20 9l-4-4"/>
    </svg>
    <span v-if="analysisResults && !isOpen" class="gi-fab-badge">✓</span>
  </button>
  <transition name="gi-drop">
    <div v-if="isOpen" class="gi-panel" :style="{ top: panelTop, maxHeight: panelMaxHeight, width: panelWidth + 'px' }">
      <div class="gi-resize-handle" @mousedown.prevent="startResize" />

      <!-- Header -->
      <div class="gi-header">
        <div class="gi-title-wrap">
          <span class="gi-title">Geometry Inspector</span>
          <span class="gi-subtitle">Polygon Analysis</span>
        </div>
        <button class="gi-close" @click="toggleOpen" title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="gi-body">
        <!-- No selection hint -->
        <div v-if="!analysisResults" class="gi-hints">
          <div class="gi-hint">
            <span class="gi-hint-dot" />
            <span>Open a polygon layer on the map, then click a polygon to analyze</span>
          </div>
          <div v-if="props.clickMsg" class="gi-click-msg">⚠ {{ props.clickMsg }}</div>
        </div>

        <!-- Analysis Results -->
        <div v-else>
          <!-- Layer info -->
          <div class="gi-feature-info">
            <div v-if="selectedFeature?.properties" class="gi-info-row">
              <span class="gi-info-label">Feature ID:</span>
              <span class="gi-info-value">{{ selectedFeature.id || 'N/A' }}</span>
            </div>
          </div>

          <!-- ─── ORIENTATION ─────────────────────────────── -->
          <div class="gi-section">
            <button class="gi-section-toggle" @click="toggleSection('orientation')">
              <span class="gi-section-chevron" :class="{ open: expandedSections.orientation }">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
              <span class="gi-section-title">Orientation</span>
            </button>
            <div v-show="expandedSections.orientation" class="gi-section-content">
              <div class="gi-metric">
                <span class="gi-label">Long Edge Bearing:</span>
                <span class="gi-value">{{ analysisResults.orientation.longEdgeBearing }}° {{ analysisResults.orientation.longEdgeCardinal }}</span>
              </div>
              <div class="gi-metric">
                <span class="gi-label">Long Edge Length:</span>
                <span class="gi-value">{{ analysisResults.orientation.longEdgeLength }}m</span>
              </div>
              <div class="gi-metric">
                <span class="gi-label">Principal Axis:</span>
                <span class="gi-value">{{ analysisResults.orientation.principalAxis }}° {{ analysisResults.orientation.principalAxisCardinal }}</span>
              </div>
            </div>
          </div>

          <!-- ─── CONVEXITY ────────────────────────────── -->
          <div class="gi-section">
            <button class="gi-section-toggle" @click="toggleSection('convexity')">
              <span class="gi-section-chevron" :class="{ open: expandedSections.convexity }">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
              <span class="gi-section-title">Convexity</span>
              <span class="gi-status-badge" :class="{ convex: analysisResults.convexity.isConvex, concave: !analysisResults.convexity.isConvex }">
                {{ analysisResults.convexity.isConvex ? 'Convex' : 'Concave' }}
              </span>
            </button>
            <div v-show="expandedSections.convexity" class="gi-section-content">
              <div class="gi-metric">
                <span class="gi-label">Shape:</span>
                <span class="gi-value">{{ analysisResults.convexity.isConvex ? 'Convex' : 'Concave' }}</span>
              </div>
              <div v-if="!analysisResults.convexity.isConvex" class="gi-metric">
                <span class="gi-label">Reflex Angles:</span>
                <span class="gi-value">{{ analysisResults.convexity.reflex_angles_count }} @ {{ analysisResults.convexity.reflexAngles.map(a => Math.round(a)).join('°, ') }}°</span>
              </div>
              <div class="gi-metric">
                <span class="gi-label">Convexity Ratio:</span>
                <span class="gi-value">{{ (analysisResults.convexity.convexityRatio * 100).toFixed(1) }}%</span>
              </div>
              <div class="gi-metric">
                <span class="gi-label">Regularity:</span>
                <span class="gi-value">{{ analysisResults.convexity.regularity_percentage }}%</span>
              </div>
            </div>
          </div>

          <!-- ─── FRONTAGE / SIDES / BACK ──────────────── -->
          <div class="gi-section">
            <button class="gi-section-toggle" @click="toggleSection('frontage')">
              <span class="gi-section-chevron" :class="{ open: expandedSections.frontage }">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
              <span class="gi-section-title">Frontage & Sides</span>
            </button>
            <div v-show="expandedSections.frontage" class="gi-section-content">
              <div class="gi-metric">
                <span class="gi-label">Frontage (Primary):</span>
                <span class="gi-value">{{ analysisResults.frontage.frontageLength }}m {{ analysisResults.frontage.frontageCardinal }}</span>
              </div>
              <div class="gi-metric">
                <span class="gi-label">Left Side:</span>
                <span class="gi-value">{{ analysisResults.frontage.leftSideLength }}m</span>
              </div>
              <div class="gi-metric">
                <span class="gi-label">Back:</span>
                <span class="gi-value">{{ analysisResults.frontage.backLength }}m</span>
              </div>
              <div class="gi-metric">
                <span class="gi-label">Right Side:</span>
                <span class="gi-value">{{ analysisResults.frontage.rightSideLength }}m</span>
              </div>
            </div>
          </div>

          <!-- ─── BATTLE AXE ───────────────────────────── -->
          <div class="gi-section">
            <button class="gi-section-toggle" @click="toggleSection('battleAxe')">
              <span class="gi-section-chevron" :class="{ open: expandedSections.battleAxe }">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
              <span class="gi-section-title">Battle Axe</span>
              <span v-if="analysisResults.battleAxe.isBattleAxe" class="gi-status-badge warning">
                {{ analysisResults.battleAxe.confidence }}% likely
              </span>
            </button>
            <div v-show="expandedSections.battleAxe" class="gi-section-content">
              <div class="gi-metric">
                <span class="gi-label">Status:</span>
                <span class="gi-value" :class="{ warning: analysisResults.battleAxe.isBattleAxe }">
                  {{ analysisResults.battleAxe.isBattleAxe === true ? `YES (${analysisResults.battleAxe.confidence}%)` : analysisResults.battleAxe.isBattleAxe ? `${analysisResults.battleAxe.isBattleAxe.toUpperCase()} (${analysisResults.battleAxe.confidence}%)` : 'No' }}
                </span>
              </div>
              <div v-if="analysisResults.battleAxe.isBattleAxe" class="gi-metric">
                <span class="gi-label">Stem Width:</span>
                <span class="gi-value">{{ analysisResults.battleAxe.stemWidth }}m</span>
              </div>
              <div v-if="analysisResults.battleAxe.isBattleAxe" class="gi-metric">
                <span class="gi-label">Body Width:</span>
                <span class="gi-value">{{ analysisResults.battleAxe.bodyWidth }}m</span>
              </div>
              <div v-if="analysisResults.battleAxe.isBattleAxe" class="gi-metric">
                <span class="gi-label">Width Ratio:</span>
                <span class="gi-value">{{ analysisResults.battleAxe.widthRatio.toFixed(2) }}</span>
              </div>
              <div v-if="analysisResults.battleAxe.isBattleAxe && analysisResults.battleAxe.warning" class="gi-warning">{{ analysisResults.battleAxe.warning }}</div>
            </div>
          </div>

          <!-- ─── ANGLES ───────────────────────────────── -->
          <div class="gi-section">
            <button class="gi-section-toggle" @click="toggleSection('angles')">
              <span class="gi-section-chevron" :class="{ open: expandedSections.angles }">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
              <span class="gi-section-title">Interior Angles</span>
            </button>
            <div v-show="expandedSections.angles" class="gi-section-content">
              <div class="gi-angles-visual">
                <span v-for="(angle, idx) in analysisResults.angles.allAngles" :key="idx" class="gi-angle-badge">{{ Math.round(angle) }}°</span>
              </div>
              <div class="gi-metric">
                <span class="gi-label">Min / Max / Mean:</span>
                <span class="gi-value">{{ analysisResults.angles.minAngle }}° / {{ analysisResults.angles.maxAngle }}° / {{ analysisResults.angles.meanAngle }}°</span>
              </div>
              <div class="gi-metric">
                <span class="gi-label">Median:</span>
                <span class="gi-value">{{ analysisResults.angles.medianAngle }}°</span>
              </div>
              <div class="gi-metric">
                <span class="gi-label">Std Dev:</span>
                <span class="gi-value">{{ analysisResults.angles.standardDeviation }}°</span>
              </div>
              <div class="gi-metric">
                <span class="gi-label">Orthogonal:</span>
                <span class="gi-value">{{ analysisResults.angles.rightAngleCount }}/{{ analysisResults.angles.allAngles.length }} angles ≈ 90° ({{ analysisResults.angles.orthogonalPercentage }}%)</span>
              </div>
            </div>
          </div>

          <button v-if="analysisResults" class="gi-clear-btn" @click="clearAnalysis">Clear Selection</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Feature } from 'geojson'
import { usePolygonInspector } from '~/composables/usePolygonInspector'

const props = withDefaults(
  defineProps<{
    hidden?: boolean
    selectedFeature?: Feature | null
    clickMsg?: string
    financialBotPx?: number
  }>(),
  {
    hidden: false,
    selectedFeature: null,
    clickMsg: '',
    financialBotPx: 0,
  }
)

const emit = defineEmits<{
  'openChange': [value: boolean]
}>()

// UI state
const isOpen = ref(false)
const panelWidth = ref(360)
const expandedSections = ref({
  orientation: true,
  convexity: true,
  frontage: true,
  battleAxe: true,
  angles: true,
})

// Geometry analysis
const { selectedFeature, analysisResults, analyzePolygon, clearSelection } = usePolygonInspector()

// FAB positioning — mirrors FinancialPanel logic one step further down
const fabTop = computed(() => {
  if (props.financialBotPx) return `${props.financialBotPx + 8}px`
  return 'calc(1rem + 192px)'
})

const panelTop = computed(() => {
  if (props.financialBotPx) return `${props.financialBotPx + 8 + 40 + 8}px`
  return 'calc(1rem + 240px)'
})

const panelMaxHeight = computed(() => `calc(100vh - ${panelTop.value} - 1rem)`)

// Resize handling
function startResize(e: MouseEvent) {
  const startX = e.clientX
  const startW = panelWidth.value
  const onMove = (ev: MouseEvent) => {
    panelWidth.value = Math.max(220, Math.min(600, startW + (startX - ev.clientX)))
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function toggleOpen() {
  isOpen.value = !isOpen.value
  emit('openChange', isOpen.value)
}

function toggleSection(section: keyof typeof expandedSections.value) {
  expandedSections.value[section] = !expandedSections.value[section]
}

function clearAnalysis() {
  clearSelection()
}

// Watch isOpen and emit changes to parent
watch(isOpen, (newVal) => {
  emit('openChange', newVal)
})

// Watch for external feature selection
watch(
  () => props.selectedFeature,
  async (newFeature) => {
    if (newFeature) {
      await analyzePolygon(newFeature)
      isOpen.value = true
      emit('openChange', true)
    }
  }
)
</script>

<style scoped>
/* ─────────────────────────────────────────────────────────────────────────── */
/* GEOMETRY INSPECTOR PANEL STYLES                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

/* ─── FAB ───────────────────────────────────────────────────────────────────── */
.gi-fab {
  position: absolute;
  right: 1rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s, color 0.15s;
  user-select: none;
  -webkit-user-select: none;
}
.gi-fab:hover { background: hsl(var(--card)); box-shadow: 0 4px 18px rgba(0,0,0,0.4); }
.gi-fab--active { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); }

.gi-fab-badge {
  position: absolute; top: -4px; right: -4px;
  background: #22c55e; color: #000;
  font-size: 0.60rem; font-weight: 500;
  min-width: 16px; height: 16px;
  border-radius: 8px; padding: 0 3px;
  display: flex; align-items: center; justify-content: center;
}

/* ─── Panel ───────────────────────────────────────────────────────────────────── */
.gi-panel {
  position: absolute;
  right: 1rem;
  z-index: 19;
  min-width: 220px;
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2);
}

.gi-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  &:hover { background: hsl(var(--primary) / 0.3); }
}

/* ─── Header ─────────────────────────────────────────────────────────────── */
.gi-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid hsl(var(--border) / 0.5);
}

.gi-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.gi-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.gi-subtitle {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.gi-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: color 0.15s;
  user-select: none;
  -webkit-user-select: none;
  &:hover { color: hsl(var(--foreground)); }
}

/* ─── Body ──────────────────────────────────────────────────────────────── */
.gi-body {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.gi-hints {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 2rem 0.5rem;
  text-align: center;
}

.gi-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: hsl(var(--muted-foreground));
}

.gi-hint-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

/* ─── Feature Info ───────────────────────────────────────────────────── */
.gi-feature-info {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: hsl(var(--muted) / 0.35);
  border-radius: 6px;
  border: 1px solid hsl(var(--border) / 0.5);
}

.gi-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.gi-info-label {
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}

.gi-info-value {
  font-family: 'Monaco', 'Courier New', monospace;
  color: hsl(var(--foreground));
}

/* ─── Sections ──────────────────────────────────────────────────────── */
.gi-section {
  margin-bottom: 0.75rem;
  border: 1px solid hsl(var(--border) / 0.5);
  border-radius: 6px;
  overflow: hidden;
}

.gi-section-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: hsl(var(--muted) / 0.35);
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
  -webkit-user-select: none;
  font-size: 0.9rem;
  font-weight: 500;
  color: hsl(var(--foreground));

  &:hover {
    background: hsl(var(--muted) / 0.5);
  }
}

.gi-section-chevron {
  display: inline-flex;
  transition: transform 0.15s;

  &.open {
    transform: rotate(90deg);
  }
}

.gi-section-title {
  flex: 1;
  text-align: left;
}

.gi-status-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  text-transform: uppercase;
  color: white;

  &.convex {
    background: #22c55e;
  }

  &.concave {
    background: #f59e0b;
  }

  &.warning {
    background: #ef4444;
  }
}

.gi-section-content {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border-top: 1px solid hsl(var(--border) / 0.5);
  background: hsl(var(--card) / 0.5);
}

/* ─── Metrics ────────────────────────────────────────────────────────── */
.gi-metric {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.gi-label {
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}

.gi-value {
  font-family: 'Monaco', 'Courier New', monospace;
  color: hsl(var(--foreground));
  text-align: right;
  word-break: break-word;

  &.warning {
    color: #ef4444;
    font-weight: 600;
  }
}

/* ─── Angles Visual ──────────────────────────────────────────────────── */
.gi-angles-visual {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.gi-angle-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.3rem 0.5rem;
  background: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
  border-radius: 4px;
  border: 1px solid hsl(var(--primary) / 0.3);
}

/* ─── Warning ────────────────────────────────────────────────────────── */
.gi-warning {
  padding: 0.6rem;
  font-size: 0.8rem;
  background: #ef44441a;
  border-left: 3px solid #ef4444;
  color: #ef4444;
  border-radius: 4px;
  margin-top: 0.3rem;
}

/* ─── Click status message ───────────────────────────────────────────── */
.gi-click-msg {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #f59e0b;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.25);
  border-radius: 4px;
  padding: 0.4rem 0.6rem;
  line-height: 1.4;
}

/* ─── Clear button ───────────────────────────────────────────────────── */
.gi-clear-btn {
  margin-top: 1rem;
  padding: 0.6rem 0.8rem;
  background: hsl(var(--muted) / 0.35);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  color: hsl(var(--foreground));
  transition: background 0.15s;
  user-select: none;
  -webkit-user-select: none;

  &:hover {
    background: hsl(var(--muted) / 0.5);
  }
}

/* ─── Transitions ────────────────────────────────────────────────────── */
.gi-drop-enter-active,
.gi-drop-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.gi-drop-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.gi-drop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
