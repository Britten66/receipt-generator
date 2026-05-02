/*
  E2E: Dashboard: core layout and navigation
  Suite: Dashboard
*/

import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for dashboard shell to be ready
    await page.locator(".sidebar").waitFor({ timeout: 15000 });
  });

  test("sidebar is visible after login", async ({ page }) => {
    await expect(page.locator(".sidebar")).toBeVisible();
  });

  test("invoice list loads", async ({ page }) => {
    await expect(page.locator(".receipt-grid, .empty")).toBeVisible();
  });

  test("new invoice button is visible", async ({ page }) => {
    const btn = page.getByRole("button", { name: /new invoice/i });
    await expect(btn).toBeVisible();
  });

  test("clicking new invoice opens the form", async ({ page }) => {
    await page.getByRole("button", { name: /new invoice/i }).click();
    await expect(page.locator(".modal")).toBeVisible();
  });

  test("sidebar shows invoices nav link", async ({ page }) => {
    await expect(page.locator(".sidebar")).toContainText(/invoice/i);
  });

  test("page title is set", async ({ page }) => {
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });
});
