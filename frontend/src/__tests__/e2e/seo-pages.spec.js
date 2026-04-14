/*
  ══════════════════════════════════════════════════════════════════════════════
  E2E: SEO Static Pages — smoke tests
  File: e2e/seo-pages.spec.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  SEO pages are static HTML in /public — they're not part of the React build.
  If they 404, Google de-indexes them and we lose organic traffic for those
  keywords. These smoke tests verify each page loads with its expected
  h1 headline. A single broken page can silently kill keyword rankings.

  WHAT WE VERIFY:
  ───────────────
  Each page:
  - Returns HTTP 200 (page.goto does not throw)
  - Contains the expected H1 text
  ══════════════════════════════════════════════════════════════════════════════
*/

import { test, expect } from "@playwright/test";

const SEO_PAGES = [
  {
    path: "/invoice-for-cleaners.html",
    title: /invoice app for cleaning businesses/i,
  },
  {
    path: "/invoice-for-electricians.html",
    title: /invoice app for electricians/i,
  },
  {
    path: "/invoice-for-landscapers.html",
    title: /invoice app for landscapers/i,
  },
  {
    path: "/invoice-for-painters.html",
    title: /invoice app for painters/i,
  },
  {
    path: "/invoice-for-plumbers.html",
    title: /invoice app for plumbers/i,
  },
  {
    path: "/invoice-for-tutors.html",
    title: /invoice app for tutors/i,
  },
];

for (const { path, title } of SEO_PAGES) {
  test(`SEO page loads: ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(title);
  });
}

test("Changelog page loads", async ({ page }) => {
  // Use explicit path — /blog/ hits the React SPA in Vite dev server
  const response = await page.goto("/blog/index.html");
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle(/changelog/i);
});
