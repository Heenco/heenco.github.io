import { test } from '@playwright/test'
import { mkdirSync } from 'fs'
import { join } from 'path'

/**
 * Demo recording: XSD Graph Explorer — ADAC Schema visualisation
 *
 * Flow:
 *   1.  Navigate to /tools/xsd-graph — loading overlay appears immediately
 *   2.  Wait for all 16 ADAC XSD files to load (overlay disappears)
 *   3.  Let 3D force layout settle briefly
 *   4.  Rotate and zoom the graph with the mouse
 *   5.  Search for "Asset" — see dropdown with highlights, click result
 *   6.  Close detail panel, clear search
 *   7.  Switch to Tree tab — expand all, scroll to show hierarchy depth
 *   8.  Click a root row — camera flies to that node on the graph
 *   9.  Switch back to Graph tab, reset camera
 *  10.  Save video to public/blog/xsd-graph-demo.webm
 *
 * Run:  npm run record:xsd-graph
 * Video appears in:  public/blog/xsd-graph-demo.webm
 */
test('XSD Graph Explorer - ADAC schema demo', async ({ page }) => {
  // ── 1. Navigate ────────────────────────────────────────────────────────────
  await page.goto('/tools/xsd-graph')

  // ── 2. Wait for ADAC preloading to finish ─────────────────────────────────
  await page.locator('.xg-loading-overlay').waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('.xg-loading-overlay').waitFor({ state: 'detached', timeout: 60_000 })

  // ── 3. Wait for 3D canvas, let force layout settle ─────────────────────────
  await page.locator('#xg-3d canvas').waitFor({ state: 'visible', timeout: 10_000 })
  await page.waitForTimeout(1_800)

  const canvasBox = await page.locator('.xg-canvas-wrap').boundingBox()
  const cx = canvasBox!.x + canvasBox!.width / 2
  const cy = canvasBox!.y + canvasBox!.height / 2

  // ── 4. Rotate and zoom ─────────────────────────────────────────────────────
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 140, cy + 40, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(400)

  await page.mouse.wheel(0, -200)
  await page.waitForTimeout(400)

  // ── 5. Search for "Asset", click first result ──────────────────────────────
  const searchInput = page.locator('input[placeholder="Search elements\u2026"]')
  await searchInput.click()
  await searchInput.fill('Asset')
  await page.locator('.xg-search-result').first().waitFor({ state: 'visible', timeout: 5_000 })
  await page.waitForTimeout(700)
  await page.locator('.xg-search-result').first().click()
  await page.waitForTimeout(1_000)

  // ── 6. Close detail panel, clear search ───────────────────────────────────
  const detailClose = page.locator('.xg-detail-close')
  if (await detailClose.isVisible()) {
    await detailClose.click()
    await page.waitForTimeout(300)
  }
  const searchClear = page.locator('.xg-search-clear')
  if (await searchClear.isVisible()) {
    await searchClear.click()
    await page.waitForTimeout(300)
  }

  // ── 7. Switch to Tree tab, expand all, scroll to show hierarchy ────────────
  await page.locator('.xg-tab').filter({ hasText: 'Tree' }).click()
  await page.waitForTimeout(600)

  await page.getByRole('button', { name: 'Expand all' }).click()
  await page.waitForTimeout(500)

  const treeEl = page.locator('.xg-tree')
  await treeEl.evaluate(el => { el.scrollTop += 300 })
  await page.waitForTimeout(400)
  await treeEl.evaluate(el => { el.scrollTop += 400 })
  await page.waitForTimeout(400)
  await treeEl.evaluate(el => { el.scrollTop = 0 })
  await page.waitForTimeout(300)

  await page.getByRole('button', { name: 'Collapse all' }).click()
  await page.waitForTimeout(300)

  // ── 8. Click first visible tree row ───────────────────────────────────────
  await page.locator('.xg-tree-row').first().click()
  await page.waitForTimeout(900)

  // ── 9. Switch back to Graph, reset camera ─────────────────────────────────
  await page.locator('.xg-tab').filter({ hasText: 'Graph' }).click()
  await page.waitForTimeout(800)

  const detailClose2 = page.locator('.xg-detail-close')
  if (await detailClose2.isVisible()) {
    await detailClose2.click()
    await page.waitForTimeout(300)
  }

  await page.locator('.xg-hud-btn').first().click()
  await page.waitForTimeout(1_200)

  // ── 10. Save video ─────────────────────────────────────────────────────────
  const video = page.video()
  await page.close()
  if (video) {
    mkdirSync(join(process.cwd(), 'public', 'blog'), { recursive: true })
    await video.saveAs(join(process.cwd(), 'public', 'blog', 'xsd-graph-demo.webm'))
  }
})
