<template>
  <main class="maps-page">

    <!-- Hero -->
    <section class="maps-hero">
      <div class="container">
        <p class="maps-eyebrow">Interactive</p>
        <h1 class="maps-heading">Maps</h1>
        <p class="maps-subheading">
          Interactive spatial maps for exploring population, amenities, and service coverage.
        </p>
      </div>
    </section>

    <!-- Grid -->
    <section class="maps-grid-section">
      <div class="container">
        <div class="maps-grid">
          <NuxtLink
            v-for="map in maps"
            :key="map.slug"
            :to="map.route"
            class="map-card"
          >
            <div class="map-card__icon-wrap">
              <span class="map-card__icon" v-html="map.icon" />
            </div>

            <div class="map-card__body">
              <h2 class="map-card__name">{{ map.name }}</h2>
              <p class="map-card__desc">{{ map.description }}</p>
            </div>

            <div class="map-card__footer">
              <span v-for="tag in map.tags" :key="tag" class="map-card__tag">{{ tag }}</span>
              <span class="map-card__arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

  </main>
</template>

<script setup>
const maps = [
  {
    slug: 'population-pois',
    route: '/maps/population-pois',
    name: 'Population & POIs',
    description: 'Explore population density and points of interest across Australia, with fitness facility gap analysis.',
    tags: ['Population', 'POIs', 'Australia'],
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>`,
  },
]
</script>

<style scoped>
.maps-page {
  font-family: var(--font-family);
  min-height: 100vh;
}

/* ── Accent ────────────────────────────────────────────────── */
:root {
  --accent: #10b981;
  --accent-rgb: 16, 185, 129;
}

/* ── Hero ──────────────────────────────────────────────────── */
.maps-hero {
  padding: 6rem 2rem 4rem;
  text-align: center;
  background:
    linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)),
    repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(209,213,219,0.15) 80px, rgba(209,213,219,0.15) 81px),
    repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(209,213,219,0.15) 80px, rgba(209,213,219,0.15) 81px);
  background-size: 100% 100%, 80px 80px, 80px 80px;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 2rem;
}

.maps-eyebrow {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 0.75rem;
}

.maps-heading {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.03em;
  margin: 0 0 1rem;
}

.maps-subheading {
  font-size: 1.05rem;
  color: #6b7280;
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.65;
}

/* ── Grid ──────────────────────────────────────────────────── */
.maps-grid-section {
  padding: 3rem 2rem 6rem;
}

.maps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

/* ── Card ──────────────────────────────────────────────────── */
.map-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
  position: relative;
  overflow: hidden;
}

.map-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.05) 0%, rgba(var(--accent-rgb), 0) 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: inherit;
}

.map-card:hover {
  background: #ffffff;
  border-color: var(--accent);
  box-shadow: 0 4px 24px rgba(var(--accent-rgb), 0.12), 0 1px 4px rgba(0,0,0,0.04);
  transform: translateY(-2px);
}

.map-card:hover::before {
  opacity: 1;
}

/* Icon */
.map-card__icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease;
  flex-shrink: 0;
}

.map-card:hover .map-card__icon-wrap {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
}

/* Body */
.map-card__body {
  flex: 1;
}

.map-card__name {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.4rem;
  letter-spacing: -0.01em;
}

.map-card__desc {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
}

/* Footer */
.map-card__footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.map-card__tag {
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: #9ca3af;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  transition: color 0.25s ease, background 0.25s ease, border-color 0.25s ease;
}

.map-card:hover .map-card__tag {
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.18);
}

.map-card__arrow {
  margin-left: auto;
  color: #d1d5db;
  display: flex;
  align-items: center;
  transition: color 0.25s ease, transform 0.2s ease;
}

.map-card:hover .map-card__arrow {
  color: var(--accent);
  transform: translateX(2px);
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 900px) {
  .maps-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 580px) {
  .maps-grid {
    grid-template-columns: 1fr;
  }

  .maps-hero {
    padding: 4rem 1.5rem 3rem;
  }
}
</style>
