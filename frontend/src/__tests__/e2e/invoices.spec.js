/*
  E2E: Invoices: create, view, status
  Suite: Invoices
*/

import { test, expect } from "@playwright/test";

test.describe("Invoices", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".sidebar").waitFor({ timeout: 15000 });
  });

  test("can open new invoice form", async ({ page }) => {
    await page.getByRole("button", { name: /new invoice/i }).click();
    await expect(page.locator(".modal")).toBeVisible();
  });

  test("new invoice form has client name field", async ({ page }) => {
    await page.getByRole("button", { name: /new invoice/i }).click();
    await page.locator(".modal").waitFor();
    await expect(
      page.locator("input[placeholder*='client' i], input[placeholder*='billed' i], input[placeholder*='customer' i]").first()
    ).toBeVisible();
  });

  test("new invoice form has a line item description field", async ({ page }) => {
    await page.getByRole("button", { name: /new invoice/i }).click();
    await page.locator(".modal").waitFor();
    await expect(
      page.locator("input[placeholder*='description' i], input[placeholder*='item' i], input[placeholder*='service' i]").first()
    ).toBeVisible();
  });

  test("cancel closes the invoice form", async ({ page }) => {
    await page.getByRole("button", { name: /new invoice/i }).click();
    await page.locator(".modal").waitFor();
    await page.locator(".modal button.btn-ghost").first().click();
    await expect(page.locator(".modal")).not.toBeVisible();
  });

  test("invoice list shows status filters", async ({ page }) => {
    const filters = page.locator("button, [role='tab']").filter({ hasText: /paid|sent|draft/i });
    const count = await filters.count();
    expect(count).toBeGreaterThan(0);
  });
});
