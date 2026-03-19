<template>
  <main class="home">

    <!-- ── Hero ───────────────────────────────────────────────────────── -->
    <section class="hero">
      <div class="container">
        <p class="hero__eyebrow"> &middot; Location Intelligence Lab</p>
        <h1 class="hero__headline">
          Spatial knowledge,<br class="br-lg"> available to everyone.
        </h1>
        <p class="hero__body">
          Heenco is aiming to distribute spatial knowledge — through tools, interactive maps, and  accessible datasets that anyone can use.
        </p>
        <div class="hero__actions">
          <NuxtLink to="/tools" class="btn btn--primary">Explore tools</NuxtLink>
          <NuxtLink to="/maps" class="btn btn--ghost">Explore maps</NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── What we do ─────────────────────────────────────────────────── -->
    <section class="section capabilities">
      <div class="container">
        <p class="section__eyebrow">What we do</p>
        <h2 class="section__heading">Three ways we share spatial knowledge</h2>
        <div class="caps-grid">
          <div class="cap">
            <div class="cap__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M2 8.5l10 6.5 10-6.5"/></svg>
            </div>
            <h3 class="cap__title">Open-source tools</h3>
            <p class="cap__desc">Free, browser-based tools to download and process spatial data from Overture Maps, OpenStreetMap, and ArcGIS REST services — no code required.</p>
          </div>
          <div class="cap">
            <div class="cap__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <h3 class="cap__title">Interactive maps</h3>
            <p class="cap__desc">Purpose-built maps that turn complex geographic data — population, infrastructure, service coverage — into something anyone can explore and understand.</p>
          </div>
          <div class="cap">
            <div class="cap__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            </div>
            <h3 class="cap__title">Freely available data</h3>
            <p class="cap__desc">Curated, ready-to-use spatial datasets made freely available to the community — so you spend less time finding data and more time using it.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Technologies ───────────────────────────────────────────────── -->
    <section class="section tech-section">
      <div class="container">
        <p class="section__eyebrow">Technology</p>
        <h2 class="section__heading">What we build with</h2>
        <p class="section__sub">Open, modern, and production-ready.</p>
        <div class="tech-grid">
          <div v-for="t in technologies" :key="t.name" class="tech-pill">
            <span class="tech-pill__dot" />
            {{ t.name }}
          </div>
        </div>
      </div>
    </section>

    <!-- ── About & Contact ────────────────────────────────────────────── -->
    <section class="section about-section">
      <div class="container about-grid">
        <div class="about-col">
          <p class="section__eyebrow">Our mission</p>
          <h2 class="section__heading">Spatial knowledge for everyone</h2>
          <p class="about__body">
            Heenco is a non-profit organisation with a simple goal: make spatial knowledge  accessible to everyone. We believe that geospatial data — and the tools to work with it — shouldn't be locked behind expensive software or specialised expertise.
          </p>
          <p class="about__body">
            We build in the open. Our tools are free to use, our maps are publicly available, and the datasets we curate are shared with no restrictions. Spatial knowledge is a public good.
          </p>
        </div>
        <div class="contact-col">
          <p class="section__eyebrow">The person behind it</p>
          <h2 class="section__heading">Maani Kheradmandi</h2>
          <p class="about__body">
            Spatial data engineer. Building open tools at the intersection of GIS, modern data engineering, and the web — with the belief that spatial knowledge should be free and accessible to everyone.
          </p>
          <div class="founder-links">
            <a href="https://www.linkedin.com/in/maani-kheradmandi/" target="_blank" rel="noopener noreferrer" class="founder-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
              LinkedIn
            </a>
            <a href="https://github.com/Heenco" target="_blank" rel="noopener noreferrer" class="founder-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </section>

  </main>
</template>

<script setup>
const technologies = [
  { name: 'DuckDB' },
  { name: 'GeoParquet' },
  { name: 'Overture Maps' },
  { name: 'OpenStreetMap' },
  { name: 'MapboxGL' },
  { name: 'PostGIS' },
  { name: 'Python' },
  { name: 'GeoPandas' },
  { name: 'ArcGIS REST' },
  { name: 'Nuxt' },
  { name: 'PMTiles' },
  { name: 'Apache Parquet' },
]
</script>

<style scoped>
/* ── Base ──────────────────────────────────────────────────── */
.home {
  font-family: var(--font-family);
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 2rem;
}

.br-lg { display: block; }
@media (max-width: 640px) { .br-lg { display: none; } }

/* ── Shared section styles ─────────────────────────────────── */
.section {
  padding: 7rem 2rem;
}

.section__eyebrow {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #10b981;
  margin-bottom: 0.75rem;
}

.section__heading {
  font-size: clamp(1.6rem, 3.5vw, 2.2rem);
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.03em;
  margin: 0 0 1rem;
  line-height: 1.2;
}

.section__sub {
  font-size: 1rem;
  color: #6b7280;
  margin: 0 0 3rem;
}

/* ── Hero ──────────────────────────────────────────────────── */
.hero {
  padding: 9rem 2rem 7rem;
  min-height: 88vh;
  display: flex;
  align-items: center;
  background:
    linear-gradient(rgba(255,255,255,0.96), rgba(255,255,255,0.96)),
    repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(209,213,219,0.15) 80px, rgba(209,213,219,0.15) 81px),
    repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(209,213,219,0.15) 80px, rgba(209,213,219,0.15) 81px);
  background-size: 100% 100%, 80px 80px, 80px 80px;
  position: relative;
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  bottom: -20%;
  right: -5%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(16,185,129,0.03) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.hero__eyebrow {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #10b981;
  margin-bottom: 1.25rem;
}

.hero__headline {
  font-size: clamp(2.4rem, 6vw, 4rem);
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.04em;
  line-height: 1.12;
  margin: 0 0 1.75rem;
}

.hero__body {
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: #6b7280;
  max-width: 600px;
  line-height: 1.7;
  margin: 0 0 2.5rem;
  font-weight: 400;
}

.hero__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.7rem 1.4rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  letter-spacing: -0.01em;
}

.btn--primary {
  background: #111827;
  color: #ffffff;
}

.btn--primary:hover {
  background: #1f2937;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(17,24,39,0.15);
}

.btn--ghost {
  background: transparent;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.btn--ghost:hover {
  color: #111827;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

/* ── Capabilities ──────────────────────────────────────────── */
.capabilities {
  border-top: 1px solid #f3f4f6;
}

.caps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 3rem;
}

.cap {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cap__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.cap__title {
  font-size: 0.975rem;
  font-weight: 600;
  color: #111827;
  letter-spacing: -0.01em;
  margin: 0;
}

.cap__desc {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.65;
  margin: 0;
}

/* ── Technologies ──────────────────────────────────────────── */
.tech-section {
  background: #f9fafb;
  border-top: 1px solid #f3f4f6;
  border-bottom: 1px solid #f3f4f6;
}

.tech-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.tech-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 1rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  font-size: 0.83rem;
  font-weight: 500;
  color: #374151;
  letter-spacing: -0.01em;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.tech-pill:hover {
  border-color: #10b981;
  color: #10b981;
}

.tech-pill__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  flex-shrink: 0;
}

/* ── About & Contact ───────────────────────────────────────── */
.about-section {
  border-top: 1px solid #f3f4f6;
}

.about-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5rem;
}

.about__body {
  font-size: 0.975rem;
  color: #6b7280;
  line-height: 1.75;
  margin: 0 0 1rem;
}

.contact-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #10b981;
  text-decoration: none;
  border-bottom: 1px solid rgba(16,185,129,0.25);
  padding-bottom: 0.1rem;
  margin-top: 0.5rem;
  transition: border-color 0.2s ease;
}

.contact-link:hover {
  border-color: #10b981;
}

.founder-links {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.founder-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #374151;
  text-decoration: none;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
  background: #fff;
}

.founder-link:hover {
  border-color: #10b981;
  color: #10b981;
  background: rgba(16,185,129,0.04);
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 900px) {
  .caps-grid {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }

  .about-grid {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
}

@media (max-width: 640px) {
  .hero {
    min-height: 70vh;
    padding: 6rem 1.5rem 4rem;
  }

  .section {
    padding: 4rem 1.5rem;
  }
}
</style>
