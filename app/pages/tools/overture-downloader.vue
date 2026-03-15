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

        <!-- Queue -->
        <section class="od-section">
          <div v-if="validationError" class="od-msg od-msg-warn">{{ validationError }}</div>

          <UButton
            variant="primary"
            :disabled="!!validationError"
            style="width: 100%"
            @click="addToQueue"
          >
            + Add to Queue
          </UButton>
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

    <!-- ── Filename prompt modal ─────────────────────────────────────── -->
    <teleport to="body">
      <transition name="od-fade">
        <div v-if="showFilenamePrompt" class="od-modal-overlay" @click.self="cancelFilenamePrompt">
          <div class="od-modal od-modal--sm">
            <div class="od-modal-header">
              <h2 class="od-modal-title">Name your ZIP file</h2>
              <button class="od-chevron-btn" @click="cancelFilenamePrompt" title="Cancel">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="od-modal-body">
              <input
                v-model="filenameInput"
                type="text"
                class="od-bug-input"
                placeholder="my-overture-data"
                @keyup.enter="confirmFilename"
                style="margin-top:0"
              />
            </div>
            <div class="od-modal-footer">
              <UButton variant="outline" size="sm" @click="cancelFilenamePrompt">Cancel</UButton>
              <UButton variant="primary" size="sm" :disabled="!filenameInput.trim()" @click="confirmFilename">Download</UButton>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- ── Filename prompt modal ──────────────────────────────────────── -->
    <teleport to="body">
      <transition name="od-fade">
        <div v-if="showFilenamePrompt" class="od-modal-overlay" @click.self="cancelFilenamePrompt">
          <div class="od-modal od-modal--sm">
            <div class="od-modal-header">
              <h2 class="od-modal-title">Name your ZIP file</h2>
              <button class="od-chevron-btn" @click="cancelFilenamePrompt" title="Cancel">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="od-modal-body">
              <input
                v-model="filenameInput"
                type="text"
                class="od-bug-input"
                placeholder="my-overture-data"
                @keyup.enter="confirmFilename"
                style="margin-top:0"
              />
            </div>
            <div class="od-modal-footer">
              <UButton variant="outline" size="sm" @click="cancelFilenamePrompt">Cancel</UButton>
              <UButton variant="primary" size="sm" :disabled="!filenameInput.trim()" @click="confirmFilename">Download</UButton>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

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
      <aside v-if="(mapLayers.length > 0 || queue.length > 0) && showLayers" class="od-layers-panel">
        <div class="od-layers-header">
          <span class="od-label">Layers</span>
          <button class="od-chevron-btn" @click="showLayers = false" title="Collapse layers">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div class="od-layer-list">

          <!-- Extracting queue entries -->
          <div
            v-for="entry in queue.filter(e => e.status === 'extracting' || e.status === 'error')"
            :key="entry.id"
            class="od-layer-row-wrap"
          >
            <div class="od-layer-row od-layer-row--pending"
              :class="{ 'od-layer-row--error': entry.status === 'error' }">
              <div class="od-layer-swatch od-layer-swatch--pending">
                <span v-if="entry.status === 'extracting'" class="od-spinner od-spinner--sm">&#9676;</span>
                <span v-else class="od-layer-swatch--error-icon">&#9888;</span>
              </div>
              <div class="od-layer-info">
                <span class="od-layer-name">{{ entry.label }}</span>
                <template v-if="entry.status === 'extracting'">
                  <div class="od-progress-bar-wrap">
                    <div
                      class="od-progress-bar-fill"
                      :style="{ width: Math.min(95, entry.elapsedMs / entry.estimatedMs * 100).toFixed(1) + '%' }"
                    />
                  </div>
                  <span class="od-layer-meta od-progress-meta">
                    {{ Math.round(entry.elapsedMs / 1000) }}s
                    &nbsp;&middot;&nbsp;
                    ~{{ Math.round(entry.estimatedMs / 1000) }}s est.
                  </span>
                </template>
                <span v-else class="od-layer-meta od-layer-meta--error">{{ entry.error }}</span>
              </div>
              <button
                class="od-layer-btn od-layer-btn--remove"
                @click="removeQueueEntry(entry.id)"
                title="Remove"
              >×</button>
            </div>
          </div>

          <!-- Done map layers -->
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
                class="od-layer-btn od-layer-btn--table"
                @click="openTableViewer(layer)"
                title="View table"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              </button>
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

        <!-- Extract All — shown when ≥1 queue entry is done -->
        <div v-if="queue.some(e => e.status === 'done')" class="od-layers-footer">
          <UButton
            variant="primary"
            style="width: 100%"
            :disabled="extractAllRunning"
            @click="extractAll"
          >
            <span v-if="extractAllRunning" class="od-spinner">&#9676;</span>
            {{ extractAllRunning ? 'Zipping…' : `↓ Extract All (${queue.filter(e => e.status === 'done').length} ready)` }}
          </UButton>
        </div>

      </aside>
    </transition>

    <!-- ── Table Viewer modal ────────────────────────────────────────────── -->
    <teleport to="body">
      <transition name="od-fade">
        <div v-if="tvLayer" class="od-tv-overlay">
          <div class="od-tv-modal">

            <!-- Loading -->
            <div v-if="tvLoading" class="od-tv-loading">
              <div class="od-tv-spinner"></div>
              <span>Loading data…</span>
            </div>

            <!-- Error -->
            <div v-else-if="tvError" class="od-tv-err">
              <span>{{ tvError }}</span>
              <button class="od-tv-btn-ghost" @click="closeTableViewer">Close</button>
            </div>

            <!-- Content -->
            <template v-else>

              <!-- Topbar -->
              <header class="od-tv-topbar">
                <div class="od-tv-topbar-left">
                  <button class="od-tv-btn-ghost" title="Close" @click="closeTableViewer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  <div class="od-tv-info">
                    <span class="od-tv-name">{{ tvLayer.label }}</span>
                    <span class="od-tv-meta">{{ tvTotalRows.toLocaleString() }} rows · {{ tvColumns.length }} columns</span>
                  </div>
                </div>
              </header>

              <!-- Body -->
              <div class="od-tv-body">
                <main class="od-tv-main">
                  <div class="od-tv-main-inner">

                    <!-- Tab bar -->
                    <div class="od-tv-tabs">
                      <button class="od-tv-tab" :class="{ 'od-tv-tab--active': tvActiveTab === 'data' }" @click="tvActiveTab = 'data'">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
                        Data
                      </button>
                      <button class="od-tv-tab" :class="{ 'od-tv-tab--active': tvActiveTab === 'charts' }" @click="tvActiveTab = 'charts'">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="9" width="3" height="6"/><rect x="6" y="5" width="3" height="10"/><rect x="11" y="2" width="3" height="13"/></svg>
                        Charts
                      </button>
                      <button class="od-tv-tab od-tv-tab--right" :class="{ 'od-tv-tab--active': tvColPanelOpen }" @click="tvColPanelOpen = !tvColPanelOpen" title="Toggle columns panel">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                        Columns
                      </button>
                    </div>

                    <!-- ── Data tab ─────────────────────────────────────────── -->
                    <div v-show="tvActiveTab === 'data'" class="od-tv-data-wrap">
                      <div class="od-tv-table-scroll" @scroll.passive="tvOnTableScroll">
                        <table class="od-tv-table">
                          <thead>
                            <tr>
                              <th class="od-tv-th od-tv-th--num">#</th>
                              <th
                                v-for="col in tvDisplayCols" :key="col.name"
                                class="od-tv-th"
                                :class="{ 'od-tv-th--right': col.kind === 'numeric' }"
                              >
                                <span class="od-tv-th-name" :title="col.name">{{ col.name }}</span>
                                <span class="od-tv-th-badge" :class="`od-tv-badge--${col.kind}`">{{ col.typeLabel }}</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="(row, i) in tvTableRows" :key="i" class="od-tv-tr">
                              <td class="od-tv-td od-tv-td--num">{{ i + 1 }}</td>
                              <td
                                v-for="col in tvDisplayCols" :key="col.name"
                                class="od-tv-td"
                                :class="{ 'od-tv-td--right': col.kind === 'numeric', 'od-tv-td--null': row[col.name] == null }"
                                :title="row[col.name] != null ? String(row[col.name]) : ''"
                              >{{ tvFmtCell(row[col.name], col.kind) }}</td>
                            </tr>
                            <tr v-if="tvTableOffset < tvTotalRows" class="od-tv-tr od-tv-tr--loadmore">
                              <td :colspan="tvDisplayCols.length + 1" class="od-tv-td od-tv-td--loadmore">
                                <span v-if="tvTableLoading" class="od-tv-mini-spinner"></span>
                                <span v-else class="od-tv-loadmore-hint">Scroll for more…</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <!-- ── Charts tab ───────────────────────────────────────── -->
                    <div v-if="tvActiveTab === 'charts'" class="od-tv-charts-area">
                      <div class="od-tv-grid">

                        <!-- Existing chart cards -->
                        <div v-for="chart in tvCharts" :key="chart.id" class="od-tv-card">
                          <!-- Toolbar row 1 -->
                          <div class="od-tv-card-toolbar">
                            <div class="od-tv-type-pills">
                              <button
                                v-for="t in TV_CHART_TYPES" :key="t.id"
                                class="od-tv-type-pill"
                                :class="{
                                  'od-tv-type-pill--active': chart.type === t.id,
                                  'od-tv-type-pill--disabled': tvColsForType(t.id).length === 0
                                }"
                                :disabled="tvColsForType(t.id).length === 0"
                                :title="t.label"
                                @click="tvChangeType(chart, t.id)"
                                v-html="t.icon"
                              ></button>
                            </div>
                            <button class="od-tv-card-close" @click="tvRemoveChart(chart.id)" title="Remove">×</button>
                          </div>

                          <!-- Toolbar row 2: column selectors -->
                          <div class="od-tv-card-selects">
                            <select class="od-tv-select" v-model="chart.col" @change="tvReloadChart(chart)">
                              <option value="">— column —</option>
                              <option v-for="c in tvColsForType(chart.type)" :key="c.name" :value="c.name">{{ c.name }}</option>
                            </select>
                            <template v-if="tvNeedsY(chart.type)">
                              <select class="od-tv-select" v-model="chart.col2" @change="tvReloadChart(chart)">
                                <option value="">{{ chart.type === 'line' ? '— Y (optional, avg) —' : '— Y axis —' }}</option>
                                <option v-for="c in tvNumericCols" :key="c.name" :value="c.name">{{ c.name }}</option>
                              </select>
                            </template>
                            <template v-if="chart.type === 'bubble'">
                              <select class="od-tv-select" v-model="chart.col3" @change="tvReloadChart(chart)">
                                <option value="">— size —</option>
                                <option v-for="c in tvNumericCols" :key="c.name" :value="c.name">{{ c.name }}</option>
                              </select>
                            </template>
                          </div>

                          <!-- Count display -->
                          <div v-if="chart.type === 'count' && chart.col" class="od-tv-count-display">
                            <div class="od-tv-count-big">{{ tvGetColStats(chart.col)?.nonNull.toLocaleString() ?? '—' }}</div>
                            <div class="od-tv-count-sub">non-null in <em>{{ chart.col }}</em></div>
                            <div class="od-tv-count-pills">
                              <span>{{ tvTotalRows.toLocaleString() }} total</span>
                              <span>{{ tvGetColStats(chart.col)?.nullPct.toFixed(1) }}% null</span>
                              <span>{{ tvGetColStats(chart.col)?.approxUnique.toLocaleString() }} unique</span>
                            </div>
                            <div v-if="tvGetColKind(chart.col) === 'numeric' && tvGetColStats(chart.col)" class="od-tv-count-pills">
                              <span>min {{ tvFmtNum(tvGetColStats(chart.col)?.min) }}</span>
                              <span>max {{ tvFmtNum(tvGetColStats(chart.col)?.max) }}</span>
                              <span v-if="tvGetColStats(chart.col)?.mean != null">avg {{ tvFmtNum(tvGetColStats(chart.col)?.mean) }}</span>
                            </div>
                          </div>
                          <div v-else-if="chart.type === 'count' && !chart.col" class="od-tv-card-placeholder">
                            <span class="od-tv-card-hint">Select a column above</span>
                          </div>

                          <!-- Chart canvas or states -->
                          <template v-else>
                            <div v-if="chart.loading" class="od-tv-card-placeholder">
                              <div class="od-tv-card-spinner"></div>
                            </div>
                            <div v-else-if="chart.error" class="od-tv-card-placeholder">
                              <span class="od-tv-card-error">{{ chart.error }}</span>
                            </div>
                            <div
                              v-else-if="chart.data"
                              :ref="(el) => tvSetChartEl(chart.id, el as HTMLElement | null)"
                              class="od-tv-chart-canvas"
                            ></div>
                            <div v-else class="od-tv-card-placeholder">
                              <span class="od-tv-card-hint">{{ chart.col ? 'Select Y axis to continue' : 'Select a column above' }}</span>
                            </div>
                          </template>

                          <!-- Palette picker -->
                          <div class="od-tv-pal-anchor" @mouseleave="tvOpenPaletteId = null">
                            <div v-if="tvOpenPaletteId === chart.id || tvLockedPaletteId === chart.id" class="od-tv-pal-pop" @mouseenter="tvOpenPaletteId = chart.id">
                              <button
                                v-for="p in TV_PALETTES" :key="p.id"
                                class="od-tv-swatch"
                                :class="{ 'od-tv-swatch--active': chart.palette === p.id }"
                                :title="p.label"
                                :style="{ background: p.swatch }"
                                @click.stop="tvSetChartPalette(chart, p.id)"
                              ></button>
                            </div>
                            <button
                              class="od-tv-palette-dot"
                              :class="{ 'od-tv-palette-dot--locked': tvLockedPaletteId === chart.id }"
                              :style="{ background: TV_PALETTES.find(p => p.id === chart.palette)?.swatch ?? '#3f3f46' }"
                              title="Click to pin colour picker"
                              @mouseenter="tvOpenPaletteId = chart.id"
                              @click.stop="tvTogglePaletteLock(chart.id)"
                            ></button>
                          </div>
                        </div>

                        <!-- Add Chart card -->
                        <div class="od-tv-card od-tv-card--add">
                          <div class="od-tv-add-title">Add Chart</div>
                          <div class="od-tv-add-types">
                            <button
                              v-for="t in TV_CHART_TYPES" :key="t.id"
                              class="od-tv-add-type"
                              :class="{
                                'od-tv-add-type--active': tvDraftType === t.id,
                                'od-tv-add-type--disabled': tvColsForType(t.id).length === 0
                              }"
                              :disabled="tvColsForType(t.id).length === 0"
                              @click="tvSelectDraftType(t.id)"
                            >
                              <span class="od-tv-add-type-icon" v-html="t.icon"></span>
                              <span class="od-tv-add-type-label">{{ t.label }}</span>
                            </button>
                          </div>
                          <div v-if="tvDraftType" class="od-tv-add-selects">
                            <div class="od-tv-add-select-row">
                              <label class="od-tv-add-select-label">{{ tvDraftXLabel }}</label>
                              <select class="od-tv-select od-tv-select--full" v-model="tvDraftCol">
                                <option value="">— select —</option>
                                <option v-for="c in tvColsForType(tvDraftType)" :key="c.name" :value="c.name">{{ c.name }}</option>
                              </select>
                            </div>
                            <div v-if="tvNeedsY(tvDraftType)" class="od-tv-add-select-row">
                              <label class="od-tv-add-select-label">{{ tvDraftType === 'line' ? 'Y (optional, avg)' : 'Y axis' }}</label>
                              <select class="od-tv-select od-tv-select--full" v-model="tvDraftCol2">
                                <option value="">{{ tvDraftType === 'line' ? '— count (default) —' : '— select —' }}</option>
                                <option v-for="c in tvNumericCols" :key="c.name" :value="c.name">{{ c.name }}</option>
                              </select>
                            </div>
                            <div v-if="tvDraftType === 'bubble'" class="od-tv-add-select-row">
                              <label class="od-tv-add-select-label">Size</label>
                              <select class="od-tv-select od-tv-select--full" v-model="tvDraftCol3">
                                <option value="">— select —</option>
                                <option v-for="c in tvNumericCols" :key="c.name" :value="c.name">{{ c.name }}</option>
                              </select>
                            </div>
                          </div>
                          <button class="od-tv-add-btn" :disabled="!tvCanAddChart" @click="tvCommitAddChart">+ Add</button>
                        </div>

                      </div>
                    </div><!-- /charts -->

                  </div><!-- /od-tv-main-inner -->

                  <!-- Right column panel -->
                  <Transition name="od-tv-col-panel">
                    <aside v-if="tvColPanelOpen" class="od-tv-col-panel">
                      <div class="od-tv-col-panel-head">
                        <span class="od-tv-sidebar-title">Columns</span>
                        <span class="od-tv-sidebar-count">{{ tvColumns.length }}</span>
                        <button class="od-tv-col-panel-close" @click="tvColPanelOpen = false" title="Close">×</button>
                      </div>
                      <ul class="od-tv-col-list">
                        <li v-for="col in tvColumns" :key="col.name" class="od-tv-col-item">
                          <button class="od-tv-col-btn" @click="tvQuickAddChart(col)" :title="`Add chart for ${col.name}`">
                            <span class="od-tv-col-badge" :class="`od-tv-badge--${col.kind}`">{{ col.typeLabel }}</span>
                            <span class="od-tv-col-name">{{ col.name }}</span>
                            <span class="od-tv-col-plus">+</span>
                          </button>
                        </li>
                      </ul>
                    </aside>
                  </Transition>

                </main>
              </div><!-- /od-tv-body -->

            </template>
          </div><!-- /od-tv-modal -->
        </div>
      </transition>
    </teleport>

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

const getDuckDB = async () => {
  if (_db) return _db

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

  URL.revokeObjectURL(workerUrl)
  return _db
}

// Open a fresh connection with httpfs + spatial pre-loaded.
// Each extraction gets its own connection so concurrent queries don't collide.
const openConn = async () => {
  const db   = await getDuckDB()
  const conn = await db.connect()
  await conn.query(`LOAD httpfs; SET s3_region='us-west-2';`)
  try { await conn.query(`LOAD spatial;`) } catch { /* unavailable in some envs */ }
  return conn
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

interface QueueEntry {
  id: string
  label: string
  theme: string
  category: string | null
  bbox: { min_lon: number; min_lat: number; max_lon: number; max_lat: number }
  release: string
  status: 'extracting' | 'done' | 'error'
  rows: number
  error: string
  buffer: Uint8Array | null
  fileName: string
  startedAt: number        // Date.now() when queued
  estimatedMs: number      // rough estimate in ms
  elapsedMs: number        // updated by global tick
}

let   layerCounter = 0
let   popup: any = null
const mapLayers         = ref<MapLayer[]>([])
const showPanel         = ref(true)
const showLayers        = ref(true)
const colorPickerOpenId = ref<string | null>(null)

// ── Queue state ──────────────────────────────────────────────────────────────

// Empirical feature density per km² (conservative estimates)
const THEME_DENSITY: Record<string, number> = {
  places:         0.08,
  buildings:      6,
  transportation: 10,
  addresses:      8,
}
const DUCKDB_RPS: Record<string, number> = {
  places:         800,  // small point rows, minimal geometry
  buildings:      120,  // polygon WKB geometry — large rows
  transportation: 80,   // complex linestring geometry — largest rows
  addresses:      300,  // wide rows but point geometry
}
const MIN_EST_MS = 8_000 // minimum estimate — httpfs init alone takes ~8s

function bboxAreaKm2(b: { min_lon: number; min_lat: number; max_lon: number; max_lat: number }) {
  const R   = 6371
  const lat = (b.min_lat + b.max_lat) / 2 * Math.PI / 180
  const dLon = Math.abs(b.max_lon - b.min_lon) * Math.PI / 180
  const dLat = Math.abs(b.max_lat - b.min_lat) * Math.PI / 180
  return R * R * dLat * Math.cos(lat) * dLon
}

function estimateMs(theme: string, bboxKm2: number): number {
  const density = THEME_DENSITY[theme] ?? 1
  const rps     = DUCKDB_RPS[theme] ?? 200
  return Math.max(MIN_EST_MS, (bboxKm2 * density / rps) * 1000)
}

let _tickInterval: ReturnType<typeof setInterval> | null = null

function startTickIfNeeded() {
  if (_tickInterval) return
  _tickInterval = setInterval(() => {
    const now = Date.now()
    let anyExtracting = false
    for (const e of queue.value) {
      if (e.status === 'extracting') {
        e.elapsedMs = now - e.startedAt
        // If we've blown past the estimate, extend it so the bar keeps moving
        if (e.elapsedMs >= e.estimatedMs * 0.92) {
          e.estimatedMs = e.elapsedMs * 1.5
        }
        anyExtracting = true
      }
    }
    if (!anyExtracting) {
      clearInterval(_tickInterval!)
      _tickInterval = null
    }
  }, 500)
}

const queue              = ref<QueueEntry[]>([])
const extractAllRunning  = ref(false)
const showFilenamePrompt = ref(false)
const filenameInput      = ref('')
const filenamePromptCb   = ref<((name: string) => void) | null>(null)

function promptFilename(defaultName: string): Promise<string | null> {
  return new Promise(resolve => {
    filenameInput.value = defaultName
    filenamePromptCb.value = resolve
    showFilenamePrompt.value = true
  })
}
function confirmFilename() {
  const name = filenameInput.value.trim()
  if (!name) return
  showFilenamePrompt.value = false
  filenamePromptCb.value?.(name)
  filenamePromptCb.value = null
}
function cancelFilenamePrompt() {
  showFilenamePrompt.value = false
  filenamePromptCb.value?.(null as any)
  filenamePromptCb.value = null
}

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

  // Polygon / Line — requires spatial extension for WKB → GeoJSON
  try {
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
  // Also drop the queue entry so Extract All count stays accurate
  const qi = queue.value.findIndex(e => e.id === id)
  if (qi !== -1) queue.value.splice(qi, 1)
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

// ── Queue / Extract ─────────────────────────────────────────────────────────
const THEME_S3: Record<string, string> = {
  places:         'theme=places/type=place',
  buildings:      'theme=buildings/type=building',
  transportation: 'theme=transportation/type=segment',
  addresses:      'theme=addresses/type=address',
  base:           'theme=base/type=land',
}

function removeQueueEntry(id: string) {
  const idx = queue.value.findIndex(e => e.id === id)
  if (idx === -1) return
  const entry = queue.value[idx]
  // Also remove the corresponding map layer if it was added
  const ml = mapLayers.value.find(l => l.id === entry.id)
  if (ml) removeMapLayer(ml.id)
  queue.value.splice(idx, 1)
}

function clearDoneQueue() {
  queue.value
    .filter(e => e.status === 'done')
    .forEach(e => {
      const ml = mapLayers.value.find(l => l.id === e.id)
      if (ml) removeMapLayer(ml.id)
    })
  queue.value = queue.value.filter(e => e.status !== 'done')
}

async function addToQueue() {
  if (validationError.value) return

  const theme = selectedTheme.value
  const cat   = theme === 'places' ? selectedCategory.value : null
  const pathSnap = [...selectedPath.value]  // snapshot before any reactive changes
  const rel   = release.value
  const bboxSnap = { ...bbox.value }
  const themeLabel = THEMES.find(t => t.id === theme)?.label ?? theme
  const label = cat ? `${themeLabel} — ${cat.replace(/_/g, ' ')}` : themeLabel
  const slug  = cat ? `${theme}_${cat}` : theme
  const fileName = `${slug}_${Date.now()}.parquet`
  const entryId  = `od-data-${layerCounter++}`

  const entry: QueueEntry = {
    id: entryId, label, theme, category: cat,
    bbox: bboxSnap, release: rel,
    status: 'extracting', rows: 0, error: '', buffer: null, fileName,
    startedAt: Date.now(),
    estimatedMs: estimateMs(theme, bboxAreaKm2(bboxSnap)),
    elapsedMs: 0,
  }
  queue.value.push(entry)
  showLayers.value = true
  startTickIfNeeded()

  // Fire-and-forget background extraction
  void (async () => {
    let conn: any = null
    try {
      conn = await openConn()
      const { min_lon, min_lat, max_lon, max_lat } = bboxSnap
      const s3   = `s3://overturemaps-us-west-2/release/${rel}/${THEME_S3[theme]}/**/*.parquet`
      const bboxWhere = `bbox.xmin < ${max_lon} AND bbox.xmax > ${min_lon} AND bbox.ymin < ${max_lat} AND bbox.ymax > ${min_lat}`

      let catWhere = ''
      if (theme === 'places' && pathSnap.length > 0) {
        const ids    = getAllDescendantIds(pathSnap)
        const inList = ids.map(id => `'${id}'`).join(', ')
        catWhere     = `categories.primary IN (${inList}) AND `
      }

      const isPoint   = theme === 'places' || theme === 'addresses'
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
        ) TO '${fileName}' (FORMAT PARQUET)
      `
      await conn.query(sql)

      const buffer = await _db.copyFileToBuffer(fileName)
      const rows   = Number(
        (await conn.query(`SELECT COUNT(*) AS cnt FROM read_parquet('${fileName}')`))
          .getChildAt(0).get(0)
      )

      const e = queue.value.find(e => e.id === entryId)
      if (e) {
        if (rows === 0) {
          e.error = 'No features found in this bbox'
          e.status = 'error'
          return
        }
        e.buffer = buffer; e.rows = rows; e.status = 'done'
      }

      // Always register in MapLayer list with actual row count so it's visible
      const layerColor = theme === 'places'
        ? LAYER_PALETTE[(layerCounter - 1) % LAYER_PALETTE.length]
        : getThemeColor(theme)
      const ml: MapLayer = {
        id: entryId, label, theme, category: cat,
        color: layerColor, rows, visible: true, mapLayerIds: [],
      }
      mapLayers.value.push(ml)
      showLayers.value = true

      // Separately try to build the map preview (non-fatal if spatial extension unavailable)
      try {
        const { geojson, displayRows } = await buildGeoJSONForMap(fileName, theme, cat, conn, layerColor)
        if (geojson && displayRows > 0) {
          ml.mapLayerIds = addLayerToMap(ml, geojson)
        }
      } catch { /* map preview is non-fatal */ }
    } catch (err: any) {
      const e = queue.value.find(e => e.id === entryId)
      if (e) { e.error = err?.message ?? 'Unknown error'; e.status = 'error' }
    } finally {
      try { await conn?.close() } catch { /* ignore */ }
    }
  })()
}

async function extractAll() {
  const ready = queue.value.filter(e => e.status === 'done' && e.buffer)
  if (!ready.length) return

  const defaultName = `overture_${Date.now()}`
  const name = await promptFilename(defaultName)
  if (!name) return

  extractAllRunning.value = true
  try {
    const JSZip = (await import('jszip')).default
    const zip   = new JSZip()
    for (const e of ready) zip.file(e.fileName, e.buffer!)
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = name.endsWith('.zip') ? name : `${name}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } finally {
    extractAllRunning.value = false
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

// ── Table Viewer (inline data explorer) ─────────────────────────────────────

type TvColKind   = 'categorical' | 'numeric' | 'datetime' | 'geometry'
type TvChartType = 'bar' | 'histogram' | 'line' | 'scatter' | 'bubble' | 'count'

interface TvColumn {
  name: string; type: string; typeLabel: string; kind: TvColKind
  stats: { nonNull: number; nullPct: number; approxUnique: number; min: any; max: any; mean: number | null } | null
}

interface TvChart {
  id: string; type: TvChartType; palette: string
  col: string; col2: string; col3: string
  data: any; loading: boolean; error: string
}

const TV_CHART_TYPES: ReadonlyArray<{ id: TvChartType; label: string; icon: string }> = [
  { id: 'bar',       label: 'Bar',       icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="9" width="3" height="6"/><rect x="6" y="5" width="3" height="10"/><rect x="11" y="2" width="3" height="13"/></svg>` },
  { id: 'histogram', label: 'Histogram', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="7" width="2.5" height="8"/><rect x="3.5" y="4" width="2.5" height="11"/><rect x="6" y="2" width="2.5" height="13"/><rect x="8.5" y="5" width="2.5" height="10"/><rect x="11" y="8" width="2.5" height="7"/><rect x="13.5" y="10" width="1.5" height="5"/></svg>` },
  { id: 'line',      label: 'Line',      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,12 4,7 7,10 10,4 13,8 15,5"/></svg>` },
  { id: 'scatter',   label: 'Scatter',   icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="12" r="1.5"/><circle cx="7" cy="5" r="1.5"/><circle cx="11" cy="9" r="1.5"/><circle cx="5" cy="7" r="1.5"/><circle cx="13" cy="3" r="1.5"/><circle cx="9" cy="13" r="1.5"/></svg>` },
  { id: 'bubble',    label: 'Bubble',    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" opacity="0.85"><circle cx="4" cy="11" r="2.5"/><circle cx="11" cy="8" r="4"/><circle cx="7" cy="4" r="1.5"/></svg>` },
  { id: 'count',     label: 'Count',     icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="6" y1="2" x2="4" y2="14"/><line x1="12" y1="2" x2="10" y2="14"/><line x1="3" y1="6" x2="13" y2="6"/><line x1="2" y1="10" x2="12" y2="10"/></svg>` },
]

interface TvPalette { id: string; label: string; swatch: string; primary: string; secondary: string; area: string; secondary2: string }
const TV_PALETTES: ReadonlyArray<TvPalette> = [
  { id: 'zinc',   label: 'Zinc',   swatch: '#3f3f46', primary: '#18181b', secondary: '#3f3f46', area: 'rgba(24,24,27,0.07)',   secondary2: '#71717a' },
  { id: 'blue',   label: 'Blue',   swatch: '#2563eb', primary: '#1d4ed8', secondary: '#2563eb', area: 'rgba(37,99,235,0.08)',  secondary2: '#3b82f6' },
  { id: 'teal',   label: 'Teal',   swatch: '#0d9488', primary: '#0f766e', secondary: '#0d9488', area: 'rgba(13,148,136,0.08)', secondary2: '#14b8a6' },
  { id: 'violet', label: 'Violet', swatch: '#7c3aed', primary: '#6d28d9', secondary: '#7c3aed', area: 'rgba(124,58,237,0.08)', secondary2: '#8b5cf6' },
  { id: 'rose',   label: 'Rose',   swatch: '#be123c', primary: '#be123c', secondary: '#e11d48', area: 'rgba(190,18,60,0.07)',  secondary2: '#f43f5e' },
  { id: 'amber',  label: 'Amber',  swatch: '#b45309', primary: '#b45309', secondary: '#d97706', area: 'rgba(180,83,9,0.07)',   secondary2: '#f59e0b' },
]

const TV_PAGE      = 200

// Lazy ECharts loader (CDN)
let _tvEchartsPromise: Promise<any> | null = null
function getECharts(): Promise<any> {
  if (_tvEchartsPromise) return _tvEchartsPromise
  _tvEchartsPromise = new Promise(resolve => {
    if ((window as any).echarts) { resolve((window as any).echarts); return }
    const s = document.createElement('script')
    s.src   = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js'
    s.onload  = () => resolve((window as any).echarts)
    s.onerror = () => resolve(null)
    document.head.appendChild(s)
  })
  return _tvEchartsPromise
}

// State
const tvLayer        = ref<MapLayer | null>(null)
const tvLoading      = ref(false)
const tvError        = ref('')
const tvColumns      = ref<TvColumn[]>([])
const tvTotalRows    = ref(0)
const tvTableRows    = ref<Record<string, any>[]>([])
const tvTableLoading = ref(false)
const tvTableOffset  = ref(0)
const tvActiveTab    = ref<'data' | 'charts'>('data')
const tvColPanelOpen = ref(false)
const tvCharts       = ref<TvChart[]>([])
const tvDraftType    = ref<TvChartType | null>(null)
const tvDraftCol     = ref('')
const tvDraftCol2    = ref('')
const tvDraftCol3    = ref('')
const tvOpenPaletteId   = ref<string | null>(null)
const tvLockedPaletteId = ref<string | null>(null)

let tvConn: any = null
let tvSrc = ''
let tvRegisteredFileName: string | null = null
const tvChartEls       = new Map<string, HTMLElement>()
const tvChartInstances = new Map<string, any>()
let   tvChartIdSeq     = 0

function tvMakeVfsFileName(layerId: string): string {
  const safeLayerId = layerId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `tv_data_${safeLayerId}_${Date.now()}.parquet`
}

// Computed
const tvDisplayCols = computed(() => tvColumns.value.filter(c => c.kind !== 'geometry'))
const tvNumericCols = computed(() => tvColumns.value.filter(c => c.kind === 'numeric'))

const tvCanAddChart = computed(() => {
  if (!tvDraftType.value || !tvDraftCol.value) return false
  if (tvDraftType.value === 'scatter' && !tvDraftCol2.value) return false
  if (tvDraftType.value === 'bubble' && (!tvDraftCol2.value || !tvDraftCol3.value)) return false
  return true
})

const tvDraftXLabel = computed(() => {
  if (!tvDraftType.value) return 'Column'
  return ['scatter', 'bubble', 'line'].includes(tvDraftType.value) ? 'X axis' : 'Column'
})

// Helpers
const TV_GEO_NAMES   = new Set(['geometry', 'geom', 'wkb_geometry', 'wkt', 'the_geom', 'shape', 'geo'])
const TV_RX_NUMERIC  = /^(TINY|SMALL|UBIG|UHUGE|UINT|USMALL|UTINY|BIG|HUGE)?INT(EGER)?$|^(FLOAT|DOUBLE|REAL|DECIMAL|NUMERIC)/i
const TV_RX_DATETIME = /^(DATE|TIMESTAMP|TIME|INTERVAL)/i
const TV_RX_GEOMETRY = /^(BLOB|GEOMETRY|WKB_BLOB)/i

function tvClassifyType(name: string, type: string): TvColKind {
  if (TV_GEO_NAMES.has(name.toLowerCase()) || TV_RX_GEOMETRY.test(type)) return 'geometry'
  if (TV_RX_NUMERIC.test(type))  return 'numeric'
  if (TV_RX_DATETIME.test(type)) return 'datetime'
  return 'categorical'
}

function tvGetTypeLabel(type: string): string {
  if (TV_RX_GEOMETRY.test(type))                             return 'Geom'
  if (type.startsWith('VARCHAR') || type === 'TEXT')         return 'Text'
  if (type === 'BOOLEAN')                                    return 'Bool'
  if (type === 'INTEGER' || type === 'INT')                  return 'Int'
  if (type === 'BIGINT')                                     return 'BigInt'
  if (type === 'DOUBLE' || type === 'FLOAT' || type === 'REAL') return 'Float'
  if (type.startsWith('DECIMAL'))                            return 'Dec'
  if (type.startsWith('TIMESTAMP'))                          return 'Time'
  if (type === 'DATE')                                       return 'Date'
  return type.includes('(') ? type.substring(0, type.indexOf('(')) : type
}

function tvFmtNum(v: any): string {
  if (v == null) return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  if (Number.isInteger(n)) return n.toLocaleString()
  return parseFloat(n.toFixed(4)).toString()
}

function tvFmtCell(v: any, kind: TvColKind): string {
  if (v == null) return 'null'
  const s = String(v)
  if (kind === 'numeric') return tvFmtNum(v)
  return s.length > 80 ? s.slice(0, 78) + '…' : s
}

function tvColsForType(type: TvChartType | null): TvColumn[] {
  if (!type) return []
  switch (type) {
    case 'bar':       return tvColumns.value.filter(c => c.kind !== 'geometry')
    case 'histogram': return tvColumns.value.filter(c => c.kind === 'numeric')
    case 'line':      return tvColumns.value.filter(c => c.kind !== 'geometry')
    case 'scatter':   return tvColumns.value.filter(c => c.kind === 'numeric')
    case 'bubble':    return tvColumns.value.filter(c => c.kind === 'numeric')
    case 'count':     return tvColumns.value.filter(c => c.kind !== 'geometry')
    default:          return []
  }
}

function tvNeedsY(type: TvChartType | null): boolean {
  return type === 'scatter' || type === 'bubble' || type === 'line'
}

function tvGetColStats(colName: string) { return tvColumns.value.find(c => c.name === colName)?.stats ?? null }
function tvGetColKind(colName: string)  { return tvColumns.value.find(c => c.name === colName)?.kind ?? null }

function tvGetChartPalette(chart: TvChart): TvPalette {
  return TV_PALETTES.find(p => p.id === chart.palette) ?? TV_PALETTES[0]!
}

// Open / close
async function openTableViewer(layer: MapLayer) {
  const entry = queue.value.find(e => e.id === layer.id)
  if (!entry?.buffer) return

  tvLayer.value        = layer
  tvLoading.value      = true
  tvError.value        = ''
  tvColumns.value      = []
  tvTableRows.value    = []
  tvTotalRows.value    = 0
  tvTableOffset.value  = 0
  tvActiveTab.value    = 'data'
  tvColPanelOpen.value = false
  tvCharts.value       = []
  tvDraftType.value    = null
  tvDraftCol.value     = ''
  tvDraftCol2.value    = ''
  tvDraftCol3.value    = ''
  tvOpenPaletteId.value   = null
  tvLockedPaletteId.value = null

  for (const inst of tvChartInstances.values()) inst.dispose()
  tvChartInstances.clear(); tvChartEls.clear(); tvChartIdSeq = 0

  try { await tvConn?.close() } catch {}
  tvConn = null

  try {
    await getDuckDB()
    // Drop previous table-view file if present.
    if (tvRegisteredFileName) {
      try { await _db.dropFile(tvRegisteredFileName) } catch {}
      tvRegisteredFileName = null
    }
    // Clean up any legacy fixed-name file from older builds.
    try { await _db.dropFile('tv_data.parquet') } catch {}
    try { await _db.dropFile('tv_data.json') } catch {}

    // Create a fresh copy for DuckDB registration.
    const rawUint8 = entry.buffer.slice()
    const tvFileName = tvMakeVfsFileName(layer.id)

    // Register file **before** creating connection so connection sees fresh state.
    await _db.registerFileBuffer(tvFileName, rawUint8.slice())
    tvRegisteredFileName = tvFileName
    tvSrc = `read_parquet('${tvFileName}')`

    // Now create connection with file already registered.
    tvConn = await _db.connect()
    try { await tvConn.query(`LOAD spatial;`) } catch {}

    const cntRes = await tvConn.query(`SELECT COUNT(*) AS n FROM ${tvSrc}`)
    tvTotalRows.value = Number(cntRes.toArray()[0].n)

    const sumRes  = await tvConn.query(`SUMMARIZE SELECT * FROM ${tvSrc}`)
    tvColumns.value = sumRes.toArray().map((row: any): TvColumn => {
      const name = String(row.column_name ?? '')
      const type = String(row.column_type ?? '')
      return {
        name, type,
        typeLabel: tvGetTypeLabel(type),
        kind:      tvClassifyType(name, type),
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

    tvLoading.value = false
    await tvLoadTableData()
    await tvAutoAddInitialCharts()
  } catch (err: any) {
    tvError.value   = `Failed to load data: ${err?.message ?? String(err)}`
    tvLoading.value = false
  }
}

async function closeTableViewer() {
  tvLayer.value = null
  for (const inst of tvChartInstances.values()) inst.dispose()
  tvChartInstances.clear(); tvChartEls.clear()
  try { await tvConn?.close() } catch {}
  tvConn = null
  if (tvRegisteredFileName) {
    try { await _db.dropFile(tvRegisteredFileName) } catch {}
    tvRegisteredFileName = null
  }
}

// Table data
async function tvLoadTableData() {
  tvTableLoading.value = true
  tvTableRows.value    = []
  tvTableOffset.value  = 0
  try {
    const cols = tvDisplayCols.value.map(c => `"${c.name}"`).join(', ')
    const res  = await tvConn.query(`SELECT ${cols} FROM ${tvSrc} LIMIT ${TV_PAGE} OFFSET 0`)
    tvTableRows.value = res.toArray().map((row: any) => {
      const out: Record<string, any> = {}
      for (const col of tvDisplayCols.value) {
        const v = row[col.name]
        out[col.name] = (v != null && typeof v === 'object' && typeof v.toString === 'function') ? v.toString() : v
      }
      return out
    })
    tvTableOffset.value = tvTableRows.value.length
  } catch {}
  tvTableLoading.value = false
}

async function tvLoadMoreRows() {
  if (tvTableLoading.value || tvTableOffset.value >= tvTotalRows.value) return
  tvTableLoading.value = true
  try {
    const cols = tvDisplayCols.value.map(c => `"${c.name}"`).join(', ')
    const res  = await tvConn.query(`SELECT ${cols} FROM ${tvSrc} LIMIT ${TV_PAGE} OFFSET ${tvTableOffset.value}`)
    const newRows = res.toArray().map((row: any) => {
      const out: Record<string, any> = {}
      for (const col of tvDisplayCols.value) {
        const v = row[col.name]
        out[col.name] = (v != null && typeof v === 'object' && typeof v.toString === 'function') ? v.toString() : v
      }
      return out
    })
    tvTableRows.value  = [...tvTableRows.value, ...newRows]
    tvTableOffset.value += newRows.length
  } catch {}
  tvTableLoading.value = false
}

function tvOnTableScroll(e: Event) {
  if (tvTableLoading.value || tvTableOffset.value >= tvTotalRows.value) return
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) tvLoadMoreRows()
}

// Chart rendering
function tvSetChartEl(id: string, el: HTMLElement | null) {
  if (el) {
    tvChartEls.set(id, el)
    const chart = tvCharts.value.find(c => c.id === id)
    if (chart?.data) tvRenderChart(id)
  } else {
    tvChartInstances.get(id)?.dispose()
    tvChartInstances.delete(id)
    tvChartEls.delete(id)
  }
}

async function tvRenderChart(id: string) {
  const el    = tvChartEls.get(id)
  const chart = tvCharts.value.find(c => c.id === id)
  if (!el || !chart?.data) return
  const ec = await getECharts()
  if (!ec) return
  let inst = tvChartInstances.get(id)
  if (!inst) { inst = ec.init(el, null, { renderer: 'canvas' }); tvChartInstances.set(id, inst) }
  inst.setOption(tvBuildOption(chart), true)
}

function tvBuildOption(chart: TvChart): any {
  const pal       = tvGetChartPalette(chart)
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
        type: 'category', data: [...d.labels].reverse(),
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
      tooltip: { trigger: 'item', confine: true, formatter: (p: any) => `${chart.col}: ${tvFmtNum(p.value[0])}<br>${chart.col2}: ${tvFmtNum(p.value[1])}` },
      xAxis: { type: 'value', name: trunc(chart.col), nameLocation: 'end', nameTextStyle: { color: '#a1a1aa', fontSize: 10 }, axisLabel: axLabel, splitLine },
      yAxis: { type: 'value', name: trunc(chart.col2), nameLocation: 'end', nameTextStyle: { color: '#a1a1aa', fontSize: 10 }, axisLabel: axLabel, splitLine },
      series: [{ type: 'scatter', data: d, symbolSize: 5, itemStyle: { color: pal.secondary, opacity: 0.65 } }],
    }
  }
  if (chart.type === 'bubble') {
    const trunc = (s: string) => s.length > 10 ? s.slice(0, 8) + '…' : s
    const maxZ  = Math.max(...(d as number[][]).map(r => r[2] ?? 0))
    const scale = maxZ > 0 ? 30 / Math.sqrt(maxZ) : 1
    return {
      backgroundColor: 'transparent',
      grid: { left: 4, right: 8, top: 6, bottom: 4, containLabel: true },
      tooltip: { trigger: 'item', confine: true, formatter: (p: any) => `${chart.col}: ${tvFmtNum(p.value[0])}<br>${chart.col2}: ${tvFmtNum(p.value[1])}<br>${chart.col3}: ${tvFmtNum(p.value[2])}` },
      xAxis: { type: 'value', name: trunc(chart.col),  nameLocation: 'end', nameTextStyle: { color: '#a1a1aa', fontSize: 10 }, axisLabel: axLabel, splitLine },
      yAxis: { type: 'value', name: trunc(chart.col2), nameLocation: 'end', nameTextStyle: { color: '#a1a1aa', fontSize: 10 }, axisLabel: axLabel, splitLine },
      series: [{ type: 'scatter', data: d, symbolSize: (r: number[]) => Math.max(4, Math.sqrt(r[2] ?? 0) * scale), itemStyle: { color: pal.secondary2, opacity: 0.65 } }],
    }
  }
  return {}
}

async function tvQueryChart(id: string) {
  const chart = tvCharts.value.find(c => c.id === id)
  if (!chart || chart.type === 'count' || !tvConn) return
  chart.loading = true; chart.error = ''; chart.data = null
  const col = chart.col; const col2 = chart.col2; const col3 = chart.col3
  try {
    let data: any
    const src = tvSrc
    if (chart.type === 'bar') {
      const res  = await tvConn.query(`SELECT CAST("${col}" AS VARCHAR) AS val, COUNT(*) AS cnt FROM ${src} WHERE "${col}" IS NOT NULL GROUP BY val ORDER BY cnt DESC`)
      const rows = res.toArray()
      data = { labels: rows.map((r: any) => String(r.val ?? '(empty)')), values: rows.map((r: any) => Number(r.cnt)) }
    }
    else if (chart.type === 'histogram') {
      const res  = await tvConn.query(`
        WITH bounds AS (SELECT MIN("${col}")::DOUBLE AS lo, MAX("${col}")::DOUBLE AS hi FROM ${src} WHERE "${col}" IS NOT NULL),
        bucketed AS (SELECT CASE WHEN b.lo = b.hi THEN 1 ELSE LEAST(20, GREATEST(1, CAST(FLOOR(("${col}"::DOUBLE - b.lo) / (b.hi - b.lo) * 20.0) + 1 AS INTEGER))) END AS bucket, b.lo, b.hi FROM ${src}, bounds b WHERE "${col}" IS NOT NULL)
        SELECT bucket, lo + (bucket - 1) * (hi - lo) / 20.0 AS bmin, COUNT(*) AS cnt FROM bucketed GROUP BY bucket, lo, hi ORDER BY bucket`)
      const rows = res.toArray()
      data = { labels: rows.map((r: any) => tvFmtNum(r.bmin)), values: rows.map((r: any) => Number(r.cnt)) }
    }
    else if (chart.type === 'line') {
      const colMeta = tvColumns.value.find(c => c.name === col)
      const isDate  = colMeta?.kind === 'datetime'
      const yExpr   = col2 ? `AVG("${col2}"::DOUBLE)` : 'COUNT(*)'
      const nullG   = col2 ? `AND "${col2}" IS NOT NULL` : ''
      const q = isDate
        ? `SELECT DATE_TRUNC('month', "${col}") AS x, ${yExpr} AS y FROM ${src} WHERE "${col}" IS NOT NULL ${nullG} GROUP BY x ORDER BY x`
        : `SELECT CAST("${col}" AS VARCHAR) AS x, ${yExpr} AS y FROM ${src} WHERE "${col}" IS NOT NULL ${nullG} GROUP BY x ORDER BY y DESC`
      const rows = (await tvConn.query(q)).toArray()
      data = { labels: rows.map((r: any) => String(r.x ?? '').slice(0, 10)), values: rows.map((r: any) => r.y != null ? parseFloat(Number(r.y).toFixed(4)) : 0) }
    }
    else if (chart.type === 'scatter' && col2) {
      const res = await tvConn.query(`SELECT "${col}"::DOUBLE AS x, "${col2}"::DOUBLE AS y FROM ${src} WHERE "${col}" IS NOT NULL AND "${col2}" IS NOT NULL`)
      data = res.toArray().map((r: any) => [Number(r.x), Number(r.y)])
    }
    else if (chart.type === 'bubble' && col2 && col3) {
      const res = await tvConn.query(`SELECT "${col}"::DOUBLE AS x, "${col2}"::DOUBLE AS y, ABS("${col3}"::DOUBLE) AS z FROM ${src} WHERE "${col}" IS NOT NULL AND "${col2}" IS NOT NULL AND "${col3}" IS NOT NULL`)
      data = res.toArray().map((r: any) => [Number(r.x), Number(r.y), Number(r.z)])
    }
    const c = tvCharts.value.find(c => c.id === id)
    if (c) { c.data = data ?? null; c.loading = false }
    if (data) { await nextTick(); await tvRenderChart(id) }
  } catch (err: any) {
    const c = tvCharts.value.find(c => c.id === id)
    if (c) { c.error = err?.message ?? String(err); c.loading = false }
  }
}

function tvReloadChart(chart: TvChart) {
  if (!chart.col) return
  if (chart.type === 'scatter' && !chart.col2) return
  if (chart.type === 'bubble' && (!chart.col2 || !chart.col3)) return
  tvQueryChart(chart.id)
}

function tvChangeType(chart: TvChart, type: TvChartType) {
  chart.type = type
  if (!tvColsForType(type).find(c => c.name === chart.col)) chart.col = tvColsForType(type)[0]?.name ?? ''
  if (!tvNeedsY(type)) { chart.col2 = ''; chart.col3 = '' }
  if (type !== 'bubble') chart.col3 = ''
  tvChartInstances.get(chart.id)?.clear()
  chart.data = null; chart.error = ''
  if (chart.type === 'count' || !chart.col) return
  if (type === 'scatter' && !chart.col2) return
  if (type === 'bubble' && (!chart.col2 || !chart.col3)) return
  tvQueryChart(chart.id)
}

function tvRemoveChart(id: string) {
  tvChartInstances.get(id)?.dispose()
  tvChartInstances.delete(id); tvChartEls.delete(id)
  tvCharts.value = tvCharts.value.filter(c => c.id !== id)
}

function tvSelectDraftType(type: TvChartType) {
  tvDraftType.value = type
  if (tvDraftCol.value && !tvColsForType(type).find(c => c.name === tvDraftCol.value)) tvDraftCol.value = ''
  if (!tvNeedsY(type)) { tvDraftCol2.value = ''; tvDraftCol3.value = '' }
  if (type !== 'bubble') tvDraftCol3.value = ''
}

async function tvCommitAddChart() {
  if (!tvCanAddChart.value || !tvDraftType.value) return
  const id = `tvchart-${++tvChartIdSeq}`
  tvCharts.value.push({ id, type: tvDraftType.value, palette: 'zinc', col: tvDraftCol.value, col2: tvDraftCol2.value, col3: tvDraftCol3.value, data: null, loading: false, error: '' })
  tvDraftType.value = null; tvDraftCol.value = ''; tvDraftCol2.value = ''; tvDraftCol3.value = ''
  await tvQueryChart(id)
}

function tvQuickAddChart(col: TvColumn) {
  const type: TvChartType = col.kind === 'numeric' ? 'histogram' : col.kind === 'datetime' ? 'line' : 'bar'
  const id = `tvchart-${++tvChartIdSeq}`
  tvCharts.value.push({ id, type, palette: 'zinc', col: col.name, col2: '', col3: '', data: null, loading: false, error: '' })
  tvActiveTab.value = 'charts'
  tvQueryChart(id)
}

async function tvAutoAddInitialCharts() {
  const catCol = tvColumns.value.find(c => c.kind === 'categorical')
  const numCol = tvColumns.value.find(c => c.kind === 'numeric')
  const dtCol  = tvColumns.value.find(c => c.kind === 'datetime')
  const toAdd: Array<{ type: TvChartType; col: string }> = []
  if (catCol) toAdd.push({ type: 'bar', col: catCol.name })
  if (numCol) toAdd.push({ type: 'histogram', col: numCol.name })
  else if (dtCol) toAdd.push({ type: 'line', col: dtCol.name })
  if (toAdd.length < 2) {
    const used = new Set(toAdd.map(t => t.col))
    for (const col of tvColumns.value) {
      if (toAdd.length >= 2) break
      if (used.has(col.name) || col.kind === 'geometry') continue
      const t: TvChartType = col.kind === 'numeric' ? 'histogram' : col.kind === 'datetime' ? 'line' : 'bar'
      toAdd.push({ type: t, col: col.name })
    }
  }
  for (const { type, col } of toAdd) {
    const id = `tvchart-${++tvChartIdSeq}`
    tvCharts.value.push({ id, type, palette: 'zinc', col, col2: '', col3: '', data: null, loading: false, error: '' })
    await tvQueryChart(id)
  }
}

function tvOnPaletteLeave(id: string) {
  if (tvLockedPaletteId.value !== id) tvOpenPaletteId.value = null
}

function tvTogglePaletteLock(id: string) {
  tvLockedPaletteId.value = tvLockedPaletteId.value === id ? null : id
  tvOpenPaletteId.value   = id
}

function tvSetChartPalette(chart: TvChart, id: string) {
  chart.palette = id
  tvOpenPaletteId.value   = null
  tvLockedPaletteId.value = null
  nextTick(() => { if (chart.data && !chart.loading) tvRenderChart(chart.id) })
}
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

/* ── Layers panel footer (Extract All) ──────────────────────────────────── */
.od-layers-footer {
  padding: 10px 12px 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}

/* ── Pending / error layer rows ──────────────────────────────────────────── */
.od-layer-row--pending {
  opacity: 0.75;
}
.od-layer-row--pending.od-layer-row--error {
  opacity: 1;
}
.od-layer-swatch--pending {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 11px;
  color: #93c5fd;
}
.od-layer-swatch--error-icon { color: #fdba74; }
.od-layer-meta--error { color: #fdba74; }
.od-spinner--sm { font-size: 10px; animation: od-spin 1.2s linear infinite; }

/* ── Progress bar ─────────────────────────────────────────────────────────────────── */
.od-progress-bar-wrap {
  width: 100%;
  height: 3px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
  margin: 4px 0 2px;
}
.od-progress-bar-fill {
  height: 100%;
  background: #60a5fa;
  border-radius: 2px;
  transition: width 0.45s ease;
  min-width: 4px;
}
.od-progress-meta {
  opacity: 0.6;
  font-size: 10px;
  letter-spacing: 0.02em;
}

/* ── Queue UI (kept for reference, no longer used in left panel) ──────────── */
.od-section--queue { gap: 10px; }

.od-queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}
.od-queue-clear {
  font-size: 11px;
  color: var(--color-text-muted, #888);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.15s;
}
.od-queue-clear:hover { color: var(--color-text, #ccc); }

.od-queue-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.od-queue-entry {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  padding: 8px 10px;
  border-left: 3px solid rgba(255,255,255,0.15);
  transition: border-color 0.2s;
}
.od-queue-entry--extracting {
  border-left-color: #60a5fa;
  opacity: 0.85;
  animation: od-pulse 1.8s ease-in-out infinite;
}
.od-queue-entry--done    { border-left-color: #4ade80; }
.od-queue-entry--error   { border-left-color: #f97316; }

@keyframes od-pulse {
  0%, 100% { opacity: 0.85; }
  50%       { opacity: 0.55; }
}

.od-queue-entry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.od-queue-entry-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text, #e5e7eb);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.od-queue-entry-meta {
  margin-top: 4px;
  font-size: 11px;
}
.od-queue-entry-status { display: flex; align-items: center; gap: 4px; }
.od-queue-entry-status--extracting { color: #93c5fd; }
.od-queue-entry-status--done       { color: #86efac; }
.od-queue-entry-status--error      { color: #fdba74; }

.od-modal--sm { max-width: 380px; }

/* ── Table viewer: table icon button ─────────────────────────────────────── */
.od-layer-btn--table {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.15s, background 0.15s;
}
.od-layer-btn--table:hover {
  opacity: 1;
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

/* ── Table viewer: overlay & modal shell ─────────────────────────────────── */
.od-tv-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: hsl(var(--background));
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Figtree', 'Segoe UI', system-ui, sans-serif;
}

.od-tv-modal {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

/* Loading / error */
.od-tv-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  height: 100%;
  color: hsl(var(--muted-foreground));
  font-size: 0.85rem;
}
.od-tv-spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid hsl(var(--border));
  border-top-color: hsl(var(--foreground));
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.od-tv-err {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 100%;
  color: hsl(var(--muted-foreground));
  font-size: 0.85rem;
  padding: 1rem;
  text-align: center;
}

/* Topbar */
.od-tv-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 48px;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
  background: hsl(var(--card));
}
.od-tv-topbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}
.od-tv-btn-ghost {
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
.od-tv-btn-ghost:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
.od-tv-info { display: flex; flex-direction: column; min-width: 0; }
.od-tv-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.od-tv-meta {
  font-size: 0.72rem;
  color: hsl(var(--muted-foreground));
}

/* Body */
.od-tv-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.od-tv-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-width: 0;
}
.od-tv-main-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* Tabs */
.od-tv-tabs {
  display: flex;
  align-items: center;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  flex-shrink: 0;
  padding: 0 0.25rem;
}
.od-tv-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.55rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 500;
  border: none;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
  font-family: inherit;
}
.od-tv-tab:hover { color: hsl(var(--foreground)); }
.od-tv-tab--active { color: hsl(var(--foreground)); border-bottom-color: hsl(var(--foreground)); }
.od-tv-tab--right { margin-left: auto; }

/* Data tab table */
.od-tv-data-wrap {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.od-tv-table-scroll {
  flex: 1;
  overflow: auto;
}
.od-tv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.76rem;
  white-space: nowrap;
}
.od-tv-th {
  position: sticky;
  top: 0;
  background: hsl(var(--card));
  padding: 0.45rem 0.6rem;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  border-bottom: 1px solid hsl(var(--border));
  border-right: 1px solid hsl(var(--border) / 0.4);
  white-space: nowrap;
  z-index: 1;
}
.od-tv-th--num { width: 44px; min-width: 44px; text-align: right; }
.od-tv-th--right { text-align: right; }
.od-tv-th-name { display: block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.od-tv-th-badge {
  display: inline-block;
  font-size: 0.6rem;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-top: 1px;
}
.od-tv-badge--numeric   { background: rgba(59,130,246,0.15); color: #60a5fa; }
.od-tv-badge--categorical { background: rgba(139,92,246,0.15); color: #a78bfa; }
.od-tv-badge--datetime  { background: rgba(20,184,166,0.15); color: #2dd4bf; }
.od-tv-badge--geometry  { background: rgba(245,158,11,0.15); color: #fbbf24; }

.od-tv-tr:hover { background: hsl(var(--accent) / 0.5); }
.od-tv-td {
  padding: 0.3rem 0.6rem;
  border-bottom: 1px solid hsl(var(--border) / 0.3);
  border-right: 1px solid hsl(var(--border) / 0.2);
  color: hsl(var(--foreground));
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.od-tv-td--num { text-align: right; color: hsl(var(--muted-foreground)); font-variant-numeric: tabular-nums; }
.od-tv-td--right { text-align: right; font-variant-numeric: tabular-nums; }
.od-tv-td--null { color: hsl(var(--muted-foreground)); font-style: italic; }
.od-tv-td--loadmore { text-align: center; padding: 0.6rem; color: hsl(var(--muted-foreground)); }
.od-tv-tr--loadmore { border: none; }
.od-tv-loadmore-hint { font-size: 0.72rem; }
.od-tv-mini-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1.5px solid hsl(var(--border));
  border-top-color: hsl(var(--foreground));
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: middle;
}

/* Charts area */
.od-tv-charts-area {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}
.od-tv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1rem;
  align-items: start;
}
.od-tv-card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
}
.od-tv-card--add {
  border-style: dashed;
  gap: 0.65rem;
}
.od-tv-card-toolbar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.od-tv-type-pills { display: flex; gap: 2px; flex: 1; flex-wrap: wrap; }
.od-tv-type-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  padding: 0;
}
.od-tv-type-pill:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
.od-tv-type-pill--active { background: hsl(var(--accent)); color: hsl(var(--foreground)); border-color: hsl(var(--border)); }
.od-tv-type-pill--disabled { opacity: 0.3; cursor: not-allowed; }
.od-tv-card-close {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  border-radius: 4px;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.od-tv-card-close:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
.od-tv-card-selects { display: flex; flex-direction: column; gap: 0.35rem; }
.od-tv-select {
  width: 100%;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  color: hsl(var(--foreground));
  font-size: 0.76rem;
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  cursor: pointer;
}
.od-tv-select--full { width: 100%; }
.od-tv-chart-canvas { height: 240px; }
.od-tv-card-placeholder {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.od-tv-card-hint { font-size: 0.75rem; color: hsl(var(--muted-foreground)); }
.od-tv-card-error { font-size: 0.75rem; color: #ef4444; }
.od-tv-card-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid hsl(var(--border));
  border-top-color: hsl(var(--foreground));
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* Count display */
.od-tv-count-display { padding: 0.5rem 0; text-align: center; }
.od-tv-count-big { font-size: 2.5rem; font-weight: 700; color: hsl(var(--foreground)); font-variant-numeric: tabular-nums; }
.od-tv-count-sub { font-size: 0.72rem; color: hsl(var(--muted-foreground)); margin-bottom: 0.5rem; }
.od-tv-count-pills { display: flex; flex-wrap: wrap; gap: 0.3rem; justify-content: center; margin-top: 0.25rem; }
.od-tv-count-pills span {
  font-size: 0.68rem;
  background: hsl(var(--accent));
  color: hsl(var(--muted-foreground));
  padding: 2px 7px;
  border-radius: 999px;
}

/* Palette picker */
.od-tv-pal-anchor {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 4px;
}
.od-tv-pal-pop {
  display: flex;
  gap: 4px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}
.od-tv-swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: transform 0.1s;
}
.od-tv-swatch:hover { transform: scale(1.2); }
.od-tv-swatch--active { border-color: hsl(var(--foreground)); }
.od-tv-palette-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.35);
  cursor: pointer;
  padding: 0;
  transition: transform 0.1s;
}
.od-tv-palette-dot:hover { transform: scale(1.25); }
.od-tv-palette-dot--locked { border-color: hsl(var(--foreground)); }

/* Add chart card */
.od-tv-add-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}
.od-tv-add-types {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
}
.od-tv-add-type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0.4rem 0.25rem;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
}
.od-tv-add-type:hover { background: hsl(var(--accent)); }
.od-tv-add-type--active { background: hsl(var(--accent)); border-color: hsl(var(--foreground) / 0.3); }
.od-tv-add-type--disabled { opacity: 0.3; cursor: not-allowed; }
.od-tv-add-type-icon { color: hsl(var(--muted-foreground)); }
.od-tv-add-type-label { font-size: 0.65rem; color: hsl(var(--muted-foreground)); }
.od-tv-add-selects { display: flex; flex-direction: column; gap: 0.4rem; }
.od-tv-add-select-row { display: flex; flex-direction: column; gap: 0.2rem; }
.od-tv-add-select-label { font-size: 0.68rem; color: hsl(var(--muted-foreground)); font-weight: 500; }
.od-tv-add-btn {
  width: 100%;
  padding: 0.45rem;
  border: none;
  border-radius: 6px;
  background: hsl(var(--foreground));
  color: hsl(var(--background));
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}
.od-tv-add-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.od-tv-add-btn:not(:disabled):hover { opacity: 0.85; }

/* Column panel */
.od-tv-col-panel {
  width: 220px;
  flex-shrink: 0;
  border-left: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.od-tv-col-panel-head {
  display: flex;
  align-items: center;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid hsl(var(--border));
  gap: 0.4rem;
  flex-shrink: 0;
}
.od-tv-sidebar-title { font-size: 0.75rem; font-weight: 600; color: hsl(var(--foreground)); flex: 1; }
.od-tv-sidebar-count {
  font-size: 0.65rem;
  background: hsl(var(--accent));
  color: hsl(var(--muted-foreground));
  padding: 1px 6px;
  border-radius: 999px;
}
.od-tv-col-panel-close {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.od-tv-col-panel-close:hover { background: hsl(var(--accent)); }
.od-tv-col-list { list-style: none; margin: 0; padding: 0.35rem; overflow-y: auto; flex: 1; }
.od-tv-col-item { margin-bottom: 1px; }
.od-tv-col-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.3rem 0.4rem;
  border: none;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.12s;
}
.od-tv-col-btn:hover { background: hsl(var(--accent)); }
.od-tv-col-badge {
  font-size: 0.58rem;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}
.od-tv-col-name {
  font-size: 0.73rem;
  color: hsl(var(--foreground));
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.od-tv-col-plus {
  font-size: 0.8rem;
  color: hsl(var(--muted-foreground));
  opacity: 0.5;
}
.od-tv-col-btn:hover .od-tv-col-plus { opacity: 1; }

/* Column panel slide transition */
.od-tv-col-panel-enter-active,
.od-tv-col-panel-leave-active {
  transition: width 0.2s ease, opacity 0.2s ease;
  overflow: hidden;
}
.od-tv-col-panel-enter-from,
.od-tv-col-panel-leave-to {
  width: 0;
  opacity: 0;
}
</style>
