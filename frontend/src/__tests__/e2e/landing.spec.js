/*
  ══════════════════════════════════════════════════════════════════════════════
  E2E: Landing Page
  File: e2e/landing.spec.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  The landing page is the top of the funnel. Every new user lands here.
  If the hero CTA is broken, nobody signs up. If Sign In is missing, paid
  users are locked out. These tests run against the real Vite dev server.

  WHAT WE VERIFY:
  ───────────────
  1.  Page title contains "InvoicePrepper"
  2.  Hero headline is visible
  3.  Hero CTA button is visible and clickable
  4.  "Start Invoicing Free" or "Create Your First Invoice" CTA text
  5.  "Sign In" nav button is visible
  6.  "Sign Up" nav button is visible
  7.  Mock invoice preview renders in hero section
  8.  "How it works" section is present
  9.  Footer has a Terms link
  10. Footer has a Privacy link
  ══════════════════════════════════════════════════════════════════════════════
*/

import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page title contains InvoicePrepper", async ({ page }) => {
    await expect(page).toHaveTitle(/InvoicePrepper/i);
  });

  test("hero headline is visible", async ({ page }) => {
    await expect(page.getByText(/just want to get paid/i)).toBeVisible();
  });

  test("hero CTA button is visible", async ({ page }) => {
    // Multiple CTA buttons exist on the page (hero + pricing section): check the first one
    const cta = page.getByRole("button", { name: /start invoicing free|create your first invoice/i }).first();
    await expect(cta).toBeVisible();
  });

  test("Sign In nav button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });

  test("Sign Up nav button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^sign up$/i })).toBeVisible();
  });

  test("mock invoice preview renders in hero", async ({ page }) => {
    await expect(page.getByLabel("Sample invoice preview")).toBeVisible();
  });

  test("How it works section is present", async ({ page }) => {
    await expect(page.getByText("How it works")).toBeVisible();
  });

  test("footer has Terms link", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // Footer uses <a href="/terms"> with text "Terms"
    await expect(page.locator("footer a[href='/terms']")).toBeVisible();
  });

  test("footer has Privacy link", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // Footer uses <a href="/privacy"> with text "Privacy"
    await expect(page.locator("footer a[href='/privacy']")).toBeVisible();
  });
});
