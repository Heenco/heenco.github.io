import { test } from '@playwright/test'

/**
 * Demo recording: ESRI REST Downloader
 *
 * Flow:
 *   1. Open the tool — library panel is shown by default
 *   2. Dismiss the "Got it" disclaimer
 *   3. Search location for "Sydney CBD" to set map extent
 *   4. Search library index for "EPI Heritage" → queue it
 *   5. Search library index for "Height of Buildings Map" → queue it
 *   6. Click the layer row to reveal the download panel
 *   7. Click "↓ Download Queue (2)" and wait for success
 *
 * Run:  npm run record:esri
 * Video appears in:  test-results/<test-name>/video.webm
 */
test('ESRI REST Downloader – NSW Planning EPI Heritage & Building Heights', async ({ page }) => {
  // ── 1. Navigate ─────────────────────────────────────────────────────────
  await page.goto('/tools/esri-rest-downloader')
  await page.waitForTimeout(2_500)

  // ── 2. Dismiss disclaimer ────────────────────────────────────────────────
  const gotIt = page.getByRole('button', { name: 'Got it' })
  if (await gotIt.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await gotIt.click()
    await page.waitForTimeout(600)
  }

  // ── 3. Search location: Sydney CBD, Australia ───────────────────────────
  const geoSearch = page.locator('input.er-geo-search-input')
  await geoSearch.click()
  await geoSearch.fill('Sydney CBD New South Wales Australia')
  await page.waitForTimeout(1_500)
  const geoSuggestion = page.locator('.er-geo-suggestion').first()
  await geoSuggestion.waitFor({ state: 'visible', timeout: 8_000 })
  await geoSuggestion.click()
  await page.waitForTimeout(2_000)

  // Zoom into Sydney CBD tightly so the bbox covers only the CBD core
  const mapEl = page.locator('#er-map')
  await mapEl.click()
  for (let i = 0; i < 5; i++) {
    await mapEl.dispatchEvent('wheel', { deltaY: -200, deltaMode: 0 })
    await page.waitForTimeout(300)
  }
  await page.waitForTimeout(1_500)

  // ── 4. Search for EPI Heritage in the library index ─────────────────────
  const librarySearch = page.locator('input.er-search')
  await librarySearch.click()
  await librarySearch.fill('EPI Heritage')
  await page.waitForTimeout(2_000)

  // Queue EPI Heritage from the index results
  const epiRow = page.locator('.er-idx-row').filter({ hasText: 'EPI Heritage' }).first()
  await epiRow.waitFor({ state: 'visible', timeout: 10_000 })
  await epiRow.locator('.er-queue-btn').click()
  await page.waitForTimeout(800)

  // ── 5. Search for Height of Buildings ────────────────────────────────────
  await librarySearch.fill('Height of Buildings Map')
  await page.waitForTimeout(2_000)

  // Queue Height of Buildings — Feature Layer
  const hobRow = page.locator('.er-idx-row').filter({ hasText: 'Height of Buildings Map' }).first()
  await hobRow.waitFor({ state: 'visible', timeout: 10_000 })
  await hobRow.locator('.er-queue-btn').click()
  await page.waitForTimeout(800)

  // ── 6. Download the queue ─────────────────────────────────────────────────
  // The Download Queue button now appears automatically when items are queued
  await page.locator('.er-action-row').waitFor({ state: 'visible', timeout: 10_000 })

  // Arm the download listener BEFORE the button click so we don't miss it
  const downloadPromise = page.waitForEvent('download', { timeout: 120_000 })

  await page.locator('.er-action-row button').filter({ hasText: /Download Queue/ }).click()

  // Handle filename prompt modal
  await page.locator('.er-modal-overlay').waitFor({ state: 'visible', timeout: 10_000 })
  const filenameInput = page.locator('.er-modal input.er-bug-input')
  await filenameInput.fill('sydney_cbd_planning')
  await page.waitForTimeout(600)
  await filenameInput.press('Enter')

  // Intercept the ZIP download (prevents Playwright from closing the page)
  const download = await downloadPromise
  await download.saveAs('test-results/sydney_cbd_planning.zip')

  // Linger on the success state so video captures it
  await page.locator('.er-msg-success, .er-msg-error').waitFor({ state: 'visible', timeout: 10_000 })
  await page.waitForTimeout(3_000)
})
