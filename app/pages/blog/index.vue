<template>
  <main class="insights-page">

    <!-- Hero -->
    <section class="insights-hero">
      <div class="container">
        <p class="insights-eyebrow">Heenco</p>
        <h1 class="insights-heading">Insights</h1>
        <p class="insights-subheading">
          Short reads on the spatial tools we build and why we build them.
        </p>
      </div>
    </section>

    <!-- Grid -->
    <section class="insights-grid-section">
      <div class="container">
        <div class="insights-grid">
          <NuxtLink
            v-for="post in posts"
            :key="post.slug"
            :to="`/blog/${post.slug}`"
            class="insight-card"
          >
            <div class="insight-card__body">
              <p class="insight-card__category">{{ post.category }}</p>
              <h2 class="insight-card__title">{{ post.title }}</h2>
              <p class="insight-card__excerpt">{{ post.excerpt }}</p>
            </div>

            <div class="insight-card__footer">
              <span class="insight-card__date">{{ post.date }}</span>
              <span class="insight-card__dot">·</span>
              <span class="insight-card__read-time">{{ post.readTime }}</span>
              <span class="insight-card__arrow">
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
const posts = [
  {
    slug: 'population-dataset',
    title: 'From a 400 MB GeoPackage to a Web Map in Four Steps',
    excerpt: 'Kontur\'s population dataset is one of the most useful open spatial datasets available. Here\'s exactly how we downloaded it, converted it to PMTiles, and put it on a map anyone can explore.',
    category: 'Dataset',
    date: 'March 9, 2026',
    readTime: '4 min read',
  },
  {
    slug: 'overture-downloader',
    title: 'Downloading Overture Maps Data Without the Headache',
    excerpt: 'Running DuckDB queries against cloud-hosted Parquet files is powerful, but it shouldn\'t require a data engineering background just to grab a city\'s worth of POIs.',
    category: 'Tool',
    date: 'March 9, 2026',
    readTime: '3 min read',
  },
  {
    slug: 'osm-downloader',
    title: 'Getting OpenStreetMap Data Into a Format That Actually Works',
    excerpt: 'Overpass Turbo is great for quick lookups. But when you need clean, analysis-ready data in Parquet, you\'re usually left stitching scripts together.',
    category: 'Tool',
    date: 'March 9, 2026',
    readTime: '3 min read',
  },
  {
    slug: 'esri-rest-downloader',
    title: 'Accessing ArcGIS Data Without an ArcGIS Licence',
    excerpt: 'Thousands of government datasets sit behind ArcGIS REST endpoints. Getting data out without the right software has always meant wrestling with APIs by hand.',
    category: 'Tool',
    date: 'March 9, 2026',
    readTime: '3 min read',
  },
]
</script>

<style scoped>
.insights-page {
  font-family: var(--font-family);
  min-height: 100vh;
}

/* ── Hero ──────────────────────────────────────────────────── */
.insights-hero {
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

.insights-eyebrow {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 0.75rem;
}

.insights-heading {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.03em;
  margin: 0 0 1rem;
}

.insights-subheading {
  font-size: 1.05rem;
  color: #6b7280;
  max-width: 480px;
  margin: 0 auto;
  line-height: 1.65;
}

/* ── Grid ──────────────────────────────────────────────────── */
.insights-grid-section {
  padding: 3rem 2rem 6rem;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

/* ── Card ──────────────────────────────────────────────────── */
.insight-card {
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

.insight-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0) 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: inherit;
}

.insight-card:hover {
  background: #ffffff;
  border-color: #10b981;
  box-shadow: 0 4px 24px rgba(16, 185, 129, 0.12), 0 1px 4px rgba(0, 0, 0, 0.04);
  transform: translateY(-2px);
}

.insight-card:hover::before {
  opacity: 1;
}

/* Body */
.insight-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.insight-card__category {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #10b981;
  margin: 0;
}

.insight-card__title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1.4;
}

.insight-card__excerpt {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
}

/* Footer */
.insight-card__footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: #9ca3af;
}

.insight-card__date,
.insight-card__read-time {
  font-weight: 500;
}

.insight-card__dot {
  color: #d1d5db;
}

.insight-card__arrow {
  margin-left: auto;
  color: #d1d5db;
  display: flex;
  align-items: center;
  transition: color 0.25s ease, transform 0.2s ease;
}

.insight-card:hover .insight-card__arrow {
  color: #10b981;
  transform: translateX(2px);
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 900px) {
  .insights-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 580px) {
  .insights-grid {
    grid-template-columns: 1fr;
  }

  .insights-hero {
    padding: 4rem 1.5rem 3rem;
  }
}
</style>
