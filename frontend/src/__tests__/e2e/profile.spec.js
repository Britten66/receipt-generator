/*
  E2E: Profile: open, fields, close
  Suite: Profile
*/

import { test, expect } from "@playwright/test";

test.describe("Profile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".sidebar").waitFor({ timeout: 15000 });
  });

  test("profile button is visible in sidebar", async ({ page }) => {
    const btn = page.locator(".sidebar .btn-ghost").first();
    await expect(btn).toBeVisible();
  });

  test("clicking profile button opens modal", async ({ page }) => {
    await page.locator(".sidebar .btn-ghost").first().click();
    await expect(page.locator(".modal-title")).toContainText("Profile");
  });

  test("profile modal has business name field", async ({ page }) => {
    await page.locator(".sidebar .btn-ghost").first().click();
    await page.locator(".modal").waitFor();
    await expect(page.locator(".modal .field").first()).toBeVisible();
  });

  test("profile modal closes on Escape", async ({ page }) => {
    await page.locator(".sidebar .btn-ghost").first().click();
    await page.locator(".modal").waitFor();
    await page.keyboard.press("Escape");
    await expect(page.locator(".modal")).not.toBeVisible();
  });

  test("help button opens help modal", async ({ page }) => {
    await page.locator(".help-btn").click();
    await expect(page.locator(".modal")).toBeVisible();
  });
});
