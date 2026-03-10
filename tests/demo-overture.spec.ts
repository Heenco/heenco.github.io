import { test } from '@playwright/test'

/**
 * Demo recording: Overture Downloader
 *
 * Flow:
 *   1. Search 'Bracken Ridge Plaza QLD' → select suggestion → map flies there
 *   2. Fill a tight bbox (~500m x 400m) around Bracken Ridge Plaza
 *   3. Fit map to bbox
 *   4. Queue Places → Eat & Drink → Restaurant
 *   5. Queue Places → Eat & Drink → Bar
 *   6. Wait for both extractions to finish, linger on results
 *   7. Change the color of the first layer
 *   8. Toggle each layer off then back on
 *   9. Zoom in x3 then out x3 with mouse wheel
 *  10. Close the layers panel
 *
 * Run:  npm run record:overture
 * Video appears in:  test-results/<test-name>/video.webm
 */
test('Overture Downloader - Bracken Ridge bar and automotive', async ({ page }) => {
  // 1. Navigate
  await page.goto('/tools/overture-downloader')
  await page.locator('#od-map').waitFor({ state: 'visible' })
  await page.waitForTimeout(2_500)

  // 2. Search for Bracken Ridge Plaza
  const searchInput = page.locator('.od-search-wrapper input[placeholder="Search location\u2026"]')
  await searchInput.click()
  await searchInput.fill('Bracken Ridge QLD')
  await page.waitForTimeout(1_500)

  const firstSuggestion = page.locator('.od-suggestion').first()
  await firstSuggestion.waitFor({ state: 'visible', timeout: 8_000 })
  await firstSuggestion.click()
  await page.waitForTimeout(3_000)

  // 3. Fill bbox ~2km x 2km centred on Bracken Ridge Plaza
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

  // 4. Queue: Places -> Eat & Drink -> Cafe
  await themeSelect.selectOption('places')
  await page.waitForTimeout(500)
  await dropdowns.locator('select.od-select').nth(0).selectOption('eat_and_drink')
  await dropdowns.locator('select.od-select').nth(1).waitFor({ state: 'visible', timeout: 5_000 })
  await dropdowns.locator('select.od-select').nth(1).selectOption('cafe')
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: '+ Add to Queue' }).click()
  await page.locator('.od-layers-panel').waitFor({ state: 'visible' })
  await page.waitForTimeout(1_000)

  // 5. Queue: Places -> Automotive (top-level only)
  await page.locator('.od-section').filter({ hasText: 'Category' }).getByRole('button', { name: 'Clear' }).click()
  await page.waitForTimeout(600)
  await dropdowns.locator('select.od-select').nth(0).selectOption('automotive')
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: '+ Add to Queue' }).click()
  await page.waitForTimeout(1_000)

  // 6. Wait for both extractions to finish
  await page.waitForFunction(
    () => !document.querySelector('.od-progress-bar'),
    { timeout: 120_000, polling: 1_500 },
  )
  // Linger so the viewer can read the completed results
  await page.waitForTimeout(3_000)

  // 7. Change color of the first layer
  await page.locator('.od-layer-swatch--btn').first().click()
  await page.waitForTimeout(800)
  await page.locator('.od-color-picker').first().locator('.od-color-swatch').nth(3).click()
  await page.waitForTimeout(1_500)

  // 8. Toggle each layer off then back on
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

  // 9. Zoom in x3 then out x3
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

  // 10. Close the layers panel
  await page.locator('.od-layers-panel .od-chevron-btn').click()
  await page.waitForTimeout(3_000)
})
