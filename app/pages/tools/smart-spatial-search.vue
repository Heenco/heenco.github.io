<template>
  <div class="sss-root">
  <div class="sss-page">
    <!-- ── Header ─────────────────────────────────────────────────── -->
    <div class="sss-header">
      <h1 class="sss-title">Smart Spatial Search</h1>
      <p class="sss-subtitle">AI-powered discovery of public spatial datasets</p>
    </div>

    <!-- ── Search bar ─────────────────────────────────────────────── -->
    <div class="sss-search-wrap">
      <div class="sss-search-box">
        <svg class="sss-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          v-model="query"
          class="sss-search-input"
          type="text"
          placeholder='Try "Heritage sites in Brisbane" or "Flood zones Sydney"'
          @keyup.enter="search"
        />
        <button v-if="query" class="sss-clear" @click="query = ''; results = []">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <UButton size="sm" :disabled="status === 'loading'" @click="search">
          <span v-if="status === 'loading'" class="sss-spinner">◌</span>
          <span v-else>Search</span>
        </UButton>
      </div>

      <!-- Example chips -->
      <div class="sss-chips">
        <span class="sss-chip-label">Try:</span>
        <UButton
          v-for="ex in examples"
          :key="ex"
          variant="outline"
          size="sm"
          class="sss-chip"
          @click="query = ex; search()"
        >{{ ex }}</UButton>
      </div>
    </div>

    <!-- ── Status / error ─────────────────────────────────────────── -->
    <div v-if="status === 'loading'" class="sss-status">
      <span class="sss-spinner-lg">◌</span>
      <span>Searching the web for spatial endpoints…</span>
    </div>
    <div v-else-if="status === 'error'" class="sss-error">
      ✗ {{ errorMsg }}
    </div>

    <!-- ── Results ────────────────────────────────────────────────── -->
    <div v-if="results.length > 0" class="sss-results">
      <div class="sss-results-hdr">
        <span>{{ results.length }} layer{{ results.length !== 1 ? 's' : '' }} found</span>
        <span v-if="recommendStatus === 'loading'" class="sss-rec-loading">
          <span class="sss-spinner">◌</span> AI analysing…
        </span>
      </div>

      <div class="sss-cards">
        <div
          v-for="(r, idx) in results"
          :key="r.url"
          class="sss-card"
          :class="{
            'sss-card--dead': r.alive === false,
            'sss-card--high': r.confidence === 'high',
          }"
        >
          <!-- confidence badge -->
          <div class="sss-card-badges">
            <span class="sss-badge" :class="`sss-badge--${r.confidence}`">{{ r.confidence }}</span>
            <span v-if="r.alive === false" class="sss-badge sss-badge--dead">unreachable</span>
            <span v-if="r.serviceType" class="sss-badge sss-badge--type">{{ r.serviceType }}</span>
          </div>

          <div class="sss-card-body">
            <h3 class="sss-card-name">{{ r.name }}</h3>
            <p v-if="r.description" class="sss-card-desc">{{ r.description }}</p>
            <a :href="r.sourceUrl" target="_blank" rel="noopener" class="sss-card-source">
              {{ r.source }} ↗
            </a>

            <!-- AI recommendation -->
            <div v-if="recommendations[String(idx + 1)]" class="sss-recommendation">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              {{ recommendations[String(idx + 1)] }}
            </div>

            <!-- Probe metadata -->
            <div class="sss-card-meta">
              <span v-if="r.featureCount != null">
                <strong>{{ r.featureCount.toLocaleString() }}</strong> features
              </span>
              <span v-if="r.bbox" class="sss-card-bbox">
                bbox {{ r.bbox.ymin.toFixed(2) }},{{ r.bbox.xmin.toFixed(2) }} →
                {{ r.bbox.ymax.toFixed(2) }},{{ r.bbox.xmax.toFixed(2) }}
              </span>
            </div>

            <div class="sss-card-url">{{ r.url }}</div>
          </div>

          <!-- Actions -->
          <div class="sss-card-actions">
            <a
              :href="`/tools/esri-rest-downloader?url=${encodeURIComponent(r.url)}`"
              class="sss-action-link"
              target="_blank"
            >
              Open in Downloader ↗
            </a>
            <UButton variant="outline" size="sm" @click="copyUrl(r.url)">
              {{ copied === r.url ? '✓ Copied' : 'Copy URL' }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Empty state ────────────────────────────────────────────── -->
    <div v-else-if="status === 'done' && results.length === 0" class="sss-empty">
      No endpoints found for "{{ lastQuery }}". Try a different query or location.
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import UButton from '~/components/ui/Button.vue'

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap' },
  ],
})

interface SpatialLayerResult {
  name: string
  url: string
  serviceType: string
  layerId: number | null
  description: string
  source: string
  sourceUrl: string
  confidence: 'high' | 'medium' | 'low'
  alive?: boolean
  featureCount?: number | null
  bbox?: { xmin: number; ymin: number; xmax: number; ymax: number } | null
  fields?: string[]
}

const query    = ref('')
const lastQuery = ref('')
const results  = ref<SpatialLayerResult[]>([])
const status   = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMsg = ref('')
const copied   = ref('')

const recommendations  = ref<Record<string, string>>({})
const recommendStatus  = ref<'idle' | 'loading' | 'done'>('idle')

const examples = [
  'Heritage sites in Brisbane',
  'Flood zones Sydney CBD',
  'Vegetation mapping Queensland',
  'Planning zones Melbourne',
]

const search = async () => {
  if (!query.value.trim()) return
  lastQuery.value = query.value.trim()
  results.value = []
  recommendations.value = {}
  status.value = 'loading'
  errorMsg.value = ''

  try {
    const data = await $fetch<{ results: SpatialLayerResult[] }>('/api/spatial-search/discover', {
      query: { q: lastQuery.value },
    })
    results.value = data.results ?? []
    status.value = 'done'

    // Fire AI recommendation in background (non-blocking)
    if (results.value.length > 0) {
      getRecommendations()
    }
  } catch (e: any) {
    status.value  = 'error'
    errorMsg.value = e?.data?.message ?? e?.message ?? 'Search failed'
  }
}

const getRecommendations = async () => {
  recommendStatus.value = 'loading'
  try {
    const data = await $fetch<{ recommendations: Record<string, string> }>('/api/spatial-search/recommend', {
      query: {
        q: lastQuery.value,
        layers: JSON.stringify(results.value.map(r => ({
          name: r.name,
          url: r.url,
          source: r.source,
          featureCount: r.featureCount,
          description: r.description,
          confidence: r.confidence,
        }))),
      },
    })
    recommendations.value = data.recommendations ?? {}
    recommendStatus.value = 'done'
  } catch {
    recommendStatus.value = 'done'
  }
}

const copyUrl = async (url: string) => {
  await navigator.clipboard.writeText(url)
  copied.value = url
  setTimeout(() => { copied.value = '' }, 2000)
}
</script>

<style scoped>
.sss-root {
  min-height: 100vh;
  background: #ffffff;
}

.sss-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
  font-family: 'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: hsl(var(--foreground));
  min-height: 100vh;
  background: #ffffff;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.sss-header {
  padding-bottom: 1.25rem;
  border-bottom: 1px solid hsl(var(--border));
  margin-bottom: 1.75rem;
}
.sss-title {
  font-size: 1rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 0.2rem;
  letter-spacing: 0.01em;
}
.sss-subtitle {
  font-size: 0.72rem;
  color: hsl(var(--muted-foreground));
  margin: 0;
}

/* ── Search ──────────────────────────────────────────────────────────────── */
.sss-search-wrap { margin-bottom: 1.75rem; }

.sss-search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  padding: 0.35rem 0.6rem;
  margin-bottom: 0.65rem;
  transition: border-color 0.15s;
}
.sss-search-box:focus-within {
  border-color: hsl(var(--ring));
}

.sss-search-icon {
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.sss-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: hsl(var(--foreground));
  font-size: 0.875rem;
  font-family: inherit;
}
.sss-search-input::placeholder {
  color: hsl(var(--muted-foreground));
}

.sss-clear {
  background: none;
  border: none;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
  padding: 2px;
  display: flex;
  border-radius: 4px;
}
.sss-clear:hover { color: hsl(var(--foreground)); }

.sss-chips {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.sss-chip-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
}
.sss-chip {
  border-radius: 999px !important;
  font-size: 0.72rem !important;
  height: auto !important;
  padding: 0.2rem 0.65rem !important;
}

/* ── Status ──────────────────────────────────────────────────────────────── */
.sss-status {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
  padding: 2rem 0;
  justify-content: center;
}
.sss-error {
  color: hsl(var(--destructive));
  font-size: 0.875rem;
  padding: 1rem 0;
}
.sss-empty {
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
  padding: 2rem 0;
  text-align: center;
}

/* ── Spinner ─────────────────────────────────────────────────────────────── */
.sss-spinner { display: inline-block; animation: sss-spin 1s linear infinite; }
.sss-spinner-lg { font-size: 1.5rem; display: inline-block; animation: sss-spin 1s linear infinite; }
@keyframes sss-spin { to { transform: rotate(360deg); } }

/* ── Results header ──────────────────────────────────────────────────────── */
.sss-results-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
  margin-bottom: 0.75rem;
}
.sss-rec-loading {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: hsl(var(--muted-foreground));
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

/* ── Cards ───────────────────────────────────────────────────────────────── */
.sss-cards { display: flex; flex-direction: column; gap: 0.75rem; }

.sss-card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  padding: 1rem 1.1rem;
  transition: border-color 0.15s;
}
.sss-card:hover { border-color: hsl(var(--ring) / 0.4); }
.sss-card--dead { opacity: 0.5; }
.sss-card--high { border-left: 3px solid hsl(142 71% 45%); }

/* ── Badges ──────────────────────────────────────────────────────────────── */
.sss-card-badges {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.55rem;
  flex-wrap: wrap;
}
.sss-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid transparent;
}
.sss-badge--high   { background: hsl(142 71% 45% / 0.15); color: hsl(142 71% 55%); border-color: hsl(142 71% 45% / 0.3); }
.sss-badge--medium { background: hsl(38 92% 50% / 0.12);  color: hsl(38 92% 60%);  border-color: hsl(38 92% 50% / 0.3); }
.sss-badge--low    { background: hsl(var(--muted));        color: hsl(var(--muted-foreground)); border-color: hsl(var(--border)); }
.sss-badge--dead   { background: hsl(var(--destructive) / 0.12); color: hsl(var(--destructive)); border-color: hsl(var(--destructive) / 0.3); }
.sss-badge--type   { background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); border-color: hsl(var(--border)); }

/* ── Card body ───────────────────────────────────────────────────────────── */
.sss-card-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: hsl(var(--card-foreground));
  margin: 0 0 0.25rem;
}
.sss-card-desc {
  font-size: 0.78rem;
  color: hsl(var(--muted-foreground));
  margin: 0 0 0.3rem;
  line-height: 1.5;
}
.sss-card-source {
  font-size: 0.72rem;
  color: hsl(var(--muted-foreground));
  text-decoration: underline;
  text-underline-offset: 2px;
  display: inline-block;
  margin-bottom: 0.45rem;
}
.sss-card-source:hover { color: hsl(var(--foreground)); }

.sss-recommendation {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: calc(var(--radius) - 2px);
  padding: 0.45rem 0.6rem;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  margin: 0.4rem 0;
  line-height: 1.5;
}
.sss-recommendation svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: hsl(var(--muted-foreground));
}

.sss-card-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.72rem;
  color: hsl(var(--muted-foreground));
  margin: 0.3rem 0;
  flex-wrap: wrap;
}
.sss-card-meta strong { color: hsl(var(--foreground)); }

.sss-card-url {
  font-size: 0.65rem;
  color: hsl(var(--muted-foreground) / 0.6);
  word-break: break-all;
  margin-top: 0.25rem;
  font-family: monospace;
}

/* ── Card actions ────────────────────────────────────────────────────────── */
.sss-card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.sss-action-link {
  display: inline-flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: calc(var(--radius) - 2px);
  font-size: 0.75rem;
  font-weight: 500;
  font-family: inherit;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  text-decoration: none;
  transition: opacity 0.15s;
}
.sss-action-link:hover { opacity: 0.9; }
</style>
