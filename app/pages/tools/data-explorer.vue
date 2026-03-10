<template>
  <div class="de-page">

    <!-- ── Landing page ──────────────────────────────────────────────────────── -->
    <div v-if="!fileLoaded && !isLoading" class="de-landing">
      <input ref="fileInput" type="file" accept=".parquet,.csv,.tsv,.txt,.json,.geojson" class="de-hidden" @change="onFileChange" />

      <!-- Hero -->
      <div class="de-landing-hero">
        <div class="de-landing-badge">Local · Private · No uploads</div>
        <h1 class="de-landing-title">Data Explorer</h1>
        <p class="de-landing-desc">
          Inspect and visualise tabular &amp; spatial data files directly in your browser.
          Everything runs locally via DuckDB-WASM — your data never leaves your device.
        </p>
      </div>

      <!-- Drop zone -->
      <div
        class="de-dropzone"
        :class="{ 'de-dropzone--over': dragOver }"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
        @click="fileInput?.click()"
      >
        <svg class="de-drop-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M24 32V16M16 24l8-8 8 8M8 36v2a2 2 0 002 2h28a2 2 0 002-2v-2" />
        </svg>
        <div class="de-drop-title">Drop a file to explore</div>
        <div class="de-drop-sub">Parquet · GeoParquet · CSV · TSV · JSON · GeoJSON</div>
        <div class="de-drop-hint">or click to browse</div>
        <div v-if="loadError" class="de-drop-error">{{ loadError }}</div>
      </div>

      <!-- Feature cards -->
      <div class="de-features">
        <div class="de-feature-card">
          <div class="de-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
          <div class="de-feature-body">
            <div class="de-feature-name">Table &amp; Stats</div>
            <div class="de-feature-desc">Browse rows with sortable columns. Auto-generated column summaries — min, max, mean, nulls, unique counts — give you an instant statistical overview.</div>
          </div>
        </div>
        <div class="de-feature-card">
          <div class="de-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div class="de-feature-body">
            <div class="de-feature-name">Interactive Charts</div>
            <div class="de-feature-desc">Add bar, line, scatter, histogram, or pie charts with a single click. Choose columns, swap colour palettes, and stack multiple charts side-by-side.</div>
          </div>
        </div>
        <div class="de-feature-card">
          <div class="de-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
            </svg>
          </div>
          <div class="de-feature-body">
            <div class="de-feature-name">Map View</div>
            <div class="de-feature-desc">GeoJSON geometry and lat/lon columns are detected automatically and rendered on an interactive map. Supports point, line, and polygon layers.</div>
          </div>
        </div>
        <div class="de-feature-card">
          <div class="de-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div class="de-feature-body">
            <div class="de-feature-name">Large File Support</div>
            <div class="de-feature-desc">Handles large Parquet and GeoParquet files — including ZSTD-compressed ones — via DuckDB-WASM and Apache Arrow, all streamed in the browser.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Loading ────────────────────────────────────────────────────────────── -->
    <div v-if="isLoading" class="de-loading-overlay">
      <div class="de-loading-spinner"></div>
      <div class="de-loading-label">{{ loadingLabel }}</div>
    </div>

    <!-- ── Loaded state ───────────────────────────────────────────────────────── -->
    <template v-if="fileLoaded">

      <!-- Topbar -->
      <header class="de-topbar">
        <div class="de-topbar-left">
          <button class="de-btn-ghost" :title="'Back'" @click="resetFile">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div class="de-topbar-info">
            <span class="de-topbar-name">{{ fileName }}</span>
            <span class="de-topbar-meta">{{ totalRows.toLocaleString() }} rows · {{ columns.length }} columns</span>
          </div>
        </div>
        <div class="de-topbar-right">
          <button class="de-btn-outline" @click="openFilePicker">Load another</button>
          <input ref="fileInputTop" type="file" accept=".parquet,.csv,.tsv,.txt,.json,.geojson" class="de-hidden" @change="onFileChange" />
        </div>
      </header>

      <!-- Body -->
      <div class="de-body">

        <!-- Main: tabs + content -->
        <main class="de-main">
          <div class="de-main-inner">

          <!-- Tab bar -->
          <div class="de-tabs">
            <button class="de-tab" :class="{ 'de-tab--active': activeTab === 'data' }" @click="activeTab = 'data'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
              Data
            </button>
            <button class="de-tab" :class="{ 'de-tab--active': activeTab === 'charts' }" @click="activeTab = 'charts'">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="9" width="3" height="6"/><rect x="6" y="5" width="3" height="10"/><rect x="11" y="2" width="3" height="13"/>
              </svg>
              Charts
            </button>
            <!-- right-aligned column panel toggle -->
            <button class="de-tab de-tab--right" @click="colPanelOpen = !colPanelOpen" :class="{ 'de-tab--active': colPanelOpen }" title="Toggle columns panel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Columns
            </button>
          </div>

          <!-- ── Data tab: map (top) + collapsible table (bottom) ───────────── -->
          <div v-show="activeTab === 'data'" class="de-data-wrap">

            <!-- Map section -->
            <div class="de-data-map" :style="tableCollapsed ? 'flex:1' : 'flex:1'">
              <!-- Column picker (when auto-detect fails) -->
              <div v-if="mapNeedsPicker && !mapLoading" class="de-map-picker-overlay">
                <div class="de-map-picker-box">
                  <div class="de-map-picker-title">Configure map columns</div>
                  <p class="de-map-picker-hint">No geometry or coordinate columns were automatically detected.</p>
                  <div class="de-map-picker-section">
                    <label class="de-map-picker-label">Geometry column</label>
                    <select class="de-select de-select--full" v-model="mapGeoCol">
                      <option value="">— none —</option>
                      <option v-for="c in columns" :key="c.name" :value="c.name">{{ c.name }}</option>
                    </select>
                  </div>
                  <div class="de-map-picker-or">— or use lat/lon coordinates —</div>
                  <div class="de-map-picker-section">
                    <label class="de-map-picker-label">Longitude</label>
                    <select class="de-select de-select--full" v-model="mapLonCol" :disabled="!!mapGeoCol">
                      <option value="">— none —</option>
                      <option v-for="c in numericCols" :key="c.name" :value="c.name">{{ c.name }}</option>
                    </select>
                  </div>
                  <div class="de-map-picker-section">
                    <label class="de-map-picker-label">Latitude</label>
                    <select class="de-select de-select--full" v-model="mapLatCol" :disabled="!!mapGeoCol">
                      <option value="">— none —</option>
                      <option v-for="c in numericCols" :key="c.name" :value="c.name">{{ c.name }}</option>
                    </select>
                  </div>
                  <button class="de-add-btn" :disabled="!(mapGeoCol || (mapLonCol && mapLatCol))" @click="applyManualMapCols">Load Map</button>
                </div>
              </div>
              <div v-if="mapLoading" class="de-map-status">
                <div class="de-map-spinner"></div>
                <span>Loading map…</span>
              </div>
              <div v-if="mapError && !mapLoading" class="de-map-status de-map-status--error">{{ mapError }}</div>
              <div v-if="mapFeatCount > 0 && !mapLoading" class="de-map-badge">
                <span v-if="mapViewLoading" class="de-map-badge-spinner"></span>
                {{ mapFeatCount.toLocaleString() }} features in view{{ mapFeatCount >= VIEWPORT_LIMIT ? ' (capped)' : '' }}
              </div>
              <button v-if="!mapNeedsPicker && !mapLoading && fileLoaded" class="de-map-recol-btn" @click="resetMapColumns">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Map columns
              </button>
              <div ref="mapElRef" class="de-map-el"></div>
            </div>

            <!-- Table section (collapsible) -->
            <div class="de-data-table" :class="{ 'de-data-table--collapsed': tableCollapsed }">
              <div class="de-data-table-header" @click="tableCollapsed = !tableCollapsed">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                  :style="{ transform: tableCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                <span>Table</span>
                <span class="de-table-badge">{{ tableRows.length.toLocaleString() }} / {{ totalRows.toLocaleString() }} rows</span>
                <div v-if="tableLoading" class="de-table-mini-spinner"></div>
              </div>
              <template v-if="!tableCollapsed">
                <div class="de-table-scroll" @scroll.passive="onTableScroll">
                  <table class="de-table">
                    <thead>
                      <tr>
                        <th class="de-th de-th--num">#</th>
                        <th v-for="col in displayCols" :key="col.name" class="de-th" :class="{ 'de-th--right': col.kind === 'numeric' }">
                          <span class="de-th-name" :title="col.name">{{ col.name }}</span>
                          <span class="de-th-badge" :class="`de-badge--${col.kind}`">{{ col.typeLabel }}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, i) in tableRows" :key="i" class="de-tr">
                        <td class="de-td de-td--num">{{ i + 1 }}</td>
                        <td
                          v-for="col in displayCols" :key="col.name"
                          class="de-td"
                          :class="{ 'de-td--right': col.kind === 'numeric', 'de-td--null': row[col.name] == null }"
                          :title="row[col.name] != null ? String(row[col.name]) : ''"
                        >{{ fmtCell(row[col.name], col.kind) }}</td>
                      </tr>
                      <tr v-if="tableOffset < totalRows" class="de-tr de-tr--loadmore">
                        <td :colspan="displayCols.length + 1" class="de-td de-td--loadmore">
                          <span v-if="tableLoading" class="de-table-mini-spinner" style="display:inline-block"></span>
                          <span v-else class="de-loadmore-hint">Scroll for more…</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </div>

          </div>

          <!-- ── Charts ────────────────────────────────────────────────────────── -->
          <div v-if="activeTab === 'charts'" class="de-charts-area">
          <div class="de-grid">

            <!-- Existing chart cards -->
            <div v-for="chart in charts" :key="chart.id" class="de-card">

              <!-- Toolbar row 1: type pills + palette trigger + close -->
              <div class="de-card-toolbar">
                <div class="de-type-pills">
                  <button
                    v-for="t in CHART_TYPES" :key="t.id"
                    class="de-type-pill"
                    :class="{
                      'de-type-pill--active': chart.type === t.id,
                      'de-type-pill--disabled': colsForType(t.id).length === 0
                    }"
                    :disabled="colsForType(t.id).length === 0"
                    :title="t.label"
                    @click="changeType(chart, t.id)"
                    v-html="t.icon"
                  ></button>
                </div>
                <button class="de-card-close" @click="removeChart(chart.id)" title="Remove">×</button>
              </div>

              <!-- Toolbar row 2: column selectors -->
              <div class="de-card-selects">
                <select class="de-select" v-model="chart.col" @change="reloadChart(chart)">
                  <option value="">— column —</option>
                  <option v-for="c in colsForType(chart.type)" :key="c.name" :value="c.name">{{ c.name }}</option>
                </select>
                <template v-if="needsY(chart.type)">
                  <select class="de-select" v-model="chart.col2" @change="reloadChart(chart)">
                    <option value="">{{ chart.type === 'line' ? '— Y (optional, avg) —' : '— Y axis —' }}</option>
                    <option v-for="c in numericCols" :key="c.name" :value="c.name">{{ c.name }}</option>
                  </select>
                </template>
                <template v-if="chart.type === 'bubble'">
                  <select class="de-select" v-model="chart.col3" @change="reloadChart(chart)">
                    <option value="">— size —</option>
                    <option v-for="c in numericCols" :key="c.name" :value="c.name">{{ c.name }}</option>
                  </select>
                </template>
              </div>

              <!-- Count display (no ECharts needed) -->
              <div v-if="chart.type === 'count' && chart.col" class="de-count-display">
                <div class="de-count-big">{{ getColStats(chart.col)?.nonNull.toLocaleString() ?? '—' }}</div>
                <div class="de-count-sub">non-null in <em>{{ chart.col }}</em></div>
                <div class="de-count-pills">
                  <span>{{ totalRows.toLocaleString() }} total</span>
                  <span>{{ getColStats(chart.col)?.nullPct.toFixed(1) }}% null</span>
                  <span>{{ getColStats(chart.col)?.approxUnique.toLocaleString() }} unique</span>
                </div>
                <div v-if="getColKind(chart.col) === 'numeric' && getColStats(chart.col)" class="de-count-pills">
                  <span>min {{ fmtNum(getColStats(chart.col)?.min) }}</span>
                  <span>max {{ fmtNum(getColStats(chart.col)?.max) }}</span>
                  <span v-if="getColStats(chart.col)?.mean != null">avg {{ fmtNum(getColStats(chart.col)?.mean) }}</span>
                </div>
              </div>
              <div v-else-if="chart.type === 'count' && !chart.col" class="de-card-placeholder">
                <span class="de-card-hint">Select a column above</span>
              </div>

              <!-- Chart canvas or states -->
              <template v-else>
                <div v-if="chart.loading" class="de-card-placeholder">
                  <div class="de-card-spinner"></div>
                </div>
                <div v-else-if="chart.error" class="de-card-placeholder">
                  <span class="de-card-error">{{ chart.error }}</span>
                </div>
                <div
                  v-else-if="chart.data"
                  :ref="(el) => setChartEl(chart.id, el as HTMLElement | null)"
                  class="de-chart-canvas"
                ></div>
                <div v-else class="de-card-placeholder">
                  <span class="de-card-hint">{{ chart.col ? 'Select Y axis to continue' : 'Select a column above' }}</span>
                </div>
              </template>

              <!-- Colour picker — bottom-right corner of card -->
              <div
                class="de-pal-anchor"
                @mouseleave="onPaletteLeave(chart.id)"
              >
                <div
                  v-if="openPaletteId === chart.id || lockedPaletteId === chart.id"
                  class="de-pal-pop"
                  @mouseenter="openPaletteId = chart.id"
                >
                  <button
                    v-for="p in PALETTES" :key="p.id"
                    class="de-swatch"
                    :class="{ 'de-swatch--active': chart.palette === p.id }"
                    :title="p.label"
                    :style="{ background: p.swatch }"
                    @click.stop="setChartPalette(chart, p.id)"
                  ></button>
                </div>
                <button
                  class="de-palette-dot"
                  :class="{ 'de-palette-dot--locked': lockedPaletteId === chart.id }"
                  :style="{ background: PALETTES.find(p => p.id === chart.palette)?.swatch ?? '#3f3f46' }"
                  title="Click to pin colour picker"
                  @mouseenter="openPaletteId = chart.id"
                  @click.stop="togglePaletteLock(chart.id)"
                ></button>
              </div>

            </div>

            <!-- Add Chart card (always last) -->
            <div class="de-card de-card--add">
              <div class="de-add-title">Add Chart</div>

              <!-- Chart type grid -->
              <div class="de-add-types">
                <button
                  v-for="t in CHART_TYPES" :key="t.id"
                  class="de-add-type"
                  :class="{
                    'de-add-type--active': draftType === t.id,
                    'de-add-type--disabled': colsForType(t.id).length === 0
                  }"
                  :disabled="colsForType(t.id).length === 0"
                  @click="selectDraftType(t.id)"
                >
                  <span class="de-add-type-icon" v-html="t.icon"></span>
                  <span class="de-add-type-label">{{ t.label }}</span>
                </button>
              </div>

              <!-- Column selectors for draft -->
              <div v-if="draftType" class="de-add-selects">
                <div class="de-add-select-row">
                  <label class="de-add-select-label">{{ draftXLabel }}</label>
                  <select class="de-select de-select--full" v-model="draftCol">
                    <option value="">— select —</option>
                    <option v-for="c in colsForType(draftType)" :key="c.name" :value="c.name">{{ c.name }}</option>
                  </select>
                </div>
                <div v-if="needsY(draftType)" class="de-add-select-row">
                  <label class="de-add-select-label">{{ draftType === 'line' ? 'Y (optional, avg)' : 'Y axis' }}</label>
                  <select class="de-select de-select--full" v-model="draftCol2">
                    <option value="">{{ draftType === 'line' ? '— count (default) —' : '— select —' }}</option>
                    <option v-for="c in numericCols" :key="c.name" :value="c.name">{{ c.name }}</option>
                  </select>
                </div>
                <div v-if="draftType === 'bubble'" class="de-add-select-row">
                  <label class="de-add-select-label">Size</label>
                  <select class="de-select de-select--full" v-model="draftCol3">
                    <option value="">— select —</option>
                    <option v-for="c in numericCols" :key="c.name" :value="c.name">{{ c.name }}</option>
                  </select>
                </div>
              </div>

              <button class="de-add-btn" :disabled="!canAddChart" @click="commitAddChart">+ Add</button>
            </div>

          </div>
          </div><!-- /de-charts-area -->

          </div><!-- /de-main-inner -->

          <!-- ── Right column panel ──────────────────────────────────────────── -->
          <Transition name="de-col-panel">
            <aside v-if="colPanelOpen" class="de-col-panel">
              <div class="de-col-panel-head">
                <span class="de-sidebar-title">Columns</span>
                <span class="de-sidebar-count">{{ columns.length }}</span>
                <button class="de-col-panel-close" @click="colPanelOpen = false" title="Close">×</button>
              </div>
              <ul class="de-col-list">
                <li v-for="col in columns" :key="col.name" class="de-col-item">
                  <button class="de-col-btn" @click="quickAddChart(col)" :title="`Add chart for ${col.name}`">
                    <span class="de-col-badge" :class="`de-badge--${col.kind}`">{{ col.typeLabel }}</span>
                    <span class="de-col-name">{{ col.name }}</span>
                    <span class="de-col-plus">+</span>
                  </button>
                </li>
              </ul>
            </aside>
          </Transition>

        </main>

      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
// data-explorer — attribute charts for spatial extracts
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'

useHead({
  title: 'Data Explorer — Heenco',
  link: [
    { rel: 'preconnect', href: 'https://unpkg.com' },
    { rel: 'preconnect', href: 'https://basemaps.cartocdn.com' },
    { rel: 'dns-prefetch', href: 'https://a.basemaps.cartocdn.com' },
  ],
})
useSeoMeta({ description: 'Explore attributes and generate charts from Parquet, GeoParquet, CSV, and GeoJSON files — all in your browser.' })

// ── Types ─────────────────────────────────────────────────────────────────────
type ColKind  = 'categorical' | 'numeric' | 'datetime' | 'geometry'
type ChartType = 'bar' | 'histogram' | 'line' | 'scatter' | 'bubble' | 'count'

interface ColStats {
  nonNull: number; nullPct: number; approxUnique: number
  min: any; max: any; mean: number | null
}

interface Column {
  name: string; type: string; typeLabel: string; kind: ColKind; stats: ColStats | null
}

interface ChartConfig {
  id: string; type: ChartType; palette: string
  col: string; col2: string; col3: string
  data: any; loading: boolean; error: string
}

// ── Chart type definitions ────────────────────────────────────────────────────
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

// ── Palettes ─────────────────────────────────────────────────────────────────
interface Palette {
  id: string; label: string; swatch: string
  primary: string; secondary: string; area: string
  secondary2: string; secondary3: string
}
const PALETTES: ReadonlyArray<Palette> = [
  { id: 'zinc',    label: 'Zinc',    swatch: '#3f3f46', primary: '#18181b', secondary: '#3f3f46', area: 'rgba(24,24,27,0.07)',    secondary2: '#71717a', secondary3: '#a1a1aa' },
  { id: 'blue',    label: 'Blue',    swatch: '#2563eb', primary: '#1d4ed8', secondary: '#2563eb', area: 'rgba(37,99,235,0.08)',   secondary2: '#3b82f6', secondary3: '#93c5fd' },
  { id: 'teal',    label: 'Teal',    swatch: '#0d9488', primary: '#0f766e', secondary: '#0d9488', area: 'rgba(13,148,136,0.08)',  secondary2: '#14b8a6', secondary3: '#5eead4' },
  { id: 'violet',  label: 'Violet',  swatch: '#7c3aed', primary: '#6d28d9', secondary: '#7c3aed', area: 'rgba(124,58,237,0.08)',  secondary2: '#8b5cf6', secondary3: '#a78bfa' },
  { id: 'rose',    label: 'Rose',    swatch: '#be123c', primary: '#be123c', secondary: '#e11d48', area: 'rgba(190,18,60,0.07)',   secondary2: '#f43f5e', secondary3: '#fda4af' },
  { id: 'amber',   label: 'Amber',   swatch: '#b45309', primary: '#b45309', secondary: '#d97706', area: 'rgba(180,83,9,0.07)',    secondary2: '#f59e0b', secondary3: '#fcd34d' },
]

// ── State ─────────────────────────────────────────────────────────────────────
const openPaletteId   = ref<string | null>(null)
const lockedPaletteId = ref<string | null>(null)
const fileInput    = ref<HTMLInputElement | null>(null)
const fileInputTop = ref<HTMLInputElement | null>(null)
const dragOver     = ref(false)
const fileLoaded   = ref(false)
const fileName     = ref('')
const loadError    = ref('')
const isLoading    = ref(false)
const loadingLabel = ref('Reading file…')
const totalRows    = ref(0)
const columns      = ref<Column[]>([])
const charts       = ref<ChartConfig[]>([])
const activeTab    = ref<'data' | 'charts'>('data')
const tableCollapsed = ref(false)
const colPanelOpen   = ref(false)
const tableRows    = ref<Record<string, any>[]>([])
const tableLoading = ref(false)
const tableOffset  = ref(0)
const TABLE_PAGE   = 200

// ── Map state ─────────────────────────────────────────────────────────────────
const mapGeoCol      = ref('')
const mapLonCol      = ref('')
const mapLatCol      = ref('')
const mapNeedsPicker = ref(false)
const mapLoading     = ref(false)
const mapViewLoading = ref(false)   // spinner while viewport query runs
const mapError       = ref('')
const mapFeatCount   = ref(0)
const mapElRef       = ref<HTMLElement | null>(null)
let   _mapInstance: any = null
let   _maplibrePromise: Promise<any> | null = null
// Background prep — start as soon as columns are known, resolve before tab click
let   _mapInstanceReady: Promise<void> | null = null
let   _geojsonPrep:      Promise<any | null> | null = null
let   _viewportTimer:    ReturnType<typeof setTimeout> | null = null
let   _viewportSeq      = 0   // cancels stale in-flight viewport queries

// Draft state for "Add Chart" panel
const draftType = ref<ChartType | null>(null)
const draftCol  = ref('')
const draftCol2 = ref('')
const draftCol3 = ref('')

// ── Computed ──────────────────────────────────────────────────────────────────
const numericCols  = computed(() => columns.value.filter(c => c.kind === 'numeric'))
const displayCols  = computed(() => columns.value.filter(c => c.kind !== 'geometry'))

const canAddChart = computed(() => {
  if (!draftType.value || !draftCol.value) return false
  if (draftType.value === 'scatter' && !draftCol2.value) return false
  if (draftType.value === 'bubble' && (!draftCol2.value || !draftCol3.value)) return false
  return true
})

const draftXLabel = computed(() => {
  if (!draftType.value) return 'Column'
  if (['scatter', 'bubble', 'line'].includes(draftType.value)) return 'X axis'
  return 'Column'
})

// ── Helpers ───────────────────────────────────────────────────────────────────
const GEO_NAMES   = new Set(['geometry', 'geom', 'wkb_geometry', 'wkt', 'the_geom', 'shape', 'geo'])
const RX_NUMERIC  = /^(TINY|SMALL|UBIG|UHUGE|UINT|USMALL|UTINY|BIG|HUGE)?INT(EGER)?$|^(FLOAT|DOUBLE|REAL|DECIMAL|NUMERIC)/i
const RX_DATETIME = /^(DATE|TIMESTAMP|TIME|INTERVAL)/i
const RX_GEOMETRY = /^(BLOB|GEOMETRY|WKB_BLOB)/i

function classifyType(name: string, type: string): ColKind {
  if (GEO_NAMES.has(name.toLowerCase()) || RX_GEOMETRY.test(type)) return 'geometry'
  if (RX_NUMERIC.test(type))  return 'numeric'
  if (RX_DATETIME.test(type)) return 'datetime'
  return 'categorical'
}

function getTypeLabel(type: string): string {
  if (RX_GEOMETRY.test(type))                             return 'Geom'
  if (type.startsWith('VARCHAR') || type === 'TEXT')      return 'Text'
  if (type === 'BOOLEAN')                                 return 'Bool'
  if (type === 'INTEGER' || type === 'INT')               return 'Int'
  if (type === 'BIGINT')                                  return 'BigInt'
  if (type === 'DOUBLE' || type === 'FLOAT' || type === 'REAL') return 'Float'
  if (type.startsWith('DECIMAL'))                         return 'Dec'
  if (type.startsWith('TIMESTAMP'))                       return 'Time'
  if (type === 'DATE')                                    return 'Date'
  return type.includes('(') ? type.substring(0, type.indexOf('(')) : type
}

function fmtCell(v: any, kind: ColKind): string {
  if (v == null) return 'null'
  const s = String(v)
  if (kind === 'numeric') return fmtNum(v)
  return s.length > 80 ? s.slice(0, 78) + '…' : s
}

function fmtNum(v: any): string {
  if (v == null) return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  if (Number.isInteger(n)) return n.toLocaleString()
  return parseFloat(n.toFixed(4)).toString()
}

function getReadFn(ext: string, file: string): string {
  if (ext === 'parquet')                          return `read_parquet('${file}')`
  if (['csv', 'tsv', 'txt'].includes(ext))        return `read_csv_auto('${file}')`
  if (ext === 'json')                             return `read_json_auto('${file}')`
  if (ext === 'geojson')                          return `ST_Read('${file}')`
  return `read_csv_auto('${file}')`
}

function needsY(type: ChartType | null): boolean {
  return type === 'scatter' || type === 'bubble' || type === 'line'
}

function getColStats(colName: string): ColStats | null {
  return columns.value.find(c => c.name === colName)?.stats ?? null
}

function getColKind(colName: string): ColKind | null {
  return columns.value.find(c => c.name === colName)?.kind ?? null
}

function colsForType(type: ChartType | null): Column[] {
  if (!type) return []
  switch (type) {
    case 'bar':       return columns.value.filter(c => c.kind !== 'geometry')
    case 'histogram': return columns.value.filter(c => c.kind === 'numeric')
    case 'line':      return columns.value.filter(c => c.kind !== 'geometry')
    case 'scatter':   return columns.value.filter(c => c.kind === 'numeric')
    case 'bubble':    return columns.value.filter(c => c.kind === 'numeric')
    case 'count':     return columns.value.filter(c => c.kind !== 'geometry')
    default:          return []
  }
}

// ── DuckDB singleton ──────────────────────────────────────────────────────────
let _db: any   = null
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
  _db   = new duckdb.AsyncDuckDB(logger, worker)
  await _db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  _conn = await _db.connect()
  URL.revokeObjectURL(workerUrl)

  try { await _conn.query(`INSTALL spatial; LOAD spatial;`) } catch { /* CDN may be unreachable */ }
  return _conn
}

// ── File registration (with ZSTD fallback via hyparquet) ─────────────────────
async function registerData(buf: ArrayBuffer, ext: string): Promise<void> {
  if (ext === 'parquet') {
    // Try DuckDB native read first (fast path)
    try {
      await _db.registerFileBuffer('de_file', new Uint8Array(buf))
      await _conn.query(`CREATE OR REPLACE VIEW de_data AS SELECT * FROM read_parquet('de_file')`)
      await _conn.query(`SELECT 1 FROM de_data LIMIT 1`) // validate — triggers decompression
      return
    } catch (e: any) {
      const msg = String(e?.message ?? '')
      // Only fall back on codec errors; rethrow anything else
      if (!msg.includes('ZSTD') && !msg.includes('codec') && !msg.includes('Decompression')) throw e
    }

    // Fallback: hyparquet (pure-JS, supports ZSTD, Snappy, Gzip, LZ4, Brotli)
    const { parquetRead, parquetMetadata } = await import('hyparquet')
    const meta = parquetMetadata(buf)
    const colNames: string[] = meta.schema.slice(1).map((s: any) => String(s.name))

    const allRows: any[] = []
    await parquetRead({ file: buf, onComplete: (rows: any[]) => allRows.push(...rows) })

    // Convert to array-of-objects → JSON → DuckDB
    const objects = allRows.map(row => {
      const obj: Record<string, any> = {}
      colNames.forEach((name, i) => {
        const v = row[i]
        // BigInt → number, Uint8Array (WKB) → skip (geometry)
        obj[name] = typeof v === 'bigint' ? Number(v)
                  : v instanceof Uint8Array ? null
                  : v instanceof Date ? v.toISOString()
                  : v
      })
      return obj
    })

    const jsonBytes = new TextEncoder().encode(JSON.stringify(objects))
    await _db.registerFileBuffer('de_file_json', jsonBytes)
    await _conn.query(`CREATE OR REPLACE VIEW de_data AS SELECT * FROM read_json_auto('de_file_json')`)
    return
  }

  // Non-parquet: register and use appropriate read function
  await _db.registerFileBuffer('de_file', new Uint8Array(buf))
  const readFn = getReadFn(ext, 'de_file')
  await _conn.query(`CREATE OR REPLACE VIEW de_data AS SELECT * FROM ${readFn}`)
}

// ── ECharts (lazy CDN) ────────────────────────────────────────────────────────
let _echartsPromise: Promise<any> | null = null

const getECharts = (): Promise<any> => {
  if (_echartsPromise) return _echartsPromise
  _echartsPromise = new Promise((resolve) => {
    if ((window as any).echarts) { resolve((window as any).echarts); return }
    const s = document.createElement('script')
    s.src   = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js'
    s.onload  = () => resolve((window as any).echarts)
    s.onerror = () => resolve(null)
    document.head.appendChild(s)
  })
  return _echartsPromise
}

const chartEls       = new Map<string, HTMLElement>()
const chartInstances = new Map<string, any>()
let   _chartIdSeq    = 0

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
  const el    = chartEls.get(id)
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

function onPaletteLeave(id: string) {
  if (lockedPaletteId.value !== id) openPaletteId.value = null
}

function togglePaletteLock(id: string) {
  lockedPaletteId.value = lockedPaletteId.value === id ? null : id
  openPaletteId.value   = id
}

function getChartPalette(chart: ChartConfig): Palette {
  return PALETTES.find(p => p.id === chart.palette) ?? PALETTES[0]!
}

function setChartPalette(chart: ChartConfig, id: string) {
  chart.palette = id
  openPaletteId.value   = null
  lockedPaletteId.value = null
  nextTick(() => { if (chart.data && !chart.loading) renderChart(chart.id) })
}

function buildOption(chart: ChartConfig): any {
  const pal       = getChartPalette(chart)
  const axLabel   = { color: '#71717a', fontSize: 11 }
  const splitLine = { lineStyle: { color: '#f0f0f1' } }
  const d         = chart.data

  if (chart.type === 'bar') {
    return {
      backgroundColor: 'transparent',
      grid: { left: 4, right: 16, top: 6, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true },
      xAxis: { type: 'value', axisLabel: axLabel, splitLine },
      yAxis: {
        type: 'category',
        data: [...d.labels].reverse(),
        axisLabel: { ...axLabel, width: 110, overflow: 'truncate', formatter: (v: string) => v.length > 18 ? v.slice(0, 16) + '…' : v },
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
    const trunc   = (s: string) => s.length > 10 ? s.slice(0, 8) + '…' : s
    const maxZ    = Math.max(...(d as number[][]).map(r => r[2] ?? 0))
    const scale   = maxZ > 0 ? 30 / Math.sqrt(maxZ) : 1
    return {
      backgroundColor: 'transparent',
      grid: { left: 4, right: 8, top: 6, bottom: 4, containLabel: true },
      tooltip: { trigger: 'item', confine: true, formatter: (p: any) => `${chart.col}: ${fmtNum(p.value[0])}<br>${chart.col2}: ${fmtNum(p.value[1])}<br>${chart.col3}: ${fmtNum(p.value[2])}` },
      xAxis: { type: 'value', name: trunc(chart.col),  nameLocation: 'end', nameTextStyle: { color: '#a1a1aa', fontSize: 10 }, axisLabel: axLabel, splitLine },
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

// ── Query ─────────────────────────────────────────────────────────────────────
async function queryChart(id: string) {
  const chart = charts.value.find(c => c.id === id)
  if (!chart || chart.type === 'count') return

  chart.loading = true
  chart.error   = ''
  chart.data    = null

  try {
    const conn = await getDuckDB()
    const col  = chart.col
    const col2 = chart.col2
    const col3 = chart.col3
    let data: any

    if (chart.type === 'bar') {
      const res  = await conn.query(`
        SELECT CAST("${col}" AS VARCHAR) AS val, COUNT(*) AS cnt
        FROM de_data WHERE "${col}" IS NOT NULL
        GROUP BY val ORDER BY cnt DESC
      `)
      const rows = res.toArray()
      data = { labels: rows.map((r: any) => String(r.val ?? '(empty)')), values: rows.map((r: any) => Number(r.cnt)) }
    }

    else if (chart.type === 'histogram') {
      const res  = await conn.query(`
        WITH bounds AS (
          SELECT MIN("${col}")::DOUBLE AS lo, MAX("${col}")::DOUBLE AS hi
          FROM de_data WHERE "${col}" IS NOT NULL
        ),
        bucketed AS (
          SELECT
            CASE WHEN b.lo = b.hi THEN 1
                 ELSE LEAST(20, GREATEST(1, CAST(FLOOR(("${col}"::DOUBLE - b.lo) / (b.hi - b.lo) * 20.0) + 1 AS INTEGER)))
            END AS bucket,
            b.lo, b.hi
          FROM de_data, bounds b
          WHERE "${col}" IS NOT NULL
        )
        SELECT bucket,
               lo + (bucket - 1) * (hi - lo) / 20.0 AS bmin,
               COUNT(*) AS cnt
        FROM bucketed
        GROUP BY bucket, lo, hi ORDER BY bucket
      `)
      const rows = res.toArray()
      data = { labels: rows.map((r: any) => fmtNum(r.bmin)), values: rows.map((r: any) => Number(r.cnt)) }
    }

    else if (chart.type === 'line') {
      const colMeta  = columns.value.find(c => c.name === col)
      const isDate   = colMeta?.kind === 'datetime'
      const yExpr    = col2 ? `AVG("${col2}"::DOUBLE)` : 'COUNT(*)'
      const nullGuard = col2 ? `AND "${col2}" IS NOT NULL` : ''
      let q: string
      if (isDate) {
        q = `SELECT DATE_TRUNC('month', "${col}") AS x, ${yExpr} AS y
             FROM de_data WHERE "${col}" IS NOT NULL ${nullGuard}
             GROUP BY x ORDER BY x`
      } else {
        q = `SELECT CAST("${col}" AS VARCHAR) AS x, ${yExpr} AS y
             FROM de_data WHERE "${col}" IS NOT NULL ${nullGuard}
             GROUP BY x ORDER BY y DESC`
      }
      const rows = (await conn.query(q)).toArray()
      data = {
        labels: rows.map((r: any) => String(r.x ?? '').slice(0, 10)),
        values: rows.map((r: any) => r.y != null ? parseFloat(Number(r.y).toFixed(4)) : 0),
      }
    }

    else if (chart.type === 'scatter' && col2) {
      const res = await conn.query(`SELECT "${col}"::DOUBLE AS x, "${col2}"::DOUBLE AS y FROM de_data WHERE "${col}" IS NOT NULL AND "${col2}" IS NOT NULL`)
      data = res.toArray().map((r: any) => [Number(r.x), Number(r.y)])
    }

    else if (chart.type === 'bubble' && col2 && col3) {
      const res = await conn.query(`SELECT "${col}"::DOUBLE AS x, "${col2}"::DOUBLE AS y, ABS("${col3}"::DOUBLE) AS z FROM de_data WHERE "${col}" IS NOT NULL AND "${col2}" IS NOT NULL AND "${col3}" IS NOT NULL`)
      data = res.toArray().map((r: any) => [Number(r.x), Number(r.y), Number(r.z)])
    }

    const c = charts.value.find(c => c.id === id)
    if (c) { c.data = data ?? null; c.loading = false }

    if (data) { await nextTick(); await renderChart(id) }

  } catch (err: any) {
    const c = charts.value.find(c => c.id === id)
    if (c) { c.error = err?.message ?? String(err); c.loading = false }
  }
}

// ── Chart card management ─────────────────────────────────────────────────────
function reloadChart(chart: ChartConfig) {
  if (!chart.col) return
  if (chart.type === 'scatter' && !chart.col2) return
  if (chart.type === 'bubble' && (!chart.col2 || !chart.col3)) return
  queryChart(chart.id)
}

function changeType(chart: ChartConfig, type: ChartType) {
  chart.type = type
  // Ensure current col is valid for new type
  if (!colsForType(type).find(c => c.name === chart.col)) {
    chart.col = colsForType(type)[0]?.name ?? ''
  }
  // Clear secondary cols if not needed
  if (!needsY(type))      { chart.col2 = ''; chart.col3 = '' }
  if (type !== 'bubble')  chart.col3 = ''

  chartInstances.get(chart.id)?.clear()
  chart.data  = null
  chart.error = ''

  if (chart.type === 'count') return
  if (!chart.col) return
  if (type === 'scatter' && !chart.col2)          return
  if (type === 'bubble' && (!chart.col2 || !chart.col3)) return
  queryChart(chart.id)
}

function removeChart(id: string) {
  chartInstances.get(id)?.dispose()
  chartInstances.delete(id)
  chartEls.delete(id)
  charts.value = charts.value.filter(c => c.id !== id)
}

// ── Add Chart panel ───────────────────────────────────────────────────────────
function selectDraftType(type: ChartType) {
  draftType.value = type
  // Reset col if not valid for new type
  if (draftCol.value && !colsForType(type).find(c => c.name === draftCol.value)) draftCol.value = ''
  if (!needsY(type)) { draftCol2.value = ''; draftCol3.value = '' }
  if (type !== 'bubble') draftCol3.value = ''
}

async function commitAddChart() {
  if (!canAddChart.value || !draftType.value) return
  const id = newId()
  charts.value.push({ id, type: draftType.value, palette: 'zinc', col: draftCol.value, col2: draftCol2.value, col3: draftCol3.value, data: null, loading: false, error: '' })
  draftType.value = null; draftCol.value = ''; draftCol2.value = ''; draftCol3.value = ''
  await queryChart(id)
}

function quickAddChart(col: Column) {
  const type: ChartType = col.kind === 'numeric' ? 'histogram' : col.kind === 'datetime' ? 'line' : 'bar'
  const id = newId()
  charts.value.push({ id, type, palette: 'zinc', col: col.name, col2: '', col3: '', data: null, loading: false, error: '' })
  queryChart(id)
}

// ── File loading ──────────────────────────────────────────────────────────────
function openFilePicker() { fileInputTop.value?.click() }

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
  loadError.value    = ''
  isLoading.value    = true
  loadingLabel.value = 'Initialising…'
  fileLoaded.value   = false
  for (const inst of chartInstances.values()) inst.dispose()
  chartInstances.clear(); chartEls.clear()
  columns.value = []; charts.value = []

  // Detach the old MapLibre/deck.gl instances — their container DOM element
  // will be unmounted by Vue (v-if="fileLoaded" is now false) so we must
  // tear down before the node disappears, then null everything out so
  // kickoffMapPrep() creates a fresh instance on the newly-mounted container.
  try { _deckOverlay?.finalize() } catch { }
  _deckOverlay      = null
  _featureCache.clear()
  try { _mapInstance?.remove() } catch { }
  _mapInstance      = null
  _mapInstanceReady = null
  _geojsonPrep      = null

  try {
    loadingLabel.value = 'Loading DuckDB…'

    // Fully terminate the old DuckDB worker on re-load.
    // Re-registering the same filename in a live VFS leaves stale internal
    // file handles that cause "No magic bytes" / ZSTD errors on the 2nd load.
    if (_db) {
      try { await _conn?.close() } catch { }
      try { await _db.terminate() } catch { }
      _db   = null
      _conn = null
    }

    await getDuckDB()

    loadingLabel.value = 'Reading file…'
    const buf = await file.arrayBuffer()
    const ext = (file.name.split('.').pop() ?? '').toLowerCase()

    await registerData(buf, ext)

    const countRes  = await _conn.query(`SELECT COUNT(*) AS n FROM de_data`)
    totalRows.value = Number(countRes.toArray()[0].n)

    loadingLabel.value = 'Analysing columns…'
    const sumRes  = await _conn.query(`SUMMARIZE de_data`)
    const sumRows = sumRes.toArray()

    columns.value = sumRows.map((row: any): Column => {
      const name = String(row.column_name ?? '')
      const type = String(row.column_type ?? '')
      return {
        name, type,
        typeLabel: getTypeLabel(type),
        kind:      classifyType(name, type),
        stats: {
          nonNull:      Number(row.count ?? 0),
          nullPct:      Number(row.null_percentage ?? 0),
          approxUnique: Number(row.approx_unique ?? 0),
          min:          row.min ?? null,
          max:          row.max ?? null,
          mean:         row.mean != null ? Number(row.mean) : null,
        },
      }
    })

    fileName.value   = file.name
    fileLoaded.value = true
    isLoading.value  = false
    activeTab.value  = 'data'

    // Kick off map prep + GeoJSON build in background (parallel with table/charts)
    kickoffMapPrep()

    await loadTableData()
    await autoAddInitialCharts()

    // watch(activeTab) only fires on VALUE CHANGES. On first load activeTab
    // is already 'data' so the watch never fires — call initMapTab() directly.
    if (activeTab.value === 'data') {
      await nextTick()
      initMapTab()
    }

  } catch (err: any) {
    loadError.value = `Failed to read file: ${err?.message ?? String(err)}`
    isLoading.value = false
  }
}

async function loadTableData() {
  tableLoading.value = true
  tableRows.value    = []
  tableOffset.value  = 0
  try {
    const conn = await getDuckDB()
    const cols = displayCols.value.map(c => `"${c.name}"`).join(', ')
    const res  = await conn.query(`SELECT ${cols} FROM de_data LIMIT ${TABLE_PAGE} OFFSET 0`)
    tableRows.value = res.toArray().map((row: any) => {
      const out: Record<string, any> = {}
      for (const col of displayCols.value) {
        const v = row[col.name]
        out[col.name] = (v != null && typeof v === 'object' && typeof v.toString === 'function') ? v.toString() : v
      }
      return out
    })
    tableOffset.value = tableRows.value.length
  } catch { /* silently skip — table is a convenience */ }
  tableLoading.value = false
}

async function loadMoreTableRows() {
  if (tableLoading.value || tableOffset.value >= totalRows.value) return
  tableLoading.value = true
  try {
    const conn = await getDuckDB()
    const cols = displayCols.value.map(c => `"${c.name}"`).join(', ')
    const res  = await conn.query(`SELECT ${cols} FROM de_data LIMIT ${TABLE_PAGE} OFFSET ${tableOffset.value}`)
    const newRows = res.toArray().map((row: any) => {
      const out: Record<string, any> = {}
      for (const col of displayCols.value) {
        const v = row[col.name]
        out[col.name] = (v != null && typeof v === 'object' && typeof v.toString === 'function') ? v.toString() : v
      }
      return out
    })
    tableRows.value  = [...tableRows.value, ...newRows]
    tableOffset.value += newRows.length
  } catch { }
  tableLoading.value = false
}

function onTableScroll(e: Event) {
  if (tableLoading.value || tableOffset.value >= totalRows.value) return
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
    loadMoreTableRows()
  }
}

async function autoAddInitialCharts() {
  const catCol = columns.value.find(c => c.kind === 'categorical')
  const numCol = columns.value.find(c => c.kind === 'numeric')
  const dtCol  = columns.value.find(c => c.kind === 'datetime')

  const toAdd: Array<{ type: ChartType; col: string }> = []
  if (catCol)              toAdd.push({ type: 'bar', col: catCol.name })
  if (numCol)              toAdd.push({ type: 'histogram', col: numCol.name })
  else if (dtCol)          toAdd.push({ type: 'line', col: dtCol.name })

  // Fill to 2 if needed
  if (toAdd.length < 2) {
    const used = new Set(toAdd.map(t => t.col))
    for (const col of columns.value) {
      if (toAdd.length >= 2) break
      if (used.has(col.name) || col.kind === 'geometry') continue
      const t: ChartType = col.kind === 'numeric' ? 'histogram' : col.kind === 'datetime' ? 'line' : 'bar'
      toAdd.push({ type: t, col: col.name })
    }
  }

  const ids: string[] = []
  for (const t of toAdd.slice(0, 2)) {
    const id = newId()
    ids.push(id)
    charts.value.push({ id, type: t.type, palette: 'zinc', col: t.col, col2: '', col3: '', data: null, loading: false, error: '' })
  }
  // Fire all chart queries concurrently
  await Promise.all(ids.map(id => queryChart(id)))
}

const MAPLIBRE_CSS     = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'
const MAPLIBRE_JS      = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'
const DECKGL_JS        = 'https://unpkg.com/deck.gl@9.1.3/dist.min.js'
const VIEWPORT_LIMIT   = 5_000   // max features per viewport query
const VIEWPORT_DEBOUNCE = 300    // ms to wait after moveend before querying
let _deckOverlay: any  = null
let _deckPromise: Promise<any> | null = null
let _featureCache      = new Map<string, any>()  // rowid → GeoJSON Feature, accumulates across pans

// Called right after columns are known — starts map init + flies to bbox center.
// No full data scan here; data is loaded per-viewport after the map is ready.
function kickoffMapPrep() {
  detectMapCols()
  if (mapNeedsPicker.value) return

  // Start map instance + CDN load in background
  _mapInstanceReady = (async () => {
    try {
      const [ml] = await Promise.all([loadMapLibre(), loadDeckGL()])
      if (_mapInstance) return
      await nextTick()
      if (!mapElRef.value) return
      _mapInstance = new ml.Map({
        container: mapElRef.value,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [0, 20], zoom: 1.5, attributionControl: false,
      })
      await new Promise<void>(res => _mapInstance.on('load', res))
    } catch { }
  })()

  // Kick off the cheap bbox-centre query concurrently with map init
  _geojsonPrep = fetchBboxCenter().catch(() => null)
}

/** Cheap query: get the data extent so we can fly the map to it on first show. */
async function fetchBboxCenter(): Promise<{ center: [number, number]; bounds: [number,number,number,number] } | null> {
  const conn = await getDuckDB()
  try {
    if (mapGeoCol.value) {
      const col = mapGeoCol.value
      const res = await conn.query(
        `SELECT ST_XMin(ext) AS w, ST_YMin(ext) AS s, ST_XMax(ext) AS e, ST_YMax(ext) AS n
         FROM (SELECT ST_Extent(${geoExpr(col)}) AS ext FROM de_data WHERE "${col}" IS NOT NULL)`
      )
      const r = res.toArray()[0]
      if (!r) return null
      const [w, s, e, n] = [Number(r.w), Number(r.s), Number(r.e), Number(r.n)]
      if ([w, s, e, n].some(v => !isFinite(v))) return null
      return { center: [(w + e) / 2, (s + n) / 2], bounds: [w, s, e, n] }
    }
    if (mapLonCol.value && mapLatCol.value) {
      const lon = mapLonCol.value; const lat = mapLatCol.value
      const res = await conn.query(
        `SELECT MIN("${lon}")::DOUBLE AS w, MIN("${lat}")::DOUBLE AS s,
                MAX("${lon}")::DOUBLE AS e, MAX("${lat}")::DOUBLE AS n
         FROM de_data WHERE "${lon}" IS NOT NULL AND "${lat}" IS NOT NULL`
      )
      const r = res.toArray()[0]
      if (!r) return null
      const [w, s, e, n] = [Number(r.w), Number(r.s), Number(r.e), Number(r.n)]
      if ([w, s, e, n].some(v => !isFinite(v))) return null
      return { center: [(w + e) / 2, (s + n) / 2], bounds: [w, s, e, n] }
    }
  } catch { }
  return null
}

/** Query features intersecting the current map viewport and render them. */
async function fetchViewport() {
  if (!_mapInstance || mapNeedsPicker.value) return
  const seq = ++_viewportSeq
  mapViewLoading.value = true
  try {
    const conn  = await getDuckDB()
    const b     = _mapInstance.getBounds()
    const [w, s, e, n] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]

    if (mapGeoCol.value) {
      const col = mapGeoCol.value
      const res = await conn.query(
        `SELECT ST_AsGeoJSON(${geoExpr(col)}) AS _geom
         FROM de_data
         WHERE "${col}" IS NOT NULL
           AND ST_Intersects(${geoExpr(col)}, ST_MakeEnvelope(${w}, ${s}, ${e}, ${n}))
         LIMIT ${VIEWPORT_LIMIT}`
      )
      if (seq !== _viewportSeq) return
      for (const r of res.toArray()) {
        const key = String(r._geom)
        if (!_featureCache.has(key)) {
          try {
            const geom = JSON.parse(String(r._geom))
            _featureCache.set(key, { type: 'Feature', geometry: geom, properties: {} })
          } catch { }
        }
      }
    } else if (mapLonCol.value && mapLatCol.value) {
      const lon = mapLonCol.value; const lat = mapLatCol.value
      const propCols = columns.value
        .filter(c => c.kind !== 'geometry' && c.name !== lon && c.name !== lat)
        .slice(0, 6).map(c => `"${c.name}"`).join(', ')
      const res = await conn.query(
        `SELECT "${lon}"::DOUBLE AS _lon, "${lat}"::DOUBLE AS _lat${propCols ? ', ' + propCols : ''}
         FROM de_data
         WHERE "${lon}" IS NOT NULL AND "${lat}" IS NOT NULL
           AND "${lon}"::DOUBLE BETWEEN ${w} AND ${e}
           AND "${lat}"::DOUBLE BETWEEN ${s} AND ${n}
         LIMIT ${VIEWPORT_LIMIT}`
      )
      if (seq !== _viewportSeq) return
      for (const r of res.toArray()) {
        const lon_ = Number(r._lon); const lat_ = Number(r._lat)
        const key = `${lon_}_${lat_}`
        if (!_featureCache.has(key)) {
          if (isFinite(lon_) && isFinite(lat_)) {
            _featureCache.set(key, {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [lon_, lat_] },
              properties: Object.fromEntries(
                Object.entries(r as object).filter(([k]) => k !== '_lon' && k !== '_lat')
              ),
            })
          }
        }
      }
    } else { return }

    if (seq !== _viewportSeq) return
    mapFeatCount.value = _featureCache.size
    const geojson = { type: 'FeatureCollection', features: Array.from(_featureCache.values()) }
    await renderMapLayers(geojson)
  } catch (e: any) {
    if (seq === _viewportSeq) mapError.value = `Map error: ${e?.message ?? e}`
  } finally {
    if (seq === _viewportSeq) mapViewLoading.value = false
  }
}

/** Schedule a debounced viewport fetch (cancels any pending one). */
function scheduleViewport() {
  if (_viewportTimer) clearTimeout(_viewportTimer)
  _viewportTimer = setTimeout(fetchViewport, VIEWPORT_DEBOUNCE)
}

async function loadMapLibre(): Promise<any> {
  if (_maplibrePromise) return _maplibrePromise
  _maplibrePromise = new Promise<any>((resolve, reject) => {
    if ((window as any).maplibregl) { resolve((window as any).maplibregl); return }
    if (!document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = MAPLIBRE_CSS
      document.head.appendChild(link)
    }
    const s = document.createElement('script')
    s.src = MAPLIBRE_JS
    s.onload  = () => resolve((window as any).maplibregl)
    s.onerror = () => reject(new Error('Failed to load MapLibre GL'))
    document.head.appendChild(s)
  })
  return _maplibrePromise
}

async function loadDeckGL(): Promise<any> {
  if (_deckPromise) return _deckPromise
  _deckPromise = new Promise<any>((resolve, reject) => {
    if ((window as any).deck) { resolve((window as any).deck); return }
    const s = document.createElement('script')
    s.src = DECKGL_JS
    s.onload  = () => resolve((window as any).deck)
    s.onerror = () => reject(new Error('Failed to load deck.gl'))
    document.head.appendChild(s)
  })
  return _deckPromise
}

function detectMapCols() {
  const geomCol = columns.value.find(c => c.kind === 'geometry')
  if (geomCol) {
    mapGeoCol.value = geomCol.name; mapLonCol.value = ''; mapLatCol.value = ''
    mapNeedsPicker.value = false; return
  }
  const LON = new Set(['lon', 'longitude', 'lng', 'x', 'long'])
  const LAT = new Set(['lat', 'latitude', 'y'])
  const lonCol = columns.value.find(c => c.kind === 'numeric' && LON.has(c.name.toLowerCase()))
  const latCol = columns.value.find(c => c.kind === 'numeric' && LAT.has(c.name.toLowerCase()))
  if (lonCol && latCol) {
    mapGeoCol.value = ''; mapLonCol.value = lonCol.name; mapLatCol.value = latCol.name
    mapNeedsPicker.value = false; return
  }
  mapGeoCol.value = ''; mapLonCol.value = ''; mapLatCol.value = ''
  mapNeedsPicker.value = true
}

/** Return the SQL expression that converts a geometry column to GEOMETRY type. */
function geoExpr(colName: string): string {
  const colMeta = columns.value.find(c => c.name === colName)
  const rawType = colMeta?.type?.toUpperCase() ?? ''
  if (rawType === 'GEOMETRY') return `"${colName}"`                           // already GEOMETRY
  if (rawType === 'VARCHAR' || rawType === 'TEXT') return `ST_GeomFromText("${colName}")`  // WKT string
  return `ST_GeomFromWKB("${colName}")`                                       // BLOB / WKB_BLOB
}

async function renderMapLayers(geojson: any) {
  if (!_mapInstance || !geojson?.features?.length) return
  const deckLib = await loadDeckGL()

  const layer = new deckLib.GeoJsonLayer({
    id: 'de-geojson',
    data: geojson,
    filled: true,
    stroked: true,
    getFillColor:          [37, 99, 235, 130],
    getLineColor:          [30, 64, 175, 220],
    getPointRadius:        60,
    pointRadiusMinPixels:  3,
    pointRadiusMaxPixels:  14,
    lineWidthMinPixels:    1,
    lineWidthMaxPixels:    3,
    pickable:              false,
    updateTriggers:        { all: Date.now() },
  })

  if (_deckOverlay) {
    _deckOverlay.setProps({ layers: [layer] })
  } else {
    _deckOverlay = new deckLib.MapboxOverlay({ interleaved: false, layers: [layer] })
    _mapInstance.addControl(_deckOverlay)
  }
}

async function initMapTab() {
  if (!mapElRef.value || !fileLoaded.value) return
  mapError.value = ''
  mapLoading.value = true

  try {
    // Await map instance ready (CDN + basemap load, runs since kickoffMapPrep)
    await (_mapInstanceReady ?? Promise.resolve())

    await new Promise<void>(r => requestAnimationFrame(() => r()))

    if (_mapInstance) {
      _mapInstance.resize()
    } else {
      // Fallback: map wasn't pre-created
      const ml = await loadMapLibre()
      _mapInstance = new ml.Map({
        container: mapElRef.value!,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [0, 20], zoom: 1.5, attributionControl: false,
      })
      await new Promise<void>(res => _mapInstance.on('load', res))
    }

    detectMapCols()
    if (mapNeedsPicker.value) { mapLoading.value = false; return }

    // Fly to bbox center (cheap query, already running in background)
    const bboxInfo = await (_geojsonPrep as Promise<any>).catch(() => null)
    if (bboxInfo?.bounds) {
      const [w, s, e, n] = bboxInfo.bounds
      _mapInstance.fitBounds([[w, s], [e, n]], { padding: 50, maxZoom: 15, animate: false })
    }

    // Wire up the moveend listener (only once)
    if (!(_mapInstance as any)._deViewportWired) {
      ;(_mapInstance as any)._deViewportWired = true
      _mapInstance.on('moveend', scheduleViewport)
    }

    mapLoading.value = false
    // Fetch the initial viewport (what's visible after fitBounds)
    await fetchViewport()
  } catch (e: any) {
    mapError.value = e?.message ?? String(e)
    mapLoading.value = false
  }
}

async function applyManualMapCols() {
  mapNeedsPicker.value = false
  mapError.value = ''; mapLoading.value = true
  try {
    _geojsonPrep = fetchBboxCenter().catch(() => null)
    if (!_mapInstance) {
      const ml = await loadMapLibre()
      _mapInstance = new ml.Map({
        container: mapElRef.value!,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [0, 20], zoom: 1.5, attributionControl: false,
      })
      await new Promise<void>(res => _mapInstance.on('load', res))
    }
    const bboxInfo = await (_geojsonPrep as Promise<any>).catch(() => null)
    if (bboxInfo?.bounds) {
      const [w, s, e, n] = bboxInfo.bounds
      _mapInstance.fitBounds([[w, s], [e, n]], { padding: 50, maxZoom: 15, animate: false })
    }
    if (!(_mapInstance as any)._deViewportWired) {
      ;(_mapInstance as any)._deViewportWired = true
      _mapInstance.on('moveend', scheduleViewport)
    }
    mapLoading.value = false
    await fetchViewport()
  } catch (e: any) {
    mapError.value = e?.message ?? String(e)
    mapLoading.value = false
  }
}

function resetMapColumns() {
  mapGeoCol.value = ''; mapLonCol.value = ''; mapLatCol.value = ''
  mapNeedsPicker.value = true; mapFeatCount.value = 0
  _featureCache.clear()
  if (_viewportTimer) { clearTimeout(_viewportTimer); _viewportTimer = null }
  ++_viewportSeq
  try { _deckOverlay?.finalize() } catch { }
  _deckOverlay = null
  _geojsonPrep = null; _mapInstanceReady = null
}

function resetFile() {
  for (const inst of chartInstances.values()) inst.dispose()
  chartInstances.clear(); chartEls.clear()
  fileLoaded.value = false; fileName.value = ''
  columns.value = []; charts.value = []; tableRows.value = []
  totalRows.value = 0; loadError.value = ''
  activeTab.value = 'data'
  tableCollapsed.value = false
  draftType.value = null; draftCol.value = ''; draftCol2.value = ''; draftCol3.value = ''
  mapGeoCol.value = ''; mapLonCol.value = ''; mapLatCol.value = ''
  mapNeedsPicker.value = false; mapLoading.value = false; mapViewLoading.value = false; mapError.value = ''; mapFeatCount.value = 0
  if (_viewportTimer) { clearTimeout(_viewportTimer); _viewportTimer = null }
  ++_viewportSeq
  try { _deckOverlay?.finalize() } catch { }
  _deckOverlay = null
  _featureCache.clear()
  _mapInstanceReady = null; _geojsonPrep = null
}

// ── Resize handler ────────────────────────────────────────────────────────────
function handleResize() { for (const inst of chartInstances.values()) inst.resize() }

function handleDocClick(e: MouseEvent) {
  if (lockedPaletteId.value && !(e.target as Element).closest('.de-pal-anchor')) {
    lockedPaletteId.value = null
    openPaletteId.value   = null
  }
}

watch(activeTab, async (tab) => {
  if (tab !== 'data') return
  await nextTick()
  initMapTab()
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
  document.addEventListener('click', handleDocClick)
  // Eagerly start downloading MapLibre GL so it's cached before tab click
  loadMapLibre().catch(() => {})
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', handleDocClick)
  for (const inst of chartInstances.values()) inst.dispose()
  chartInstances.clear()
  _mapInstance?.remove(); _mapInstance = null
})
</script>

<style scoped>
/* ── Design tokens (shadcn light) ───────────────────────────────────────────── */
/* background  : #ffffff  card       : #ffffff  border  : hsl(240 5.9% 90%) = #e4e4e7          */
/* foreground  : #09090b  muted      : #f4f4f5  muted-fg: #71717a                               */
/* primary     : #18181b  primary-fg : #fafafa  ring    : #18181b                               */

/* ── Page shell ─────────────────────────────────────────────────────────────── */
.de-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ffffff;
  color: #09090b;
  font-family: var(--font-family, system-ui, sans-serif);
  overflow: hidden;
}
.de-hidden { display: none; }

/* ── Landing page ───────────────────────────────────────────────────────────── */
.de-landing {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 3rem 1.5rem 4rem;
}
.de-landing-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 560px;
  gap: 0.6rem;
}
.de-landing-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #71717a;
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
}
.de-landing-title {
  font-size: 2rem;
  font-weight: 700;
  color: #09090b;
  margin: 0.25rem 0 0;
  line-height: 1.15;
}
.de-landing-desc {
  font-size: 0.9rem;
  color: #71717a;
  line-height: 1.6;
  margin: 0;
}

/* ── Drop zone ──────────────────────────────────────────────────────────────── */
.de-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 520px;
  border: 2px dashed #e4e4e7;
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  padding: 2.25rem 2rem;
  text-align: center;
  background: #fafafa;
}
.de-dropzone:hover,
.de-dropzone--over { border-color: #18181b; background: #f4f4f5; }
.de-drop-icon { width: 36px; height: 36px; color: #a1a1aa; margin-bottom: 0.25rem; }
.de-dropzone:hover .de-drop-icon,
.de-dropzone--over .de-drop-icon { color: #18181b; }
.de-drop-title { font-size: 1rem; font-weight: 600; color: #09090b; }
.de-drop-sub   { font-size: 0.8rem; color: #71717a; }
.de-drop-hint  { font-size: 0.75rem; color: #a1a1aa; }
.de-drop-error {
  margin-top: 0.75rem; font-size: 0.82rem; color: #dc2626;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 8px; padding: 0.4rem 0.9rem;
}

/* ── Feature cards ──────────────────────────────────────────────────────────── */
.de-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  width: 100%;
  max-width: 900px;
}
.de-feature-card {
  display: flex;
  gap: 0.9rem;
  padding: 1.1rem 1.2rem;
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
}
.de-feature-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f4f5;
  border-radius: 8px;
  color: #18181b;
}
.de-feature-icon svg { width: 18px; height: 18px; }
.de-feature-body { display: flex; flex-direction: column; gap: 0.25rem; }
.de-feature-name { font-size: 0.85rem; font-weight: 600; color: #09090b; }
.de-feature-desc { font-size: 0.78rem; color: #71717a; line-height: 1.5; }

/* ── Loading ────────────────────────────────────────────────────────────────── */
.de-loading-overlay {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1rem;
}
.de-loading-spinner {
  width: 36px; height: 36px;
  border: 3px solid #e4e4e7; border-top-color: #18181b;
  border-radius: 50%; animation: de-spin 0.8s linear infinite;
}
.de-loading-label { font-size: 0.9rem; color: #71717a; }
@keyframes de-spin { to { transform: rotate(360deg); } }

/* ── Topbar ─────────────────────────────────────────────────────────────────── */
.de-topbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; height: 52px; padding: 0 1rem;
  background: #ffffff; border-bottom: 1px solid #e4e4e7; flex-shrink: 0; z-index: 10;
}
.de-topbar-left  { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
.de-topbar-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
.de-topbar-info  { display: flex; flex-direction: column; min-width: 0; }
.de-topbar-name  { font-size: 0.875rem; font-weight: 600; color: #09090b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }
.de-topbar-meta  { font-size: 0.75rem; color: #71717a; }
.de-btn-ghost {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 6px;
  background: transparent; border: none; color: #71717a; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.de-btn-ghost:hover { background: #f4f4f5; color: #09090b; }
.de-btn-outline {
  padding: 0.3rem 0.8rem; font-size: 0.8rem;
  border: 1px solid #e4e4e7; border-radius: 6px;
  background: #ffffff; color: #71717a; cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.de-btn-outline:hover { border-color: #18181b; color: #09090b; background: #f4f4f5; }

/* ── Body ───────────────────────────────────────────────────────────────────── */
.de-body { display: flex; flex: 1; overflow: hidden; }

/* ── Sidebar label reused in right panel ───────────────────────────────────── */
.de-sidebar-title {
  font-size: 0.7rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em; color: #71717a;
}
.de-sidebar-count {
  font-size: 0.7rem; background: #e4e4e7; color: #71717a;
  border-radius: 10px; padding: 0.1rem 0.45rem;
}

/* ── Right column panel ─────────────────────────────────────────────────────── */
.de-col-panel {
  width: 220px; flex-shrink: 0;
  background: #fafafa; border-left: 1px solid #e4e4e7;
  overflow-y: auto; display: flex; flex-direction: column;
  position: relative; z-index: 5;
}
.de-col-panel-head {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.75rem 0.75rem 0.5rem; flex-shrink: 0;
}
.de-col-panel-head .de-sidebar-title { flex: 1; }
.de-col-panel-close {
  background: none; border: none; cursor: pointer;
  font-size: 1.1rem; color: #71717a; padding: 0 0.1rem; line-height: 1;
}
.de-col-panel-close:hover { color: #09090b; }
/* Slide-in/out transition */
.de-col-panel-enter-active, .de-col-panel-leave-active { transition: width 0.22s ease, opacity 0.22s ease; overflow: hidden; }
.de-col-panel-enter-from, .de-col-panel-leave-to { width: 0 !important; opacity: 0; }
.de-col-list { list-style: none; padding: 0 0 1rem; margin: 0; flex: 1; }
.de-col-item { display: flex; }
.de-col-btn {
  width: 100%; display: flex; align-items: center; gap: 0.45rem;
  padding: 0.3rem 0.875rem; background: none; border: none;
  cursor: pointer; transition: background 0.12s; text-align: left;
}
.de-col-btn:hover { background: #f0f0f1; }
.de-col-btn:hover .de-col-plus { opacity: 1; }
.de-col-name {
  flex: 1; font-size: 0.78rem; color: #3f3f46;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}
.de-col-plus { font-size: 1rem; color: #18181b; opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }
.de-col-badge {
  font-size: 0.6rem; padding: 0.1rem 0.3rem;
  border-radius: 4px; flex-shrink: 0; font-weight: 600;
}
.de-badge--categorical { background: #f4f4f5; color: #3f3f46; border: 1px solid #e4e4e7; }
.de-badge--numeric     { background: #f4f4f5; color: #3f3f46; border: 1px solid #e4e4e7; }
.de-badge--datetime    { background: #f4f4f5; color: #3f3f46; border: 1px solid #e4e4e7; }
.de-badge--geometry    { background: #f4f4f5; color: #3f3f46; border: 1px solid #e4e4e7; }

/* ── Main ───────────────────────────────────────────────────────────────────── */
.de-main { flex: 1; overflow: hidden; min-width: 0; display: flex; flex-direction: row; }
.de-main-inner { flex: 1; min-width: 0; overflow: hidden; display: flex; flex-direction: column; }

/* ── Data tab: map + table split ───────────────────────────────────────────── */
.de-data-wrap {
  flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;
}
.de-data-map {
  flex: 1; position: relative; overflow: hidden; min-height: 0;
}
/* Collapsible table panel */
.de-data-table {
  flex-shrink: 0;
  display: flex; flex-direction: column;
  border-top: 1px solid #e4e4e7;
  max-height: 40%; min-height: 0;
  transition: max-height 0.25s ease;
  overflow: hidden;
}
.de-data-table--collapsed {
  max-height: 2.25rem !important;
  overflow: hidden;
}
.de-data-table-header {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.45rem 0.875rem; flex-shrink: 0;
  background: #fafafa; border-bottom: 1px solid #e4e4e7;
  cursor: pointer; user-select: none; min-height: 2.25rem;
  font-size: 0.75rem; font-weight: 600; color: #3f3f46;
}
.de-data-table-header:hover { background: #f0f0f1; }
.de-table-badge {
  font-size: 0.68rem; color: #71717a; font-weight: 400; margin-left: auto;
}
.de-table-mini-spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 1.5px solid #e4e4e7; border-top-color: #18181b;
  animation: de-spin 0.8s linear infinite;
}
.de-data-table .de-table-scroll { flex: 1; overflow: auto; }

/* ── Chart grid ─────────────────────────────────────────────────────────────── */
.de-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 0.875rem;
  align-content: start;
}

/* ── Chart card ─────────────────────────────────────────────────────────────── */
.de-card {
  position: relative;
  background: #ffffff; border: 1px solid #e4e4e7;
  border-radius: 8px; padding: 0.75rem;
  display: flex; flex-direction: column; gap: 0.5rem; min-width: 0;
}

/* ── Card toolbar ───────────────────────────────────────────────────────────── */
.de-card-toolbar {
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
}
.de-type-pills { display: flex; gap: 3px; }
.de-type-pill {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  background: #f4f4f5; border: 1px solid transparent;
  color: #71717a; cursor: pointer; transition: all 0.15s;
  flex-shrink: 0;
}
.de-type-pill:hover:not(.de-type-pill--disabled) { background: #e4e4e7; color: #09090b; }
.de-type-pill--active { background: #18181b; border-color: #18181b; color: #fafafa; }
.de-type-pill--disabled { opacity: 0.3; cursor: not-allowed; }
.de-card-close {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 4px; flex-shrink: 0;
  background: none; border: none; color: #a1a1aa; cursor: pointer;
  font-size: 1rem; transition: color 0.15s, background 0.15s;
}
.de-card-close:hover { color: #dc2626; background: #fef2f2; }

/* ── Card selects ───────────────────────────────────────────────────────────── */
.de-card-selects { display: flex; flex-wrap: wrap; gap: 0.375rem; }

.de-select {
  flex: 1; min-width: 0; padding: 0.3rem 0.5rem;
  background: #ffffff; border: 1px solid #e4e4e7;
  border-radius: 6px; color: #09090b; font-size: 0.78rem;
  cursor: pointer; transition: border-color 0.15s;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2371717a' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 0.5rem center; padding-right: 1.5rem;
}
.de-select:focus { outline: none; border-color: #18181b; box-shadow: 0 0 0 2px rgba(24,24,27,0.08); }
.de-select--full { flex: none; width: 100%; }

/* ── Count display ──────────────────────────────────────────────────────────── */
.de-count-display {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.5rem; padding: 1rem 0.5rem;
}
.de-count-big   { font-size: 2.5rem; font-weight: 700; color: #09090b; line-height: 1; }
.de-count-sub   { font-size: 0.8rem; color: #71717a; }
.de-count-sub em { color: #3f3f46; font-style: normal; }
.de-count-pills { display: flex; flex-wrap: wrap; gap: 0.35rem 0.65rem; justify-content: center; }
.de-count-pills span {
  font-size: 0.7rem; color: #71717a;
  background: #f4f4f5; border: 1px solid #e4e4e7;
  border-radius: 4px; padding: 0.1rem 0.4rem;
}

/* ── Card placeholder ───────────────────────────────────────────────────────── */
.de-card-placeholder {
  height: 200px; display: flex; align-items: center; justify-content: center;
}
.de-card-spinner {
  width: 24px; height: 24px; border: 2px solid #e4e4e7; border-top-color: #18181b;
  border-radius: 50%; animation: de-spin 0.8s linear infinite;
}
.de-card-error { font-size: 0.75rem; color: #dc2626; text-align: center; padding: 0.5rem; }
.de-card-hint  { font-size: 0.8rem; color: #a1a1aa; }

/* ── Chart canvas ───────────────────────────────────────────────────────────── */
.de-chart-canvas { width: 100%; height: 220px; }

/* ── Add Chart card ─────────────────────────────────────────────────────────── */
.de-card--add {
  border-style: dashed;
  border-color: #e4e4e7;
  background: #fafafa;
  justify-content: flex-start;
}
.de-add-title {
  font-size: 0.7rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em; color: #a1a1aa;
  margin-bottom: 0.25rem;
}
.de-add-types {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.375rem;
}
.de-add-type {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.3rem; padding: 0.6rem 0.25rem;
  background: #ffffff; border: 1px solid #e4e4e7;
  border-radius: 8px; cursor: pointer; color: #71717a;
  transition: all 0.15s; font-size: 0.7rem;
}
.de-add-type:hover:not(.de-add-type--disabled) {
  background: #f4f4f5; border-color: #d4d4d8; color: #09090b;
}
.de-add-type--active {
  background: #18181b; border-color: #18181b; color: #fafafa;
}
.de-add-type--disabled { opacity: 0.3; cursor: not-allowed; }
.de-add-type-icon { display: flex; }
.de-add-type-label { font-size: 0.65rem; font-weight: 500; }
.de-add-selects { display: flex; flex-direction: column; gap: 0.375rem; margin-top: 0.375rem; }
.de-add-select-row { display: flex; flex-direction: column; gap: 0.2rem; }
.de-add-select-label { font-size: 0.65rem; color: #71717a; padding-left: 0.125rem; }
.de-add-btn {
  margin-top: auto;
  width: 100%; padding: 0.5rem;
  background: #18181b; border: 1px solid #18181b;
  border-radius: 8px; color: #fafafa; font-size: 0.8rem;
  font-weight: 600; cursor: pointer; transition: background 0.15s, opacity 0.15s;
}
.de-add-btn:hover:not(:disabled) { background: #3f3f46; border-color: #3f3f46; }
.de-add-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* ── Tabs ───────────────────────────────────────────────────────────────────── */
.de-tabs {
  display: flex; gap: 2px; padding: 0.5rem 0.75rem 0;
  border-bottom: 1px solid #e4e4e7; flex-shrink: 0;
}
.de-tab {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.35rem 0.8rem; font-size: 0.8rem; font-weight: 500;
  background: none; border: none; border-radius: 6px 6px 0 0;
  color: #71717a; cursor: pointer; transition: color 0.15s, background 0.15s;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.de-tab:hover { color: #09090b; background: #f4f4f5; }
.de-tab--active { color: #09090b; border-bottom-color: #18181b; }
.de-tab--right  { margin-left: auto; }

/* ── Charts area ────────────────────────────────────────────────────────────── */
.de-charts-area { flex: 1; overflow-y: auto; padding: 1rem; min-width: 0; background: #fafafa; }

/* ── Per-card palette anchor (bottom-right of card) ─────────────────────── */
.de-pal-anchor {
  position: absolute;
  bottom: 0.625rem;
  right: 0.625rem;
  z-index: 20;
}
.de-palette-dot {
  display: block;
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.18);
  cursor: pointer; padding: 0;
  transition: transform 0.15s, box-shadow 0.15s;
}
.de-palette-dot:hover { transform: scale(1.25); box-shadow: 0 0 0 2px rgba(0,0,0,0.22); }
.de-palette-dot--locked { box-shadow: 0 0 0 2px #ffffff, 0 0 0 3.5px rgba(0,0,0,0.40) !important; }
.de-pal-pop {
  position: absolute;
  bottom: calc(100% + 6px);
  right: 0;
  display: flex; gap: 5px; align-items: center;
  background: #ffffff; border: 1px solid #e4e4e7;
  border-radius: 8px; padding: 6px 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.10);
  white-space: nowrap;
}
.de-swatch {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer; padding: 0;
  transition: transform 0.15s;
  flex-shrink: 0;
}
.de-swatch:hover { transform: scale(1.25); }
.de-swatch--active {
  outline: 2px solid #09090b;
  outline-offset: 2px;
  transform: scale(1.15);
}

/* ── Attribute table ────────────────────────────────────────────────────────── */
.de-table-wrap {
  flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;
}
.de-table-loading {
  display: flex; align-items: center; justify-content: center;
  gap: 0.75rem; flex: 1; color: #71717a; font-size: 0.85rem;
}
.de-table-meta {
  padding: 0.4rem 0.75rem; font-size: 0.72rem; color: #71717a;
  flex-shrink: 0; display: flex; align-items: center; gap: 0.4rem;
  border-bottom: 1px solid #e4e4e7; background: #fafafa;
}
.de-table-meta-note { color: #a1a1aa; }
.de-table-scroll { flex: 1; overflow: auto; position: relative; }
.de-table {
  width: max-content; min-width: 100%; border-collapse: collapse;
  font-size: 0.78rem;
}
.de-th {
  position: sticky; top: 0; z-index: 2;
  padding: 0.45rem 0.75rem; background: #fafafa;
  border-bottom: 1px solid #e4e4e7; border-right: 1px solid #f0f0f1;
  white-space: nowrap; font-weight: 600; color: #3f3f46;
  text-align: left;
}
.de-th--num { color: #a1a1aa; width: 40px; min-width: 40px; text-align: right; }
.de-th--right { text-align: right; }
.de-th-name { display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; }
.de-th-badge {
  display: inline-block; font-size: 0.58rem; padding: 0.05rem 0.28rem;
  border-radius: 3px; margin-left: 0.3rem; font-weight: 600;
  vertical-align: middle; flex-shrink: 0;
  background: #f4f4f5; color: #71717a; border: 1px solid #e4e4e7;
}
.de-tr:nth-child(even) { background: #fafafa; }
.de-tr:nth-child(odd)  { background: #ffffff; }
.de-tr:hover { background: #f4f4f5; }
.de-td {
  padding: 0.32rem 0.75rem; border-bottom: 1px solid #f0f0f1;
  border-right: 1px solid #f4f4f5; white-space: nowrap;
  max-width: 300px; overflow: hidden; text-overflow: ellipsis;
  color: #09090b;
}
.de-td--num   { color: #a1a1aa; text-align: right; font-variant-numeric: tabular-nums; font-size: 0.7rem; }
.de-td--right { text-align: right; font-variant-numeric: tabular-nums; color: #3f3f46; }
.de-td--null  { color: #d4d4d8 !important; font-style: italic; }

/* ── Map tab ─────────────────────────────────────────────────────────────────── */
.de-map-wrap { flex: 1; position: relative; overflow: hidden; min-height: 0; }
.de-map-el   { position: absolute; inset: 0; }
.de-map-picker-overlay {
  position: absolute; inset: 0; z-index: 20;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
}
.de-map-picker-box {
  background: #ffffff; border-radius: 10px; padding: 1.5rem; width: 320px;
  display: flex; flex-direction: column; gap: 0.75rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.22);
}
.de-map-picker-title { font-size: 0.85rem; font-weight: 600; color: #09090b; }
.de-map-picker-hint  { font-size: 0.75rem; color: #71717a; margin: 0; }
.de-map-picker-section { display: flex; flex-direction: column; gap: 0.3rem; }
.de-map-picker-label { font-size: 0.72rem; font-weight: 500; color: #3f3f46; }
.de-map-picker-or { text-align: center; font-size: 0.72rem; color: #a1a1aa; }
.de-map-status {
  position: absolute; inset: 0; z-index: 10;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  font-size: 0.82rem; color: #fafafa;
  background: rgba(0,0,0,0.45); backdrop-filter: blur(2px);
}
.de-map-status--error { color: #fca5a5; }
.de-map-spinner {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.25); border-top-color: #ffffff;
  animation: de-spin 0.8s linear infinite;
}
.de-map-badge {
  position: absolute; bottom: 1rem; left: 1rem; z-index: 10;
  background: rgba(0,0,0,0.65); color: #fafafa;
  font-size: 0.7rem; padding: 0.25rem 0.6rem; border-radius: 6px;
  backdrop-filter: blur(4px); pointer-events: none;
  display: flex; align-items: center; gap: 0.4rem;
}
.de-map-badge-spinner {
  display: inline-block; width: 9px; height: 9px; border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.3); border-top-color: #fff;
  animation: de-spin 0.7s linear infinite; flex-shrink: 0;
}
/* Infinite scroll sentinel */
.de-tr--loadmore { background: transparent !important; }
.de-td--loadmore { padding: 0.5rem 1rem; text-align: center; }
.de-loadmore-hint { font-size: 0.75rem; color: #a1a1aa; }
.de-map-recol-btn {
  position: absolute; top: 0.75rem; right: 0.75rem; z-index: 10;
  display: flex; align-items: center; gap: 0.35rem;
  background: rgba(0,0,0,0.6); color: #fafafa;
  border: none; border-radius: 6px; padding: 0.35rem 0.7rem;
  font-size: 0.72rem; cursor: pointer; backdrop-filter: blur(4px);
}
.de-map-recol-btn:hover { background: rgba(0,0,0,0.8); }
:global(.maplibregl-ctrl-attrib) { display: none !important; }
</style>
