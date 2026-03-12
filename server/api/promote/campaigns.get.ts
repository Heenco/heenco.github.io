import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

export default defineEventHandler(async () => {
  const campaignsDir = join(process.cwd(), 'promote', 'campaigns')

  if (!existsSync(campaignsDir)) {
    return []
  }

  let entries: string[]
  try {
    entries = await readdir(campaignsDir)
  } catch {
    return []
  }

  const campaigns = []

  for (const entry of entries.sort()) {
    const jsonPath = join(campaignsDir, entry, 'campaign.json')
    if (!existsSync(jsonPath)) continue

    try {
      const raw = await readFile(jsonPath, 'utf-8')
      campaigns.push(JSON.parse(raw))
    } catch {
      // skip malformed json
    }
  }

  return campaigns
})
