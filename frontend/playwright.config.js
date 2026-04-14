/*
  ══════════════════════════════════════════════════════════════════════════════
  PLAYWRIGHT E2E CONFIGURATION
  ══════════════════════════════════════════════════════════════════════════════

  Runs against the local Vite dev server (port 5173).
  Start the server first: npm run dev
  Then run tests: npx playwright test

  Or run both together: npx playwright test --ui  (starts server automatically
  via webServer config below)
  ══════════════════════════════════════════════════════════════════════════════
*/

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/__tests__/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 2,
  reporter: "html",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Automatically start the Vite dev server before running tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
