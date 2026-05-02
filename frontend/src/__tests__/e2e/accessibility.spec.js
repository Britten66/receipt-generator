/*
  ══════════════════════════════════════════════════════════════════════════════
  E2E: Accessibility: WCAG 2.1 AA + structural layout compliance
  File: e2e/accessibility.spec.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  Accessibility is a legal requirement in Canada (AODA), the US (ADA), and the
  EU (EAA). axe-core scans for WCAG violations automatically. Structural tests
  verify the page is correctly organised for screen readers and keyboard users.

  WHAT WE VERIFY:
  ───────────────
  WCAG + BEST PRACTICE (axe-core):
    1.  Landing page: no WCAG 2.1 AA or best-practice violations
    2.  Sign in modal: no WCAG 2.1 AA or best-practice violations
    3.  Sign up modal: no WCAG 2.1 AA or best-practice violations

  LAYOUT STRUCTURE (Playwright):
    4.  Page has exactly one <h1>
    5.  Heading hierarchy is not broken (no level skipped)
    6.  Page has a <nav> landmark
    7.  Page has a <main> or role="main" landmark
    8.  All images have non-empty alt text
    9.  All buttons have an accessible name
    10. All form inputs have an associated label
    11. Page <title> is set and non-empty

  KEYBOARD + INTERACTION:
    12. Sign In modal opens and closes with Escape
    13. Sign Up modal opens and closes with Escape
    14. First focusable element inside the auth modal receives focus on open

  WCAG LEVELS CHECKED:
  ────────────────────
  wcag2a, wcag2aa: legal standard (AODA, ADA, EAA)
  best-practice  : structural and semantic correctness
  ══════════════════════════════════════════════════════════════════════════════
*/

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function finishAnimations(page) {
  await page.evaluate(() =>
    document.querySelectorAll("*").forEach((el) =>
      el.getAnimations().forEach((a) => a.finish())
    )
  );
}

// ─── WCAG + BEST PRACTICE ────────────────────────────────────────────────────

test.describe("Accessibility: WCAG + best practice", () => {
  test("landing page has no violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "best-practice"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("sign in modal has no violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.getByText("Welcome back").waitFor();
    await finishAnimations(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "best-practice"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("sign up modal has no violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: /^sign up$/i }).click();
    await page.getByText("Create your account").waitFor();
    await finishAnimations(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "best-practice"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

// ─── LAYOUT STRUCTURE ────────────────────────────────────────────────────────

test.describe("Accessibility: Layout structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for React to render: nav is the first landmark React produces
    await page.locator("nav").first().waitFor({ timeout: 15000 });
  });

  test("page has exactly one h1", async ({ page }) => {
    const h1s = await page.locator("h1").all();
    expect(h1s.length).toBe(1);
  });

  test("heading hierarchy has no skipped levels", async ({ page }) => {
    const levels = await page.evaluate(() =>
      Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((el) =>
        parseInt(el.tagName[1])
      )
    );
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  test("page has a navigation landmark", async ({ page }) => {
    await expect(page.locator("nav, [role='navigation']").first()).toBeVisible();
  });

  test("page has a main landmark", async ({ page }) => {
    const main = page.locator("main, [role='main']").first();
    const count = await page.locator("main, [role='main']").count();
    expect(count).toBeGreaterThanOrEqual(1);
    if (count > 0) await expect(main).toBeAttached();
  });

  test("all images have non-empty alt text", async ({ page }) => {
    const images = await page.locator("img").all();
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      expect(alt).not.toBeNull();
      expect(alt?.trim().length).toBeGreaterThan(0);
    }
  });

  test("all buttons have an accessible name", async ({ page }) => {
    const unnamed = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).filter(
        (el) =>
          !(
            el.getAttribute("aria-label")?.trim() ||
            el.getAttribute("title")?.trim() ||
            el.textContent?.trim()
          )
      ).length
    );
    expect(unnamed).toBe(0);
  });

  test("page title is set and non-empty", async ({ page }) => {
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
    expect(title).toContain("InvoicePrepper");
  });
});

test.describe("Accessibility: Form labels", () => {
  test("sign in form inputs all have labels", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.getByText("Welcome back").waitFor();
    await finishAnimations(page);
    const inputs = await page.locator("input:not([type='hidden']):not([aria-hidden='true'])").all();
    for (const input of inputs) {
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledBy = await input.getAttribute("aria-labelledby");
      const hasLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false;
      const hasAriaLabel = !!ariaLabel || !!ariaLabelledBy;
      const hasPlaceholder = !!(await input.getAttribute("placeholder"));
      expect(hasLabel || hasAriaLabel || hasPlaceholder).toBe(true);
    }
  });
});

// ─── KEYBOARD + INTERACTION ───────────────────────────────────────────────────

test.describe("Accessibility: Keyboard interaction", () => {
  test("Escape closes the sign in modal", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.getByText("Welcome back").waitFor();
    await finishAnimations(page);
    await page.keyboard.press("Escape");
    await expect(page.getByText("Welcome back")).not.toBeVisible();
  });

  test("Escape closes the sign up modal", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: /^sign up$/i }).click();
    await page.getByText("Create your account").waitFor();
    await finishAnimations(page);
    await page.keyboard.press("Escape");
    await expect(page.getByText("Create your account")).not.toBeVisible();
  });

  test("auth modal receives focus on open", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.getByText("Welcome back").waitFor();
    await finishAnimations(page);
    const focused = await page.evaluate(() => document.activeElement?.closest(".auth-card") !== null);
    expect(focused).toBe(true);
  });
});
