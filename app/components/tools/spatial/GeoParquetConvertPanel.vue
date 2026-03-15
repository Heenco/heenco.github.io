<template>
  <!-- ─── GeoParquet FAB ────────────────────────────────────────────────── -->
  <button
    v-show="!hidden"
    class="gc-fab"
    :class="{ 'gc-fab--active': isOpen }"
    :style="{ top: fabTop }"
    @click="isOpen = !isOpen"
    :title="isOpen ? 'Close GeoParquet Converter' : 'Convert to GeoParquet'"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
    </svg>
  </button>

  <!-- ─── GeoParquet Panel ─────────────────────────────────────────────── -->
  <transition name="gc-slide">
    <aside v-if="isOpen" class="gc-panel" :style="{ top: panelTop, maxHeight: panelMaxHeight, width: panelWidth + 'px' }">
      <div class="gc-resize-handle" @mousedown.prevent="startResize" />

      <!-- Header -->
      <div class="gc-header">
        <div class="gc-title-wrap">
          <span class="gc-title">GeoParquet Converter</span>
          <span class="gc-subtitle">Vector data only</span>
        </div>
        <button class="gc-close" @click="isOpen = false" title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="gc-body">
        <div
          class="gc-dropzone"
          :class="{ 'gc-dropzone--over': dragOver, 'gc-dropzone--loading': status === 'loading' }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
          @click="status !== 'loading' && fileInput?.click()"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".geojson,.json,.csv,.tsv"
            class="gc-hidden"
            @change="onFileChange"
          />

          <template v-if="status === 'loading'">
            <div class="gc-spinner">◌</div>
            <div class="gc-drop-status">{{ statusLabel }}</div>
          </template>
          <template v-else>
            <svg class="gc-drop-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M24 32V16M16 24l8-8 8 8M8 36v2a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2v-2" />
            </svg>
            <div class="gc-drop-title">Drop a file to convert</div>
            <div class="gc-drop-sub">GeoJSON · CSV · TSV</div>
            <div class="gc-drop-hint">or click to browse</div>
          </template>
        </div>

        <div v-if="selectedFile" class="gc-file-card">
          <div class="gc-file-name">{{ selectedFile.name }}</div>
          <div class="gc-file-meta">{{ fmtBytes(selectedFile.size) }}</div>
        </div>

        <div class="gc-field">
          <label class="gc-label">Output name</label>
          <input v-model="outputName" class="gc-input" type="text" placeholder="output.parquet" />
        </div>

        <div class="gc-field">
          <label class="gc-label">Target CRS</label>
          <div class="gc-row">
            <button class="gc-toggle" :class="{ 'gc-toggle--on': reproject }" @click="reproject = !reproject">
              <span class="gc-toggle-thumb"></span>
            </button>
            <input v-model="targetEpsg" class="gc-input gc-input--epsg" type="text" placeholder="4326" :disabled="!reproject" />
          </div>
        </div>

        <button class="gc-convert" :disabled="!selectedFile || status === 'loading'" @click="convertFile">
          {{ status === 'loading' ? 'Converting…' : 'Convert to GeoParquet' }}
        </button>

        <div v-if="error" class="gc-error">⚠ {{ error }}</div>

        <div v-if="outputUrl" class="gc-result">
          <div class="gc-result-row">
            <span class="gc-result-name">{{ outputName || 'output.parquet' }}</span>
            <span class="gc-result-size">{{ outputSize ? fmtBytes(outputSize) : '' }}</span>
          </div>
          <button class="gc-download" @click="downloadOutput">Download</button>
        </div>
      </div>
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  hidden?: boolean
}>()

const emit = defineEmits<{
  openChange: [open: boolean]
}>()

const isOpen = ref(false)
const panelWidth = ref(360)
const dragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const outputName = ref('')
const reproject = ref(true)
const targetEpsg = ref('4326')
const status = ref<'idle' | 'loading'>('idle')
const statusLabel = ref('')
const error = ref('')
const outputUrl = ref<string | null>(null)
const outputSize = ref<number | null>(null)

const fabTop = computed(() => 'calc(1rem + 288px)')
const panelTop = computed(() => '1rem')
const panelMaxHeight = computed(() => 'calc(100vh - 2rem)')

// ── DuckDB ────────────────────────────────────────────────────────────────────
let _db: any = null
let _conn: any = null

async function getDuckDB() {
  if (_db) return _db
  const duckdb = await import('@duckdb/duckdb-wasm')
  const bundles = duckdb.getJsDelivrBundles()
  const bundle = await duckdb.selectBundle(bundles)
  const workerResp = await fetch(bundle.mainWorker!)
  const workerBlob = await workerResp.blob()
  const workerUrl = URL.createObjectURL(workerBlob)
  const worker = new Worker(workerUrl)
  const logger = new duckdb.VoidLogger()
  _db = new duckdb.AsyncDuckDB(logger, worker)
  await _db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  URL.revokeObjectURL(workerUrl)
  return _db
}

async function getConn() {
  const db = await getDuckDB()
  if (!_conn) {
    _conn = await db.connect()
    await _conn.query(`LOAD httpfs;`)
    try {
      await _conn.query(`LOAD spatial;`)
    } catch {
      console.warn('[DuckDB] Spatial extension not available')
    }
  }
  return _conn
}

function startResize(e: MouseEvent) {
  const startX = e.clientX
  const startW = panelWidth.value
  const onMove = (ev: MouseEvent) => {
    panelWidth.value = Math.max(240, Math.min(640, startW + (startX - ev.clientX)))
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

watch(isOpen, v => emit('openChange', v))

function resetOutput() {
  if (outputUrl.value) URL.revokeObjectURL(outputUrl.value)
  outputUrl.value = null
  outputSize.value = null
  error.value = ''
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) selectFile(file)
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) selectFile(file)
  ;(e.target as HTMLInputElement).value = ''
}

function selectFile(file: File) {
  selectedFile.value = file
  const base = file.name.replace(/\.[^/.]+$/, '')
  outputName.value = `${base}.parquet`
  resetOutput()
}

async function convertFile() {
  if (!selectedFile.value || status.value === 'loading') return
  error.value = ''
  status.value = 'loading'
  statusLabel.value = 'Loading DuckDB…'
  resetOutput()

  let inputKey = ''
  let outputKey = ''
  try {
    const db = await getDuckDB()
    const conn = await getConn()
    statusLabel.value = 'Reading file…'

    const file = selectedFile.value
    const buffer = new Uint8Array(await file.arrayBuffer())
    
    // Register input file
    inputKey = `input-${Date.now()}.${file.name.split('.').pop()}`
    await db.registerFileBuffer(inputKey, buffer)

    // Determine file type and read accordingly
    const fileExt = file.name.toLowerCase().split('.').pop()
    let sql = ''

    if (fileExt === 'geojson' || fileExt === 'json') {
      statusLabel.value = 'Processing GeoJSON…'
      // Read GeoJSON with spatial extension
      sql = `SELECT * FROM ST_Read('${inputKey}')`
    } else if (fileExt === 'csv' || fileExt === 'tsv') {
      statusLabel.value = 'Detecting columns…'
      const delim = fileExt === 'tsv' ? '\\t' : ','
      
      // Read CSV and try to detect lat/lon columns
      const sampleRes = await conn.query(
        `SELECT * FROM read_csv('${inputKey}', delim='${delim}', auto_detect=true) LIMIT 1`
      )
      const sampleCols = sampleRes.schema.fields.map((f: any) => f.name.toLowerCase())
      
      // Try to find lat/lon columns
      const latCandidates = ['lat', 'latitude', 'y']
      const lonCandidates = ['lon', 'long', 'longitude', 'lng', 'x']
      
      const latCol = sampleCols.find((c: string) => latCandidates.includes(c))
      const lonCol = sampleCols.find((c: string) => lonCandidates.includes(c))
      
      if (!latCol || !lonCol) {
        throw new Error(`Could not detect lat/lon columns in CSV. Found columns: ${sampleCols.join(', ')}`)
      }
      
      statusLabel.value = 'Creating geometries…'
      // Create Point geometries from lat/lon
      sql = `
        SELECT 
          *,
          ST_Point("${lonCol}", "${latCol}") as geometry
        FROM read_csv('${inputKey}', delim='${delim}', auto_detect=true)
        WHERE "${latCol}" IS NOT NULL AND "${lonCol}" IS NOT NULL
      `
    } else {
      throw new Error(`Unsupported file type: .${fileExt}. Supported: GeoJSON, CSV, TSV`)
    }

    // Write to Parquet
    statusLabel.value = 'Writing Parquet…'
    outputKey = `output-${Date.now()}.parquet`
    
    await conn.query(`COPY (${sql}) TO '${outputKey}' (FORMAT PARQUET)`)
    
    // Get the output file
    statusLabel.value = 'Preparing download…'
    const outputBuffer = await db.copyFileToBuffer(outputKey)
    
    // Create download
    const blob = new Blob([outputBuffer], { type: 'application/octet-stream' })
    outputUrl.value = URL.createObjectURL(blob)
    outputSize.value = outputBuffer.byteLength
    status.value = 'idle'
    
    console.log('[DuckDB] ✓ Conversion complete:', outputKey, `(${outputBuffer.byteLength} bytes)`)

  } catch (err: any) {
    console.error('[DuckDB] Conversion error:', err)
    error.value = err?.message ?? 'Conversion failed'
    status.value = 'idle'
  } finally {
    // Cleanup
    if (inputKey) {
      try {
        await _db?.dropFile(inputKey)
      } catch {}
    }
    if (outputKey) {
      try {
        await _db?.dropFile(outputKey)
      } catch {}
    }
    statusLabel.value = ''
  }
}

function downloadOutput() {
  if (!outputUrl.value) return
  const a = document.createElement('a')
  a.href = outputUrl.value
  a.download = outputName.value || 'output.parquet'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function fmtBytes(n: number) {
  if (!Number.isFinite(n)) return ''
  if (n < 1024) return `${n} B`
  const kb = n / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(2)} GB`
}
</script>

<style scoped>
:deep(*) { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Figtree', 'Segoe UI', system-ui, sans-serif; }

.gc-fab {
  position: absolute;
  right: 1rem;
  z-index: 20;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  color: hsl(var(--foreground));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, box-shadow 0.15s, color 0.15s;
}
.gc-fab:hover { background: hsl(var(--card)); box-shadow: 0 4px 18px rgba(0,0,0,0.4); }
.gc-fab--active { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); }

.gc-panel {
  position: absolute;
  top: 1rem;
  right: calc(1rem + 40px + 8px);
  bottom: 1rem;
  z-index: 19;
  min-width: 240px;
  background: hsl(var(--card) / 0.97);
  backdrop-filter: blur(14px);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gc-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: ew-resize;
  z-index: 10;
  border-radius: 8px 0 0 8px;
  transition: background 0.15s;
}
.gc-resize-handle:hover, .gc-resize-handle:active {
  background: hsl(var(--primary) / 0.2);
}

.gc-slide-enter-active, .gc-slide-leave-active { transition: opacity 0.18s, transform 0.18s; }
.gc-slide-enter-from, .gc-slide-leave-to { opacity: 0; transform: translateX(8px); }

.gc-header {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}
.gc-title-wrap { display: flex; flex-direction: column; gap: 0.1rem; margin-right: auto; }
.gc-title { font-size: 0.9rem; font-weight: 600; color: hsl(var(--foreground)); line-height: 1.1; }
.gc-subtitle { font-size: 0.72rem; color: hsl(var(--muted-foreground)); }

.gc-close {
  width: 28px; height: 28px; border-radius: 6px; border: none;
  background: transparent; color: hsl(var(--muted-foreground));
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.gc-close:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }

.gc-body {
  overflow-y: auto;
  padding: 0.75rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  flex: 1;
}

.gc-hidden { display: none; }

.gc-dropzone {
  border: 2px dashed hsl(var(--border));
  border-radius: 10px;
  padding: 1.6rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  text-align: center;
  user-select: none;
}
.gc-dropzone:hover,
.gc-dropzone--over {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.05);
}
.gc-dropzone--loading { cursor: default; animation: none; }

.gc-drop-icon {
  width: 36px;
  height: 36px;
  color: hsl(var(--muted-foreground));
  opacity: 0.7;
}
.gc-drop-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}
.gc-drop-sub {
  font-size: 0.72rem;
  color: hsl(var(--muted-foreground));
}
.gc-drop-hint {
  font-size: 0.68rem;
  color: hsl(var(--muted-foreground));
  opacity: 0.7;
  margin-top: 0.2rem;
}
.gc-drop-status {
  font-size: 0.78rem;
  color: hsl(var(--muted-foreground));
}

.gc-spinner {
  font-size: 1.5rem;
  animation: gc-spin 1s linear infinite;
  color: hsl(var(--muted-foreground));
}
@keyframes gc-spin { to { transform: rotate(360deg); } }

.gc-file-card {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 0.6rem 0.7rem;
  background: hsl(var(--card));
}
.gc-file-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gc-file-meta {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
}

.gc-field { display: flex; flex-direction: column; gap: 0.25rem; }
.gc-label { font-size: 0.75rem; font-weight: 600; color: hsl(var(--foreground)); }
.gc-input {
  height: 30px;
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--muted) / 0.25);
  color: hsl(var(--foreground));
  font-size: 0.78rem;
  padding: 0 0.6rem;
  outline: none;
}
.gc-input--epsg { width: 110px; }

.gc-row { display: flex; align-items: center; gap: 0.5rem; }
.gc-toggle {
  position: relative;
  width: 32px; height: 18px; border-radius: 9999px;
  border: none; cursor: pointer;
  background: hsl(var(--muted)); transition: background 0.18s;
  padding: 0;
}
.gc-toggle--on { background: hsl(var(--primary)); }
.gc-toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 14px; height: 14px; border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  transition: transform 0.18s;
}
.gc-toggle--on .gc-toggle-thumb { transform: translateX(14px); }

.gc-convert {
  width: 100%; height: 34px;
  border-radius: 8px; border: none;
  background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
  font-size: 0.8rem; font-weight: 600; font-family: inherit;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: opacity 0.15s;
}
.gc-convert:hover:not(:disabled) { opacity: 0.9; }
.gc-convert:disabled { opacity: 0.5; cursor: not-allowed; }

.gc-error {
  font-size: 0.75rem;
  color: #ef4444;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
}

.gc-result {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 0.6rem 0.7rem;
  background: hsl(var(--muted) / 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.gc-result-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.gc-result-name { font-size: 0.78rem; font-weight: 600; color: hsl(var(--foreground)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gc-result-size { font-size: 0.7rem; color: hsl(var(--muted-foreground)); }
.gc-download {
  height: 30px;
  border-radius: 8px; border: 1px solid hsl(var(--border));
  background: hsl(var(--card)); color: hsl(var(--foreground));
  font-size: 0.78rem; font-weight: 600;
  cursor: pointer;
}
.gc-download:hover { background: hsl(var(--accent)); }
</style>
