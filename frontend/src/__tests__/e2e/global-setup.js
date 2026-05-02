/*
  global-setup.js: Runs once before all Playwright tests.
  Logs in with the test account and saves the session to disk.
  All dashboard tests reuse this session: no login in every test.
*/

import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AUTH_FILE = path.join(__dirname, ".auth/user.json");

export default async function globalSetup() {
  const email    = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_EMAIL and TEST_PASSWORD must be set. " +
      "Locally: create frontend/.env.test. In CI: add GitHub Secrets."
    );
  }

  const browser = await chromium.launch();
  const page    = await browser.newPage();

  await page.goto("http://localhost:5173");

  // Open sign in modal
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.getByText("Welcome back").waitFor();

  // Fill credentials and submit
  await page.fill("#auth-email",    email);
  await page.fill("#auth-password", password);
  await page.getByRole("button", { name: /^sign in$/i }).last().click();

  // Dismiss welcome modal if it appears (shows on first login)
  try {
    const welcome = page.locator(".welcome-modal, [class*='welcome']").first();
    await welcome.waitFor({ timeout: 5000 });
    await page.keyboard.press("Escape");
  } catch {
    // No welcome modal: continue
  }

  // Dismiss consent modal if it appears
  try {
    const consent = page.locator(".consent-modal, [class*='consent']").first();
    await consent.waitFor({ timeout: 3000 });
    await page.keyboard.press("Escape");
  } catch {
    // No consent modal: continue
  }

  // Wait for dashboard shell
  await page.locator(".app-shell, .sidebar").first().waitFor({ timeout: 20000 });

  // Save session
  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}
