import { test } from '@playwright/test'
import { mkdirSync } from 'fs'
import { join } from 'path'

/**
 * Demo recording: Overture Downloader (with Attribute Table & Charts)
 *
 * Flow:
 *   1.  Search 'Bracken Ridge QLD' → select suggestion → map flies there
 *   2.  Fill bbox (~5km) around Bracken Ridge
 *   3.  Fit map to bbox
 *   4.  Queue Places → Eat & Drink → Cafe
 *   5.  Queue Places → Automotive (top-level)
 *   6.  Wait for both extractions to finish
 *   7.  Open Table Viewer on first layer (Cafe)
 *        a. Wait for data to load
 *        b. Scroll through data table
 *        c. Open Columns panel → quick-add a chart from column list
 *        d. Close Columns panel
 *        e. Switch to Charts tab — see auto-generated charts
 *        f. Manually add a Bar chart via the "Add Chart" card
 *        g. Change palette on a chart
 *        h. Switch back to Data tab
 *        i. Close Table Viewer
 *   8.  Open Table Viewer on second layer (Automotive) — validates multi-layer
 *        a. Brief data browse
 *        b. Close Table Viewer
 *   9.  Change color of first layer
 *  10.  Toggle each layer off then back on
 *  11.  Zoom in x3 then out x3 with mouse wheel
 *  12.  Close layers panel
 *
 * Run:  npm run record:overture
 * Video appears in:  test-results/<test-name>/video.webm
 */
test('Overture Downloader - Bracken Ridge bar and automotive', async ({ page }) => {
  // ── 1. Navigate ────────────────────────────────────────────────────────────
  await page.goto('/tools/overture-downloader')
  await page.locator('#od-map').waitFor({ state: 'visible' })
  await page.waitForTimeout(2_500)

  // ── 2. Search for Bracken Ridge ────────────────────────────────────────────
  const searchInput = page.locator('.od-search-wrapper input[placeholder="Search location\u2026"]')
  await searchInput.click()
  await searchInput.fill('Bracken Ridge QLD')
  await page.waitForTimeout(1_500)

  const firstSuggestion = page.locator('.od-suggestion').first()
  await firstSuggestion.waitFor({ state: 'visible', timeout: 8_000 })
  await firstSuggestion.click()
  await page.waitForTimeout(3_000)

  // ── 3. Fill bbox ~5km x 5km centred on Bracken Ridge ─────────────────────
  const field = (label: string) =>
    page.locator('.od-field').filter({ hasText: label }).locator('input')

  await field('W (min lon)').fill('153.006')
  await field('S (min lat)').fill('-27.3743')
  await field('E (max lon)').fill('153.0524')
  await field('N (max lat)').fill('-27.316')
  await field('N (max lat)').press('Tab')
  await page.waitForTimeout(600)

  await page.getByRole('button', { name: 'Fit map' }).click()
  await page.waitForTimeout(2_000)

  // Store map centre for mouse-wheel zoom later
  const mapBox = await page.locator('#od-map').boundingBox()
  const cx = mapBox!.x + mapBox!.width / 2
  const cy = mapBox!.y + mapBox!.height / 2

  const themeSelect = page.locator('.od-section').filter({ hasText: 'Theme' }).locator('select.od-select')
  const dropdowns   = page.locator('.od-dropdowns')

  // ── 4. Queue: Places → Eat & Drink → Cafe ─────────────────────────────────
  await themeSelect.selectOption('places')
  await page.waitForTimeout(500)
  await dropdowns.locator('select.od-select').nth(0).selectOption('eat_and_drink')
  await dropdowns.locator('select.od-select').nth(1).waitFor({ state: 'visible', timeout: 5_000 })
  await dropdowns.locator('select.od-select').nth(1).selectOption('cafe')
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: '+ Add to Queue' }).click()
  await page.locator('.od-layers-panel').waitFor({ state: 'visible' })
  await page.waitForTimeout(1_000)

  // ── 5. Queue: Places → Automotive (top-level) ──────────────────────────────
  await page.locator('.od-section').filter({ hasText: 'Category' }).getByRole('button', { name: 'Clear' }).click()
  await page.waitForTimeout(600)
  await dropdowns.locator('select.od-select').nth(0).selectOption('automotive')
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: '+ Add to Queue' }).click()
  await page.waitForTimeout(1_000)

  // ── 6. Wait for both extractions to finish ─────────────────────────────────
  await page.waitForFunction(
    () => !document.querySelector('.od-progress-bar'),
    { timeout: 180_000, polling: 1_500 },
  )
  await page.waitForTimeout(3_000)

  // ── 7. Open Table Viewer on first layer (Cafe) ─────────────────────────────
  await page.locator('.od-layer-btn--table').first().click()
  await page.locator('.od-tv-overlay').waitFor({ state: 'visible' })

  // Wait for data to finish loading (loading panel disappears, meta row count appears)
  await page.locator('.od-tv-meta').waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(1_500)

  // 7b. Scroll through the data table
  const tableScroll = page.locator('.od-tv-table-scroll')
  await tableScroll.evaluate((el: HTMLElement) => { el.scrollTop += 350 })
  await page.waitForTimeout(900)
  await tableScroll.evaluate((el: HTMLElement) => { el.scrollTop += 350 })
  await page.waitForTimeout(900)
  await tableScroll.evaluate((el: HTMLElement) => { el.scrollTop = 0 })
  await page.waitForTimeout(600)

  // 7c. Open Columns panel and quick-add the first column as a chart
  await page.locator('.od-tv-tab--right').click()
  await page.locator('.od-tv-col-panel').waitFor({ state: 'visible' })
  await page.waitForTimeout(1_000)
  await page.locator('.od-tv-col-btn').first().click()
  await page.waitForTimeout(1_500)

  // 7d. Close Columns panel
  await page.locator('.od-tv-col-panel-close').click()
  await page.waitForTimeout(700)

  // 7e. Switch to Charts tab — see auto-generated charts
  await page.locator('.od-tv-tab').filter({ hasText: 'Charts' }).click()
  await page.waitForTimeout(2_000)

  // 7f. Manually add a Bar chart via the "Add Chart" card
  await page.locator('.od-tv-card--add .od-tv-add-type').first().click() // Bar (first type)
  await page.waitForTimeout(600)
  // Select the first available column
  const addColSelect = page.locator('.od-tv-add-selects .od-tv-select--full').first()
  await addColSelect.selectOption({ index: 1 })
  await page.waitForTimeout(600)
  await page.locator('.od-tv-add-btn').click()
  await page.waitForTimeout(2_000)

  // 7g. Change palette on the first chart (click dot to pin picker, then choose teal)
  const firstPaletteDot = page.locator('.od-tv-palette-dot').first()
  await firstPaletteDot.click() // pins the picker open
  await page.waitForTimeout(600)
  await page.locator('.od-tv-pal-pop').first().locator('.od-tv-swatch').nth(2).click() // teal
  await page.waitForTimeout(1_500)
  // Click dot again to unpin
  await firstPaletteDot.click()
  await page.waitForTimeout(700)

  // 7h. Switch back to Data tab
  await page.locator('.od-tv-tab').filter({ hasText: 'Data' }).click()
  await page.waitForTimeout(1_200)

  // 7i. Close Table Viewer
  await page.locator('.od-tv-topbar .od-tv-btn-ghost').first().click()
  await page.locator('.od-tv-overlay').waitFor({ state: 'hidden' })
  await page.waitForTimeout(1_500)

  // ── 8. Open Table Viewer on second layer (Automotive) ─────────────────────
  await page.locator('.od-layer-btn--table').nth(1).click()
  await page.locator('.od-tv-overlay').waitFor({ state: 'visible' })
  await page.locator('.od-tv-meta').waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(1_500)

  // 8a. Brief scroll through data
  await tableScroll.evaluate((el: HTMLElement) => { el.scrollTop += 250 })
  await page.waitForTimeout(900)

  // 8b. Close Table Viewer
  await page.locator('.od-tv-topbar .od-tv-btn-ghost').first().click()
  await page.locator('.od-tv-overlay').waitFor({ state: 'hidden' })
  await page.waitForTimeout(1_500)

  // ── 9. Change color of first layer ────────────────────────────────────────
  await page.locator('.od-layer-swatch--btn').first().click()
  await page.waitForTimeout(800)
  await page.locator('.od-color-picker').first().locator('.od-color-swatch').nth(3).click()
  await page.waitForTimeout(1_500)

  // ── 10. Toggle each layer off then back on ─────────────────────────────────
  const switches = page.locator('.od-layers-panel').locator('button[role="switch"]')
  const count = await switches.count()
  for (let i = 0; i < count; i++) {
    const sw = switches.nth(i)
    await sw.click()
    await page.waitForTimeout(900)
    await sw.click()
    await page.waitForTimeout(700)
  }
  await page.waitForTimeout(1_500)

  // ── 11. Zoom in x3 then out x3 ────────────────────────────────────────────
  await page.mouse.move(cx, cy)
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, -200)
    await page.waitForTimeout(600)
  }
  await page.waitForTimeout(1_000)
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(600)
  }
  await page.waitForTimeout(2_000)

  // ── 12. Close layers panel ─────────────────────────────────────────────────
  await page.locator('.od-layers-panel .od-chevron-btn').click()
  await page.waitForTimeout(3_000)

  // ── 13. Save video to public/blog/ ─────────────────────────────────────────
  const video = page.video()
  await page.close()
  if (video) {
    mkdirSync(join(process.cwd(), 'public', 'blog'), { recursive: true })
    await video.saveAs(join(process.cwd(), 'public', 'blog', 'overture-downloader-demo.webm'))
  }
})
