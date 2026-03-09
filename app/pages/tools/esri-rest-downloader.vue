<template>
  <div class="er-page">

    <!-- ── FAB (when panel hidden) ────────────────────────────────────── -->
    <button v-if="!showPanel" class="er-fab" @click="showPanel = true" title="Open ESRI REST Downloader">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    </button>

    <!-- ── Location search (above left panel) ─────────────────── -->
    <div v-if="showPanel" class="er-geo-search-wrapper" ref="geoSearchWrapperRef">
      <div class="er-geo-search-container">
        <input
          v-model="geoSearchQuery"
          type="text"
          placeholder="Search location…"
          class="er-geo-search-input"
          @input="fetchGeoSuggestions"
          @keyup.enter="searchGeoLocation"
          @focus="showGeoSuggestions = true"
        />
        <button v-if="geoSearchQuery" class="er-geo-search-btn er-geo-search-clear" @click="clearGeoSearch" title="Clear">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <button class="er-geo-search-btn" @click="searchGeoLocation" title="Search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
      </div>
      <div v-if="showGeoSuggestions && geoSuggestions.length > 0" class="er-geo-suggestions">
        <div
          v-for="s in geoSuggestions"
          :key="s.id"
          class="er-geo-suggestion"
          @click="selectGeoSuggestion(s)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span class="er-geo-suggestion-name">{{ s.place_name }}</span>
        </div>
      </div>
    </div>

    <!-- ── Left panel ────────────────────────────────────────────────────── -->
    <transition name="er-slide-left">
      <aside v-if="showPanel" class="er-panel">
        <div class="er-panel-header">
          <div class="er-header">
            <h1 class="er-title">ESRI REST Downloader</h1>
            <p class="er-subtitle">Explore ArcGIS REST services &amp; export to GeoParquet</p>
          </div>
          <button class="er-chevron-btn" @click="showPanel = false" title="Collapse">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>
      <div class="er-panel-inner">

        <!-- Active endpoint bar — shown once a service is loaded -->
        <div v-if="tree.length > 0" class="er-active-bar">
          <button class="er-back-library" @click="clearExplore">← Browse library</button>
          <span class="er-active-bar-url">{{ serviceUrl }}</span>
        </div>

        <!-- Search / Filter -->
        <section v-if="tree.length > 0" class="er-section er-section--flush">
          <div class="er-search-wrap">
            <svg class="er-search-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="filterQuery" class="er-search" placeholder="Filter layers…" type="text" />
            <button v-if="filterQuery" class="er-search-clear" @click="filterQuery = ''">✕</button>
          </div>
        </section>

        <!-- Tree -->
        <section ref="treeSection" v-if="tree.length > 0" class="er-section er-section--tree er-section--grow">
          <div class="er-tree">
            <!-- Root folders -->
            <template v-for="folder in filteredTree" :key="folder.name">
              <div class="er-folder">
                <button class="er-folder-btn" @click="toggleFolder(folder)">
                  <span class="er-folder-chevron" :class="{ open: folder.open }">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="er-folder-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  <span class="er-folder-name">{{ folder.name === '/' ? '(root)' : folder.name }}</span>
                  <span class="er-folder-count">{{ folder.services.length }}</span>
                </button>

                <!-- Services in folder -->
                <div v-show="folder.open" class="er-services">
                  <template v-for="svc in folder.filteredServices ?? folder.services" :key="svc.key">
                    <div class="er-service">
                      <div class="er-service-row">
                        <button class="er-service-btn" @click="toggleService(svc)">
                          <span class="er-service-chevron" :class="{ open: svc.open }">
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                          </span>
                          <span class="er-type-badge" :style="{ background: serviceTypeColor(svc.type) + '22', color: serviceTypeColor(svc.type), borderColor: serviceTypeColor(svc.type) + '55' }">{{ svc.type }}</span>
                          <span class="er-service-name">{{ svc.name }}</span>
                        </button>
                        <button
                          class="er-info-btn"
                          :class="{ 'er-info-btn--active': detailTarget?.url === svc.url && detailPanelOpen }"
                          title="View service details"
                          @click="openServiceDetail(svc)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </button>
                      </div>

                      <!-- Layers in service -->
                      <div v-show="svc.open" class="er-layers">
                        <div v-if="svc.loadingLayers" class="er-layers-loading">
                          <span class="er-spinner">◌</span> Loading layers…
                        </div>
                        <template v-else>
                          <div
                            v-for="layer in svc.layers ?? []"
                            :key="layer.id"
                            class="er-layer"
                            :class="{ 'er-layer--active': activeLayer?.key === `${svc.key}/${layer.id}` }"
                            :data-layer-key="`${svc.key}/${layer.id}`"
                            @click="selectLayer(svc, layer)"
                          >
                            <span class="er-geom-icon" :title="layer.geometryType ?? 'Table'">{{ geomIcon(layer.geometryType) }}</span>
                            <span class="er-layer-name">{{ layer.name }}</span>
                            <button
                              class="er-info-btn"
                              :class="{ 'er-info-btn--active': detailTarget?.url === `${svc.url}/${layer.id}` && detailPanelOpen }"
                              title="View layer details"
                              @click.stop="openLayerDetail(svc, layer)"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                            </button>
                            <button
                              v-if="QUERYABLE_TYPES.includes(svc.type)"
                              class="er-eye-btn"
                              :class="{ 'er-eye-btn--active': mapLayerKey === `${svc.key}/${layer.id}` }"
                              :title="mapLayerKey === `${svc.key}/${layer.id}` ? 'Hide from map' : 'Show on map'"
                              @click.stop="toggleOnMap(svc, layer)"
                            >
                              <span v-if="mapLayerKey === `${svc.key}/${layer.id}` && layerStatus === 'loading'" class="er-spinner er-spinner--sm">◌</span>
                              <svg v-else-if="mapLayerKey === `${svc.key}/${layer.id}`" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                              <svg v-else xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            </button>
                          </div>
                          <div v-if="!svc.layers?.length" class="er-empty">No queryable layers</div>
                        </template>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </template>
          </div>
        </section>

        <!-- Active layer info + download -->
        <section v-if="activeLayer" class="er-section er-section--action">
          <div class="er-active-info">
            <div class="er-active-name">{{ activeLayer.layerName }}</div>
            <div class="er-active-meta">{{ activeLayer.svcName }} · {{ activeLayer.svcType }}</div>
            <div v-if="layerFeatureCount !== null" class="er-active-count">
              {{ layerFeatureCount.toLocaleString() }} features in current map view
            </div>
          </div>

          <div v-if="layerStatus === 'no-query'" class="er-msg er-msg-warn er-msg-sm">
            Preview not supported for {{ activeLayer.svcType }}
          </div>
          <div v-if="layerStatus === 'error'" class="er-msg er-msg-error er-msg-sm">
            ✗ {{ layerError }}
          </div>

          <!-- Download -->
          <template v-if="layerStatus === 'loaded' || layerStatus === 'loading'">
            <div v-if="downloadStatus === 'loading'" class="er-msg er-msg-info er-msg-sm">
              <div>Paginating… {{ downloadFetched.toLocaleString() }} / {{ downloadTotal > 0 ? downloadTotal.toLocaleString() : '?' }} features in map view</div>
              <div style="margin-top:0.3rem">Converting to GeoParquet in browser…</div>
            </div>
            <div v-if="downloadStatus === 'success'" class="er-msg er-msg-success er-msg-sm">
              ✓ <strong>{{ downloadResult?.rows.toLocaleString() }}</strong> rows · {{ (downloadResult?.sizeBytes / 1e6).toFixed(2) }} MB
              <div class="er-result-file">{{ downloadResult?.fileName }}</div>
            </div>
            <div v-if="downloadStatus === 'error'" class="er-msg er-msg-error er-msg-sm">
              ✗ {{ downloadResult?.error }}
            </div>
            <div class="er-action-row">
              <UButton
                variant="primary"
                style="flex: 1"
                :disabled="downloadStatus === 'loading'"
                @click="downloadGeoParquet"
              >
                <span v-if="downloadStatus === 'loading'" class="er-spinner">◌</span>
                {{ downloadStatus === 'loading' ? 'Downloading…' : '↓ GeoParquet' }}
              </UButton>
              <UButton
                v-if="downloadStatus === 'loading'"
                variant="outline"
                @click="cancelDownload"
              >
                Cancel
              </UButton>
            </div>
          </template>
        </section>

        <!-- Library / Layer search (idle state) -->
        <section v-if="tree.length === 0 && exploreStatus !== 'loading'" class="er-section er-library er-section--grow">
          <div class="er-library-hdr">
            <span class="er-label" style="margin:0">Layer Search</span>
            <span v-if="indexLoadState === 'done' && esriIndex" class="er-idx-meta">{{ esriIndex.layers.length.toLocaleString() }} indexed</span>
          </div>

          <div class="er-search-wrap" style="margin-bottom:0.5rem">
            <svg class="er-search-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="librarySearch" class="er-search" placeholder="Search layers, services, endpoints…" type="text" />
            <button v-if="librarySearch" class="er-search-clear" @click="librarySearch = ''">✕</button>
          </div>

          <!-- ── Search results (query active) ─────────────────────────── -->
          <div v-if="librarySearch.trim()" class="er-library-results">

            <!-- Matching endpoints from library -->
            <template v-if="filteredLibrary.length > 0">
              <div class="er-idx-section-hdr">
                Endpoints
                <span class="er-idx-count">{{ filteredLibrary.reduce((n, g) => n + g.entries.length, 0) }}</span>
              </div>
              <template v-for="grp in filteredLibrary" :key="grp.group">
                <div class="er-lib-group-hdr">
                  <span class="er-lib-group-label">{{ grp.group }}</span>
                  <span class="er-lib-group-count">{{ grp.entries.length }}</span>
                </div>
                <div
                  v-for="entry in grp.entries"
                  :key="entry.name + entry.url"
                  class="er-lib-entry-wrap"
                >
                  <button class="er-lib-entry" :title="entry.url" @click="loadLibraryEntry(entry)">
                    <span class="er-lib-name">{{ entry.name }}</span>
                    <span class="er-lib-url">{{ entry.url.replace(/^https?:\/\//, '') }}</span>
                  </button>
                </div>
              </template>
            </template>

            <!-- Matching layers from index -->
            <div class="er-idx-section-hdr">
              Layers
              <span v-if="indexLoadState === 'done'" class="er-idx-count">
                {{ filteredIndexResults.length }}{{ filteredIndexResults.length >= MAX_INDEX_RESULTS ? '+' : '' }}
              </span>
            </div>

            <div v-if="indexLoadState === 'loading'" class="er-idx-loading">
              <span class="er-spinner">◌</span> Searching index…
            </div>
            <div v-else-if="indexLoadState === 'error'" class="er-empty" style="font-size:0.72rem">
              Index not found — run <code style="font-family:monospace">npm run index:esri</code>
            </div>
            <template v-else-if="indexLoadState === 'done' && groupedIndexResults.length > 0">
              <template v-for="grp in groupedIndexResults" :key="grp.endpointName">
                <div class="er-idx-group-hdr">{{ grp.endpointName }}</div>
                <div
                  v-for="item in grp.items"
                  :key="item.serviceUrl + '/' + item.layerId"
                  class="er-idx-row"
                  :class="{ 'er-idx-row--active': activeLayer?.key === indexKey(item) }"
                  @click="selectFromIndex(item)"
                >
                  <span class="er-geom-icon" :title="item.geometryType ?? item.serviceType">{{ geomIcon(item.geometryType ?? undefined) }}</span>
                  <div class="er-idx-info">
                    <span class="er-idx-layer-name">{{ item.layerName ?? item.serviceName }}</span>
                    <span class="er-idx-service">{{ item.serviceName }} · {{ item.serviceType }}</span>
                  </div>
                  <button
                    v-if="QUERYABLE_TYPES.includes(item.serviceType) && item.layerId != null"
                    class="er-eye-btn"
                    :class="{ 'er-eye-btn--active': mapLayerKey === indexKey(item) }"
                    :title="mapLayerKey === indexKey(item) ? 'Hide from map' : 'Show on map'"
                    @click.stop="showFromIndex(item)"
                  >
                    <span v-if="mapLayerKey === indexKey(item) && layerStatus === 'loading'" class="er-spinner er-spinner--sm">◌</span>
                    <svg v-else-if="mapLayerKey === indexKey(item)" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </button>
                </div>
              </template>
            </template>
            <div v-else-if="indexLoadState === 'done' && filteredIndexResults.length === 0 && filteredLibrary.length === 0" class="er-empty">
              No results for "{{ librarySearch }}"
            </div>

          </div>

          <!-- ── Library list (no query) ───────────────────────────────── -->
          <div v-else class="er-library-list">
            <template v-for="grp in filteredLibrary" :key="grp.group">
              <div class="er-lib-group-hdr">
                <span class="er-lib-group-label">{{ grp.group }}</span>
                <span class="er-lib-group-count">{{ grp.entries.length }}</span>
              </div>
              <div
                v-for="entry in grp.entries"
                :key="entry.name + entry.url"
                class="er-lib-entry-wrap"
              >
                <button
                  class="er-lib-entry"
                  :title="entry.url"
                  @click="loadLibraryEntry(entry)"
                >
                  <span class="er-lib-name">{{ entry.name }}</span>
                  <span class="er-lib-url">{{ entry.url.replace(/^https?:\/\//, '') }}</span>
                </button>
                <button
                  v-if="grp.group === 'My Services'"
                  class="er-lib-remove"
                  title="Remove from library"
                  @click="removeCustomEntry(entry.url)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </template>
            <div v-if="filteredLibrary.length === 0" class="er-empty">No matching services</div>
          </div>
        </section>

      </div><!-- /er-panel-inner -->

      <!-- ── Custom endpoint footer ────────────────────────────────────── -->
      <div v-if="tree.length === 0" class="er-custom-footer">
        <button class="er-custom-footer-toggle" @click="showCustomEndpoint = !showCustomEndpoint">
          <svg class="er-custom-footer-chevron" :class="{ open: showCustomEndpoint }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          <span>Custom endpoint</span>
        </button>
        <transition name="er-footer-slide">
          <div v-if="showCustomEndpoint" class="er-custom-footer-body">
            <div class="er-url-row">
              <input
                v-model="serviceUrl"
                type="text"
                class="er-input"
                placeholder="https://example.com/arcgis/rest/services"
                @keyup.enter="explore"
              />
            </div>
            <div v-if="urlStatus === 'invalid'" class="er-msg er-msg-warn er-msg-sm">
              ✗ Not a valid ArcGIS REST endpoint
            </div>
            <div v-if="urlStatus === 'cors'" class="er-msg er-msg-warn er-msg-sm">
              ✗ CORS blocked — server does not permit browser access
            </div>
            <div v-if="urlStatus === 'ok'" class="er-msg er-msg-success er-msg-sm">
              ✓ Valid ArcGIS REST endpoint detected
            </div>
            <UButton
              variant="primary"
              style="width: 100%; margin-top: 0.1rem"
              :disabled="exploreStatus === 'loading' || !serviceUrl.trim()"
              @click="explore"
            >
              <span v-if="exploreStatus === 'loading'" class="er-spinner">◌</span>
              {{ exploreStatus === 'loading' ? `Fetching… ${fetchedCount} / ${totalCount}` : 'Explore' }}
            </UButton>
          </div>
        </transition>
      </div>

      </aside>
    </transition>

    <!-- ── Detail panel ────────────────────────────────────────────────── -->
    <transition name="er-slide">
      <aside v-if="detailPanelOpen" class="er-detail-panel">
        <div class="er-detail-inner">

          <!-- Header -->
          <div class="er-detail-header">
            <div class="er-detail-title-wrap">
              <span class="er-detail-kind">{{ detailTarget?.kind === 'layer' ? 'Layer' : 'Service' }}</span>
              <span class="er-detail-title">{{ detailTarget?.label }}</span>
            </div>
            <button class="er-detail-close" title="Close" @click="detailPanelOpen = false">✕</button>
          </div>

          <!-- Loading -->
          <div v-if="detailStatus === 'loading'" class="er-detail-loading">
            <span class="er-spinner">◌</span> Loading metadata…
          </div>

          <!-- Error -->
          <div v-else-if="detailStatus === 'error'" class="er-msg er-msg-error" style="margin:1rem">
            ✗ {{ detailError }}
          </div>

          <!-- Content -->
          <div v-else-if="detailData" class="er-detail-content">

            <!-- Overview -->
            <div v-if="detailOverview.length > 0" class="er-detail-section">
              <div class="er-detail-section-title">Overview</div>
              <div class="er-detail-kv-list">
                <div v-for="row in detailOverview" :key="row.label" class="er-detail-kv">
                  <span class="er-detail-k">{{ row.label }}</span>
                  <span class="er-detail-v">{{ row.value }}</span>
                </div>
              </div>
            </div>

            <!-- Symbology -->
            <div v-if="detailSymbology.length > 0" class="er-detail-section">
              <div class="er-detail-section-title">Symbology</div>
              <div class="er-sym-list">
                <div v-for="sym in detailSymbology" :key="sym.label + sym.fill" class="er-sym-row">
                  <span
                    class="er-sym-swatch"
                    :style="{ background: sym.fill, borderColor: sym.outline, borderWidth: sym.outlineWidth + 'px', borderStyle: 'solid' }"
                  />
                  <span class="er-sym-label">{{ sym.label || '(all features)' }}</span>
                </div>
              </div>
            </div>

            <!-- Extent -->
            <div v-if="detailExtent" class="er-detail-section">
              <div class="er-detail-section-title">Extent</div>
              <div class="er-detail-kv-list">
                <div class="er-detail-kv"><span class="er-detail-k">West</span><span class="er-detail-v">{{ detailExtent.xmin?.toFixed(5) }}</span></div>
                <div class="er-detail-kv"><span class="er-detail-k">South</span><span class="er-detail-v">{{ detailExtent.ymin?.toFixed(5) }}</span></div>
                <div class="er-detail-kv"><span class="er-detail-k">East</span><span class="er-detail-v">{{ detailExtent.xmax?.toFixed(5) }}</span></div>
                <div class="er-detail-kv"><span class="er-detail-k">North</span><span class="er-detail-v">{{ detailExtent.ymax?.toFixed(5) }}</span></div>
              </div>
            </div>

            <!-- Description -->
            <div v-if="detailData.description" class="er-detail-section">
              <div class="er-detail-section-title">Description</div>
              <p class="er-detail-desc">{{ detailData.description }}</p>
            </div>

            <!-- Copyright -->
            <div v-if="detailData.copyrightText" class="er-detail-section">
              <div class="er-detail-section-title">Copyright</div>
              <p class="er-detail-desc">{{ detailData.copyrightText }}</p>
            </div>

            <!-- Fields -->
            <div v-if="detailFields.length > 0" class="er-detail-section">
              <div class="er-detail-section-title">Fields ({{ detailFields.length }})</div>
              <div class="er-search-wrap" style="margin-bottom:0.4rem">
                <svg class="er-search-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input v-model="fieldSearch" class="er-search" placeholder="Search fields…" />
                <button v-if="fieldSearch" class="er-search-clear" @click="fieldSearch = ''">✕</button>
              </div>
              <div class="er-detail-fields">
                <div v-for="f in filteredDetailFields" :key="f.name" class="er-detail-field">
                  <span class="er-field-name">{{ f.name }}</span>
                  <span v-if="f.alias && f.alias !== f.name" class="er-field-alias">{{ f.alias }}</span>
                  <span class="er-field-type">{{ f.type?.replace('esriFieldType', '') }}</span>
                </div>
                <div v-if="filteredDetailFields.length === 0" class="er-empty">No matching fields</div>
              </div>
            </div>

            <!-- Capabilities -->
            <div v-if="detailData.capabilities" class="er-detail-section">
              <div class="er-detail-section-title">Capabilities</div>
              <div class="er-caps">
                <span v-for="cap in detailData.capabilities.split(',')" :key="cap" class="er-cap-badge">{{ cap.trim() }}</span>
              </div>
            </div>

          </div>
        </div>
      </aside>
    </transition>

    <!-- ── Map ─────────────────────────────────────────────────────────── -->
    <div class="er-map-wrap">
      <div id="er-map" class="er-map" />
      <!-- Map overlay controls -->
      <div v-if="mapLayerKey" class="er-map-controls">
        <label class="er-map-toggle">
          <span class="er-map-toggle-track" :class="{ 'er-map-toggle-track--on': autoUpdate }">
            <input type="checkbox" v-model="autoUpdate" class="er-map-toggle-input" />
            <span class="er-map-toggle-thumb" />
          </span>
          <span class="er-map-toggle-label">Update as map moves</span>
        </label>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import UButton from '~/components/ui/Button.vue'
import { ESRI_LIBRARY } from '~/config/esriLibrary'

const config = useRuntimeConfig()

// ── Panel visibility ──────────────────────────────────────────────────────
const showPanel           = ref(true)
const showCustomEndpoint  = ref(true)

// ── Geocoding search ──────────────────────────────────────────────────────
const geoSearchWrapperRef = ref<HTMLElement | null>(null)
const treeSection         = ref<HTMLElement | null>(null)
const geoSearchQuery      = ref('')
const geoSuggestions      = ref<any[]>([])
const showGeoSuggestions  = ref(false)
let   geoSearchDebounce: ReturnType<typeof setTimeout> | null = null

function fetchGeoSuggestions() {
  if (geoSearchDebounce) clearTimeout(geoSearchDebounce)
  if (!geoSearchQuery.value.trim()) { geoSuggestions.value = []; showGeoSuggestions.value = false; return }
  geoSearchDebounce = setTimeout(async () => {
    const token = (config.public as any).mapboxToken
    if (!token) return
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(geoSearchQuery.value)}.json?access_token=${token}&limit=5&autocomplete=true`)
      const data = await res.json()
      geoSuggestions.value = data.features ?? []
      showGeoSuggestions.value = true
    } catch { geoSuggestions.value = [] }
  }, 300)
}

function placeGeoMarker(lng: number, lat: number) {
  if (!map) return
  const geojson = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] } }] }
  if (map.getSource('er-geo-marker')) {
    map.getSource('er-geo-marker').setData(geojson)
  } else {
    map.addSource('er-geo-marker', { type: 'geojson', data: geojson })
    map.addLayer({ id: 'er-geo-marker-halo', type: 'circle', source: 'er-geo-marker', paint: { 'circle-radius': 11, 'circle-color': '#ffffff', 'circle-opacity': 0.9 } })
    map.addLayer({ id: 'er-geo-marker-dot',  type: 'circle', source: 'er-geo-marker', paint: { 'circle-radius': 5,  'circle-color': '#f97316', 'circle-opacity': 1 } })
  }
}

function clearGeoMarker() {
  if (!map) return
  if (map.getLayer('er-geo-marker-dot'))  map.removeLayer('er-geo-marker-dot')
  if (map.getLayer('er-geo-marker-halo')) map.removeLayer('er-geo-marker-halo')
  if (map.getSource('er-geo-marker'))     map.removeSource('er-geo-marker')
}

function clearGeoSearch() {
  geoSearchQuery.value = ''
  geoSuggestions.value = []
  showGeoSuggestions.value = false
  clearGeoMarker()
}

function selectGeoSuggestion(s: any) {
  geoSearchQuery.value = s.place_name
  geoSuggestions.value = []
  showGeoSuggestions.value = false
  const [lng, lat] = s.center
  placeGeoMarker(lng, lat)
  map?.flyTo({ center: [lng, lat], zoom: 10, essential: true })
}

async function searchGeoLocation() {
  if (!geoSearchQuery.value.trim()) return
  showGeoSuggestions.value = false
  const token = (config.public as any).mapboxToken
  if (!token) return
  try {
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(geoSearchQuery.value)}.json?access_token=${token}&limit=1`)
    const data = await res.json()
    if (data.features?.length) {
      const [lng, lat] = data.features[0].center
      placeGeoMarker(lng, lat)
      map?.flyTo({ center: [lng, lat], zoom: 10, essential: true })
    }
  } catch {}
}

function handleGeoClickOutside(e: MouseEvent) {
  if (geoSearchWrapperRef.value && !geoSearchWrapperRef.value.contains(e.target as Node)) {
    showGeoSuggestions.value = false
  }
}

// ── MapLibre ────────────────────────────────────────────────────────────────
const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'
const MAPLIBRE_JS  = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'
let map: any = null

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })

// ── State ───────────────────────────────────────────────────────────────────
const serviceUrl    = ref('')
const urlStatus     = ref<'idle' | 'ok' | 'invalid' | 'cors'>('idle')
const exploreStatus = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const fetchedCount  = ref(0)
const totalCount    = ref(0)
const filterQuery   = ref('')

// ── Types ───────────────────────────────────────────────────────────────────
interface EsriLayer {
  id: number
  name: string
  type: string        // 'Feature Layer' | 'Table' | 'Raster Layer' …
  geometryType?: string
}

interface EsriService {
  name: string        // e.g. "Folder/ServiceName"
  type: string        // FeatureServer | MapServer | …
  url: string
  key: string
  open: boolean
  loadingLayers: boolean
  layers?: EsriLayer[]
  filteredServices?: EsriService[]
}

interface EsriFolder {
  name: string
  open: boolean
  services: EsriService[]
  filteredServices?: EsriService[]
}

const tree = ref<EsriFolder[]>([])

// ── Active layer ─────────────────────────────────────────────────────────────
const activeLayer = ref<{
  key: string
  layerName: string
  svcName: string
  svcType: string
  url: string
  geometryType?: string
} | null>(null)
const mapLayerKey       = ref<string | null>(null)
const layerStatus       = ref<'idle' | 'loading' | 'loaded' | 'error' | 'no-query'>('idle')
const layerError        = ref('')
const layerFeatureCount = ref<number | null>(null)

// ── Download ─────────────────────────────────────────────────────────────────
const downloadStatus  = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const downloadFetched = ref(0)
const downloadTotal   = ref(0)
const downloadResult  = ref<any>(null)
let   cancelRequested = false
const autoUpdate      = ref(false)

// ── Detail panel ──────────────────────────────────────────────────────────────
const detailPanelOpen = ref(false)
const detailStatus    = ref<'idle' | 'loading' | 'error'>('idle')
const detailData      = ref<any>(null)
const detailError     = ref('')
const detailTarget    = ref<{ url: string; label: string; kind: 'layer' | 'service' } | null>(null)
const fieldSearch     = ref('')
const librarySearch   = ref('')

// ── Global layer index ────────────────────────────────────────────────────
interface IndexRecord {
  endpointName: string
  endpointUrl:  string
  serviceType:  string
  serviceName:  string
  serviceUrl:   string
  layerId:      number | null
  layerName:    string | null
  layerUrl:     string | null
  layerType:    string | null
  geometryType: string | null
}

const esriIndex      = ref<{ _meta: any; layers: IndexRecord[] } | null>(null)
const indexLoadState = ref<'idle' | 'loading' | 'done' | 'error'>('idle')

const loadIndex = async () => {
  if (indexLoadState.value !== 'idle') return
  indexLoadState.value = 'loading'
  try {
    const res = await fetch('/esri-index.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    // Only treat as valid if it has been generated (totalRecords > 0 or generatedAt is set)
    if (!data?._meta?.generatedAt) throw new Error('Index not yet generated')
    esriIndex.value      = data
    indexLoadState.value = 'done'
  } catch {
    indexLoadState.value = 'error'
  }
}

watch(librarySearch, (val) => {
  if (val.trim() && indexLoadState.value === 'idle') loadIndex()
})

const MAX_INDEX_RESULTS = 150

const filteredIndexResults = computed((): IndexRecord[] => {
  if (!librarySearch.value.trim() || indexLoadState.value !== 'done' || !esriIndex.value) return []
  const q = librarySearch.value.toLowerCase()
  const out: IndexRecord[] = []
  for (const item of esriIndex.value.layers) {
    if (out.length >= MAX_INDEX_RESULTS) break
    if (
      item.layerName?.toLowerCase().includes(q) ||
      item.serviceName?.toLowerCase().includes(q) ||
      item.endpointName?.toLowerCase().includes(q) ||
      item.endpointUrl?.toLowerCase().includes(q) ||
      item.serviceUrl?.toLowerCase().includes(q) ||
      item.serviceType?.toLowerCase().includes(q) ||
      item.layerType?.toLowerCase().includes(q)
    ) out.push(item)
  }
  return out
})

const groupedIndexResults = computed(() => {
  const map = new Map<string, IndexRecord[]>()
  for (const item of filteredIndexResults.value) {
    if (!map.has(item.endpointName)) map.set(item.endpointName, [])
    map.get(item.endpointName)!.push(item)
  }
  return [...map.entries()].map(([endpointName, items]) => ({ endpointName, items }))
})

const indexKey = (item: IndexRecord) =>
  item.layerId != null ? `idx:${item.serviceUrl}/${item.layerId}` : `idx:${item.serviceUrl}`

// Navigate directly to a specific service+layer from an index result.
// Builds a minimal synthetic tree — never fetches the full parent endpoint.
const navigateFromIndex = async (item: IndexRecord, showOnMap = false) => {
  // Reset state
  tree.value              = []
  activeLayer.value       = null
  mapLayerKey.value       = null
  layerStatus.value       = 'idle'
  layerFeatureCount.value = null
  downloadStatus.value    = 'idle'
  downloadResult.value    = null
  detailPanelOpen.value   = false
  detailData.value        = null
  exploreStatus.value     = 'loading'
  clearMapLayer()

  serviceUrl.value    = item.serviceUrl
  librarySearch.value = ''

  // Build a single-service tree from index metadata (no root crawl needed)
  const svc: EsriService = {
    name:          item.serviceName,
    type:          item.serviceType,
    url:           item.serviceUrl,
    key:           `${item.serviceName}/${item.serviceType}`,
    open:          false,
    loadingLayers: false,
    layers:        undefined,
  }
  tree.value          = [{ name: '/', open: true, services: [svc] }]
  exploreStatus.value = 'done'
  urlStatus.value     = 'ok'

  // Fetch only this service's layers
  await toggleService(svc)

  if (item.layerId != null && svc.layers) {
    const layer = svc.layers.find(l => l.id === item.layerId)
    if (layer) {
      selectLayer(svc, layer)
      // Scroll the selected layer into view after DOM updates
      await nextTick()
      const el = treeSection.value?.querySelector(`[data-layer-key="${svc.key}/${layer.id}"]`)
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      if (showOnMap && QUERYABLE_TYPES.includes(svc.type)) {
        mapLayerKey.value       = `${svc.key}/${layer.id}`
        layerError.value        = ''
        layerFeatureCount.value = null
        await loadLayerPreview(true)
      }
    }
  }
}

const selectFromIndex = (item: IndexRecord) => navigateFromIndex(item, false)

const showFromIndex = async (item: IndexRecord) => {
  // Toggle off if the same layer is already on the map
  const sameUrl = activeLayer.value?.url === (item.layerUrl ?? item.serviceUrl)
  if (sameUrl && mapLayerKey.value) {
    clearMapLayer()
    mapLayerKey.value       = null
    layerStatus.value       = 'idle'
    layerFeatureCount.value = null
    return
  }
  await navigateFromIndex(item, true)
}

// ── Custom services (localStorage) ──────────────────────────────────────────────────
const CUSTOM_KEY    = 'esri-custom-services'
const customEntries = ref<{ name: string; url: string }[]>([])

const nameFromUrl = (url: string): string => {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

const maybeAddToCustom = (url: string) => {
  const norm = normalizeUrl(url)
  const allUrls = new Set([
    ...ESRI_LIBRARY.flatMap(g => g.entries.map(e => normalizeUrl(e.url))),
    ...customEntries.value.map(e => normalizeUrl(e.url)),
  ])
  if (allUrls.has(norm)) return
  customEntries.value = [{ name: nameFromUrl(norm), url: norm }, ...customEntries.value]
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(customEntries.value)) } catch {}
}

const removeCustomEntry = (url: string) => {
  customEntries.value = customEntries.value.filter(e => e.url !== url)
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(customEntries.value)) } catch {}
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const SERVICE_COLORS: Record<string, string> = {
  FeatureServer:     '#10b981',
  MapServer:         '#3b82f6',
  ImageServer:       '#f59e0b',
  VectorTileServer:  '#8b5cf6',
  GeocodeServer:     '#ec4899',
  GPServer:          '#14b8a6',
  GeometryServer:    '#f97316',
}
const serviceTypeColor = (type: string) => SERVICE_COLORS[type] ?? '#6b7280'

const GEOM_ICONS: Record<string, string> = {
  esriGeometryPoint:   '●',
  esriGeometryMultipoint: '⁘',
  esriGeometryPolyline:'〜',
  esriGeometryPolygon: '▪',
  esriGeometryEnvelope:'□',
}
const geomIcon = (gt?: string) => gt ? (GEOM_ICONS[gt] ?? '◦') : '⊟'

const QUERYABLE_TYPES = ['FeatureServer', 'MapServer']

const normalizeUrl = (u: string) => u.trim().replace(/\/+$/, '')

// ── Safe fetch (ESRI REST JSON) ───────────────────────────────────────────────
const esriFetch = async (url: string, params: Record<string, string> = {}): Promise<any> => {
  const u = new URL(url)
  u.searchParams.set('f', 'json')
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v))
  const res = await fetch(u.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data?.error) throw new Error(data.error.message ?? JSON.stringify(data.error))
  return data
}

// ── ESRI JSON → GeoJSON conversion (fallback for servers that don't support f=geojson) ──
const esriGeomToGeoJSON = (geom: any, geomType: string): any => {
  if (!geom) return null
  if (geomType === 'esriGeometryPoint' || (geom.x !== undefined && geom.y !== undefined)) {
    if (geom.x === null || geom.x === undefined) return null
    return { type: 'Point', coordinates: [geom.x, geom.y] }
  }
  if (geomType === 'esriGeometryMultipoint' || geom.points) {
    const pts: number[][] = geom.points ?? []
    return pts.length ? { type: 'MultiPoint', coordinates: pts } : null
  }
  if (geomType === 'esriGeometryPolyline' || geom.paths) {
    const paths: number[][][] = geom.paths ?? []
    if (!paths.length) return null
    return paths.length === 1
      ? { type: 'LineString', coordinates: paths[0] }
      : { type: 'MultiLineString', coordinates: paths }
  }
  if (geomType === 'esriGeometryPolygon' || geom.rings) {
    const rings: number[][][] = geom.rings ?? []
    return rings.length ? { type: 'Polygon', coordinates: rings } : null
  }
  return null
}

const esriJsonToGeoJSON = (data: any): any => {
  const geomType: string = data.geometryType ?? ''
  const features = (data.features ?? []).map((f: any) => ({
    type: 'Feature',
    geometry: esriGeomToGeoJSON(f.geometry, geomType),
    properties: f.attributes ?? {},
  }))
  return { type: 'FeatureCollection', features }
}

// Try f=geojson first; fall back to f=json + manual conversion for older/picky servers
const esriQueryAsGeoJSON = async (url: string, params: Record<string, string>): Promise<any> => {
  try {
    return await esriFetch(url, { ...params, f: 'geojson' })
  } catch {
    const data = await esriFetch(url, { ...params, f: 'json' })
    return esriJsonToGeoJSON(data)
  }
}

// ── Verify URL ────────────────────────────────────────────────────────────────
let verifyTimer: ReturnType<typeof setTimeout> | null = null
watch(serviceUrl, (val) => {
  urlStatus.value = 'idle'
  if (verifyTimer) clearTimeout(verifyTimer)
  if (!val.trim()) return
  verifyTimer = setTimeout(async () => {
    try {
      const data = await esriFetch(normalizeUrl(val))
      urlStatus.value = (data?.folders !== undefined || data?.services !== undefined) ? 'ok' : 'invalid'
    } catch (e: any) {
      urlStatus.value = (e?.message ?? '').toLowerCase().includes('cors') || (e instanceof TypeError) ? 'cors' : 'invalid'
    }
  }, 600)
})

// Extract the canonical /rest/services base from any ArcGIS URL.
// e.g. "https://server/arcgis/rest/services/public" → "https://server/arcgis/rest/services"
const getServicesRoot = (url: string): string => {
  const m = url.match(/^(https?:\/\/.+?\/rest\/services)/i)
  return (m && m[1]) ? m[1] : url
}

// ── Explore ───────────────────────────────────────────────────────────────────
const explore = async () => {
  if (!serviceUrl.value.trim()) return
  const rootUrl = normalizeUrl(serviceUrl.value)
  const servicesRoot = getServicesRoot(rootUrl)

  exploreStatus.value = 'loading'
  fetchedCount.value  = 0
  totalCount.value    = 0
  tree.value          = []
  activeLayer.value   = null
  layerStatus.value   = 'idle'
  clearMapLayer()

  try {
    // 1. Fetch root
    const root = await esriFetch(rootUrl)
    if (root?.folders === undefined && root?.services === undefined) {
      exploreStatus.value = 'error'; urlStatus.value = 'invalid'; return
    }

    const rootFolders: string[] = root.folders ?? []
    const rootServices: any[]   = root.services ?? []

    // Total = root + one request per folder
    totalCount.value = 1 + rootFolders.length

    // 2. Build folder list starting with root-level services
    const folderList: EsriFolder[] = []

    if (rootServices.length > 0) {
      folderList.push({ name: '/', open: true, services: rootServices.map(s => buildService(s, servicesRoot)) })
    }

    fetchedCount.value = 1

    // 3. Eagerly fetch all folders (5 concurrent)
    const CONCURRENCY = 5
    for (let i = 0; i < rootFolders.length; i += CONCURRENCY) {
      const batch = rootFolders.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map(f => esriFetch(`${rootUrl}/${encodeURIComponent(f)}`))
      )
      results.forEach((r, idx) => {
        fetchedCount.value++
        const folderName: string = batch[idx] ?? ''
        if (r.status === 'fulfilled') {
          const svcs: any[] = r.value?.services ?? []
          folderList.push({
            name: folderName,
            open: false,
            services: svcs.map(s => buildService(s, servicesRoot)),
          })
        } else {
          folderList.push({ name: folderName, open: false, services: [] })
        }
      })
    }

    tree.value = folderList
    exploreStatus.value = 'done'
    urlStatus.value = 'ok'
    maybeAddToCustom(rootUrl)
  } catch (e: any) {
    exploreStatus.value = 'error'
    urlStatus.value = (e instanceof TypeError) ? 'cors' : 'invalid'
  }
}

const buildService = (raw: any, servicesRoot: string): EsriService => {
  // ArcGIS returns service names relative to /rest/services (e.g. "public/SomeService").
  // Always build URLs from the true services root so entering a sub-folder URL like
  // .../services/public doesn't produce a double-prefix like .../public/public/SomeService.
  const parts = (raw.name as string).split('/')
  const displayName: string = parts[parts.length - 1] ?? raw.name ?? ''
  return {
    name: displayName,
    type: raw.type,
    url: `${servicesRoot}/${raw.name}/${raw.type}`,
    key: `${raw.name}/${raw.type}`,
    open: false,
    loadingLayers: false,
    layers: undefined,
  }
}

// ── Library ───────────────────────────────────────────────────────────────────
const filteredLibrary = computed(() => {
  const q = librarySearch.value.toLowerCase().trim()
  const groups = [
    ...(customEntries.value.length > 0
      ? [{ group: 'My Services', entries: customEntries.value }]
      : []),
    ...ESRI_LIBRARY,
  ]
  if (!q) return groups
  return groups
    .map(grp => ({ ...grp, entries: grp.entries.filter(e =>
      e.name.toLowerCase().includes(q) || e.url.toLowerCase().includes(q)
    )}))
    .filter(grp => grp.entries.length > 0)
})

const loadLibraryEntry = (entry: { name: string; url: string }) => {
  serviceUrl.value  = entry.url
  librarySearch.value = ''
  explore()
}

const clearExplore = () => {
  tree.value           = []
  activeLayer.value    = null
  mapLayerKey.value    = null
  layerStatus.value    = 'idle'
  layerFeatureCount.value = null
  downloadStatus.value = 'idle'
  downloadResult.value = null
  detailPanelOpen.value = false
  detailData.value     = null
  exploreStatus.value  = 'idle'
  urlStatus.value      = 'idle'
  serviceUrl.value     = ''
  clearMapLayer()
}

// ── Filtered tree ─────────────────────────────────────────────────────────────
const filteredTree = computed(() => {
  const q = filterQuery.value.toLowerCase().trim()
  if (!q) return tree.value
  return tree.value
    .map(folder => {
      const matchedServices = folder.services.filter(svc =>
        svc.name.toLowerCase().includes(q) ||
        svc.type.toLowerCase().includes(q) ||
        (svc.layers ?? []).some(l => l.name.toLowerCase().includes(q))
      )
      if (matchedServices.length === 0 && !folder.name.toLowerCase().includes(q)) return null
      return { ...folder, open: true, filteredServices: matchedServices }
    })
    .filter(Boolean) as EsriFolder[]
})

// ── Folder toggle ─────────────────────────────────────────────────────────────
const toggleFolder = (folder: EsriFolder) => {
  folder.open = !folder.open
}

// ── Service toggle — lazy-load layers ────────────────────────────────────────
const toggleService = async (svc: EsriService) => {
  svc.open = !svc.open
  if (!svc.open || svc.layers !== undefined) return

  svc.loadingLayers = true
  try {
    const data = await esriFetch(svc.url)
    svc.layers = [
      ...(data?.layers ?? []),
      ...(data?.tables ?? []),
    ].map((l: any) => ({
      id: l.id,
      name: l.name,
      type: l.type ?? '',
      geometryType: l.geometryType,
    }))
  } catch {
    svc.layers = []
  } finally {
    svc.loadingLayers = false
  }
}

// ── Select layer (highlight + download panel, no map load) ───────────────────
const selectLayer = (svc: EsriService, layer: EsriLayer) => {
  const key = `${svc.key}/${layer.id}`
  if (activeLayer.value?.key === key) return

  activeLayer.value = {
    key,
    layerName: layer.name,
    svcName: svc.name,
    svcType: svc.type,
    url: `${svc.url}/${layer.id}`,
    geometryType: layer.geometryType,
  }
  downloadStatus.value = 'idle'
  downloadResult.value = null

  if (!QUERYABLE_TYPES.includes(svc.type)) {
    layerStatus.value = 'no-query'
  }
}

// ── Eye icon: toggle layer on map ─────────────────────────────────────────────
const toggleOnMap = async (svc: EsriService, layer: EsriLayer) => {
  const key = `${svc.key}/${layer.id}`

  // If this layer is already on map, hide it
  if (mapLayerKey.value === key) {
    clearMapLayer()
    mapLayerKey.value   = null
    layerStatus.value   = 'idle'
    layerFeatureCount.value = null
    return
  }

  // Select it in the panel too
  selectLayer(svc, layer)

  mapLayerKey.value = key
  layerError.value  = ''
  layerFeatureCount.value = null
  await loadLayerPreview(true)
}

// ── Detail panel helpers ───────────────────────────────────────────────────────
// Extract fill + outline swatches from ESRI drawingInfo renderer (best-effort)
const extractSymbology = (renderer: any): Array<{ fill: string; outline: string; outlineWidth: number; label: string }> => {
  if (!renderer) return []
  const toRgba = (c?: number[]) =>
    c ? `rgba(${c[0]},${c[1]},${c[2]},${((c[3] ?? 255) / 255).toFixed(2)})` : '#6b7280'
  const symToSwatch = (sym: any) => ({
    fill:         toRgba(sym?.color),
    outline:      toRgba(sym?.outline?.color),
    outlineWidth: Math.max(1, sym?.outline?.width ?? 1),
  })
  if (renderer.type === 'simple') {
    return [{ ...symToSwatch(renderer.symbol), label: renderer.label ?? '' }]
  }
  if (renderer.type === 'uniqueValue') {
    const items = (renderer.uniqueValueInfos ?? []).slice(0, 20).map((u: any) => ({ ...symToSwatch(u.symbol), label: u.label ?? u.value ?? '' }))
    if (renderer.defaultSymbol) items.unshift({ ...symToSwatch(renderer.defaultSymbol), label: renderer.defaultLabel ?? '(default)' })
    return items
  }
  if (renderer.type === 'classBreaks') {
    return (renderer.classBreakInfos ?? []).slice(0, 20).map((b: any) => ({ ...symToSwatch(b.symbol), label: b.label ?? '' }))
  }
  return []
}

const openServiceDetail = async (svc: EsriService) => {
  detailTarget.value    = { url: svc.url, label: svc.name, kind: 'service' }
  detailPanelOpen.value = true
  detailStatus.value    = 'loading'
  detailData.value      = null
  detailError.value     = ''
  fieldSearch.value     = ''
  try {
    detailData.value   = await esriFetch(svc.url)
    detailStatus.value = 'idle'
  } catch (e: any) {
    detailError.value  = e?.message ?? 'Failed to load service metadata'
    detailStatus.value = 'error'
  }
}

const openLayerDetail = async (svc: EsriService, layer: EsriLayer) => {
  const url = `${svc.url}/${layer.id}`
  detailTarget.value    = { url, label: layer.name, kind: 'layer' }
  detailPanelOpen.value = true
  detailStatus.value    = 'loading'
  detailData.value      = null
  detailError.value     = ''
  fieldSearch.value     = ''
  try {
    detailData.value   = await esriFetch(url)
    detailStatus.value = 'idle'
  } catch (e: any) {
    detailError.value  = e?.message ?? 'Failed to load layer metadata'
    detailStatus.value = 'error'
  }
}

// ── Detail panel computed ──────────────────────────────────────────────────────
const detailOverview = computed(() => {
  const d = detailData.value
  if (!d) return []
  const rows: Array<{ label: string; value: string }> = []
  if (d.geometryType) rows.push({ label: 'Geometry', value: d.geometryType.replace('esriGeometry', '') })
  const wkid = d.extent?.spatialReference?.wkid ?? d.sourceSpatialReference?.wkid ?? d.spatialReference?.wkid
  if (wkid)          rows.push({ label: 'EPSG', value: String(wkid) })
  if (d.minScale != null) rows.push({ label: 'Min Scale', value: d.minScale === 0 ? 'None' : `1:${d.minScale.toLocaleString()}` })
  if (d.maxScale != null) rows.push({ label: 'Max Scale', value: d.maxScale === 0 ? 'None' : `1:${d.maxScale.toLocaleString()}` })
  if (d.type)        rows.push({ label: 'Type', value: d.type })
  if (d.serviceItemId) rows.push({ label: 'Item ID', value: d.serviceItemId })
  return rows
})

const detailExtent = computed(() => detailData.value?.extent ?? null)

const detailFields = computed<any[]>(() => detailData.value?.fields ?? [])

const filteredDetailFields = computed(() => {
  const q = fieldSearch.value.toLowerCase().trim()
  if (!q) return detailFields.value
  return detailFields.value.filter((f: any) =>
    f.name?.toLowerCase().includes(q) ||
    f.alias?.toLowerCase().includes(q) ||
    f.type?.toLowerCase().includes(q)
  )
})

const detailSymbology = computed(() =>
  extractSymbology(detailData.value?.drawingInfo?.renderer)
)

// Convert ESRI renderer → MapLibre paint objects
const rendererToMapPaint = (renderer: any, geomType: string, fallback: string) => {
  const isPoly = geomType.includes('Polygon') || geomType.includes('Envelope')
  const isLine = geomType.includes('Polyline') || geomType.includes('Line')

  const toRgba = (c?: number[]): string | null =>
    c ? `rgba(${c[0]},${c[1]},${c[2]},${((c[3] ?? 255) / 255).toFixed(2)})` : null
  const symFill   = (sym: any) => toRgba(sym?.color)         ?? fallback
  const symStroke = (sym: any) => toRgba(sym?.outline?.color) ?? '#ffffff'
  const symWidth  = (sym: any) => Math.max(0.5, sym?.outline?.width ?? sym?.width ?? 1)
  const symRadius = (sym: any) => Math.max(3, (sym?.size ?? 8) / 2)

  const fromSym = (sym: any) => {
    if (isPoly) return {
      fill:   { 'fill-color': symFill(sym), 'fill-opacity': 1 },
      line:   { 'line-color': symStroke(sym), 'line-width': symWidth(sym) },
    }
    if (isLine) return { line: { 'line-color': symFill(sym), 'line-width': symWidth(sym) } }
    return { circle: {
      'circle-color': symFill(sym), 'circle-radius': symRadius(sym),
      'circle-stroke-color': symStroke(sym), 'circle-stroke-width': symWidth(sym),
    }}
  }

  if (!renderer || renderer.type === 'simple') return fromSym(renderer?.symbol)

  if (renderer.type === 'uniqueValue') {
    const field  = renderer.field1 ?? renderer.field ?? 'objectid'
    const infos  = renderer.uniqueValueInfos ?? []
    const defSym = renderer.defaultSymbol
    const colorExpr: any = infos.length
      ? ['match', ['to-string', ['get', field]],
          ...infos.flatMap((u: any) => [String(u.value ?? ''), symFill(u.symbol)]),
          symFill(defSym)]
      : symFill(defSym)
    if (isPoly) return {
      fill: { 'fill-color': colorExpr, 'fill-opacity': 1 },
      line: { 'line-color': colorExpr, 'line-width': 0.5 },
    }
    if (isLine) return { line: { 'line-color': colorExpr, 'line-width': 2 } }
    return { circle: {
      'circle-color': colorExpr, 'circle-radius': 5,
      'circle-stroke-color': symStroke(defSym), 'circle-stroke-width': 1,
    }}
  }

  if (renderer.type === 'classBreaks') {
    const field  = renderer.field ?? 'objectid'
    const breaks = renderer.classBreakInfos ?? []
    let colorExpr: any = fallback
    if (breaks.length) {
      if (breaks.length === 1) {
        colorExpr = symFill(breaks[0].symbol)
      } else {
        const stepExpr: any[] = ['step', ['to-number', ['get', field], 0], symFill(breaks[0].symbol)]
        for (let i = 0; i < breaks.length - 1; i++) {
          stepExpr.push(breaks[i].classMaxValue ?? 0, symFill(breaks[i + 1].symbol))
        }
        colorExpr = stepExpr
      }
    }
    if (isPoly) return {
      fill: { 'fill-color': colorExpr, 'fill-opacity': 1 },
      line: { 'line-color': 'rgba(0,0,0,0.25)', 'line-width': 0.5 },
    }
    if (isLine) return { line: { 'line-color': colorExpr, 'line-width': 2 } }
    return { circle: {
      'circle-color': colorExpr, 'circle-radius': 5,
      'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1,
    }}
  }

  return fromSym(null)
}

const loadLayerPreview = async (isInitial = false) => {
  if (!activeLayer.value || !map) return
  layerStatus.value = 'loading'
  clearMapLayer()

  try {
    const bounds = map.getBounds()
    const bbox = {
      xmin: bounds.getWest(),
      ymin: bounds.getSouth(),
      xmax: bounds.getEast(),
      ymax: bounds.getNorth(),
    }

    const baseParams = {
      where: '1=1',
      outSR: '4326',
      outFields: '*',
      resultRecordCount: '1000',
      returnGeometry: 'true',
    }

    // Fetch layer metadata (for renderer/symbology) in parallel with first feature query
    const [meta, firstData] = await Promise.all([
      esriFetch(activeLayer.value.url, { f: 'json' }).catch(() => null),
      esriQueryAsGeoJSON(`${activeLayer.value.url}/query`, {
        ...baseParams,
        geometry: JSON.stringify(bbox),
        geometryType: 'esriGeometryEnvelope',
        inSR: '4326',
      }),
    ])

    let data = firstData
    if (!data?.features) throw new Error('No features returned')

    // If nothing visible in the current view, retry globally so we can auto-zoom to the data
    if (data.features.length === 0) {
      const global = await esriQueryAsGeoJSON(`${activeLayer.value.url}/query`, baseParams)
      if (global?.features?.length > 0) data = global
    }

    layerFeatureCount.value = data.features.length

    const geojson: any = data

    // Add to map
    map.addSource('er-layer', { type: 'geojson', data: geojson })

    // Prefer the stored ESRI geometry type; fall back to metadata, then GeoJSON detection
    let geomType = activeLayer.value.geometryType ?? meta?.geometryType ?? ''
    if (!geomType && data.features.length > 0) {
      const firstGeomType: string = data.features.find((f: any) => f.geometry?.type)?.geometry?.type ?? ''
      if      (firstGeomType.includes('Polygon'))    geomType = 'esriGeometryPolygon'
      else if (firstGeomType.includes('LineString')) geomType = 'esriGeometryPolyline'
      else if (firstGeomType.includes('Point'))      geomType = 'esriGeometryPoint'
    }

    const renderer = meta?.drawingInfo?.renderer ?? null
    const fallbackColor = serviceTypeColor(activeLayer.value.svcType)
    const paint = rendererToMapPaint(renderer, geomType, fallbackColor)

    if (geomType.includes('Polygon') || geomType.includes('Envelope')) {
      map.addLayer({ id: 'er-layer-fill',   type: 'fill',   source: 'er-layer', paint: paint.fill })
      map.addLayer({ id: 'er-layer-line',   type: 'line',   source: 'er-layer', paint: paint.line })
    } else if (geomType.includes('Polyline') || geomType.includes('Line')) {
      map.addLayer({ id: 'er-layer-line',   type: 'line',   source: 'er-layer', paint: paint.line })
    } else {
      map.addLayer({ id: 'er-layer-circle', type: 'circle', source: 'er-layer', paint: paint.circle })
    }

    // Auto-zoom to features only on first load of a layer, not on subsequent bbox reloads
    if (isInitial && data.features.length > 0) {
      const bbox = featureBbox(geojson)
      if (bbox) {
        map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 60, duration: 600, maxZoom: 14 })
      }
    }

    layerStatus.value = 'loaded'
  } catch (e: any) {
    layerError.value  = e?.message ?? 'Unknown error'
    layerStatus.value = 'error'
  }
}

// Re-load preview when map moves (debounced) — only when autoUpdate is enabled
let moveTimer: ReturnType<typeof setTimeout> | null = null
const onMapMoveEnd = () => {
  if (!autoUpdate.value) return
  if (!mapLayerKey.value) return
  if (layerStatus.value !== 'loaded' && layerStatus.value !== 'error') return
  if (moveTimer) clearTimeout(moveTimer)
  moveTimer = setTimeout(() => {
    if (activeLayer.value) loadLayerPreview(false)
  }, 800)
}

// Compute bbox [minLng, minLat, maxLng, maxLat] from a GeoJSON FeatureCollection
// Using iterative reduce to avoid call-stack overflow on large datasets
const featureBbox = (fc: any): [number, number, number, number] | null => {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  const pushCoord = (c: number[]) => {
    const lng = c[0] as number
    const lat = c[1] as number
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  const walk = (g: any) => {
    if (!g) return
    if (g.type === 'Point') { pushCoord(g.coordinates); return }
    if (g.type === 'MultiPoint' || g.type === 'LineString') { g.coordinates.forEach(pushCoord); return }
    if (g.type === 'MultiLineString' || g.type === 'Polygon') { g.coordinates.forEach((ring: number[][]) => ring.forEach(pushCoord)); return }
    if (g.type === 'MultiPolygon') { g.coordinates.forEach((poly: number[][][]) => poly.forEach(ring => ring.forEach(pushCoord))); return }
  }
  fc.features?.forEach((f: any) => walk(f?.geometry))
  if (!isFinite(minLng)) return null
  return [minLng, minLat, maxLng, maxLat]
}

const clearMapLayer = () => {
  if (!map) return
  ['er-layer-fill', 'er-layer-line', 'er-layer-circle'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id)
  })
  if (map.getSource('er-layer')) map.removeSource('er-layer')
}

// ── GeoParquet Download ───────────────────────────────────────────────────────
let _db: any  = null
let _conn: any = null

const getDuckDB = async () => {
  if (_conn) return _conn
  const duckdb = await import('@duckdb/duckdb-wasm')
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

  // Install spatial extension for GeoParquet support
  try {
    await _conn.query(`INSTALL spatial; LOAD spatial;`)
  } catch {
    // May fail if CDN unreachable — graceful fallback to geometry-as-text
  }
  return _conn
}

const cancelDownload = () => { cancelRequested = true }

const downloadGeoParquet = async () => {
  if (!activeLayer.value) return
  cancelRequested     = false
  downloadStatus.value  = 'loading'
  downloadFetched.value = 0
  downloadTotal.value   = 0
  downloadResult.value  = null

  try {
    // Snap the current map bbox at download time
    const mapBounds = map?.getBounds()
    const bboxGeom = mapBounds ? JSON.stringify({
      xmin: mapBounds.getWest(),
      ymin: mapBounds.getSouth(),
      xmax: mapBounds.getEast(),
      ymax: mapBounds.getNorth(),
    }) : null

    const bboxParams: Record<string, string> = bboxGeom ? {
      geometry: bboxGeom,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
    } : {}

    // 1. Get count within bbox
    const countData = await esriFetch(`${activeLayer.value.url}/query`, {
      where: '1=1',
      ...bboxParams,
      returnCountOnly: 'true',
      f: 'json',
    })
    const total = countData?.count ?? 0
    downloadTotal.value = total

    // 2. Paginate all features within bbox — no cap, page size 1000
    const PAGE = 1000
    const allFeatures: any[] = []

    for (let offset = 0; offset < Math.max(total, 1); offset += PAGE) {
      if (cancelRequested) throw new Error('Cancelled by user')

      const page = await esriQueryAsGeoJSON(`${activeLayer.value.url}/query`, {
        where: '1=1',
        ...bboxParams,
        outSR: '4326',
        outFields: '*',
        returnGeometry: 'true',
        resultRecordCount: String(PAGE),
        resultOffset: String(offset),
      })

      const features = page?.features ?? []
      allFeatures.push(...features)
      downloadFetched.value = allFeatures.length

      // If we got fewer than a full page, we're done
      if (features.length < PAGE) break
    }

    if (cancelRequested) throw new Error('Cancelled by user')

    // 3. Build full GeoJSON FeatureCollection
    const fc = { type: 'FeatureCollection', features: allFeatures }
    const fcJson = JSON.stringify(fc)
    const fileName = `${activeLayer.value.layerName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.parquet`

    // 4. Write to DuckDB WASM virtual FS and convert
    const conn = await getDuckDB()
    const jsonFile = fileName.replace('.parquet', '.geojson')
    const encoder  = new TextEncoder()
    await _db.registerFileBuffer(jsonFile, encoder.encode(fcJson))

    // Try with spatial extension (proper GeoParquet via ST_Read which handles geometry natively)
    let sql: string
    try {
      await conn.query(`SELECT ST_GeomFromGeoJSON('{"type":"Point","coordinates":[0,0]}')`)
      // Spatial available — ST_Read parses GeoJSON and emits a GEOMETRY column directly
      sql = `
        COPY (
          SELECT * FROM ST_Read('${jsonFile}')
        ) TO '${fileName}' (FORMAT PARQUET, COMPRESSION ZSTD)
      `
    } catch {
      // Fallback: no spatial ext — store geometry and properties as JSON text columns
      sql = `
        COPY (
          SELECT
            f->>'geometry'   AS geometry,
            f->>'properties' AS properties
          FROM (
            SELECT UNNEST(features) AS f
            FROM read_json_auto('${jsonFile}')
          )
        ) TO '${fileName}' (FORMAT PARQUET, COMPRESSION ZSTD)
      `
    }

    await conn.query(sql)
    const buffer = await _db.copyFileToBuffer(fileName)
    const rows   = allFeatures.length

    // 5. Trigger download
    const blob = new Blob([buffer], { type: 'application/octet-stream' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = fileName
    document.body.appendChild(a); a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    downloadResult.value = { rows, fileName, sizeBytes: buffer.byteLength }
    downloadStatus.value = 'success'
  } catch (e: any) {
    if (e?.message === 'Cancelled by user') {
      downloadStatus.value = 'idle'
    } else {
      downloadResult.value = { error: e?.message ?? 'Unknown error' }
      downloadStatus.value = 'error'
    }
  }
}

// ── Map init ──────────────────────────────────────────────────────────────────
const initMap = () => {
  const ml = (window as any).maplibregl
  if (!ml) return

  map = new ml.Map({
    container: 'er-map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [133.5, -27.0],
    zoom: 3.5,
    attributionControl: false,
  })

  map.on('moveend', onMapMoveEnd)
}

onMounted(() => {
  // Restore custom services from localStorage
  try {
    const saved = localStorage.getItem(CUSTOM_KEY)
    if (saved) customEntries.value = JSON.parse(saved)
  } catch {}

  const link = document.createElement('link')
  link.rel = 'stylesheet'; link.href = MAPLIBRE_CSS
  document.head.appendChild(link)
  loadScript(MAPLIBRE_JS).then(initMap).catch(console.error)
  document.addEventListener('click', handleGeoClickOutside)
})

onUnmounted(() => {
  map?.remove(); map = null
  if (_conn) { _conn.close().catch(() => {}); _conn = null }
  if (_db)   { _db.terminate().catch(() => {}); _db = null }
  document.removeEventListener('click', handleGeoClickOutside)
})
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.er-page {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #0a0a12;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Figtree', 'Segoe UI', system-ui, sans-serif;
}

.er-panel {
  position: absolute;
  top: calc(1rem + 48px + 0.75rem);
  left: 1rem;
  bottom: 1rem;
  width: 360px;
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

.er-panel-inner {
  flex: 1;
  overflow-y: auto;
  padding: 0 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Map wrap + overlay controls ────────────────────────────────────────── */
.er-map-wrap {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.er-map {
  width: 100%;
  height: 100%;
}

.er-map-controls {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: auto;
}

.er-map-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(0,0,0,0.15);
  border-radius: 9999px;
  padding: 0.35rem 0.75rem 0.35rem 0.5rem;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35);
}

.er-map-toggle-label {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Figtree', 'Segoe UI', system-ui, sans-serif;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: #1a1a2e;
  white-space: nowrap;
}

.er-map-toggle-input {
  display: none;
}

.er-map-toggle-track {
  position: relative;
  width: 28px;
  height: 16px;
  border-radius: 9999px;
  background: #cbd5e1;
  border: 1px solid #94a3b8;
  flex-shrink: 0;
  transition: background 0.2s, border-color 0.2s;
}

.er-map-toggle-track--on {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.er-map-toggle-thumb {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  transition: transform 0.2s;
}

.er-map-toggle-track--on .er-map-toggle-thumb {
  transform: translateX(12px);
}

/* ── Scrollbar ───────────────────────────────────────────────────────────── */
.er-panel-inner::-webkit-scrollbar { width: 4px; }
.er-panel-inner::-webkit-scrollbar-track { background: transparent; }
.er-panel-inner::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

/* ── Panel header ────────────────────────────────────────────────────── */
.er-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem 1rem 0.85rem;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
  gap: 0.5rem;
}

.er-panel-header .er-header {
  padding-bottom: 0;
  border-bottom: none;
  margin-bottom: 0;
}

.er-chevron-btn {
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
.er-chevron-btn:hover {
  background: hsl(var(--border));
  color: hsl(var(--foreground));
}

/* ── FAB (panel closed state) ──────────────────────────────────────── */
.er-fab {
  position: absolute;
  top: 1rem;
  left: 1rem;
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
.er-fab:hover {
  background: hsl(var(--card));
  box-shadow: 0 4px 18px rgba(0,0,0,0.4);
}

/* ── Geo search wrapper (above panel) ────────────────────────────── */
.er-geo-search-wrapper {
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 360px;
  z-index: 20;
}

.er-geo-search-container {
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

.er-geo-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: hsl(var(--foreground));
  font-size: 0.82rem;
  padding: 0.45rem 0.6rem;
  font-family: inherit;
}
.er-geo-search-input::placeholder {
  color: hsl(var(--muted-foreground));
  opacity: 0.7;
}

.er-geo-search-btn {
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
.er-geo-search-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}
.er-geo-search-clear { opacity: 0.7; }
.er-geo-search-clear:hover { opacity: 1; }

.er-geo-suggestions {
  margin-top: 6px;
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.35);
  overflow: hidden;
}

.er-geo-suggestion {
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
.er-geo-suggestion:last-child { border-bottom: none; }
.er-geo-suggestion:hover { background: hsl(var(--accent) / 0.5); }
.er-geo-suggestion svg { color: hsl(var(--muted-foreground)); margin-top: 2px; flex-shrink: 0; }

.er-geo-suggestion-name {
  flex: 1;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.er-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid hsl(var(--border));
  margin-bottom: 0;
}

.er-title {
  font-size: 1rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 0.2rem;
  letter-spacing: 0.01em;
}

.er-subtitle {
  font-size: 0.72rem;
  color: hsl(var(--muted-foreground));
  margin: 0;
}

/* ── Sections ────────────────────────────────────────────────────────────── */
.er-section {
  padding: 0.9rem 0;
  border-bottom: 1px solid hsl(var(--border));
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.er-section:last-child { border-bottom: none; }

.er-section--flush {
  padding-bottom: 0.5rem;
}

.er-section--tree {
  padding-top: 0.5rem;
  flex: 1;
  overflow-y: auto;
}

.er-section--grow {
  min-height: 0;
}

.er-section--action {
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--muted) / 0.3);
  padding: 0.9rem;
  margin: 0 -1.25rem -1.25rem;
}

/* ── Label ───────────────────────────────────────────────────────────────── */
.er-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
}

/* ── URL input ───────────────────────────────────────────────────────────── */
.er-url-row {
  display: flex;
  gap: 0.4rem;
}

.er-input {
  flex: 1;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  color: hsl(var(--foreground));
  font-size: 0.78rem;
  padding: 0.4rem 0.6rem;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit;
  min-width: 0;
}

.er-input:focus {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.25);
}

/* ── Search ──────────────────────────────────────────────────────────────── */
.er-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.er-search-icon {
  position: absolute;
  left: 0.5rem;
  color: hsl(var(--muted-foreground));
  pointer-events: none;
}

.er-search {
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

.er-search:focus { border-color: hsl(var(--ring)); }

.er-search-clear {
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

/* ── Tree ────────────────────────────────────────────────────────────────── */
.er-tree {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

/* Folder */
.er-folder-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  background: none;
  border: none;
  color: hsl(var(--foreground));
  font-size: 0.78rem;
  font-weight: 500;
  padding: 0.35rem 0.2rem;
  cursor: pointer;
  text-align: left;
  border-radius: 4px;
  transition: background 0.1s;
}

.er-folder-btn:hover { background: hsl(var(--muted)); }

.er-folder-icon { color: hsl(var(--muted-foreground)); flex-shrink: 0; }

.er-folder-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.er-folder-count {
  font-size: 0.65rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  border-radius: 9999px;
  padding: 0.05rem 0.4rem;
  flex-shrink: 0;
}

.er-folder-chevron,
.er-service-chevron {
  color: hsl(var(--muted-foreground));
  transition: transform 0.15s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.er-folder-chevron.open,
.er-service-chevron.open { transform: rotate(90deg); }

/* Services */
.er-services {
  padding-left: 1rem;
  border-left: 1px solid hsl(var(--border));
  margin-left: 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.er-service-row {
  display: flex;
  align-items: center;
}

.er-service-row:hover { background: hsl(var(--muted)); border-radius: 4px; }
.er-service-row:hover .er-info-btn { opacity: 1; }

.er-service-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  color: hsl(var(--foreground));
  font-size: 0.76rem;
  padding: 0.28rem 0.2rem;
  cursor: pointer;
  text-align: left;
  border-radius: 4px;
  transition: background 0.1s;
}

.er-service-btn:hover { background: none; }

.er-service-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.er-type-badge {
  font-size: 0.6rem;
  font-weight: 600;
  border: 1px solid;
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
  letter-spacing: 0.02em;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Layers */
.er-layers {
  padding-left: 1rem;
  border-left: 1px solid hsl(var(--border));
  margin-left: 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.er-layers-loading {
  font-size: 0.72rem;
  color: hsl(var(--muted-foreground));
  padding: 0.3rem 0.2rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.er-layer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.28rem 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.74rem;
  color: hsl(var(--foreground));
  transition: background 0.1s;
}

.er-layer:hover { background: hsl(var(--muted)); }

.er-layer--active {
  background: hsl(var(--primary) / 0.12);
  color: hsl(var(--primary));
}

.er-geom-icon {
  font-size: 0.65rem;
  color: hsl(var(--muted-foreground));
  width: 12px;
  text-align: center;
  flex-shrink: 0;
}

.er-layer-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

/* ── Eye button ──────────────────────────────────────────────────────────── */
.er-eye-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0.1rem;
  border-radius: 3px;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
  opacity: 0;
  transition: opacity 0.1s, color 0.1s;
  line-height: 0;
}

.er-layer:hover .er-eye-btn { opacity: 1; }
.er-eye-btn--active { opacity: 1 !important; color: hsl(var(--primary)); }
.er-eye-btn:hover { color: hsl(var(--foreground)); }

.er-empty {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
  padding: 0.3rem 0.2rem;
  font-style: italic;
}

/* ── Active layer panel ──────────────────────────────────────────────────── */
.er-active-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-bottom: 0.25rem;
}

.er-active-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.er-active-meta {
  font-size: 0.68rem;
  color: hsl(var(--muted-foreground));
}

.er-active-count {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
}

.er-action-row {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.1rem;
}

/* ── Messages ────────────────────────────────────────────────────────────── */
.er-msg {
  font-size: 0.75rem;
  border-radius: 6px;
  padding: 0.55rem 0.7rem;
  line-height: 1.5;
}

.er-msg-sm { font-size: 0.7rem; padding: 0.4rem 0.6rem; }

.er-msg-info    { background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); }
.er-msg-warn    { background: rgba(245,158,11,0.08); color: #b45309; border: 1px solid rgba(245,158,11,0.3); }
.er-msg-success { background: rgba(22,163,74,0.08);  color: #15803d; border: 1px solid rgba(22,163,74,0.3); }
.er-msg-error   { background: rgba(220,38,38,0.08);  color: #dc2626; border: 1px solid rgba(220,38,38,0.3); }

.er-result-file {
  font-family: monospace;
  font-size: 0.66rem;
  word-break: break-all;
  opacity: 0.8;
  margin-top: 0.2rem;
}

/* ── Library ────────────────────────────────────────────────────────────── */
.er-library {
  flex: 1;
  overflow: hidden;
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.er-library-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

/* ── Index search results ─────────────────────────────────────────────────── */
.er-idx-meta {
  font-size: 0.63rem;
  color: hsl(var(--muted-foreground));
  opacity: 0.6;
}

.er-idx-section-hdr {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
  margin: 0.75rem 0 0.3rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid hsl(var(--border));
}

.er-idx-count {
  font-size: 0.65rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  border-radius: 9999px;
  padding: 0 0.35rem;
  font-weight: 600;
}

.er-idx-loading {
  font-size: 0.74rem;
  color: hsl(var(--muted-foreground));
  padding: 0.4rem 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.er-idx-group-hdr {
  font-size: 0.64rem;
  font-weight: 600;
  color: hsl(var(--primary));
  letter-spacing: 0.02em;
  padding: 0.45rem 0 0.15rem;
  opacity: 0.9;
}

.er-idx-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.35rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}
.er-idx-row:hover { background: hsl(var(--muted)); }
.er-idx-row--active { background: hsl(var(--primary) / 0.10); }

.er-idx-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.er-idx-layer-name {
  font-size: 0.76rem;
  color: hsl(var(--foreground));
  font-weight: 450;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.er-idx-service {
  font-size: 0.63rem;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.er-library-results {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.er-library-results::-webkit-scrollbar { width: 4px; }
.er-library-results::-webkit-scrollbar-track { background: transparent; }
.er-library-results::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

.er-library-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.er-library-list::-webkit-scrollbar { width: 4px; }
.er-library-list::-webkit-scrollbar-track { background: transparent; }
.er-library-list::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

.er-lib-group-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.2rem 0.2rem;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
  border-bottom: 1px solid hsl(var(--border));
  margin-bottom: 1px;
  position: sticky;
  top: 0;
  background: hsl(var(--card));
  z-index: 1;
}

.er-lib-group-count {
  font-size: 0.6rem;
  background: hsl(var(--muted));
  border-radius: 9999px;
  padding: 0.05rem 0.35rem;
  color: hsl(var(--muted-foreground));
}

.er-lib-entry-wrap {
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: background 0.1s;
}

.er-lib-entry-wrap:hover { background: hsl(var(--muted)); }
.er-lib-entry-wrap:hover .er-lib-remove { opacity: 1; }

.er-lib-entry {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  padding: 0.32rem 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  gap: 0.08rem;
}

.er-lib-remove {
  flex-shrink: 0;
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 0.25rem 0.4rem;
  opacity: 0;
  transition: opacity 0.1s, color 0.1s;
  line-height: 0;
  border-radius: 4px;
}
.er-lib-remove:hover { color: #dc2626; }

.er-lib-name {
  font-size: 0.76rem;
  font-weight: 500;
  color: hsl(var(--foreground));
  line-height: 1.3;
}

.er-lib-url {
  font-size: 0.6rem;
  color: hsl(var(--muted-foreground));
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.er-active-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid hsl(var(--border));
}

.er-active-bar-url {
  font-size: 0.66rem;
  color: hsl(var(--muted-foreground));
  word-break: break-all;
  line-height: 1.4;
  opacity: 0.7;
}

.er-back-library {
  background: none;
  border: none;
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 0;
  text-align: left;
  transition: color 0.1s;
  width: fit-content;
}
.er-back-library:hover { color: hsl(var(--foreground)); }

/* ── Custom endpoint footer ─────────────────────────────────────────────── */
.er-custom-footer {
  flex-shrink: 0;
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--muted) / 0.25);
}

.er-custom-footer-toggle {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  padding: 0.55rem 1.25rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.71rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  font-family: inherit;
  text-align: left;
  transition: color 0.15s;
}
.er-custom-footer-toggle:hover { color: hsl(var(--foreground)); }

.er-custom-footer-chevron {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}
.er-custom-footer-chevron.open { transform: rotate(180deg); }

.er-custom-footer-body {
  padding: 0 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.er-footer-slide-enter-active,
.er-footer-slide-leave-active {
  transition: max-height 0.22s ease, opacity 0.18s ease;
  overflow: hidden;
  max-height: 160px;
}
.er-footer-slide-enter-from,
.er-footer-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ── Idle (kept for legacy) ─────────────────────────────────────────────── */
.er-mono {
  font-family: monospace;
  font-size: 0.66rem;
  word-break: break-all;
}

/* ── Spinner ─────────────────────────────────────────────────────────────── */
.er-spinner {
  display: inline-block;
  animation: er-spin 1s linear infinite;
}

.er-spinner--sm { font-size: 0.7rem; }

@keyframes er-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ── Info button ─────────────────────────────────────────────────────────── */
.er-info-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0.1rem;
  border-radius: 3px;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
  opacity: 0;
  transition: opacity 0.1s, color 0.1s;
  line-height: 0;
}

.er-layer:hover .er-info-btn,
.er-service-row:hover .er-info-btn { opacity: 1; }
.er-info-btn--active { opacity: 1 !important; color: hsl(var(--primary)); }
.er-info-btn:hover { color: hsl(var(--foreground)); }

/* ── Detail panel ────────────────────────────────────────────────────────── */
.er-detail-panel {
  position: absolute;
  top: 1rem;
  left: calc(1rem + 360px + 0.75rem);
  bottom: 1rem;
  width: 320px;
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

.er-detail-inner {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.er-detail-inner::-webkit-scrollbar { width: 4px; }
.er-detail-inner::-webkit-scrollbar-track { background: transparent; }
.er-detail-inner::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

.er-detail-header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.er-detail-title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.er-detail-kind {
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
}

.er-detail-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.er-detail-close {
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
.er-detail-close:hover { color: hsl(var(--foreground)); background: hsl(var(--muted)); }

.er-detail-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.76rem;
  padding: 1.25rem 1rem;
}

.er-detail-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.er-detail-section {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid hsl(var(--border));
}
.er-detail-section:last-child { border-bottom: none; }

.er-detail-section-title {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
  margin-bottom: 0.5rem;
}

.er-detail-kv-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.er-detail-kv {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  font-size: 0.74rem;
}

.er-detail-k {
  color: hsl(var(--muted-foreground));
  width: 80px;
  flex-shrink: 0;
  font-size: 0.7rem;
}

.er-detail-v {
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
  font-size: 0.71rem;
}

.er-detail-desc {
  font-size: 0.73rem;
  color: hsl(var(--muted-foreground));
  margin: 0;
  line-height: 1.6;
  word-break: break-word;
}

/* Symbology */
.er-sym-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.er-sym-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.73rem;
  color: hsl(var(--foreground));
}

.er-sym-swatch {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
  box-sizing: border-box;
}

.er-sym-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Fields */
.er-detail-fields {
  display: flex;
  flex-direction: column;
  gap: 1px;
  max-height: 240px;
  overflow-y: auto;
}

.er-detail-fields::-webkit-scrollbar { width: 3px; }
.er-detail-fields::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

.er-detail-field {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  padding: 0.22rem 0.3rem;
  border-radius: 3px;
  font-size: 0.71rem;
}
.er-detail-field:hover { background: hsl(var(--muted) / 0.5); }

.er-field-name {
  color: hsl(var(--foreground));
  font-family: monospace;
  font-size: 0.7rem;
  flex-shrink: 0;
}

.er-field-alias {
  color: hsl(var(--muted-foreground));
  font-size: 0.67rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.er-field-type {
  color: hsl(var(--muted-foreground));
  font-size: 0.62rem;
  background: hsl(var(--muted));
  border-radius: 3px;
  padding: 0.05rem 0.3rem;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: auto;
}

/* Capabilities */
.er-caps {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.er-cap-badge {
  font-size: 0.65rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
  border: 1px solid hsl(var(--border));
}

/* ── Slide transition (detail panel) ────────────────────────────────────── */
.er-slide-enter-active,
.er-slide-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.er-slide-enter-from,
.er-slide-leave-to {
  transform: translateX(-12px);
  opacity: 0;
}

/* ── Slide-left transition (main panel) ───────────────────────────────── */
.er-slide-left-enter-active,
.er-slide-left-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.er-slide-left-enter-from,
.er-slide-left-leave-to {
  transform: translateX(-16px);
  opacity: 0;
}
</style>
