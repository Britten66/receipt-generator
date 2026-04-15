/*
  ══════════════════════════════════════════════════════════════════════════════
  E2E: Invoices — create, view, status
  Suite: Invoices
  ══════════════════════════════════════════════════════════════════════════════
*/

import { test, expect } from "@playwright/test";

test.describe("Invoices", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Dismiss welcome modal if present
    const welcome = page.locator(".welcome-modal, [data-testid='welcome-modal']");
    if (await welcome.isVisible().catch(() => false)) {
      await page.keyboard.press("Escape");
    }
  });

  test("can open new invoice form", async ({ page }) => {
    await page.getByRole("button", { name: /new invoice/i }).click();
    await expect(page.locator("form")).toBeVisible();
  });

  test("new invoice form has client name field", async ({ page }) => {
    await page.getByRole("button", { name: /new invoice/i }).click();
    await expect(
      page.locator("input[placeholder*='client' i], input[name*='client' i], input[id*='client' i]").first()
    ).toBeVisible();
  });

  test("new invoice form has at least one line item row", async ({ page }) => {
    await page.getByRole("button", { name: /new invoice/i }).click();
    await expect(page.locator("input[placeholder*='description' i], input[placeholder*='item' i]").first()).toBeVisible();
  });

  test("cancel closes the invoice form", async ({ page }) => {
    await page.getByRole("button", { name: /new invoice/i }).click();
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.locator(".invoice-grid, .empty-state")).toBeVisible();
  });

  test("invoice list shows status filters", async ({ page }) => {
    const sidebar = page.locator(".app-sidebar");
    await expect(sidebar).toBeVisible();
    // Status filters exist somewhere on page
    const filters = page.locator("button, [role='tab']").filter({ hasText: /paid|sent|draft/i });
    const count = await filters.count();
    expect(count).toBeGreaterThan(0);
  });
});
