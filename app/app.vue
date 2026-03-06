<template>
  <div class="app">
    <NuxtRouteAnnouncer />
    <header class="header">
      <nav class="nav">
        <div class="nav__logo">
          <NuxtLink to="/">
            <HeencoLogo class="header-logo" />
          </NuxtLink>
        </div>
        <ul class="nav__links">
          <li><NuxtLink to="/">Home</NuxtLink></li>
          <li><NuxtLink to="/blog">Insights</NuxtLink></li>
        </ul>
      </nav>
    </header>

    <NuxtPage />
  </div>
</template>

<script setup>
import './app.css'
import HeencoLogo from '~/components/ui/HeencoLogo.vue'
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

/* Header & Navigation */
.header {
  border-bottom: 1px solid rgba(229, 231, 235, 0.1);
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  z-index: 100;
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.nav__logo {
  display: flex;
  align-items: center;
}

.nav__logo a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.nav__logo a:hover {
  opacity: 0.7;
}

.header-logo :deep(.heenco-logo) {
  flex-direction: row;
  align-items: center;
  gap: 0.7rem;
}

.header-logo :deep(.heenco-logo__row) {
  gap: 0.7rem;
}

.header-logo :deep(.heenco-logo__mark) {
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
  box-shadow: 0 2px 10px rgba(55, 65, 81, 0.25);
}

.header-logo :deep(.heenco-logo__orbit) {
  border-color: rgba(255, 255, 255, 0.4);
}

.header-logo :deep(.heenco-logo__core) {
  width: 0.35rem;
  height: 0.35rem;
  box-shadow: 0 0 0 2px rgba(75, 85, 99, 0.3);
}

.header-logo :deep(.heenco-logo__wordmark) {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 1.35rem;
  letter-spacing: 0.05em;
  font-weight: 800;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

.header-logo :deep(.heenco-logo__motto) {
  display: none;
}

.nav__links {
  display: flex;
  list-style: none;
  gap: 2.5rem;
}

.nav__links a {
  text-decoration: none;
  color: #6b7280;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
  padding-bottom: 0.25rem;
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.01em;
}

.nav__links a::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
  transform: scaleX(0);
  transition: transform 0.2s ease;
}

.nav__links a:hover {
  color: #1f2937;
}

.nav__links a:hover::after,
.nav__links a.router-link-active::after {
  transform: scaleX(1);
}

.nav__links a.router-link-active {
  color: #1f2937;
  font-weight: 600;
}

/* Responsive Design */
@media (max-width: 768px) {
  .nav {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .nav__links {
    flex-direction: column;
    gap: var(--spacing-md);
    text-align: center;
  }
}
</style>
