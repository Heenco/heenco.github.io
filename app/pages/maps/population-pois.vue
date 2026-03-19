<template>
  <div class="map-container">
    <div class="search-wrapper">
      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search location..."
          class="search-input"
          @input="fetchSuggestions"
          @keyup.enter="searchLocation"
          @focus="showSuggestions = true"
        />
        <button @click="searchLocation" class="search-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </button>
      </div>
      <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-list">
        <div
          v-for="suggestion in suggestions"
          :key="suggestion.id"
          class="suggestion-item"
          @click="selectSuggestion(suggestion)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="suggestion-icon">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <div class="suggestion-text">
            <div class="suggestion-name">{{ suggestion.place_name }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Layer List -->
    <div class="layer-list">
      <div class="layer-list-header" @click="layerListExpanded = !layerListExpanded">
        <button type="button" class="layer-list-toggle" :class="{ expanded: layerListExpanded }">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"></path>
          <path d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"></path>
          <path d="m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"></path>
        </svg>
        <span>Layers</span>
      </div>
      <div v-show="layerListExpanded" class="layer-items">
        <!-- Population -->
        <div v-for="layer in layers.filter(l => l.id === 'population')" :key="layer.id" class="layer-item">
          <label class="layer-label" @click.prevent="toggleLayer(layer.id)">
            <button 
              type="button"
              role="switch"
              :aria-checked="layer.visible"
              class="layer-switch"
              :class="{ active: layer.visible }"
            >
              <span class="layer-switch-thumb"></span>
            </button>
            <div class="layer-info">
              <span class="layer-name">{{ layer.name }}</span>
              <span v-if="layer.description" class="layer-description">{{ layer.description }}</span>
            </div>
          </label>
        </div>

        <!-- Places -->
        <div class="layer-item">
          <label class="layer-label" @click.prevent="togglePlaces">
            <button 
              type="button"
              role="switch"
              :aria-checked="placesVisible"
              class="layer-switch"
              :class="{ active: placesVisible }"
            >
              <span class="layer-switch-thumb"></span>
            </button>
            <div class="layer-info">
              <span class="layer-name">Places</span>
              <span class="layer-description">Points of interest from Overture Maps</span>
            </div>
          </label>
        </div>

        <!-- Traffic -->
        <div class="layer-item">
          <label class="layer-label" @click.prevent="toggleTraffic">
            <button 
              type="button"
              role="switch"
              :aria-checked="trafficVisible"
              class="layer-switch"
              :class="{ active: trafficVisible }"
            >
              <span class="layer-switch-thumb"></span>
            </button>
            <div class="layer-info">
              <span class="layer-name">Traffic</span>
              <span class="layer-description">Live congestion from Mapbox</span>
              <div v-if="trafficVisible" class="traffic-legend">
                <span class="traffic-chip traffic-low">Low</span>
                <span class="traffic-chip traffic-moderate">Moderate</span>
                <span class="traffic-chip traffic-heavy">Heavy</span>
                <span class="traffic-chip traffic-severe">Severe</span>
              </div>
            </div>
          </label>
        </div>

        <!-- Foursquare + remaining layers -->
        <div v-for="layer in layers.filter(l => l.id !== 'population')" :key="layer.id" class="layer-item">
          <label class="layer-label" @click.prevent="toggleLayer(layer.id)">
            <button 
              type="button"
              role="switch"
              :aria-checked="layer.visible"
              class="layer-switch"
              :class="{ active: layer.visible }"
            >
              <span class="layer-switch-thumb"></span>
            </button>
            <div class="layer-info">
              <span class="layer-name">{{ layer.name }}</span>
              <span v-if="layer.description" class="layer-description">{{ layer.description }}</span>
            </div>
          </label>
        </div>
      </div>
    </div>
    
    <!-- Basemap Selector Button -->
    <button @click="openBasemapMenu" class="basemap-button">
      <img 
        :src="getBasemapPreviewUrl(getNextBasemapId())" 
        alt="Switch basemap"
        class="basemap-button-thumbnail"
      />
    </button>
    
    <!-- Basemap Modal -->
    <div v-if="showBasemapMenu" class="basemap-modal-overlay" @click="showBasemapMenu = false">
      <div class="basemap-modal" @click.stop>
        <div class="basemap-modal-header">
          <div>
            <h3>Map type</h3>
            <p class="basemap-subtitle">Select a style to use for your map.</p>
          </div>
        </div>
        <div class="basemap-grid">
          <div
            v-for="basemap in basemaps"
            :key="basemap.id"
            class="basemap-card"
            :class="{ active: selectedBasemap === basemap.id }"
            @click="selectBasemap(basemap)"
          >
            <div class="basemap-preview" :style="{ backgroundImage: `url(${getBasemapThumbnail(basemap.previewTemplate)})` }"></div>
            <span class="basemap-name">{{ basemap.name }}</span>
          </div>
        </div>
        <div class="basemap-modal-footer">
          <button @click="showBasemapMenu = false" class="modal-button modal-button-cancel">Cancel</button>
          <button @click="applyBasemap" class="modal-button modal-button-continue">Continue</button>
        </div>
      </div>
    </div>
    
    <div id="map" class="map"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { mapLayers, placesSource } from '~/config/mapLayers';

const config = useRuntimeConfig();
let map = null;
const searchQuery = ref('');
const suggestions = ref([]);
const showSuggestions = ref(false);
const showBasemapMenu = ref(false);
const layerListExpanded = ref(true);
const currentBasemap = ref('dark-matter');
const selectedBasemap = ref('dark-matter');
const layers = ref(mapLayers.map(l => ({ id: l.id, name: l.name, description: l.description, visible: l.visible })));
const placesVisible = ref(true);
const trafficVisible = ref(false);
let debounceTimer = null;

const PMTILES_SCRIPT_URL = 'https://unpkg.com/pmtiles@3.0.6/dist/pmtiles.js';
let pmtilesProtocolAdded = false;
const MAPLIBRE_CSS_URL = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
const MAPLIBRE_JS_URL = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
const DEFAULT_VIEW = { lng: 134.0, lat: -27.0, zoom: 4 };

const loadScript = (src) => new Promise((resolve, reject) => {
  const existingScript = document.querySelector(`script[src="${src}"]`);
  if (existingScript) {
    if (existingScript.dataset.loaded === 'true') {
      resolve();
      return;
    }
    existingScript.addEventListener('load', () => resolve());
    existingScript.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
    return;
  }

  const script = document.createElement('script');
  script.src = src;
  script.onload = () => {
    script.dataset.loaded = 'true';
    resolve();
  };
  script.onerror = () => reject(new Error(`Failed to load ${src}`));
  document.head.appendChild(script);
});

const toTileCoords = (lng, lat, zoom) => {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
  );
  return { x, y };
};

const getBasemapThumbnail = (templateUrl) => {
  const zoom = 12;
  const { x, y } = toTileCoords(151.2093, -33.8688, zoom);
  return templateUrl
    .replace('{z}', String(zoom))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
};

const basemaps = [
  {
    id: 'voyager',
    name: 'Voyager',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    previewTemplate: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
  },
  {
    id: 'positron',
    name: 'Positron',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    previewTemplate: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
  },
  {
    id: 'dark-matter',
    name: 'Dark Matter',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    previewTemplate: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
  }
];

const getBasemapPreviewUrl = (basemapId) => {
  const basemap = basemaps.find(b => b.id === basemapId);
  if (!basemap) return '';
  return getBasemapThumbnail(basemap.previewTemplate);
};

const getNextBasemapId = () => {
  const index = basemaps.findIndex(b => b.id === currentBasemap.value);
  if (index === -1) return basemaps[0].id;
  return basemaps[(index + 1) % basemaps.length].id;
};

const getInitialViewFromUrl = () => {
  if (typeof window === 'undefined') return DEFAULT_VIEW;
  const url = new URL(window.location.href);
  const zoom = Number(url.searchParams.get('z'));
  const lng = Number(url.searchParams.get('lng'));
  const lat = Number(url.searchParams.get('lat'));
  return {
    zoom: Number.isFinite(zoom) ? zoom : DEFAULT_VIEW.zoom,
    lng: Number.isFinite(lng) ? lng : DEFAULT_VIEW.lng,
    lat: Number.isFinite(lat) ? lat : DEFAULT_VIEW.lat
  };
};

const syncViewToUrl = () => {
  if (!map || typeof window === 'undefined') return;
  const center = map.getCenter();
  const zoom = map.getZoom();
  const url = new URL(window.location.href);
  url.searchParams.set('z', zoom.toFixed(2));
  url.searchParams.set('lng', center.lng.toFixed(5));
  url.searchParams.set('lat', center.lat.toFixed(5));
  window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
};

onMounted(() => {
  // Load MapLibre GL JS
  const link = document.createElement('link');
  link.href = MAPLIBRE_CSS_URL;
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  Promise.all([
    loadScript(MAPLIBRE_JS_URL),
    loadScript(PMTILES_SCRIPT_URL)
  ]).then(() => {
    addPmtilesProtocol();
    initMap();
  }).catch((error) => {
    console.error('Error loading scripts:', error);
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', handleClickOutside);
});

const handleClickOutside = (event) => {
  if (!event.target.closest('.search-wrapper')) {
    showSuggestions.value = false;
  }
};

const initMap = () => {
  if (typeof window !== 'undefined' && window.maplibregl) {
    const initialView = getInitialViewFromUrl();
    map = new window.maplibregl.Map({
      container: 'map',
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [initialView.lng, initialView.lat],
      zoom: initialView.zoom,
      attributionControl: false
    });

    map.on('load', () => {
      addPmtilesProtocol();
      addOvertureLayers();
      syncViewToUrl();
      setupPopulationInspection();
    });
    map.on('style.load', () => {
      addPmtilesProtocol();
      addOvertureLayers();
      setupPopulationInspection();
    });
    map.on('moveend', syncViewToUrl);
  }
};

const addPmtilesProtocol = () => {
  if (pmtilesProtocolAdded) return;
  if (window.pmtiles && window.maplibregl && window.maplibregl.addProtocol) {
    const protocol = new window.pmtiles.Protocol();
    window.maplibregl.addProtocol('pmtiles', protocol.tile);
    pmtilesProtocolAdded = true;
  }
};

const PLACES_SOURCE_ID = placesSource.url;
const PLACES_LAYER_ID = 'places-all';

const addOvertureLayers = () => {
  if (!map || !pmtilesProtocolAdded || !map.isStyleLoaded()) return;

  // Deduplicate non-place sources by URL
  const addedSources = new Set();
  for (const layerDef of mapLayers) {
    const sourceId = layerDef.source.url;
    if (!addedSources.has(sourceId) && !map.getSource(sourceId)) {
      map.addSource(sourceId, layerDef.source);
    }
    addedSources.add(sourceId);
  }

  for (const layerDef of mapLayers) {
    const layerState = layers.value.find(l => l.id === layerDef.id);
    const isVisible = layerState ? layerState.visible : layerDef.visible;

    if (!map.getLayer(layerDef.id)) {
      map.addLayer({
        id: layerDef.id,
        source: layerDef.source.url,
        ...layerDef.layer,
        layout: {
          ...layerDef.layer.layout,
          visibility: isVisible ? 'visible' : 'none'
        }
      });
    } else {
      map.setLayoutProperty(layerDef.id, 'visibility', isVisible ? 'visible' : 'none');
    }
  }

  // Add places source after other layers so place circles can render above fills.
  if (!map.getSource(PLACES_SOURCE_ID)) {
    map.addSource(PLACES_SOURCE_ID, placesSource);
  }

  // Add one unfiltered places layer for zoom-level debugging.
  if (!map.getLayer(PLACES_LAYER_ID)) {
    map.addLayer({
      id: PLACES_LAYER_ID,
      source: PLACES_SOURCE_ID,
      type: 'circle',
      'source-layer': 'place',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 1.2, 6, 1.6, 9, 2.1, 12, 2.8, 16, 3.8],
        'circle-color': '#f59e0b',
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.45, 6, 0.6, 10, 0.75, 14, 0.9],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 3, 0.2, 10, 0.5, 16, 0.8],
        'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.25, 10, 0.5, 16, 0.75]
      },
      layout: {
        visibility: placesVisible.value ? 'visible' : 'none'
      }
    });
  } else {
    map.setLayoutProperty(PLACES_LAYER_ID, 'visibility', placesVisible.value ? 'visible' : 'none');
  }

  addTrafficLayer();
};

const addTrafficLayer = () => {
  if (!map || !map.isStyleLoaded()) return;
  const token = config.public.mapboxToken;
  if (!map.getSource('mapbox-traffic')) {
    map.addSource('mapbox-traffic', {
      type: 'vector',
      tiles: [`https://api.mapbox.com/v4/mapbox.mapbox-traffic-v1/{z}/{x}/{y}.mvt?access_token=${token}`],
      minzoom: 0,
      maxzoom: 15
    });
  }
  if (!map.getLayer('traffic')) {
    map.addLayer({
      id: 'traffic',
      type: 'line',
      source: 'mapbox-traffic',
      'source-layer': 'traffic',
      minzoom: 6,
      paint: {
        'line-color': ['match', ['get', 'congestion'],
          'low', '#22c55e',
          'moderate', '#f59e0b',
          'heavy', '#ef4444',
          'severe', '#7f1d1d',
          '#94a3b8'
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 12, 2.5],
        'line-opacity': 0.85
      },
      layout: { visibility: trafficVisible.value ? 'visible' : 'none' }
    });
  } else {
    map.setLayoutProperty('traffic', 'visibility', trafficVisible.value ? 'visible' : 'none');
  }
};

const toggleTraffic = () => {
  trafficVisible.value = !trafficVisible.value;
  if (!map) return;
  if (map.getLayer('traffic')) {
    map.setLayoutProperty('traffic', 'visibility', trafficVisible.value ? 'visible' : 'none');
  } else {
    addTrafficLayer();
  }
};

const fetchSuggestions = () => {
  clearTimeout(debounceTimer);
  
  if (!searchQuery.value.trim()) {
    suggestions.value = [];
    showSuggestions.value = false;
    return;
  }

  debounceTimer = setTimeout(async () => {
    const accessToken = config.public.mapboxToken;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery.value)}.json?access_token=${accessToken}&limit=5&autocomplete=true&country=AU`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      suggestions.value = data.features || [];
      showSuggestions.value = true;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      suggestions.value = [];
    }
  }, 300);
};

const selectSuggestion = (suggestion) => {
  searchQuery.value = suggestion.place_name;
  suggestions.value = [];
  showSuggestions.value = false;
  if (!map) return;

  const [lng, lat] = suggestion.center;
  placeSearchMarker(lng, lat);
  map.flyTo({
    center: [lng, lat],
    zoom: 14,
    essential: true
  });
};

const searchLocation = async () => {
  if (!searchQuery.value.trim()) return;

  showSuggestions.value = false;
  
  const accessToken = config.public.mapboxToken;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery.value)}.json?access_token=${accessToken}&limit=1&country=AU`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      placeSearchMarker(lng, lat);
      map.flyTo({
        center: [lng, lat],
        zoom: 14,
        essential: true
      });
    }
  } catch (error) {
    console.error('Error searching location:', error);
  }
};

const placeSearchMarker = (lng, lat) => {
  if (!map) return;

  const geojson = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] }
    }]
  };

  if (map.getSource('search-marker')) {
    map.getSource('search-marker').setData(geojson);
  } else {
    map.addSource('search-marker', { type: 'geojson', data: geojson });
    map.addLayer({
      id: 'search-marker-border',
      type: 'circle',
      source: 'search-marker',
      paint: {
        'circle-radius': 12,
        'circle-color': '#ffffff',
        'circle-opacity': 1
      }
    });
    map.addLayer({
      id: 'search-marker-fill',
      type: 'circle',
      source: 'search-marker',
      paint: {
        'circle-radius': 5,
        'circle-color': '#f97316',
        'circle-opacity': 1
      }
    });
  }
};

const openBasemapMenu = () => {
  selectedBasemap.value = currentBasemap.value;
  showBasemapMenu.value = true;
};

const selectBasemap = (basemap) => {
  selectedBasemap.value = basemap.id;
};

const applyBasemap = () => {
  if (map && currentBasemap.value !== selectedBasemap.value) {
    const basemap = basemaps.find(b => b.id === selectedBasemap.value);
    if (basemap) {
      map.setStyle(basemap.style);
      currentBasemap.value = selectedBasemap.value;
    }
  }
  showBasemapMenu.value = false;
};

const setupPopulationInspection = () => {
  if (!map) return;

  // Create popup instance
  const popup = new window.maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: '300px'
  });

  // Add cursor pointer on hover
  map.on('mouseenter', 'population', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'population', () => {
    map.getCanvas().style.cursor = '';
  });

  // Click handler to show feature properties
  map.on('click', 'population', (e) => {
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const props = feature.properties;
    
    // Build HTML content for popup
    let html = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; font-size: 13px;">';
    html += '<div style="font-weight: 600; margin-bottom: 8px; color: #1f2937;">Population Hexagon</div>';
    
    if (props.population !== undefined) {
      html += `<div style="margin-bottom: 4px;"><span style="color: #6b7280;">Population:</span> <span style="font-weight: 500;">${Number(props.population).toLocaleString()}</span></div>`;
    }
    
    if (props.h3) {
      html += `<div style="margin-bottom: 4px;"><span style="color: #6b7280;">H3 ID:</span> <span style="font-family: monospace; font-size: 11px;">${props.h3}</span></div>`;
    }
    
    // Add any other properties
    const excludeKeys = ['population', 'h3'];
    Object.keys(props).forEach(key => {
      if (!excludeKeys.includes(key)) {
        html += `<div style="margin-bottom: 4px;"><span style="color: #6b7280;">${key}:</span> <span style="font-weight: 500;">${props[key]}</span></div>`;
      }
    });
    
    html += '</div>';
    
    popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
  });
};

const togglePlaces = () => {
  placesVisible.value = !placesVisible.value;
  if (!map) return;
  if (map.getLayer(PLACES_LAYER_ID)) {
    map.setLayoutProperty(PLACES_LAYER_ID, 'visibility', placesVisible.value ? 'visible' : 'none');
  }
};

const toggleLayer = (layerId) => {
  const layer = layers.value.find(l => l.id === layerId);
  if (layer && map) {
    layer.visible = !layer.visible;
    if (map.getLayer(layer.id)) {
      const visibility = layer.visible ? 'visible' : 'none';
      map.setLayoutProperty(layer.id, 'visibility', visibility);
    } else {
      addOvertureLayers();
    }
  }
};
onUnmounted(() => {
  if (map) {
    map.remove();
  }
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

.map {
  width: 100%;
  height: 100%;
}

.search-wrapper {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  min-width: 350px;
}

.search-container {
  display: flex;
  gap: 4px;
  background: hsl(var(--background, 0 0% 100%));
  border: 1px solid hsl(var(--border, 240 5.9% 90%));
  border-radius: calc(var(--radius, 0.5rem));
  padding: 4px;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}

.search-input {
  border: none;
  outline: none;
  padding: 8px 12px;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  flex: 1;
  background: transparent;
  color: hsl(var(--foreground, 240 10% 3.9%));
  transition: all 0.2s ease;
  font-weight: 400;
}

.search-input::placeholder {
  color: hsl(var(--muted-foreground, 240 3.8% 46.1%));
}

.search-input:focus {
  outline: none;
}

.search-button {
  background: transparent;
  color: hsl(var(--muted-foreground, 240 3.8% 46.1%));
  border: none;
  border-radius: calc(var(--radius, 0.5rem) - 2px);
  padding: 0 8px;
  height: 40px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.search-button:hover {
  color: hsl(var(--foreground, 240 10% 3.9%));
  background: hsl(var(--accent, 240 4.8% 95.9%));
}

.search-button:focus-visible {
  outline: 2px solid hsl(var(--ring, 240 5.9% 10%));
  outline-offset: 2px;
}

.search-button svg {
  width: 18px;
  height: 18px;
}

.suggestions-list {
  margin-top: 8px;
  background: hsl(var(--background, 0 0% 100%));
  border: 1px solid hsl(var(--border, 240 5.9% 90%));
  border-radius: calc(var(--radius, 0.5rem));
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  overflow: hidden;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s ease;
  border-bottom: 1px solid hsl(var(--border, 240 5.9% 90%));
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: hsl(var(--accent, 240 4.8% 95.9%));
}

.suggestion-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: hsl(var(--muted-foreground, 240 3.8% 46.1%));
}

.suggestion-text {
  flex: 1;
  min-width: 0;
}

.suggestion-name {
  font-size: 14px;
  font-weight: 400;
  color: hsl(var(--foreground, 240 10% 3.9%));
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.4;
}

/* Layer List */
.layer-list {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  min-width: 350px;
  max-height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  background: hsl(var(--background, 0 0% 100%));
  border: 1px solid hsl(var(--border, 240 5.9% 90%));
  border-radius: calc(var(--radius, 0.5rem));
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  overflow: hidden;
}

.layer-list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: hsl(var(--muted, 240 4.8% 95.9%));
  border-bottom: 1px solid hsl(var(--border, 240 5.9% 90%));
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground, 240 10% 3.9%));
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  cursor: pointer;
  user-select: none;
}

.layer-list-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: hsl(var(--muted-foreground, 240 3.8% 46.1%));
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.layer-list-toggle.expanded {
  transform: rotate(90deg);
}

.layer-list-toggle svg {
  width: 16px;
  height: 16px;
}

.layer-empty-state {
  padding: 20px 16px;
  text-align: center;
  font-size: 13px;
  color: hsl(var(--muted-foreground, 240 3.8% 46.1%));
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.layer-items {
  padding: 8px 0;
  overflow-y: auto;
  scrollbar-width: thin;
}

.layer-items::-webkit-scrollbar {
  width: 6px;
}

.layer-items::-webkit-scrollbar-track {
  background: transparent;
}

.layer-items::-webkit-scrollbar-thumb {
  background: hsl(var(--border, 240 5.9% 90%));
  border-radius: 3px;
}

.layer-item {
  padding: 0 16px;
}

.layer-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  cursor: pointer;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: hsl(var(--foreground, 240 10% 3.9%));
  transition: color 0.15s ease;
}

.layer-label:hover {
  color: hsl(var(--foreground, 240 10% 3.9%));
}

.layer-switch {
  display: inline-flex;
  align-items: center;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
  border: 2px solid transparent;
  border-radius: 9999px;
  background-color: hsl(var(--input, 240 5.9% 90%));
  cursor: pointer;
  padding: 0;
  transition: background-color 0.15s ease;
}

.layer-switch.active {
  background-color: hsl(var(--primary, 240 5.9% 10%));
}

.layer-switch-thumb {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  background-color: hsl(var(--background, 0 0% 100%));
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.1);
  transition: transform 0.15s ease;
  transform: translateX(0px);
}

.layer-switch.active .layer-switch-thumb {
  transform: translateX(16px);
}

.layer-switch:focus-visible {
  outline: 2px solid hsl(var(--ring, 240 5.9% 10%));
  outline-offset: 2px;
}

.layer-name {
  font-weight: 600;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  letter-spacing: 0.01em;
}

.layer-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.layer-description {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 400;
  line-height: 1.2;
}

.layer-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.category-chevron {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: hsl(var(--muted-foreground, 240 3.8% 46.1%));
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: transform 0.2s ease, color 0.15s ease;
}

.category-chevron:hover {
  color: hsl(var(--foreground, 240 10% 3.9%));
}

.category-chevron.expanded {
  transform: rotate(180deg);
}

.category-dropdown {
  margin-top: 4px;
  padding: 4px 0 4px 12px;
  border-left: 2px solid hsl(var(--border, 240 5.9% 90%));
  margin-left: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s ease;
}

.category-item:hover {
  background: hsl(var(--accent, 240 4.8% 95.9%));
}

.category-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.category-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: hsl(var(--foreground, 240 10% 3.9%));
}

.layer-switch-sm {
  width: 28px;
  height: 16px;
}

.layer-switch-thumb-sm {
  width: 12px;
  height: 12px;
}

.layer-switch-sm.active .layer-switch-thumb-sm {
  transform: translateX(12px);
}

/* Basemap Selector Button */
.basemap-button {
  position: absolute;
  bottom: 30px;
  right: 20px;
  width: 75px;
  height: 75px;
  border-radius: 12px;
  background: hsl(var(--background, 0 0% 100%));
  border: 1px solid hsl(var(--border, 240 5.9% 90%));
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: hsl(var(--foreground, 240 10% 3.9%));
  z-index: 10;
  padding: 0;
}

.basemap-button:hover {
  background: hsl(var(--accent, 240 4.8% 95.9%));
  transform: scale(1.05);
}

.basemap-button-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 11px;
}

/* Basemap Modal */
.basemap-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.basemap-modal {
  background: hsl(var(--background, 0 0% 100%));
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  max-width: 650px;
  width: 90%;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.basemap-modal-header {
  padding: 24px 24px 16px 24px;
}

.basemap-modal-header h3 {
  font-size: 22px;
  font-weight: 400;
  color: hsl(var(--foreground, 240 10% 3.9%));
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin: 0 0 8px 0;
}

.basemap-subtitle {
  font-size: 14px;
  font-weight: 400;
  color: hsl(var(--muted-foreground, 240 3.8% 46.1%));
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin: 0;
}

.basemap-grid {
  display: flex;
  gap: 12px;
  padding: 24px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.basemap-grid::-webkit-scrollbar {
  height: 6px;
}

.basemap-grid::-webkit-scrollbar-track {
  background: transparent;
}

.basemap-grid::-webkit-scrollbar-thumb {
  background: hsl(var(--border, 240 5.9% 90%));
  border-radius: 3px;
}

.basemap-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.basemap-card:hover .basemap-preview {
  transform: scale(1.05);
}

.basemap-card.active .basemap-preview {
  border-color: hsl(var(--foreground, 240 10% 3.9%));
  border-width: 3px;
}

.basemap-preview {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  border: 2px solid hsl(var(--border, 240 5.9% 90%));
  transition: all 0.2s ease;
}

.basemap-name {
  font-size: 13px;
  font-weight: 400;
  color: hsl(var(--foreground, 240 10% 3.9%));
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  text-align: center;
}

.basemap-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid hsl(var(--border, 240 5.9% 90%));
}

.modal-button {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.modal-button-cancel {
  background: transparent;
  color: hsl(var(--foreground, 240 10% 3.9%));
}

.modal-button-cancel:hover {
  background: hsl(var(--accent, 240 4.8% 95.9%));
}

.modal-button-continue {
  background: hsl(var(--foreground, 240 10% 3.9%));
  color: hsl(var(--background, 0 0% 100%));
}

.modal-button-continue:hover {
  opacity: 0.9;
}

/* Traffic legend */
.traffic-legend {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.traffic-chip {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 9999px;
  color: #fff;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.traffic-low { background: #22c55e; }
.traffic-moderate { background: #f59e0b; }
.traffic-heavy { background: #ef4444; }
.traffic-severe { background: #7f1d1d; }
</style>
