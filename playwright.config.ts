import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',

  // Per-test timeout — extractions can take a while
  timeout: 300_000,

  // Don't wipe the whole outputDir before each run so previous recordings survive
  cleanOutputDir: false,

  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },

    // Record video for every test
    video: { mode: 'on', size: { width: 1280, height: 800 } },

    // Slow down actions so they're readable on the recording
    launchOptions: { slowMo: 350 },

    // Show the browser window
    headless: false,
  },

  projects: [
    { name: 'chromium' },
  ],

  // Videos and traces end up here
  outputDir: 'test-results',

  // Start Nuxt dev server automatically if not already running
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
