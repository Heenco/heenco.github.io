<template>
  <div class="app">
    <NuxtRouteAnnouncer />
    <Header v-if="!isMapPage" />
    <NuxtPage />
  </div>
</template>

<script setup>
import './app.css'
import Header from '~/components/ui/Header.vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isMapPage = computed(() => {
  const p = route.path
  // Hide header on individual tool/map pages, promote dashboard, but keep it on the index pages
  return (p.startsWith('/maps/') || p.startsWith('/tools/') || p.startsWith('/promote'))
})
</script>

<style scoped>
:root {
  --color-black: #000000;
  --color-white: #ffffff;
  --color-gray-100: #f1f5f9;
  --color-gray-200: #e2e8f0;
  --color-gray-700: #334155;
  --color-gray-900: #0f172a;
  
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-2xl: 4rem;
  
  --transition: all 0.3s ease-out;
}

.app {
  font-family: var(--font-family);
  color: var(--color-gray-900);
  background-color: var(--color-white);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}
</style>
