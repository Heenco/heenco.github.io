import { readFile, copyFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

interface RunBody {
  campaignId: string
  action: string
}

// Whitelist of allowed actions and how they map to commands.
// Values are functions that receive the campaign object and return
// the [bin, args] tuple to execute — nothing is shell-interpolated.
const ACTIONS: Record<string, (c: Record<string, unknown>) => [string, string[]]> = {
  record: (c) => ['npm', ['run', String(c.recordingCmd ?? 'record')]],
  'generate-script': (c) => ['node', ['scripts/generate-script.mjs', `--campaign=${c.id}`]],
  'parse-strategy': (c) => ['node', ['scripts/parse-strategy.mjs', `--campaign=${c.id}`, `--file=${String(c.strategyFile ?? `promote/campaigns/${c.id}-${c.slug}/VideoStrategy.json`)}`]],
  'select-music': (c) => ['node', ['scripts/select-music.mjs', `--campaign=${c.id}`]],
  'generate-voiceover': (c) => ['node', ['scripts/generate-voiceover.mjs', `--campaign=${c.id}`]],
  'generate-captions': (c) => ['node', ['scripts/generate-captions.mjs', `--campaign=${c.id}`]],
  'generate-thumbnail': (c) => ['node', ['scripts/generate-thumbnail.mjs', `--campaign=${c.id}`]],
  'generate-assets': (c) => ['node', ['scripts/generate-assets.mjs', `--campaign=${c.id}`]],
  'process-video': (c) => ['node', ['scripts/process-video.mjs', `--campaign=${c.id}`]],
  'youtube-upload': (c) => ['node', ['scripts/youtube-upload.mjs', `--campaign=${c.id}`]],
  'youtube-stats': (c) => ['node', ['scripts/youtube-stats.mjs', `--campaign=${c.id}`]],
  'youtube-publish-winner': (c) => ['node', ['scripts/youtube-publish-winner.mjs', `--campaign=${c.id}`]],
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RunBody>(event)
  const { campaignId, action } = body

  if (!campaignId || !action) {
    throw createError({ statusCode: 400, message: 'Missing campaignId or action' })
  }

  if (!ACTIONS[action]) {
    throw createError({ statusCode: 400, message: `Unknown action: ${action}. Allowed: ${Object.keys(ACTIONS).join(', ')}` })
  }

  // Load campaign
  const campaignsDir = join(process.cwd(), 'promote', 'campaigns')
  const entries = existsSync(campaignsDir)
    ? (await import('node:fs/promises')).readdir(campaignsDir).then(r => r)
    : Promise.resolve([])

  const folders = await entries
  const folder = folders.find(f => f.startsWith(`${campaignId}-`) || f === campaignId)

  if (!folder) {
    throw createError({ statusCode: 404, message: `Campaign ${campaignId} not found` })
  }

  const jsonPath = join(campaignsDir, folder, 'campaign.json')
  const campaignDir = join(campaignsDir, folder)
  let campaign: Record<string, unknown>
  try {
    campaign = JSON.parse(await readFile(jsonPath, 'utf-8'))
  } catch {
    throw createError({ statusCode: 404, message: `campaign.json not found for ${campaignId}` })
  }

  // Special handling for 'record': use the campaign's recordingCmd
  // e.g. "npm run record:overture" → split into bin + args
  let bin: string
  let args: string[]

  if (action === 'record') {
    const cmd = String(campaign.recordingCmd ?? '')
    if (!cmd) {
      throw createError({ statusCode: 400, message: 'This campaign has no recordingCmd defined' })
    }
    const parts = cmd.split(' ')
    bin = parts[0]!
    args = parts.slice(1)
  } else {
    ;[bin, args] = ACTIONS[action]!(campaign)
  }

  const cwd = process.cwd()

  try {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      cwd,
      timeout: 15 * 60 * 1000, // 15 min max (generate-assets runs 4 sub-scripts)
      env: { ...process.env },
      shell: true, // needed on Windows for npm.cmd and node.cmd
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    })

    // After a successful recording, auto-copy the WebM into the campaign folder
    let postNote = ''
    if (action === 'record') {
      try {
        const testResultsDir = join(cwd, 'test-results')
        const entries = await readdir(testResultsDir)
        // Find folders matching demo-{slug}-* that contain a video.webm
        const slug = String(campaign.slug ?? '')
        const matching = entries
          .filter(e => e.startsWith(`demo-${slug}`) || e.includes(slug))
          .map(e => join(testResultsDir, e, 'video.webm'))

        let found: string | null = null
        for (const candidate of matching) {
          if (existsSync(candidate)) { found = candidate; break }
        }

        // Fallback: any demo-* folder with video.webm, newest first
        if (!found) {
          const allDemos = entries.filter(e => e.startsWith('demo-'))
          for (const d of allDemos.reverse()) {
            const candidate = join(testResultsDir, d, 'video.webm')
            if (existsSync(candidate)) { found = candidate; break }
          }
        }

        if (found) {
          const dest = join(campaignDir, 'recording.webm')
          await copyFile(found, dest)
          postNote = `\n\n✓ recording.webm copied to campaign folder from:\n  ${found}`
        } else {
          postNote = '\n\n⚠ Could not find video.webm in test-results/ — copy it manually.'
        }
      } catch (copyErr) {
        postNote = `\n\n⚠ Auto-copy failed: ${(copyErr as Error).message}`
      }
    }

    return { ok: true, action, stdout: stdout + postNote, stderr }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string }
    return {
      ok: false,
      action,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? e.message ?? 'Unknown error',
    }
  }
})
