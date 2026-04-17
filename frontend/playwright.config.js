import { defineConfig, devices } from "@playwright/test";
import { AUTH_FILE } from "./src/__tests__/e2e/global-setup.js";

export default defineConfig({
  testDir: "./src/__tests__/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 2,
  timeout: 60000,

  globalSetup: "./src/__tests__/e2e/global-setup.js",

  reporter: [
    ["html", { open: "never" }],
    ["allure-playwright"],
  ],

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Public tests — no login needed
    {
      name: "public",
      testMatch: [
        "**/accessibility.spec.js",
        "**/landing.spec.js",
        "**/auth.spec.js",
        "**/seo-pages.spec.js",
      ],
      use: { ...devices["Desktop Chrome"] },
    },

    // Dashboard tests — reuse saved login session
    {
      name: "dashboard",
      testMatch: [
        "**/dashboard.spec.js",
        "**/invoices.spec.js",
        "**/billing.spec.js",
        "**/profile.spec.js",
      ],
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE,
      },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
