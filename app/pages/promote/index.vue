<template>
  <div class="promote-dashboard">

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar__brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
          <line x1="12" y1="2" x2="12" y2="22"/>
          <path d="M2 8.5l10 6.5 10-6.5"/>
        </svg>
        <span>Promote</span>
      </div>
      <nav class="sidebar__nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="sidebar__link"
          :class="{ 'sidebar__link--active': activeTab === tab.id }"
          @click="activeTab = tab.id as 'overview' | 'campaigns'"
        >
          <span class="sidebar__link-icon" v-html="tab.icon"></span>
          {{ tab.label }}
          <span v-if="tab.badge" class="sidebar__badge">{{ tab.badge }}</span>
        </button>
      </nav>

      <div class="sidebar__footer">
        <a href="vscode://file/c:/Luma/heenco.github.io/promote.md" class="sidebar__docs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          promote.md
        </a>
      </div>
    </aside>

    <!-- Main content -->
    <main class="dashboard-main">

      <!-- Header bar -->
      <header class="dash-header">
        <div>
          <h1 class="dash-title">{{ currentTabLabel }}</h1>
          <p class="dash-subtitle" v-if="activeTab === 'overview'">{{ campaigns.length }} campaign{{ campaigns.length !== 1 ? 's' : '' }} · {{ pendingCount }} pending action{{ pendingCount !== 1 ? 's' : '' }}</p>
        </div>
        <button class="btn-primary" @click="showNewCampaign = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Campaign
        </button>
      </header>

      <!-- Loading -->
      <div v-if="pending" class="loading-state">
        <div class="spinner"></div>
        <p>Loading campaigns…</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="error-state">
        <p>{{ error.message }}</p>
      </div>

      <template v-else>

        <!-- OVERVIEW TAB -->
        <div v-if="activeTab === 'overview'" class="tab-content">

          <!-- Pending actions -->
          <section v-if="allPendingActions.length" class="pending-section">
            <h2 class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Pending Actions
            </h2>
            <div class="pending-list">
              <div v-for="action in allPendingActions" :key="action.key" class="pending-item">
                <span class="pending-item__bullet">👤</span>
                <div class="pending-item__content">
                  <span class="pending-item__task">{{ action.task }}</span>
                  <span class="pending-item__meta">{{ action.campaignName }} · Phase {{ action.phase }}</span>
                </div>
                <span class="pending-item__cmd" v-if="action.cmd">{{ action.cmd }}</span>
              </div>
            </div>
          </section>

          <!-- Stats row -->
          <div class="stats-row">
            <div class="stat-card">
              <span class="stat-card__value">{{ campaigns.length }}</span>
              <span class="stat-card__label">Campaigns</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">{{ totalVideos }}</span>
              <span class="stat-card__label">Videos planned</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">{{ publishedVideos }}</span>
              <span class="stat-card__label">Published</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value stat-card__value--warn">{{ pendingCount }}</span>
              <span class="stat-card__label">Pending actions</span>
            </div>
          </div>

          <!-- Campaign cards -->
          <section class="campaigns-section">
            <h2 class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
              All Campaigns
            </h2>

            <div v-if="campaigns.length === 0" class="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
              <p>No campaigns yet. Create your first one.</p>
              <button class="btn-primary" @click="showNewCampaign = true">+ New Campaign</button>
            </div>

            <div class="campaigns-grid" v-else>
              <div
                v-for="c in campaigns"
                :key="c.id"
                class="campaign-card"
                :class="{ 'campaign-card--expanded': expandedId === c.id }"
              >
                <div class="campaign-card__header" @click="toggle(c.id)">
                  <div class="campaign-card__meta">
                    <span class="campaign-card__id">#{{ c.id }}</span>
                    <span class="campaign-card__type-badge">{{ c.type }}</span>
                  </div>
                  <div class="campaign-card__title-row">
                    <h3 class="campaign-card__name">{{ c.name }}</h3>
                    <span class="status-pill" :class="`status-pill--${c.status}`">{{ statusLabel(c.status) }}</span>
                  </div>
                  <p class="campaign-card__month">{{ formatMonth(c.month) }}</p>

                  <!-- Phase progress bar -->
                  <div class="phase-progress">
                    <div class="phase-progress__bar">
                      <div
                        class="phase-progress__fill"
                        :style="{ width: phasePercent(c) + '%' }"
                      ></div>
                    </div>
                    <span class="phase-progress__label">Phase {{ currentPhase(c) }} of 8</span>
                  </div>

                  <!-- Quick stats -->
                  <div class="campaign-card__quick-stats">
                    <span>{{ c.videos?.length ?? 0 }} videos</span>
                    <span>·</span>
                    <span>{{ publishedCount(c) }} published</span>
                    <span>·</span>
                    <span>{{ c.audiences?.length ?? 0 }} audiences</span>
                  </div>

                  <div class="campaign-card__chevron">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline :points="expandedId === c.id ? '18 15 12 9 6 15' : '6 9 12 15 18 9'"/>
                    </svg>
                  </div>
                </div>

                <!-- Expanded detail -->
                <div v-if="expandedId === c.id" class="campaign-card__detail">
                  <div class="detail-grid">

                    <!-- Phase checklist -->
                    <div class="detail-col">
                      <h4 class="detail-col__title">Pipeline Phases</h4>
                      <div class="phase-list">
                        <div
                          v-for="phase in phaseList"
                          :key="phase.key"
                          class="phase-item"
                          :class="`phase-item--${getPhaseStatus(c, phase.key)}`"
                        >
                          <span class="phase-item__icon">{{ phaseIcon(getPhaseStatus(c, phase.key)) }}</span>
                          <div class="phase-item__body">
                            <span class="phase-item__label">{{ phase.label }}</span>
                            <div v-if="getPhaseTasks(phase.key).length" class="phase-item__tasks">
                              <span
                                v-for="task in getPhaseTasks(phase.key)"
                                :key="task"
                                class="phase-item__task"
                              >{{ task }}</span>
                            </div>
                          </div>
                          <div class="phase-item__actions">
                            <!-- Run button for automatable phases -->
                            <button
                              v-if="phase.action"
                              class="phase-item__run"
                              :class="{ 'phase-item__run--running': runningKey === `${c.id}-${phase.key}` }"
                              :disabled="runningKey === `${c.id}-${phase.key}`"
                              @click.stop="runAction(c, phase)"
                              :title="`Run: ${phase.action}`"
                            >
                              <span v-if="runningKey === `${c.id}-${phase.key}`">⏳</span>
                              <span v-else>▶</span>
                            </button>
                            <button
                              class="phase-item__toggle"
                              @click.stop="cyclePhase(c, phase.key)"
                              :title="`Advance status`"
                            >
                              {{ getPhaseStatus(c, phase.key) === 'done' ? '↩ Undo' : getPhaseStatus(c, phase.key) === 'in-progress' ? '✓ Done' : 'Start' }}
                            </button>
                          </div>
                        </div>
                      </div>

                      <!-- Run output terminal -->
                      <div v-if="terminalOutput[c.id]" class="run-terminal">
                        <div class="run-terminal__header">
                          <span>{{ terminalOutput[c.id]?.action }}</span>
                          <span :class="terminalOutput[c.id]?.ok ? 'run-terminal__ok' : 'run-terminal__fail'">
                            {{ terminalOutput[c.id]?.ok ? '✓ success' : '✗ failed' }}
                          </span>
                          <button class="run-terminal__close" @click.stop="delete terminalOutput[c.id]">✕</button>
                        </div>
                        <pre class="run-terminal__body">{{ terminalOutput[c.id]?.stdout || terminalOutput[c.id]?.stderr || '(no output)' }}</pre>
                      </div>

                      <div class="phase-editor-note">
                        ▶ runs the phase action · Start/Done advances the phase status
                      </div>
                    </div>

                    <!-- Videos -->
                    <div class="detail-col">
                      <h4 class="detail-col__title">Videos</h4>
                      <div class="video-list">
                        <div
                          v-for="v in c.videos"
                          :key="v.id"
                          class="video-item"
                          :class="`video-item--${v.status}`"
                        >
                          <div class="video-item__header">
                            <span class="video-item__id">{{ v.id?.toUpperCase() }}</span>
                            <span class="video-item__format">{{ v.format }}</span>
                            <span class="status-pill status-pill--sm" :class="`status-pill--${v.status}`">{{ statusLabel(v.status) }}</span>
                          </div>
                          <p class="video-item__title">{{ v.title || '(no title set)' }}</p>
                          <div class="video-item__meta">
                            <span class="video-item__audience">{{ v.audience }}</span>
                            <span v-if="v.abTest" class="video-item__abtag">A/B</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Audiences & info -->
                    <div class="detail-col">
                      <h4 class="detail-col__title">Details</h4>
                      <div class="info-table">
                        <div class="info-row">
                          <span class="info-label">URL</span>
                          <a :href="c.url" target="_blank" rel="noopener" class="info-value info-value--link">{{ c.url }}</a>
                        </div>
                        <div class="info-row">
                          <span class="info-label">Month</span>
                          <span class="info-value">{{ formatMonth(c.month) }}</span>
                        </div>
                        <div class="info-row">
                          <span class="info-label">Audiences</span>
                          <div class="info-value info-value--tags">
                            <span v-for="a in c.audiences" :key="a" class="audience-tag">{{ a }}</span>
                          </div>
                        </div>
                        <div class="info-row" v-if="c.recordingCmd">
                          <span class="info-label">Recording</span>
                          <code class="info-value info-value--code">{{ c.recordingCmd }}</code>
                        </div>
                      </div>

                      <!-- Phase status editor -->
                      <div class="phase-editor-note">
                        Click a phase → ▶ Start → ✓ Done to advance it.
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- CAMPAIGNS TAB (alias to overview but scrolled) -->
        <div v-if="activeTab === 'campaigns'" class="tab-content">
          <div class="campaigns-grid">
            <div
              v-for="c in campaigns"
              :key="c.id"
              class="campaign-card"
              :class="{ 'campaign-card--expanded': expandedId === c.id }"
            >
              <!-- same card structure -->
              <div class="campaign-card__header" @click="toggle(c.id)">
                <div class="campaign-card__meta">
                  <span class="campaign-card__id">#{{ c.id }}</span>
                  <span class="campaign-card__type-badge">{{ c.type }}</span>
                </div>
                <div class="campaign-card__title-row">
                  <h3 class="campaign-card__name">{{ c.name }}</h3>
                  <span class="status-pill" :class="`status-pill--${c.status}`">{{ statusLabel(c.status) }}</span>
                </div>
                <p class="campaign-card__month">{{ formatMonth(c.month) }}</p>
                <div class="phase-progress">
                  <div class="phase-progress__bar">
                    <div class="phase-progress__fill" :style="{ width: phasePercent(c) + '%' }"></div>
                  </div>
                  <span class="phase-progress__label">Phase {{ currentPhase(c) }} of 8</span>
                </div>
                <div class="campaign-card__quick-stats">
                  <span>{{ c.videos?.length ?? 0 }} videos</span>
                  <span>·</span>
                  <span>{{ publishedCount(c) }} published</span>
                </div>
                <div class="campaign-card__chevron">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline :points="expandedId === c.id ? '18 15 12 9 6 15' : '6 9 12 15 18 9'"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

      </template>
    </main>

    <!-- New Campaign Modal -->
    <Teleport to="body">
      <div v-if="showNewCampaign" class="modal-overlay" @click.self="showNewCampaign = false">
        <div class="modal">
          <div class="modal__header">
            <h2>New Campaign</h2>
            <button class="modal__close" @click="showNewCampaign = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form class="modal__form" @submit.prevent="createCampaign">

            <!-- Type -->
            <div class="form-field">
              <label class="form-label">Content type</label>
              <div class="type-picker">
                <button
                  v-for="t in contentTypes"
                  :key="t.id"
                  type="button"
                  class="type-btn"
                  :class="{ 'type-btn--active': form.type === t.id }"
                  @click="form.type = t.id"
                >
                  <span v-html="t.icon"></span>
                  {{ t.label }}
                </button>
              </div>
            </div>

            <!-- Name -->
            <div class="form-field">
              <label class="form-label" for="camp-name">Name <span class="form-required">*</span></label>
              <input
                id="camp-name"
                v-model="form.name"
                class="form-input"
                placeholder="e.g. Overture Downloader"
                required
                @input="autoSlug"
              />
            </div>

            <!-- Slug -->
            <div class="form-field">
              <label class="form-label" for="camp-slug">Slug <span class="form-required">*</span></label>
              <input
                id="camp-slug"
                v-model="form.slug"
                class="form-input form-input--mono"
                placeholder="e.g. overture-downloader"
                required
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
              />
            </div>

            <!-- URL -->
            <div class="form-field">
              <label class="form-label" for="camp-url">URL <span class="form-required">*</span></label>
              <input
                id="camp-url"
                v-model="form.url"
                class="form-input"
                type="url"
                placeholder="https://heenco.io/tools/..."
                required
              />
            </div>

            <!-- Month -->
            <div class="form-field">
              <label class="form-label" for="camp-month">Month <span class="form-required">*</span></label>
              <input
                id="camp-month"
                v-model="form.month"
                class="form-input"
                type="month"
                required
              />
            </div>

            <!-- Video formats -->
            <div class="form-field">
              <label class="form-label">Video formats <span class="form-hint">— one video generated per format</span></label>
              <div class="audience-picker">
                <label
                  v-for="f in formatOptions"
                  :key="f.id"
                  class="audience-option"
                  :class="{ 'audience-option--selected': form.formats.includes(f.id) }"
                >
                  <input
                    type="checkbox"
                    :value="f.id"
                    v-model="form.formats"
                    class="audience-checkbox"
                  />
                  <div>
                    <span class="audience-option__label">
                      {{ f.label }}
                      <span v-if="f.needsRecording" class="format-badge format-badge--rec">● recording</span>
                      <span v-if="f.aiOnly" class="format-badge format-badge--ai">✦ AI only</span>
                    </span>
                    <span class="audience-option__desc">{{ f.desc }}</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Audiences -->
            <div class="form-field">
              <label class="form-label">Target audiences</label>
              <div class="audience-picker">
                <label
                  v-for="a in audienceOptions"
                  :key="a.id"
                  class="audience-option"
                  :class="{ 'audience-option--selected': form.audiences.includes(a.id) }"
                >
                  <input
                    type="checkbox"
                    :value="a.id"
                    v-model="form.audiences"
                    class="audience-checkbox"
                  />
                  <div>
                    <span class="audience-option__label">{{ a.label }}</span>
                    <span class="audience-option__desc">{{ a.desc }}</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Error -->
            <div v-if="createError" class="form-error">{{ createError }}</div>

            <div class="modal__actions">
              <button type="button" class="btn-secondary" @click="showNewCampaign = false">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="creating">
                <span v-if="creating">Creating…</span>
                <span v-else>Create Campaign</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Promote Dashboard · Heenco' })

// ─── Types ───────────────────────────────────────────────────────────────────

interface Video {
  id: string
  format: string
  audience: string
  title: string
  selectedScript: string | null
  abTest: boolean
  youtubeIds: Record<string, string | null>
  winnerHook?: string | null
  status: string
}

interface Campaign {
  id: string
  type: string
  name: string
  slug: string
  url: string
  month: string
  recordingCmd: string | null
  recordingSrc: string | null
  audiences: string[]
  phases: Record<string, string>
  pendingActions: string[]
  videos: Video[]
  status: string
  createdAt?: string
}

// ─── Data ────────────────────────────────────────────────────────────────────

const { data: campaigns, pending, error, refresh } = await useFetch<Campaign[]>('/api/promote/campaigns', {
  default: () => [],
})

// ─── Navigation ──────────────────────────────────────────────────────────────

const activeTab = ref<'overview' | 'campaigns'>('overview')

const tabs = computed(() => [
  {
    id: 'overview',
    label: 'Overview',
    badge: null,
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></rect></svg>`,
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    badge: campaigns.value?.length || null,
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  },
])

const currentTabLabel = computed(() => tabs.value.find(t => t.id === activeTab.value)?.label ?? '')

// ─── Phase definitions ────────────────────────────────────────────────────────

const phaseList = [
  { key: '1_setup', label: '1. Setup', action: null, tasks: ['Create campaign folder', 'FFmpeg check', 'Music library', 'Thumbnail templates'] },
  { key: '2_recording', label: '2. Recording', action: 'record', tasks: ['Run Playwright', 'Confirm WebM output', 'Copy to campaign folder'] },
  { key: '3_scripts', label: '3. Strategy', action: 'parse-strategy', tasks: ['Prepare VideoStrategy.json', 'Parse strategy into scripts', 'Review generated scripts and campaign.json'] },
  { key: '4_assets', label: '4. Assets', action: 'generate-assets', tasks: ['Music selection', 'Voiceover (ElevenLabs)', 'AI images', 'Captions', 'Thumbnails'] },
  { key: '5_assembly', label: '5. Assembly', action: 'process-video', tasks: ['Assemble final videos per format', 'Spot-check outputs'] },
  { key: '6_youtube', label: '6. YouTube', action: 'youtube-upload', tasks: ['OAuth setup', 'Upload unlisted', 'Run A/B experiment', 'Publish winner'] },
  { key: '7_distribution', label: '7. Distribution', action: null, tasks: ['Metricool schedule', 'Cross-post V1-V6'] },
  { key: '8_reporting', label: '8. Reporting', action: null, tasks: ['Capture final stats', 'Update campaign.json'] },
]

function getPhaseTasks(key: string): string[] {
  return phaseList.find(p => p.key === key)?.tasks ?? []
}

function getPhaseStatus(c: Campaign, key: string): string {
  return c.phases?.[key] ?? 'not-started'
}

function phaseIcon(status: string): string {
  if (status === 'done') return '✅'
  if (status === 'in-progress') return '🔄'
  return '⬜'
}

function currentPhase(c: Campaign): number {
  if (!c.phases) return 0
  const order = ['1_setup', '2_recording', '3_scripts', '4_assets', '5_assembly', '6_youtube', '7_distribution', '8_reporting']
  let last = 0
  for (let i = 0; i < order.length; i++) {
    if (c.phases[order[i]!] === 'done') last = i + 1
    else if (c.phases[order[i]!] === 'in-progress') return i + 1
  }
  return last + 1 <= 8 ? last + 1 : 8
}

function phasePercent(c: Campaign): number {
  if (!c.phases) return 0
  const values = Object.values(c.phases)
  const done = values.filter(v => v === 'done').length
  return Math.round((done / 8) * 100)
}

// ─── Phase editing ───────────────────────────────────────────────────────────

async function cyclePhase(c: Campaign, key: string) {
  const current = c.phases?.[key] ?? 'not-started'
  const next = current === 'not-started' ? 'in-progress' : current === 'in-progress' ? 'done' : 'not-started'

  if (!c.phases) c.phases = {}
  c.phases[key] = next

  // Persist via PATCH (best effort — future endpoint)
  try {
    await $fetch(`/api/promote/campaigns/${c.id}/phases`, {
      method: 'POST',
      body: { key, value: next },
    })
  } catch {
    // Phase update persists in memory for the session; full persistence needs endpoint
  }
}

// ─── Script runner ────────────────────────────────────────────────────────────

const runningKey = ref<string | null>(null)
const terminalOutput = reactive<Record<string, { ok: boolean; action: string; stdout: string; stderr: string }>>({})

async function runAction(c: Campaign, phase: { key: string; action: string | null }) {
  if (!phase.action) return
  const key = `${c.id}-${phase.key}`
  runningKey.value = key
  try {
    const result = await $fetch<{ ok: boolean; action: string; stdout: string; stderr: string }>('/api/promote/run', {
      method: 'POST',
      body: { campaignId: c.id, action: phase.action },
    })
    terminalOutput[c.id] = result
    if (result.ok) {
      // Auto-advance phase to in-progress on successful run
      if ((c.phases?.[phase.key] ?? 'not-started') === 'not-started') {
        await cyclePhase(c, phase.key)
      }
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    terminalOutput[c.id] = {
      ok: false,
      action: phase.action,
      stdout: '',
      stderr: err?.data?.message ?? err?.message ?? 'Request failed',
    }
  } finally {
    runningKey.value = null
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

const totalVideos = computed(() => (campaigns.value ?? []).reduce((n, c) => n + (c.videos?.length ?? 0), 0))
const publishedVideos = computed(() => (campaigns.value ?? []).reduce((n, c) => n + publishedCount(c), 0))
const pendingCount = computed(() => allPendingActions.value.length)

function publishedCount(c: Campaign): number {
  return (c.videos ?? []).filter(v => v.status === 'published').length
}

// ─── Pending actions ─────────────────────────────────────────────────────────

const MANUAL_PHASE_TASKS: Record<string, { task: string; cmd?: string }[]> = {
  '1_setup': [
    { task: 'Confirm FFmpeg is installed', cmd: 'ffmpeg -version' },
    { task: 'Build music library (promote/assets/music/)' },
    { task: 'Create thumbnail HTML templates' },
    { task: 'Place Heenco logo PNG for outro (promote/assets/logo_outro.png)' },
  ],
  '2_recording': [
    { task: 'Symlink/copy WebM to campaign folder as recording.webm' },
  ],
  '3_scripts': [
    { task: 'Create or paste VideoStrategy.json in the campaign folder' },
    { task: 'Run parse strategy from the dashboard' },
    { task: 'Review generated scripts (promote/campaigns/{id}/scripts/)' },
  ],
  '4_assets': [
    { task: 'Add HF_TOKEN to .env for AI image generation' },
    { task: 'Set up ElevenLabs free tier', cmd: 'elevenlabs.io' },
    { task: 'Add ELEVENLABS_API_KEY to .env' },
    { task: 'Add GROQ_API_KEY to .env for captioning and music selection' },
  ],
  '5_assembly': [
    { task: 'Spot-check all output videos (promote/campaigns/{id}/output/)' },
  ],
  '6_youtube': [
    { task: 'Google Cloud project + YouTube API + OAuth setup' },
    { task: 'Open YouTube Studio → run A/B experiment on V1' },
    { task: 'Wait 7–14 days, then check stats' },
  ],
  '7_distribution': [
    { task: 'Sign up for Metricool (free tier)' },
    { task: 'Connect: Instagram, LinkedIn, Twitter/X in Metricool' },
    { task: 'Schedule posts for all platforms' },
  ],
  '8_reporting': [
    { task: 'Capture final YouTube analytics' },
    { task: 'Update campaign.json with results' },
    { task: 'Add changelog entry to promote.md' },
  ],
}

const allPendingActions = computed(() => {
  const actions: { key: string; campaignName: string; phase: string; task: string; cmd?: string }[] = []

  for (const c of (campaigns.value ?? [])) {
    for (const phase of phaseList) {
      const status = getPhaseStatus(c, phase.key)
      if (status === 'in-progress') {
        const tasks = MANUAL_PHASE_TASKS[phase.key] ?? []
        for (const t of tasks) {
          actions.push({
            key: `${c.id}-${phase.key}-${t.task}`,
            campaignName: c.name,
            phase: phase.label,
            task: t.task.replace('{id}', c.id),
            cmd: t.cmd,
          })
        }
      }
    }
  }

  return actions
})

// ─── Card expand/collapse ────────────────────────────────────────────────────

const expandedId = ref<string | null>(null)

function toggle(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    'not-started': 'Not started',
    'in-progress': 'In progress',
    done: 'Done',
    published: 'Published',
  }
  return map[s] ?? s
}

function formatMonth(m: string): string {
  if (!m) return ''
  const [year, month] = m.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

// ─── New campaign form ───────────────────────────────────────────────────────

const showNewCampaign = ref(false)
const creating = ref(false)
const createError = ref('')

const DEFAULT_FORMATS: Record<string, string[]> = {
  tool:    ['demo', 'problem-story', 'hook-teaser'],
  map:     ['demo', 'problem-story', 'hook-teaser'],
  article: ['explainer', 'problem-story', 'hook-teaser'],
  video:   ['explainer', 'hook-teaser'],
}

const form = ref({
  type: 'tool' as string,
  name: '',
  slug: '',
  url: '',
  month: new Date().toISOString().slice(0, 7),
  audiences: [] as string[],
  formats: ['demo', 'problem-story', 'hook-teaser'] as string[],
})

// Auto-update default formats when content type changes
watch(() => form.value.type, (t) => {
  form.value.formats = [...(DEFAULT_FORMATS[t] ?? ['demo', 'problem-story', 'hook-teaser'])]
})

const formatOptions = [
  {
    id: 'demo',
    label: 'Demo',
    desc: 'Screen recording with narration. Shows the tool in action. Requires Playwright recording.',
    needsRecording: true,
    aiOnly: false,
  },
  {
    id: 'problem-story',
    label: 'Problem story',
    desc: 'Narrates the audience pain point. No recording needed — pure voiceover + text cards.',
    needsRecording: false,
    aiOnly: true,
  },
  {
    id: 'explainer',
    label: 'Explainer',
    desc: 'Educational context — "What is X and why does it matter?". Slides + voiceover.',
    needsRecording: false,
    aiOnly: true,
  },
  {
    id: 'hook-teaser',
    label: 'Hook teaser',
    desc: 'Bold text + music only, 15–20s. For TikTok/Reels silent autoplay. No voice needed.',
    needsRecording: false,
    aiOnly: true,
  },
  {
    id: 'data-story',
    label: 'Data story',
    desc: 'Surprising stat → insight → tool reveal. Stat card + voiceover. No recording needed.',
    needsRecording: false,
    aiOnly: true,
  },
]

const contentTypes = [
  {
    id: 'tool',
    label: 'Tool',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/></svg>`,
  },
  {
    id: 'map',
    label: 'Map',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  },
  {
    id: 'article',
    label: 'Article',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  },
  {
    id: 'video',
    label: 'Video',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
  },
]

const audienceOptions = [
  { id: 'gis-students', label: 'GIS students & academics', desc: 'ArcGIS/QGIS users, free data focus' },
  { id: 'urban-planners', label: 'Urban planners', desc: 'POI + building data for study areas' },
  { id: 'env-consultants', label: 'Environmental consultants', desc: 'Land-use + place data for EIS' },
  { id: 'heritage-consultants', label: 'Heritage consultants', desc: 'Rapid site context globally' },
  { id: 'eco-consultants', label: 'Ecological consultants', desc: 'Background layers without ArcGIS credits' },
  { id: 'site-selectors', label: 'Business site selectors', desc: 'Competition mapping, catchment analysis' },
  { id: 'nocode-gis', label: 'No-code GIS users', desc: 'Non-technical map enthusiasts' },
  { id: 'developers', label: 'Developers', desc: 'API / CLI users, data pipeline builders' },
  { id: 'data-scientists', label: 'Data scientists', desc: 'Python, spatial analytics' },
]

function autoSlug() {
  form.value.slug = form.value.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

async function createCampaign() {
  createError.value = ''
  creating.value = true
  try {
    await $fetch('/api/promote/campaigns', {
      method: 'POST',
      body: form.value,
    })
    showNewCampaign.value = false
    form.value = { type: 'tool', name: '', slug: '', url: '', month: new Date().toISOString().slice(0, 7), audiences: [], formats: ['demo', 'problem-story', 'hook-teaser'] }
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    createError.value = err?.data?.message ?? err?.message ?? 'Failed to create campaign'
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────────── */

.promote-dashboard {
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
  font-family: var(--font-family);
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 0;
  position: sticky;
  top: 0;
  height: 100vh;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0 1.25rem 1.25rem;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 700;
  font-size: 0.9375rem;
  color: #1a1a1a;
  letter-spacing: -0.01em;
}

.sidebar__nav {
  flex: 1;
  padding: 0.875rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #555;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background 0.15s, color 0.15s;
  position: relative;
}

.sidebar__link:hover {
  background: #f5f5f5;
  color: #1a1a1a;
}

.sidebar__link--active {
  background: #f0f9ff;
  color: #0ea5e9;
  font-weight: 600;
}

.sidebar__link-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.sidebar__badge {
  margin-left: auto;
  background: #e8e8e8;
  color: #555;
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-weight: 600;
}

.sidebar__link--active .sidebar__badge {
  background: #bae6fd;
  color: #0284c7;
}

.sidebar__footer {
  padding: 0.875rem 1.25rem 0;
  border-top: 1px solid #f0f0f0;
}

.sidebar__docs {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  color: #888;
  text-decoration: none;
  transition: color 0.15s;
}

.sidebar__docs:hover {
  color: #0ea5e9;
}

/* ── Main ────────────────────────────────────────────────────────────────── */

.dashboard-main {
  flex: 1;
  min-width: 0;
  padding: 2rem;
  max-width: 1200px;
}

.dash-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.75rem;
  gap: 1rem;
}

.dash-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.dash-subtitle {
  font-size: 0.875rem;
  color: #888;
  margin-top: 0.25rem;
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #1a1a1a;
  color: #fff;
  border: none;
  padding: 0.5625rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font-family);
  transition: background 0.15s;
  white-space: nowrap;
}

.btn-primary:hover { background: #333; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  color: #555;
  border: 1px solid #e8e8e8;
  padding: 0.5625rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  font-family: var(--font-family);
  transition: background 0.15s, border-color 0.15s;
}

.btn-secondary:hover {
  background: #f5f5f5;
  border-color: #d0d0d0;
}

/* ── Loading / errors ────────────────────────────────────────────────────── */

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem;
  color: #888;
  font-size: 0.9rem;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid #e8e8e8;
  border-top-color: #1a1a1a;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Pending actions ─────────────────────────────────────────────────────── */

.pending-section {
  margin-bottom: 1.75rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.75rem;
}

.pending-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 0.625rem 0.875rem;
  font-size: 0.8125rem;
}

.pending-item__bullet {
  font-size: 0.875rem;
  flex-shrink: 0;
}

.pending-item__content {
  flex: 1;
  min-width: 0;
}

.pending-item__task {
  display: block;
  font-weight: 500;
  color: #92400e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pending-item__meta {
  display: block;
  color: #b45309;
  font-size: 0.75rem;
  margin-top: 0.125rem;
}

.pending-item__cmd {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  background: #fef3c7;
  color: #92400e;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Stats row ───────────────────────────────────────────────────────────── */

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.75rem;
}

.stat-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 1.125rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-card__value {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.02em;
  line-height: 1;
}

.stat-card__value--warn { color: #d97706; }

.stat-card__label {
  font-size: 0.8125rem;
  color: #888;
  font-weight: 500;
}

/* ── Campaigns ───────────────────────────────────────────────────────────── */

.campaigns-section {
  margin-bottom: 2rem;
}

.campaigns-grid {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3.5rem;
  background: #fff;
  border: 1px dashed #d0d0d0;
  border-radius: 12px;
  color: #888;
  font-size: 0.9rem;
  text-align: center;
}

/* ── Campaign card ───────────────────────────────────────────────────────── */

.campaign-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.campaign-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.campaign-card--expanded { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }

.campaign-card__header {
  padding: 1.125rem 1.25rem;
  cursor: pointer;
  position: relative;
  user-select: none;
}

.campaign-card__meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}

.campaign-card__id {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #888;
  font-family: var(--font-mono);
}

.campaign-card__type-badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #f0f0f0;
  color: #555;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.campaign-card__title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.campaign-card__name {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.campaign-card__month {
  font-size: 0.8125rem;
  color: #888;
  margin-bottom: 0.75rem;
}

.campaign-card__chevron {
  position: absolute;
  right: 1.25rem;
  top: 1.25rem;
  color: #bbb;
}

.campaign-card__quick-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #888;
  margin-top: 0.5rem;
}

/* ── Phase progress bar ──────────────────────────────────────────────────── */

.phase-progress {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.phase-progress__bar {
  flex: 1;
  height: 5px;
  background: #f0f0f0;
  border-radius: 999px;
  overflow: hidden;
}

.phase-progress__fill {
  height: 100%;
  background: #1a1a1a;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.phase-progress__label {
  font-size: 0.75rem;
  color: #888;
  white-space: nowrap;
  font-weight: 500;
}

/* ── Status pills ────────────────────────────────────────────────────────── */

.status-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.status-pill--sm { font-size: 0.65rem; padding: 0.15rem 0.5rem; }

.status-pill--not-started { background: #f0f0f0; color: #888; }
.status-pill--in-progress { background: #dbeafe; color: #1d4ed8; }
.status-pill--done, .status-pill--published { background: #dcfce7; color: #15803d; }

/* ── Expanded detail ─────────────────────────────────────────────────────── */

.campaign-card__detail {
  border-top: 1px solid #f0f0f0;
  padding: 1.25rem;
  background: #fafafa;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1.5rem;
}

.detail-col__title {
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #888;
  margin-bottom: 0.75rem;
}

/* ── Phase list ──────────────────────────────────────────────────────────── */

.phase-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.phase-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border-radius: 7px;
  font-size: 0.8125rem;
  background: #fff;
  border: 1px solid transparent;
  transition: border-color 0.15s;
}

.phase-item--done { border-color: #bbf7d0; background: #f0fdf4; }
.phase-item--in-progress { border-color: #bfdbfe; background: #eff6ff; }
.phase-item--not-started { border-color: #f0f0f0; }

.phase-item__icon { flex-shrink: 0; font-size: 0.875rem; margin-top: 0.05rem; }

.phase-item__body { flex: 1; min-width: 0; }

.phase-item__label {
  display: block;
  font-weight: 600;
  color: #333;
}

.phase-item__tasks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.phase-item__task {
  font-size: 0.7rem;
  background: #f0f0f0;
  color: #666;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.phase-item--done .phase-item__task { background: #dcfce7; color: #15803d; }
.phase-item--in-progress .phase-item__task { background: #dbeafe; color: #1d4ed8; }

.phase-item__toggle {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  border: 1px solid #e8e8e8;
  background: #fff;
  color: #555;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  font-family: var(--font-family);
  transition: background 0.15s, border-color 0.15s;
}

.phase-item__toggle:hover {
  background: #f5f5f5;
  border-color: #d0d0d0;
}

.phase-editor-note {
  font-size: 0.75rem;
  color: #aaa;
  margin-top: 0.875rem;
  font-style: italic;
}

/* ── Phase action buttons ────────────────────────────────────────────────── */

.phase-item__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.phase-item__run {
  font-size: 0.75rem;
  font-weight: 700;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  cursor: pointer;
  font-family: var(--font-family);
  transition: background 0.15s, border-color 0.15s;
}

.phase-item__run:hover { background: #dbeafe; border-color: #93c5fd; }
.phase-item__run--running { opacity: 0.6; cursor: not-allowed; }
.phase-item__run:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Run terminal ────────────────────────────────────────────────────────── */

.run-terminal {
  margin-top: 0.75rem;
  border-radius: 8px;
  border: 1px solid #1e293b;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.run-terminal__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: #1e293b;
  color: #94a3b8;
  font-size: 0.72rem;
}

.run-terminal__ok { color: #4ade80; margin-left: auto; }
.run-terminal__fail { color: #f87171; margin-left: auto; }

.run-terminal__close {
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  font-size: 0.75rem;
  padding: 0 0.25rem;
  margin-left: 0.25rem;
  line-height: 1;
}

.run-terminal__close:hover { color: #94a3b8; }

.run-terminal__body {
  background: #0f172a;
  color: #e2e8f0;
  padding: 0.75rem;
  max-height: 220px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

/* ── Video list ──────────────────────────────────────────────────────────── */

.video-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.video-item {
  padding: 0.625rem 0.75rem;
  border-radius: 7px;
  background: #fff;
  border: 1px solid #e8e8e8;
}

.video-item--published { border-color: #bbf7d0; background: #f0fdf4; }
.video-item--in-progress { border-color: #bfdbfe; background: #eff6ff; }

.video-item__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.video-item__id {
  font-size: 0.7rem;
  font-weight: 700;
  color: #888;
  font-family: var(--font-mono);
}

.video-item__format {
  font-size: 0.72rem;
  background: #f0f0f0;
  color: #666;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.video-item__title {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
  line-height: 1.35;
}

.video-item__meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #888;
}

.video-item__abtag {
  background: #fef3c7;
  color: #92400e;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 700;
}

/* ── Info table ──────────────────────────────────────────────────────────── */

.info-table {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.info-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #aaa;
}

.info-value {
  font-size: 0.8125rem;
  color: #333;
  line-height: 1.4;
}

.info-value--link {
  color: #0ea5e9;
  text-decoration: none;
  word-break: break-all;
}

.info-value--link:hover { text-decoration: underline; }

.info-value--code {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  background: #f0f0f0;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
}

.info-value--tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.audience-tag {
  font-size: 0.72rem;
  background: #f0f0f0;
  color: #555;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
}

/* ── Modal ───────────────────────────────────────────────────────────────── */

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
}

.modal {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 60px rgba(0,0,0,0.18);
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}

.modal__header h2 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.015em;
}

.modal__close {
  background: none;
  border: none;
  cursor: pointer;
  color: #888;
  padding: 0.25rem;
  border-radius: 6px;
  display: flex;
  transition: background 0.15s, color 0.15s;
}

.modal__close:hover { background: #f0f0f0; color: #333; }

.modal__form {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.375rem;
}

/* ── Form fields ─────────────────────────────────────────────────────────── */

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #333;
}

.form-required { color: #ef4444; }

.form-input {
  width: 100%;
  padding: 0.5625rem 0.75rem;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: var(--font-family);
  color: #1a1a1a;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}

.form-input:focus {
  border-color: #1a1a1a;
  box-shadow: 0 0 0 3px rgba(26,26,26,0.08);
}

.form-input--mono { font-family: var(--font-mono); }

.form-error {
  font-size: 0.8125rem;
  color: #ef4444;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 7px;
  padding: 0.5rem 0.75rem;
}

/* ── Type picker ─────────────────────────────────────────────────────────── */

.type-picker {
  display: flex;
  gap: 0.5rem;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.875rem;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  background: #fff;
  color: #555;
  cursor: pointer;
  font-family: var(--font-family);
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.type-btn:hover { background: #f5f5f5; }
.type-btn--active {
  border-color: #1a1a1a;
  background: #1a1a1a;
  color: #fff;
}

/* ── Audience picker ─────────────────────────────────────────────────────── */

.audience-picker {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 0.375rem;
}

.audience-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
}

.audience-option:hover { background: #f5f5f5; }
.audience-option--selected { background: #f0f9ff; }

.audience-checkbox { flex-shrink: 0; cursor: pointer; }

.format-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 6px;
  vertical-align: middle;
  letter-spacing: 0.03em;
}
.format-badge--rec { background: #fef3c7; color: #92400e; }
.format-badge--ai  { background: #ede9fe; color: #5b21b6; }

.form-hint {
  font-size: 0.75rem;
  font-weight: 400;
  color: #999;
  margin-left: 4px;
}

.audience-option__label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #333;
}

.audience-option__desc {
  display: block;
  font-size: 0.75rem;
  color: #888;
}

/* ── Tab content ─────────────────────────────────────────────────────────── */

.tab-content { animation: fadeIn 0.15s ease; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ──────────────────────────────────────────────────────────── */

@media (max-width: 900px) {
  .promote-dashboard { flex-direction: column; }
  .sidebar {
    width: 100%;
    height: auto;
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 0.75rem;
  }
  .sidebar__brand { border-bottom: none; padding-bottom: 0; }
  .sidebar__nav { flex-direction: row; padding: 0; flex: none; }
  .sidebar__footer { display: none; }
  .dashboard-main { padding: 1.25rem; }
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
