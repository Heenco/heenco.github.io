<template>
  <div
    class="xg-page"
    :style="{
      '--xg-left-panel-width': `${leftPanelWidth}px`,
    }"
  >
    <!-- ── Left panel FAB (collapsed) ───────────────────────────────── -->
    <button v-if="!showPanel" class="xg-fab xg-fab--left" @click="showPanel = true" title="Open XSD Graph">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
    </button>

    <!-- ── Left panel ─────────────────────────────────────────────── -->
    <transition name="xg-slide-left">
      <aside v-if="showPanel" class="xg-panel" :style="{ width: `${leftPanelWidth}px` }">

        <div class="xg-panel-header">
          <div class="xg-header">
            <h1 class="xg-title">XSD Graph Explorer</h1>
            <p class="xg-subtitle">Visualise XML Schema as an interactive 3D node graph</p>
          </div>
          <button class="xg-chevron-btn" @click="showPanel = false" title="Collapse">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>

        <!-- Tab bar — outside scroll area so it spans full width -->
        <div v-if="graph" class="xg-tabs">
          <button class="xg-tab" :class="{ active: activeTab === 'graph' }" @click="activeTab = 'graph'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Graph
          </button>
          <button class="xg-tab" :class="{ active: activeTab === 'tree' }" @click="activeTab = 'tree'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Tree
          </button>
        </div>

        <div class="xg-panel-inner">

          <!-- Upload zone -->
          <section class="xg-section">
            <div
              class="xg-dropzone"
              :class="{ 'xg-dropzone--over': dragging, 'xg-dropzone--loaded': graph !== null, 'xg-dropzone--loading': isPreloading }"
              @dragover.prevent="dragging = true"
              @dragleave="dragging = false"
              @drop.prevent="onDrop"
              @click="!isPreloading && fileInputRef?.click()"
            >
              <input ref="fileInputRef" type="file" accept=".xsd" multiple style="display:none" @change="onFileInput" />
              <div v-if="isPreloading" class="xg-dropzone-content">
                <svg class="xg-spin-sm" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                <span class="xg-dropzone-label">Loading {{ preloadLoaded }}/{{ preloadTotal }} files…</span>
              </div>
              <div v-else-if="graph === null" class="xg-dropzone-content">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span class="xg-dropzone-label">Drop <strong>.xsd</strong> files here</span>
                <span class="xg-dropzone-sub">or click to browse — multiple files supported</span>
              </div>
              <div v-else class="xg-dropzone-content">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span class="xg-dropzone-label" style="color:#10b981">{{ loadedFiles.length }} file{{ loadedFiles.length !== 1 ? 's' : '' }} loaded</span>
                <span class="xg-dropzone-sub">{{ graph.nodes.length }} nodes · {{ graph.links.length }} links</span>
              </div>
            </div>
            <div v-if="parseError" class="xg-msg xg-msg-error xg-msg-sm">✗ {{ parseError }}</div>

            <!-- Loaded files list -->
            <div v-if="loadedFiles.length > 0" class="xg-file-list">
              <div v-for="f in loadedFiles" :key="f.name" class="xg-file-row">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span class="xg-file-name">{{ f.name }}</span>
                <button class="xg-file-remove" @click.stop="removeFile(f.name)">✕</button>
              </div>
            </div>

            <button v-if="loadedFiles.length > 0" class="xg-clear-btn" @click="clearAll">
              Clear all
            </button>
          </section>

          <!-- Filter / search -->
          <section v-if="graph && activeTab === 'graph'" class="xg-section">
            <div class="xg-search-wrap">
              <svg class="xg-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                v-model="searchQuery"
                class="xg-search"
                placeholder="Search elements…"
                type="text"
                autocomplete="off"
                @keydown.escape="searchQuery = ''"
              />
              <button v-if="searchQuery" class="xg-search-clear" @click="searchQuery = ''">✕</button>
            </div>

            <!-- Search results dropdown -->
            <div v-if="searchQuery" class="xg-search-results">
              <button
                v-for="node in searchResults"
                :key="node.id"
                class="xg-search-result"
                @click="goToNode(node)"
              >
                <span class="xg-conn-dot" :style="{ background: kindColor(node.kind) }" />
                <span class="xg-search-result-name">
                  <template v-for="(part, i) in highlightParts(node.label, searchQuery)" :key="i">
                    <strong v-if="part.bold" class="xg-search-hl">{{ part.t }}</strong>
                    <span v-else>{{ part.t }}</span>
                  </template>
                </span>
                <span class="xg-search-result-kind">{{ node.kind }}</span>
              </button>
              <div v-if="searchResultsTotal > 10" class="xg-search-result-more">
                +{{ searchResultsTotal - 10 }} more — refine your search
              </div>
              <div v-if="searchResults.length === 0" class="xg-search-noresult">
                No matches found
              </div>
            </div>

            <!-- Kind filters -->
            <div class="xg-filter-row">
              <button
                v-for="kf in kindFilters"
                :key="kf.kind"
                class="xg-kind-chip"
                :class="{ active: kf.active }"
                :style="kf.active ? { background: kindColor(kf.kind) + '22', color: kindColor(kf.kind), borderColor: kindColor(kf.kind) + '66' } : {}"
                @click="kf.active = !kf.active"
              >
                {{ kf.label }}
              </button>
            </div>

            <!-- Stats -->
            <div class="xg-stats">
              <span class="xg-stat">
                <span class="xg-stat-val">{{ visibleNodeCount }}</span>
                <span class="xg-stat-lbl">nodes</span>
              </span>
              <span class="xg-stat">
                <span class="xg-stat-val">{{ graph.links.length }}</span>
                <span class="xg-stat-lbl">links</span>
              </span>
              <span class="xg-stat">
                <span class="xg-stat-val">{{ loadedFiles.length }}</span>
                <span class="xg-stat-lbl">files</span>
              </span>
            </div>
          </section>

          <!-- Namespace list -->
          <section v-if="namespaces.length > 1 && activeTab === 'graph'" class="xg-section xg-section--grow">
            <div class="xg-label" style="margin-bottom:0.4rem">Namespaces</div>
            <div class="xg-ns-list">
              <div
                v-for="ns in namespaces"
                :key="ns.uri"
                class="xg-ns-row"
                :class="{ active: ns.active }"
                @click="ns.active = !ns.active"
              >
                <span class="xg-ns-dot" :style="{ background: ns.color }" />
                <span class="xg-ns-label">{{ ns.shortName }}</span>
                <span class="xg-ns-count">{{ ns.count }}</span>
              </div>
            </div>
          </section>

          <!-- Legend -->
          <section v-if="graph && activeTab === 'graph'" class="xg-section">
            <div class="xg-label" style="margin-bottom:0.5rem">Legend</div>
            <div class="xg-legend">
              <div v-for="leg in legend" :key="leg.label" class="xg-legend-row">
                <span class="xg-legend-dot" :style="{ background: leg.color, boxShadow: `0 0 5px ${leg.color}` }" />
                <span class="xg-legend-label">{{ leg.label }}</span>
              </div>
            </div>
            <div class="xg-legend-links">
              <div v-for="l in linkLegend" :key="l.label" class="xg-legend-link-row">
                <span class="xg-legend-line" :style="{ borderColor: l.color, borderStyle: l.dash ? 'dashed' : 'solid' }" />
                <span class="xg-legend-label">{{ l.label }}</span>
              </div>
            </div>
          </section>

          <!-- ── Tree tab ──────────────────────────────────────── -->
          <template v-if="activeTab === 'tree' && graph">

            <section class="xg-section">
              <div class="xg-search-wrap">
                <svg class="xg-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  v-model="treeQuery"
                  class="xg-search"
                  placeholder="Filter tree…"
                  type="text"
                  autocomplete="off"
                  @keydown.escape="treeQuery = ''"
                />
                <button v-if="treeQuery" class="xg-search-clear" @click="treeQuery = ''">✕</button>
              </div>
              <div class="xg-tree-actions">
                <button class="xg-tree-action-btn" @click="expandAll">Expand all</button>
                <button class="xg-tree-action-btn" @click="collapseAll">Collapse all</button>
              </div>
              <div class="xg-stat-lbl" style="margin-top:0.1rem">
                {{ flatTree.length }} {{ treeQuery ? 'matched' : 'root' }}{{ flatTree.length !== 1 ? 's' : '' }} visible
              </div>
            </section>

            <div class="xg-tree xg-section xg-section--grow">
              <div
                v-for="row in flatTree"
                :key="row.id"
                class="xg-tree-row"
                :class="{
                  'xg-tree-row--selected': selectedNode?.id === row.id,
                  'xg-tree-row--match': row.isMatch && treeQuery,
                }"
                :style="{ paddingLeft: `${(row.depth * 14) + 8}px` }"
                @click="treeRowClick(row)"
              >
                <button
                  v-if="row.hasChildren"
                  class="xg-tree-arrow"
                  :class="{ expanded: row.isExpanded }"
                  @click.stop="toggleTreeNode(row.id)"
                  tabindex="-1"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <span v-else class="xg-tree-leaf" />
                <span class="xg-tree-dot" :style="{ background: kindColor(row.node.kind) }" />
                <span class="xg-tree-label">
                  <template v-if="treeQuery">
                    <template v-for="(part, i) in highlightParts(row.node.label, treeQuery)" :key="i">
                      <strong v-if="part.bold" class="xg-search-hl">{{ part.t }}</strong>
                      <span v-else>{{ part.t }}</span>
                    </template>
                  </template>
                  <template v-else>{{ row.node.label }}</template>
                </span>
              </div>
              <div v-if="flatTree.length === 0 && !treeQuery" class="xg-tree-empty">
                No inheritance hierarchy found in this schema
              </div>
              <div v-if="flatTree.length === 0 && treeQuery" class="xg-tree-empty">
                No matches for "{{ treeQuery }}"
              </div>
            </div>

          </template>

        </div>

        <!-- Resize handle -->
        <div class="xg-resize-handle xg-resize-handle--right" @mousedown.prevent="startResize" />
      </aside>
    </transition>

    <!-- ── Detail panel ────────────────────────────────────────────── -->
    <transition name="xg-slide">
      <aside v-if="selectedNode" class="xg-detail-panel">
        <div class="xg-detail-inner">
          <div class="xg-detail-header">
            <div class="xg-detail-title-wrap">
              <span class="xg-detail-kind" :style="{ color: kindColor(selectedNode.kind) }">{{ selectedNode.kind }}</span>
              <span class="xg-detail-title">{{ selectedNode.label }}</span>
            </div>
            <button class="xg-detail-close" @click="selectedNode = null">✕</button>
          </div>

          <div class="xg-detail-content">

            <div v-if="selectedNode.documentation" class="xg-detail-section">
              <div class="xg-detail-section-title">Documentation</div>
              <p class="xg-detail-desc">{{ selectedNode.documentation }}</p>
            </div>

            <div class="xg-detail-section">
              <div class="xg-detail-section-title">Overview</div>
              <div class="xg-detail-kv-list">
                <div class="xg-detail-kv"><span class="xg-detail-k">Kind</span><span class="xg-detail-v">{{ selectedNode.kind }}</span></div>
                <div class="xg-detail-kv"><span class="xg-detail-k">File</span><span class="xg-detail-v">{{ selectedNode.fileName }}</span></div>
                <div class="xg-detail-kv"><span class="xg-detail-k">Namespace</span><span class="xg-detail-v xg-detail-v--mono">{{ selectedNode.namespace }}</span></div>
                <div v-if="selectedNode.abstract" class="xg-detail-kv"><span class="xg-detail-k">Abstract</span><span class="xg-detail-v" style="color:#f59e0b">Yes</span></div>
                <div v-for="(val, key) in selectedNode.raw" :key="String(key)" v-show="val" class="xg-detail-kv">
                  <span class="xg-detail-k">{{ key }}</span>
                  <span class="xg-detail-v">{{ val }}</span>
                </div>
              </div>
            </div>

            <div v-if="selectedNode.attributes.length > 0" class="xg-detail-section">
              <div class="xg-detail-section-title">Attributes ({{ selectedNode.attributes.length }})</div>
              <div class="xg-detail-fields">
                <div v-for="a in selectedNode.attributes" :key="a.name" class="xg-detail-field">
                  <span class="xg-field-name">{{ a.name }}</span>
                  <span class="xg-field-type">{{ a.type }}</span>
                  <span class="xg-field-use" :class="a.use === 'required' ? 'xg-field-use--req' : ''">{{ a.use }}</span>
                </div>
              </div>
            </div>

            <div v-if="nodeConnections.parents.length > 0" class="xg-detail-section">
              <div class="xg-detail-section-title">Parents / Extended by</div>
              <div class="xg-conn-list">
                <button v-for="n in nodeConnections.parents" :key="n.id" class="xg-conn-item" @click="focusNode(n.id)">
                  <span class="xg-conn-dot" :style="{ background: kindColor(n.kind) }" />
                  <span>{{ n.label }}</span>
                </button>
              </div>
            </div>

            <div v-if="nodeConnections.children.length > 0" class="xg-detail-section">
              <div class="xg-detail-section-title">Children / References</div>
              <div class="xg-conn-list">
                <button v-for="n in nodeConnections.children" :key="n.id" class="xg-conn-item" @click="focusNode(n.id)">
                  <span class="xg-conn-dot" :style="{ background: kindColor(n.kind) }" />
                  <span>{{ n.label }}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </aside>
    </transition>

    <!-- ── 3D Canvas ───────────────────────────────────────────────── -->
    <div class="xg-canvas-wrap">
      <div id="xg-3d" ref="canvasRef" class="xg-canvas" />

      <!-- Empty state -->
      <div v-if="!graph && !isPreloading" class="xg-empty-overlay">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.15"><rect x="2" y="3" width="7" height="7" rx="1"/><rect x="15" y="3" width="7" height="7" rx="1"/><rect x="8" y="14" width="8" height="7" rx="1"/><line x1="5.5" y1="10" x2="12" y2="14"/><line x1="18.5" y1="10" x2="12" y2="14"/></svg>
        <p>Load one or more <strong>.xsd</strong> files to begin</p>
      </div>

      <!-- Preload loading overlay -->
      <div v-if="isPreloading" class="xg-loading-overlay">
        <div class="xg-loading-card">
          <svg class="xg-loading-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          <div class="xg-loading-text">Loading ADAC schemas…</div>
          <div class="xg-loading-progress-wrap">
            <div class="xg-loading-progress-bar" :style="{ width: `${preloadProgress}%` }" />
          </div>
          <div class="xg-loading-sub">{{ preloadLoaded }} / {{ preloadTotal }} files</div>
        </div>
      </div>

      <!-- Controls hint -->
      <div v-if="graph" class="xg-controls-hint">
        <span>🖱 Drag to rotate · Scroll to zoom · Click node for details</span>
      </div>

      <!-- HUD -->
      <div v-if="graph" class="xg-hud">
        <button class="xg-hud-btn" @click="resetCamera" title="Reset camera">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="xg-hud-btn" @click="toggleLabels" :class="{ active: showLabels }" title="Toggle labels">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 20 4-16 4 16"/><path d="M6 15h12"/></svg>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { parseXsd, mergeGraphs } from '~/lib/xsdParser'
import type { XsdGraph, XsdNode, NodeKind } from '~/lib/xsdParser'

// ── Panel state ──────────────────────────────────────────────────────────────
const showPanel      = ref(true)
const leftPanelWidth = ref(340)
const activeTab      = ref<'graph' | 'tree'>('graph')

// ── Tree state ───────────────────────────────────────────────────────────────
const treeQuery       = ref('')
const treeExpandedIds = ref<Set<string>>(new Set())

// ── File loading ─────────────────────────────────────────────────────────────
const fileInputRef  = ref<HTMLInputElement | null>(null)
const dragging      = ref(false)
const loadedFiles   = ref<{ name: string; content: string }[]>([])
const parseError    = ref('')
const graph         = ref<XsdGraph | null>(null)

// ── Preload state ─────────────────────────────────────────────────────────────
const isPreloading   = ref(false)
const preloadTotal   = ref(0)
const preloadLoaded  = ref(0)
const preloadProgress = computed(() =>
  preloadTotal.value > 0 ? Math.round((preloadLoaded.value / preloadTotal.value) * 100) : 0
)

const ADAC_FILES = [
  'ADAC/ADAC_V600.xsd',
  'ADAC/ADACCadastre.xsd',
  'ADAC/ADACCommunication.xsd',
  'ADAC/ADACElectrical.xsd',
  'ADAC/ADACEnhancements.xsd',
  'ADAC/ADACEnumeratedTypes.xsd',
  'ADAC/ADACGeometry.xsd',
  'ADAC/ADACGlobalTypes.xsd',
  'ADAC/ADACOpenSpace.xsd',
  'ADAC/ADACSewerage.xsd',
  'ADAC/ADACStormWater.xsd',
  'ADAC/ADACStringTypes.xsd',
  'ADAC/ADACSupplementary.xsd',
  'ADAC/ADACSurface.xsd',
  'ADAC/ADACTransport.xsd',
  'ADAC/ADACWaterSupply.xsd',
]

const preloadAdacFiles = async () => {
  isPreloading.value = true
  preloadTotal.value = ADAC_FILES.length
  preloadLoaded.value = 0
  parseError.value = ''

  const results: { name: string; content: string }[] = []

  for (const path of ADAC_FILES) {
    try {
      const res = await fetch(`/${path}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const content = await res.text()
      results.push({ name: path.split('/').pop()!, content })
    } catch (e: any) {
      console.warn(`[XSD] Failed to load ${path}:`, e?.message)
    }
    preloadLoaded.value++
  }

  loadedFiles.value = results
  if (results.length > 0) rebuildGraph()
  isPreloading.value = false
}

// ── Search / filter ──────────────────────────────────────────────────────────
const searchQuery   = ref('')

const searchResults = computed(() => {
  if (!graph.value || !searchQuery.value.trim()) return []
  const q = searchQuery.value.toLowerCase().trim()
  return graph.value.nodes
    .filter(n => n.label.toLowerCase().includes(q) || n.namespace.toLowerCase().includes(q))
    .slice(0, 10)
})

const searchResultsTotal = computed(() => {
  if (!graph.value || !searchQuery.value.trim()) return 0
  const q = searchQuery.value.toLowerCase().trim()
  return graph.value.nodes.filter(n =>
    n.label.toLowerCase().includes(q) || n.namespace.toLowerCase().includes(q)
  ).length
})

const highlightParts = (text: string, q: string): { t: string; bold: boolean }[] => {
  const qi = q.toLowerCase().trim()
  if (!qi) return [{ t: text, bold: false }]
  const idx = text.toLowerCase().indexOf(qi)
  if (idx === -1) return [{ t: text, bold: false }]
  return [
    { t: text.slice(0, idx),               bold: false },
    { t: text.slice(idx, idx + qi.length), bold: true  },
    { t: text.slice(idx + qi.length),      bold: false },
  ]
}

const kindFilters   = ref([
  { kind: 'element' as NodeKind,        label: 'element',        active: true },
  { kind: 'complexType' as NodeKind,    label: 'complexType',    active: true },
  { kind: 'simpleType' as NodeKind,     label: 'simpleType',     active: true },
  { kind: 'group' as NodeKind,          label: 'group',          active: true },
  { kind: 'attributeGroup' as NodeKind, label: 'attributeGroup', active: true },
])

// ── Selected node / detail ────────────────────────────────────────────────────
const selectedNode  = ref<XsdNode | null>(null)

// ── Graph controls ────────────────────────────────────────────────────────────
const showLabels    = ref(true)
const canvasRef     = ref<HTMLElement | null>(null)
let   fg: any       = null  // force-graph instance

// ── Kind → colour map ─────────────────────────────────────────────────────────
const KIND_COLORS: Record<string, string> = {
  element:        '#3b82f6',
  complexType:    '#8b5cf6',
  simpleType:     '#10b981',
  group:          '#f59e0b',
  attributeGroup: '#ec4899',
}
const kindColor = (k: string) => KIND_COLORS[k] ?? '#6b7280'

// ── Legend ────────────────────────────────────────────────────────────────────
const legend = [
  { label: 'element',        color: KIND_COLORS.element },
  { label: 'complexType',    color: KIND_COLORS.complexType },
  { label: 'simpleType',     color: KIND_COLORS.simpleType },
  { label: 'group',          color: KIND_COLORS.group },
  { label: 'attributeGroup', color: KIND_COLORS.attributeGroup },
]
const linkLegend = [
  { label: 'extends',    color: '#f97316', dash: false },
  { label: 'restricts',  color: '#ef4444', dash: false },
  { label: 'references', color: '#3b82f6', dash: false },
  { label: 'contains',   color: '#6b7280', dash: false },
  { label: 'imports',    color: '#a855f7', dash: true  },
]

// ── Namespace pills ───────────────────────────────────────────────────────────
const NS_PALETTE = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ec4899','#06b6d4','#ef4444','#84cc16']

const namespaces = computed(() => {
  if (!graph.value) return []
  const map = new Map<string, number>()
  for (const n of graph.value.nodes) {
    map.set(n.namespace, (map.get(n.namespace) ?? 0) + 1)
  }
  return [...map.entries()].map(([uri, count], i) => ({
    uri,
    shortName: uri.split('/').pop()?.replace(/\.xsd$/i, '') ?? uri,
    count,
    color: NS_PALETTE[i % NS_PALETTE.length] as string,
    active: true,
  }))
})

// ── Filtered graph for renderer ───────────────────────────────────────────────
const activeKinds = computed(() => new Set(kindFilters.value.filter(k => k.active).map(k => k.kind)))
const activeNs    = computed(() => new Set(namespaces.value.filter(n => n.active).map(n => n.uri)))

const filteredGraph = computed(() => {
  if (!graph.value) return { nodes: [], links: [] }
  const q = searchQuery.value.toLowerCase().trim()
  const nodes = graph.value.nodes.filter(n =>
    activeKinds.value.has(n.kind) &&
    activeNs.value.has(n.namespace) &&
    (!q || n.label.toLowerCase().includes(q) || n.namespace.toLowerCase().includes(q))
  )
  const nodeIds = new Set(nodes.map(n => n.id))
  const links = graph.value.links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
  return { nodes, links }
})

const visibleNodeCount = computed(() => filteredGraph.value.nodes.length)

// ── Connections for detail panel ──────────────────────────────────────────────
const nodeConnections = computed(() => {
  if (!selectedNode.value || !graph.value) return { parents: [], children: [] }
  const id = selectedNode.value.id
  const nodeMap = new Map(graph.value.nodes.map(n => [n.id, n]))
  const parents = graph.value.links.filter(l => l.source === id).map(l => nodeMap.get(l.target)).filter(Boolean) as XsdNode[]
  const children = graph.value.links.filter(l => l.target === id).map(l => nodeMap.get(l.source)).filter(Boolean) as XsdNode[]
  return { parents, children }
})

// ── File input handlers ───────────────────────────────────────────────────────
const readFile = (file: File): Promise<{ name: string; content: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve({ name: file.name, content: reader.result as string })
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsText(file)
  })

const processFiles = async (files: FileList | File[]) => {
  parseError.value = ''
  const arr = Array.from(files)
  try {
    const newFiles = await Promise.all(arr.map(readFile))
    // Avoid duplicates by name
    const existingNames = new Set(loadedFiles.value.map(f => f.name))
    const toAdd = newFiles.filter(f => !existingNames.has(f.name))
    loadedFiles.value = [...loadedFiles.value, ...toAdd]
    rebuildGraph()
  } catch (e: any) {
    parseError.value = e?.message ?? 'Failed to read file'
  }
}

const rebuildGraph = () => {
  parseError.value = ''
  if (loadedFiles.value.length === 0) { graph.value = null; return }
  try {
    const graphs = loadedFiles.value.map(f => parseXsd(f.content, f.name))
    graph.value = mergeGraphs(graphs)
  } catch (e: any) {
    parseError.value = e?.message ?? 'Parse error'
    graph.value = null
  }
}

const onDrop = async (e: DragEvent) => {
  dragging.value = false
  const files = e.dataTransfer?.files
  if (files?.length) await processFiles(files)
}

const onFileInput = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (files?.length) await processFiles(files)
}

const removeFile = (name: string) => {
  loadedFiles.value = loadedFiles.value.filter(f => f.name !== name)
  rebuildGraph()
}

const clearAll = () => {
  loadedFiles.value = []
  graph.value = null
  selectedNode.value = null
  parseError.value = ''
  if (fg) { fg.graphData({ nodes: [], links: [] }) }
}

// ── 3D Force Graph ────────────────────────────────────────────────────────────
const FORCE_GRAPH_JS = 'https://unpkg.com/3d-force-graph@1.73.5/dist/3d-force-graph.min.js'

const LINK_COLORS: Record<string, string> = {
  extends:    '#f97316',
  restricts:  '#ef4444',
  references: '#3b82f6',
  contains:   '#4b5563',
  imports:    '#a855f7',
}

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })

const buildGraphData = () => {
  const { nodes, links } = filteredGraph.value
  return {
    nodes: nodes.map(n => ({
      id: n.id,
      name: n.label,
      kind: n.kind,
      abstract: n.abstract,
      nodeColor: kindColor(n.kind),
      nodeVal: 1 + (graph.value?.links.filter(l => l.source === n.id || l.target === n.id).length ?? 0) * 0.4,
      _node: n,
    })),
    links: links.map(l => ({
      source: l.source,
      target: l.target,
      kind: l.kind,
      color: LINK_COLORS[l.kind] ?? '#6b7280',
    })),
  }
}

const initForceGraph = () => {
  const FG = (window as any).ForceGraph3D
  if (!FG || !canvasRef.value) return

  fg = FG()(canvasRef.value)
    .backgroundColor('#0a0a12')
    .nodeColor((n: any) => n.nodeColor)
    .nodeVal((n: any) => n.nodeVal)
    .nodeLabel((n: any) => showLabels.value ? n.name : '')
    .nodeOpacity(0.92)
    .linkColor((l: any) => l.color)
    .linkOpacity(0.55)
    .linkWidth(0.8)
    .linkDirectionalArrowLength(3)
    .linkDirectionalArrowRelPos(1)
    .linkDirectionalArrowColor((l: any) => l.color)
    .onNodeClick((node: any) => {
      selectedNode.value = node._node ?? null
    })
    .onNodeHover((node: any) => {
      if (canvasRef.value) {
        canvasRef.value.style.cursor = node ? 'pointer' : 'default'
      }
    })

  // Responsive resize
  const resizeObs = new ResizeObserver(() => {
    if (canvasRef.value) fg.width(canvasRef.value.clientWidth).height(canvasRef.value.clientHeight)
  })
  resizeObs.observe(canvasRef.value)

  if (graph.value) fg.graphData(buildGraphData())
}

watch(filteredGraph, () => {
  if (fg) fg.graphData(buildGraphData())
}, { deep: true })

watch(showLabels, () => {
  if (fg) fg.nodeLabel((n: any) => showLabels.value ? n.name : '').refresh()
})

const resetCamera = () => { fg?.zoomToFit(600) }

const toggleLabels = () => { showLabels.value = !showLabels.value }

const focusNode = (id: string) => {
  if (!fg) return
  const node = (fg.graphData().nodes as any[]).find((n: any) => n.id === id)
  if (!node) return
  selectedNode.value = graph.value?.nodes.find(n => n.id === id) ?? null
  fg.cameraPosition(
    { x: node.x * 1.5, y: node.y * 1.5, z: node.z + 120 },
    node,
    800,
  )
}

const goToNode = (node: XsdNode) => {
  searchQuery.value = ''
  selectedNode.value = node
  focusNode(node.id)
}

// ── Tree (inheritance / restriction hierarchy) ───────────────────────────────
interface FlatTreeRow {
  id: string
  node: XsdNode
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  isMatch: boolean
}

// parent → child[] (source extends/restricts target → target is parent, source is child)
const _treeChildrenMap = computed(() => {
  if (!graph.value) return new Map<string, string[]>()
  const map = new Map<string, string[]>()
  for (const link of graph.value.links) {
    if (link.kind === 'extends' || link.kind === 'restricts') {
      if (!map.has(link.target)) map.set(link.target, [])
      map.get(link.target)!.push(link.source)
    }
  }
  return map
})

// child → parent (for ancestor lookup)
const _treeParentMap = computed(() => {
  if (!graph.value) return new Map<string, string>()
  const m = new Map<string, string>()
  for (const link of graph.value.links) {
    if (link.kind === 'extends' || link.kind === 'restricts') m.set(link.source, link.target)
  }
  return m
})

// ids that have a parent (i.e. they are NOT roots)
const _treeHasParent = computed(() => new Set(_treeParentMap.value.keys()))

const flatTree = computed<FlatTreeRow[]>(() => {
  if (!graph.value) return []
  const nodeMap   = new Map(graph.value.nodes.map(n => [n.id, n]))
  const children  = _treeChildrenMap.value
  const hasParent = _treeHasParent.value
  const parentMap = _treeParentMap.value

  const roots = graph.value.nodes
    .filter(n => !hasParent.has(n.id))
    .sort((a, b) => a.label.localeCompare(b.label))

  const q = treeQuery.value.toLowerCase().trim()
  const matchingIds = q
    ? new Set(graph.value.nodes.filter(n => n.label.toLowerCase().includes(q)).map(n => n.id))
    : null

  // All ancestors of matching nodes (so we can show the full path)
  const ancestorsOfMatch = new Set<string>()
  if (matchingIds) {
    for (const id of matchingIds) {
      let cur = parentMap.get(id)
      while (cur) { ancestorsOfMatch.add(cur); cur = parentMap.get(cur) }
    }
  }

  const result: FlatTreeRow[] = []

  const walk = (nodeId: string, depth: number, branch: Set<string>) => {
    if (branch.has(nodeId)) return               // cycle guard
    const node = nodeMap.get(nodeId)
    if (!node) return

    const isMatch    = matchingIds ? matchingIds.has(nodeId) : false
    const isAncestor = ancestorsOfMatch.has(nodeId)
    const shouldShow = !matchingIds || isMatch || isAncestor

    const childIds = (children.get(nodeId) ?? [])
      .sort((a, b) => (nodeMap.get(a)?.label ?? '').localeCompare(nodeMap.get(b)?.label ?? ''))
    const hasChildren = childIds.length > 0
    // Auto-expand ancestors when searching; otherwise honour treeExpandedIds
    const isExpanded  = treeExpandedIds.value.has(nodeId) || (matchingIds !== null && isAncestor)

    if (shouldShow) result.push({ id: nodeId, node, depth, hasChildren, isExpanded, isMatch })

    if (isExpanded || matchingIds !== null) {
      const newBranch = new Set(branch)
      newBranch.add(nodeId)
      for (const cid of childIds) walk(cid, depth + 1, newBranch)
    }
  }

  for (const root of roots) walk(root.id, 0, new Set())
  return result
})

const toggleTreeNode = (id: string) => {
  const s = new Set(treeExpandedIds.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  treeExpandedIds.value = s
}

const expandAll = () => {
  treeExpandedIds.value = new Set(_treeChildrenMap.value.keys())
}

const collapseAll = () => {
  treeExpandedIds.value = new Set()
}

// Reset tree expansion when graph changes
watch(graph, () => { treeExpandedIds.value = new Set() })

const treeRowClick = (row: FlatTreeRow) => {
  goToNode(row.node)
}

// ── Resize handle ─────────────────────────────────────────────────────────────
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

const startResize = (e: MouseEvent) => {
  const startX = e.clientX
  const startW = leftPanelWidth.value
  const onMove = (ev: MouseEvent) => {
    leftPanelWidth.value = clamp(startW + (ev.clientX - startX), 260, 500)
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    if (fg && canvasRef.value) {
      nextTick(() => fg.width(canvasRef.value!.clientWidth).height(canvasRef.value!.clientHeight))
    }
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  // Load 3D lib and ADAC files in parallel; init graph once lib is ready
  Promise.all([
    loadScript(FORCE_GRAPH_JS),
    preloadAdacFiles(),
  ]).then(initForceGraph).catch(console.error)
})

onUnmounted(() => {
  fg?.pauseAnimation()
  fg = null
})
</script>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────────── */
.xg-page {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #0a0a12;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Figtree', 'Segoe UI', system-ui, sans-serif;
  --xg-left-panel-width: 340px;
}

.xg-canvas-wrap {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.xg-canvas {
  width: 100%;
  height: 100%;
}

/* ── FAB ────────────────────────────────────────────────────────────────── */
.xg-fab {
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
.xg-fab:hover { background: hsl(var(--card)); box-shadow: 0 4px 18px rgba(0,0,0,0.4); }
.xg-fab--left { left: 1rem; }

/* ── Left panel ─────────────────────────────────────────────────────────── */
.xg-panel {
  position: absolute;
  top: 1rem;
  left: 1rem;
  bottom: 1rem;
  width: var(--xg-left-panel-width);
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

.xg-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem 1rem 0.85rem;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
  gap: 0.5rem;
}

.xg-panel-inner {
  flex: 1;
  overflow-y: auto;
  padding: 0 1.1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.xg-panel-inner::-webkit-scrollbar { width: 4px; }
.xg-panel-inner::-webkit-scrollbar-track { background: transparent; }
.xg-panel-inner::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

/* ── Panel typography ───────────────────────────────────────────────────── */
.xg-header { padding-bottom: 0; border-bottom: none; margin-bottom: 0; }

.xg-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 0.2rem;
  letter-spacing: 0.01em;
}

.xg-subtitle {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
  margin: 0;
}

.xg-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
}

/* ── Chevron btn ────────────────────────────────────────────────────────── */
.xg-chevron-btn {
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
.xg-chevron-btn:hover { background: hsl(var(--border)); color: hsl(var(--foreground)); }

/* ── Section ────────────────────────────────────────────────────────────── */
.xg-section {
  padding: 0.85rem 0;
  border-bottom: 1px solid hsl(var(--border));
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.xg-section:last-child { border-bottom: none; }
.xg-section--grow { min-height: 0; flex: 1; overflow: hidden; }

/* ── Dropzone ───────────────────────────────────────────────────────────── */
.xg-dropzone {
  border: 1.5px dashed hsl(var(--border));
  border-radius: 8px;
  padding: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.xg-dropzone:hover,
.xg-dropzone--over { border-color: hsl(var(--ring)); background: hsl(var(--muted) / 0.4); }
.xg-dropzone--loaded { border-style: solid; border-color: #10b981; background: rgba(16,185,129,0.05); }

.xg-dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  text-align: center;
  pointer-events: none;
}
.xg-dropzone-label {
  font-size: 0.8rem;
  color: hsl(var(--foreground));
}
.xg-dropzone-sub {
  font-size: 0.68rem;
  color: hsl(var(--muted-foreground));
}

/* ── File list ──────────────────────────────────────────────────────────── */
.xg-file-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 130px;
  overflow-y: auto;
  padding-right: 2px;
}
.xg-file-list::-webkit-scrollbar { width: 4px; }
.xg-file-list::-webkit-scrollbar-track { background: transparent; }
.xg-file-list::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

.xg-file-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: hsl(var(--muted) / 0.4);
  border-radius: 5px;
  padding: 0.3rem 0.5rem;
  font-size: 0.72rem;
  color: hsl(var(--foreground));
}

.xg-file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
  font-size: 0.68rem;
}

.xg-file-remove {
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  font-size: 0.65rem;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.12s;
}
.xg-file-remove:hover { color: #ef4444; }

.xg-clear-btn {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
  background: none;
  border: 1px solid hsl(var(--border));
  border-radius: 5px;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  align-self: flex-start;
  transition: background 0.12s, color 0.12s;
}
.xg-clear-btn:hover { background: hsl(var(--muted)); color: hsl(var(--foreground)); }

/* ── Search ─────────────────────────────────────────────────────────────── */
.xg-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.xg-search-icon {
  position: absolute;
  left: 0.5rem;
  color: hsl(var(--muted-foreground));
  pointer-events: none;
}

.xg-search {
  width: 100%;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  color: hsl(var(--foreground));
  font-size: 0.78rem;
  padding: 0.35rem 1.6rem;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.xg-search:focus { border-color: hsl(var(--ring)); }

.xg-search-clear {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  font-size: 0.7rem;
  padding: 0;
  line-height: 1;
}

/* ── Search results dropdown ────────────────────────────────────────────── */
.xg-search-results {
  background: hsl(var(--popover, var(--card)));
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.xg-search-result {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  background: none;
  border: none;
  border-bottom: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
  cursor: pointer;
  text-align: left;
  font-size: 0.72rem;
  font-family: inherit;
  width: 100%;
  transition: background 0.1s;
}
.xg-search-result:last-child { border-bottom: none; }
.xg-search-result:hover { background: hsl(var(--muted)); }

.xg-search-result-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xg-search-hl {
  color: hsl(var(--foreground));
  font-weight: 700;
  background: hsl(var(--ring) / 0.18);
  border-radius: 2px;
  padding: 0 1px;
}

.xg-search-result-kind {
  font-size: 0.6rem;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted));
  padding: 0.05rem 0.3rem;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}

.xg-search-result-more {
  font-size: 0.65rem;
  color: hsl(var(--muted-foreground));
  padding: 0.3rem 0.6rem;
  text-align: center;
  font-style: italic;
  border-top: 1px solid hsl(var(--border));
}

.xg-search-noresult {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
  padding: 0.45rem 0.6rem;
  text-align: center;
}

/* ── Kind filter chips ──────────────────────────────────────────────────── */
.xg-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.xg-kind-chip {
  font-size: 0.63rem;
  font-weight: 600;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  padding: 0.15rem 0.45rem;
  background: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.xg-kind-chip:hover { background: hsl(var(--muted)); color: hsl(var(--foreground)); }
.xg-kind-chip.active { font-weight: 700; }

/* ── Stats ──────────────────────────────────────────────────────────────── */
.xg-stats {
  display: flex;
  gap: 0.75rem;
}

.xg-stat {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.xg-stat-val {
  font-size: 0.95rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.xg-stat-lbl {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
}

/* ── Namespace list ─────────────────────────────────────────────────────── */
.xg-ns-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  flex: 1;
}

.xg-ns-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.35rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.72rem;
  color: hsl(var(--foreground));
  transition: background 0.1s;
  opacity: 0.45;
}
.xg-ns-row.active { opacity: 1; }
.xg-ns-row:hover { background: hsl(var(--muted)); }

.xg-ns-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.xg-ns-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
  font-size: 0.68rem;
}

.xg-ns-count {
  font-size: 0.62rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  border-radius: 9999px;
  padding: 0.03rem 0.35rem;
}

/* ── Legend ─────────────────────────────────────────────────────────────── */
.xg-legend {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.5rem;
}

.xg-legend-row,
.xg-legend-link-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: hsl(var(--foreground));
}

.xg-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.xg-legend-label {
  font-size: 0.68rem;
  color: hsl(var(--muted-foreground));
}

.xg-legend-links {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.xg-legend-line {
  display: inline-block;
  width: 18px;
  height: 0;
  border-top-width: 1.5px;
  border-top-style: solid;
  flex-shrink: 0;
}

/* ── Messages ───────────────────────────────────────────────────────────── */
.xg-msg { font-size: 0.75rem; border-radius: 6px; padding: 0.4rem 0.6rem; line-height: 1.5; }
.xg-msg-sm { font-size: 0.7rem; }
.xg-msg-error { background: rgba(220,38,38,0.08); color: #dc2626; border: 1px solid rgba(220,38,38,0.3); }

/* ── Resize handle ──────────────────────────────────────────────────────── */
.xg-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 30;
  pointer-events: auto;
  touch-action: none;
}
.xg-resize-handle--right { right: 0; }
.xg-resize-handle::before {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  left: -6px; right: -6px;
  cursor: col-resize;
}
.xg-resize-handle::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  right: 0;
  width: 2px;
  border-radius: 2px;
  background: hsl(var(--primary) / 0.5);
  opacity: 0;
  transition: opacity 0.15s ease;
}
.xg-resize-handle:hover::after { opacity: 1; }

/* ── Detail panel ───────────────────────────────────────────────────────── */
.xg-detail-panel {
  position: absolute;
  top: 1rem;
  left: calc(1rem + var(--xg-left-panel-width) + 0.75rem);
  bottom: 1rem;
  width: 300px;
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 9;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2);
}

.xg-detail-inner {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.xg-detail-inner::-webkit-scrollbar { width: 4px; }
.xg-detail-inner::-webkit-scrollbar-track { background: transparent; }
.xg-detail-inner::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

.xg-detail-header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.xg-detail-title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.xg-detail-kind {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.xg-detail-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xg-detail-close {
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
  flex-shrink: 0;
  transition: color 0.1s, background 0.1s;
  margin-top: 0.1rem;
}
.xg-detail-close:hover { color: hsl(var(--foreground)); background: hsl(var(--muted)); }

.xg-detail-content {
  display: flex;
  flex-direction: column;
}

.xg-detail-section {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid hsl(var(--border));
}
.xg-detail-section:last-child { border-bottom: none; }

.xg-detail-section-title {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
  margin-bottom: 0.45rem;
}

.xg-detail-kv-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.xg-detail-kv {
  display: flex;
  gap: 0.5rem;
  font-size: 0.72rem;
}

.xg-detail-k {
  color: hsl(var(--muted-foreground));
  min-width: 80px;
  flex-shrink: 0;
}

.xg-detail-v {
  color: hsl(var(--foreground));
  word-break: break-all;
}

.xg-detail-v--mono {
  font-family: monospace;
  font-size: 0.65rem;
}

.xg-detail-desc {
  font-size: 0.72rem;
  color: hsl(var(--foreground));
  line-height: 1.6;
  margin: 0;
}

/* ── Attribute fields ───────────────────────────────────────────────────── */
.xg-detail-fields {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.xg-detail-field {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
}

.xg-field-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.xg-field-type {
  color: hsl(var(--muted-foreground));
  font-size: 0.62rem;
  background: hsl(var(--muted));
  border-radius: 3px;
  padding: 0.05rem 0.3rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.xg-field-use {
  font-size: 0.6rem;
  border-radius: 3px;
  padding: 0.05rem 0.3rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  flex-shrink: 0;
}
.xg-field-use--req {
  color: #f59e0b;
  background: rgba(245,158,11,0.1);
  border: 1px solid rgba(245,158,11,0.3);
}

/* ── Connections ────────────────────────────────────────────────────────── */
.xg-conn-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.xg-conn-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: hsl(var(--foreground));
  background: none;
  border: 1px solid hsl(var(--border));
  border-radius: 5px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s, border-color 0.12s;
}
.xg-conn-item:hover {
  background: hsl(var(--muted));
  border-color: hsl(var(--ring));
}

.xg-conn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Empty / HUD overlays ───────────────────────────────────────────────── */
.xg-empty-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  pointer-events: none;
}

.xg-empty-overlay p {
  font-size: 0.9rem;
  color: rgba(255,255,255,0.25);
  margin: 0;
}

.xg-empty-overlay strong { color: rgba(255,255,255,0.4); }

/* ── Loading overlay ─────────────────────────────────────────────────────── */
.xg-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 18, 0.6);
  backdrop-filter: blur(4px);
  z-index: 20;
}

.xg-loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  background: hsl(var(--card) / 0.97);
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 2rem 2.5rem;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
  min-width: 220px;
}

@keyframes xg-spin {
  to { transform: rotate(360deg); }
}

.xg-loading-spin {
  color: hsl(var(--primary, var(--ring)));
  animation: xg-spin 1s linear infinite;
  flex-shrink: 0;
}

.xg-spin-sm {
  color: hsl(var(--muted-foreground));
  animation: xg-spin 1s linear infinite;
  flex-shrink: 0;
}

.xg-loading-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.xg-loading-progress-wrap {
  width: 100%;
  height: 4px;
  background: hsl(var(--muted));
  border-radius: 9999px;
  overflow: hidden;
}

.xg-loading-progress-bar {
  height: 100%;
  background: hsl(var(--primary, var(--ring)));
  border-radius: 9999px;
  transition: width 0.2s ease;
}

.xg-loading-sub {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
}

/* ── Dropzone loading variant ────────────────────────────────────────────── */
.xg-dropzone--loading {
  cursor: default;
  opacity: 0.7;
  pointer-events: none;
}

.xg-controls-hint {
  position: absolute;
  bottom: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  color: rgba(255,255,255,0.3);
  pointer-events: none;
  white-space: nowrap;
}

.xg-hud {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  z-index: 10;
}

.xg-hud-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card) / 0.9);
  backdrop-filter: blur(8px);
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.xg-hud-btn:hover,
.xg-hud-btn.active { background: hsl(var(--card)); color: hsl(var(--foreground)); }

/* ── Tabs ────────────────────────────────────────────────────────────────── */
.xg-tabs {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid hsl(var(--border));
  margin: 0 0 0;
  padding: 0 0.75rem;
  gap: 0;
}

.xg-tab {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 0.75rem;
  font-size: 0.72rem;
  font-weight: 500;
  font-family: inherit;
  color: hsl(var(--muted-foreground));
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition: color 0.14s;
  white-space: nowrap;
}
.xg-tab:hover { color: hsl(var(--foreground)); }
.xg-tab.active {
  color: hsl(var(--foreground));
  border-bottom-color: hsl(var(--primary, var(--ring)));
  font-weight: 600;
}

/* ── Tree ────────────────────────────────────────────────────────────────── */
.xg-tree-actions {
  display: flex;
  gap: 0.4rem;
}

.xg-tree-action-btn {
  font-size: 0.67rem;
  font-family: inherit;
  color: hsl(var(--muted-foreground));
  background: none;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.xg-tree-action-btn:hover { background: hsl(var(--muted)); color: hsl(var(--foreground)); }

.xg-tree {
  overflow-y: auto;
  padding: 0.3rem 0;
  flex: 1;
  min-height: 0;
}

.xg-tree::-webkit-scrollbar { width: 4px; }
.xg-tree::-webkit-scrollbar-track { background: transparent; }
.xg-tree::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

.xg-tree-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 26px;
  padding-right: 0.6rem;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.1s;
  position: relative;
}
.xg-tree-row:hover { background: hsl(var(--muted)); }
.xg-tree-row--selected { background: hsl(var(--muted)); }
.xg-tree-row--selected::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  border-radius: 2px;
  background: hsl(var(--ring));
}

.xg-tree-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: color 0.1s, transform 0.18s ease;
  border-radius: 3px;
}
.xg-tree-arrow:hover { color: hsl(var(--foreground)); background: hsl(var(--border)); }
.xg-tree-arrow.expanded { transform: rotate(90deg); }

.xg-tree-leaf {
  display: inline-block;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.xg-tree-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.xg-tree-label {
  font-size: 0.72rem;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  line-height: 1.4;
}

.xg-tree-row--match .xg-tree-label {
  color: hsl(var(--foreground));
}

.xg-tree-empty {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
  padding: 0.75rem 0.5rem;
  text-align: center;
  font-style: italic;
}

/* ── Slide transitions ────────────────────────────────────────────────────── */
.xg-slide-left-enter-active,
.xg-slide-left-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.xg-slide-left-enter-from,
.xg-slide-left-leave-to {
  transform: translateX(-16px);
  opacity: 0;
}

.xg-slide-enter-active,
.xg-slide-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.xg-slide-enter-from,
.xg-slide-leave-to {
  transform: translateX(-12px);
  opacity: 0;
}
</style>
