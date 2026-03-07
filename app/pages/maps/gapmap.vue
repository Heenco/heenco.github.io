<template>
  <div class="map-container">
    <div id="map" class="map"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

const config = useRuntimeConfig();
let map = null;

onMounted(() => {
  // Load Mapbox GL JS
  const link = document.createElement('link');
  link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css';
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  const script = document.createElement('script');
  script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.js';
  script.onload = () => {
    initMap();
  };
  document.head.appendChild(script);
});

const initMap = () => {
  if (typeof window !== 'undefined' && window.mapboxgl) {
    window.mapboxgl.accessToken = config.public.mapboxToken;

    map = new window.mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v11', // Light basemap style
      center: [151.2093, -33.8688], // Sydney coordinates [lng, lat]
      zoom: 12
    });
  }
};

onUnmounted(() => {
  if (map) {
    map.remove();
  }
});
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
}

.map {
  width: 100%;
  height: 100%;
}
</style>
