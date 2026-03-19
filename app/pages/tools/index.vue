<template>
  <main class="tools-page">

    <!-- Hero -->
    <section class="tools-hero">
      <div class="container">
        <p class="tools-eyebrow">Open Source</p>
        <h1 class="tools-heading">Tools</h1>
        <p class="tools-subheading">
          Spatial data utilities for accessing, transforming, and exploring geospatial datasets.
        </p>
      </div>
    </section>

    <!-- Grid -->
    <section class="tools-grid-section">
      <div class="container">
        <div class="tools-grid">
          <component
            :is="tool.external ? 'a' : NuxtLink"
            v-for="tool in tools"
            :key="tool.slug"
            v-bind="tool.external
              ? { href: tool.route, target: '_blank', rel: 'noopener noreferrer' }
              : { to: tool.route }"
            class="tool-card"
          >
            <div class="tool-card__icon-wrap">
              <span class="tool-card__icon" v-html="tool.icon" />
            </div>

            <div class="tool-card__body">
              <h2 class="tool-card__name">{{ tool.name }}</h2>
              <p class="tool-card__desc">{{ tool.description }}</p>
            </div>

            <div class="tool-card__footer">
              <span v-for="tag in tool.tags" :key="tag" class="tool-card__tag">{{ tag }}</span>
              <span class="tool-card__arrow">
                <!-- external: diagonal arrow; internal: right arrow -->
                <svg v-if="tool.external" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M7 17L17 7M7 7h10v10"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </div>
          </component>
        </div>
      </div>
    </section>

  </main>
</template>

<script setup>
const NuxtLink = resolveComponent('NuxtLink')
const tools = [
  {
    slug: 'roxy-ai-receptionist',
    route: '/tools/roxy-ai-receptionist',
    name: 'Roxy — AI Receptionist',
    description: 'Give your tradie business a 24/7 AI receptionist that answers calls, books jobs, and never takes a day off.',
    tags: ['AI', 'Tradies', 'Voice'],
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.1 6.1l1.27-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>`,
  },
  {
    slug: 'overture-downloader',
    route: '/tools/overture-downloader',
    name: 'Overture Downloader',
    description: 'Extract Overture Maps data to GeoParquet by bounding box and category.',
    tags: ['Overture Maps', 'GeoParquet'],
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
      <line x1="12" y1="2" x2="12" y2="22"/>
      <path d="M2 8.5l10 6.5 10-6.5"/>
    </svg>`,
  },
  {
    slug: 'osm-downloader',
    route: '/tools/osm-downloader',
    name: 'OSM Downloader',
    description: 'Download OpenStreetMap features by tag and bounding box, exported to Parquet.',
    tags: ['OpenStreetMap', 'Parquet'],
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>`,
  },
  {
    slug: 'esri-rest-downloader',
    route: '/tools/esri-rest-downloader',
    name: 'ESRI REST Downloader',
    description: 'Browse ArcGIS REST services and export any layer to GeoParquet.',
    tags: ['ArcGIS', 'REST', 'GeoParquet'],
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>`,
  },
  {
    slug: 'data-explorer',
    route: '/tools/data-explorer',
    name: 'Data Explorer',
    description: 'Explore attributes and generate charts from Parquet, GeoParquet, CSV, or GeoJSON files.',
    tags: ['Parquet', 'CSV', 'Charts'],
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 21V9"/>
      <path d="M7 15h2M7 18h4M13 13h4M13 16h2"/>
    </svg>`,
  },
  {
    slug: 'xsd-graph',
    route: '/tools/xsd-graph',
    name: 'XSD Graph Explorer',
    description: 'Parse XML Schema (XSD) files and explore type hierarchies, extensions, and references as an interactive 3D node graph.',
    tags: ['XSD', 'Schema', '3D Graph'],
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="7" height="7" rx="1"/>
      <rect x="15" y="3" width="7" height="7" rx="1"/>
      <rect x="8" y="14" width="8" height="7" rx="1"/>
      <line x1="5.5" y1="10" x2="12" y2="14"/>
      <line x1="18.5" y1="10" x2="12" y2="14"/>
    </svg>`,
  },
  {
    slug: 'kepler-viewer',
    route: 'https://kepler.heenco.com',
    external: true,
    name: 'Kepler Viewer',
    description: 'Visualise large geospatial datasets interactively with Kepler.gl — supports GeoJSON, CSV, and more.',
    tags: ['Kepler.gl', 'Visualisation', 'Maps'],
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18"/>
      <path d="M3 9h18M3 15h18"/>
    </svg>`,
  },
]
</script>

<style scoped>
.tools-page {
  font-family: var(--font-family);
  min-height: 100vh;
}

/* ── Hero ──────────────────────────────────────────────────── */
.tools-hero {
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

.tools-eyebrow {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 0.75rem;
}

.tools-heading {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.03em;
  margin: 0 0 1rem;
}

.tools-subheading {
  font-size: 1.05rem;
  color: #6b7280;
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.65;
}

/* ── Grid ──────────────────────────────────────────────────── */
.tools-grid-section {
  padding: 3rem 2rem 6rem;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

/* ── Accent ────────────────────────────────────────────────── */
:root {
  --accent: #10b981;
  --accent-rgb: 16, 185, 129;
}

/* ── Card ──────────────────────────────────────────────────── */
.tool-card {
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

.tool-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.05) 0%, rgba(var(--accent-rgb), 0) 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: inherit;
}

.tool-card:hover {
  background: #ffffff;
  border-color: var(--accent);
  box-shadow: 0 4px 24px rgba(var(--accent-rgb), 0.12), 0 1px 4px rgba(0,0,0,0.04);
  transform: translateY(-2px);
}

.tool-card:hover::before {
  opacity: 1;
}

/* Icon */
.tool-card__icon-wrap {
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

.tool-card:hover .tool-card__icon-wrap {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
}

/* Body */
.tool-card__body {
  flex: 1;
}

.tool-card__name {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.4rem;
  letter-spacing: -0.01em;
}

.tool-card__desc {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
}

/* Footer */
.tool-card__footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.tool-card__tag {
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

.tool-card:hover .tool-card__tag {
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.18);
}

.tool-card__arrow {
  margin-left: auto;
  color: #d1d5db;
  display: flex;
  align-items: center;
  transition: color 0.25s ease, transform 0.2s ease;
}

.tool-card:hover .tool-card__arrow {
  color: var(--accent);
  transform: translateX(2px);
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 900px) {
  .tools-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 580px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }

  .tools-hero {
    padding: 4rem 1.5rem 3rem;
  }
}
</style>
