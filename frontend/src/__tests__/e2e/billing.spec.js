/*
  E2E: Billing: open modal, plan display, close
  Suite: Billing
*/

import { test, expect } from "@playwright/test";

test.describe("Billing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".sidebar").waitFor({ timeout: 15000 });
  });

  test("billing link is visible in sidebar", async ({ page }) => {
    await expect(page.locator(".sidebar").getByText(/billing/i)).toBeVisible();
  });

  test("clicking billing opens modal", async ({ page }) => {
    await page.locator(".sidebar").getByText(/billing/i).click();
    await expect(page.locator(".modal-title")).toContainText("Billing");
  });

  test("billing modal shows current plan", async ({ page }) => {
    await page.locator(".sidebar").getByText(/billing/i).click();
    await page.locator(".modal").waitFor();
    await expect(page.locator(".modal")).toContainText(/free|pro|voice/i);
  });

  test("billing modal closes on Escape", async ({ page }) => {
    await page.locator(".sidebar").getByText(/billing/i).click();
    await page.locator(".modal").waitFor();
    await page.keyboard.press("Escape");
    await expect(page.locator(".modal")).not.toBeVisible();
  });

  test("trash button opens recently deleted modal", async ({ page }) => {
    await page.locator(".trash-btn").click();
    await expect(page.locator(".modal")).toBeVisible();
  });
});
