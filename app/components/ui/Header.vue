<template>
  <header class="header" :class="{ 'header--scrolled': isScrolled }">
    <nav class="nav">
      <div class="nav__logo" :class="{ 'nav__logo--visible': isScrolled }">
        <NuxtLink to="/">
          <HeencoLogo class="header-logo" />
        </NuxtLink>
      </div>
      <ul class="nav__links">
        <li><NuxtLink to="/">Home</NuxtLink></li>
        <li><NuxtLink to="/blog">Insights</NuxtLink></li>
        <li><NuxtLink to="/tools">Tools</NuxtLink></li>
        <li><NuxtLink to="/maps">Maps</NuxtLink></li>
      </ul>
    </nav>
  </header>
</template>

<script setup>
import HeencoLogo from '~/components/ui/HeencoLogo.vue'
import { ref, onMounted, onUnmounted } from 'vue'

const isScrolled = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 200
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll() // Check initial state
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* Header & Navigation */
.header {
  border-bottom: 1px solid rgba(229, 231, 235, 0.1);
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  z-index: 100;
  transition: all 0.3s ease;
}

.header--scrolled {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-bottom-color: rgba(229, 231, 235, 0.2);
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 52px;
}

.nav__logo {
  display: flex;
  align-items: center;
  opacity: 0;
  transform: translateX(-20px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.nav__logo--visible {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
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
  gap: 0;
}

.header-logo :deep(.heenco-logo__wordmark) {
  display: none;
}

.header-logo :deep(.heenco-logo__mark) {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
  box-shadow: 0 2px 10px rgba(55, 65, 81, 0.25);
}

.header-logo :deep(.heenco-logo__orbit) {
  border-color: rgba(255, 255, 255, 0.4);
}

.header-logo :deep(.heenco-logo__core) {
  width: 0.4rem;
  height: 0.4rem;
  box-shadow: 0 0 0 2px rgba(75, 85, 99, 0.3);
}

.header-logo :deep(.heenco-logo__motto) {
  display: none;
}

.nav__links {
  display: flex;
  list-style: none;
  gap: 2.5rem;
  margin-left: auto;
}

.nav__links a {
  text-decoration: none;
  color: #6b7280;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
  padding-bottom: 0.25rem;
  font-family: var(--font-family);
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
    gap: 1.5rem;
  }

  .nav__links {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }
}
</style>
