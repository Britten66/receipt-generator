/*
  ══════════════════════════════════════════════════════════════════════════════
  E2E: Accessibility — WCAG 2.1 AA compliance
  File: e2e/accessibility.spec.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  Accessibility is a legal requirement in Canada (AODA) and the US (ADA).
  axe-core scans each page for WCAG violations — colour contrast, missing
  labels, keyboard traps, missing alt text, etc. Failures here mean real
  users with disabilities cannot use the app, and companies can face lawsuits.

  WHAT WE VERIFY:
  ───────────────
  1. Landing page has no critical or serious WCAG violations
  2. Auth modal (sign in) has no critical or serious WCAG violations
  3. Auth modal (sign up) has no critical or serious WCAG violations

  WCAG LEVELS CHECKED:
  ────────────────────
  wcag2a, wcag2aa — the legal standard in most jurisdictions
  ══════════════════════════════════════════════════════════════════════════════
*/

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility — Landing page", () => {
  test("landing page has no critical WCAG violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("Accessibility — Auth modal", () => {
  test("sign in modal has no critical WCAG violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.getByText("Welcome back").waitFor();
    await page.evaluate(() =>
      document.querySelectorAll("*").forEach((el) =>
        el.getAnimations().forEach((a) => a.finish())
      )
    );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("sign up modal has no critical WCAG violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: /^sign up$/i }).click();
    await page.getByText("Create your account").waitFor();
    await page.evaluate(() =>
      document.querySelectorAll("*").forEach((el) =>
        el.getAnimations().forEach((a) => a.finish())
      )
    );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
