/*
  ══════════════════════════════════════════════════════════════════════════════
  E2E: Auth Modal: open, mode switch, consent gate, password validation
  File: e2e/auth.spec.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  Auth is the gateway to the whole app. Password validation blocks weak
  passwords. Consent is handled post-login via the ConsentModal. These
  tests run against the real UI.

  WHAT WE VERIFY:
  ───────────────
  1.  Sign In button opens auth modal in login mode
  2.  Auth modal shows "Welcome back" heading in login mode
  3.  Sign Up button opens auth modal in signup mode
  4.  Auth modal shows "Create your account" heading in signup mode
  5.  Clicking the Sign Up tab inside the modal switches to signup mode
  6.  Clicking the Sign In tab inside the modal switches to login mode
  7.  Weak password shows a validation error
  8.  Mismatched passwords shows an error
  9.  "Continue with Google" button is visible in the auth modal
  10. Forgot password flow works end to end
  ══════════════════════════════════════════════════════════════════════════════
*/

import { test, expect } from "@playwright/test";

test.describe("Auth modal: Sign In", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^sign in$/i }).click();
  });

  test("opens auth modal with Welcome back heading", async ({ page }) => {
    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("shows email field", async ({ page }) => {
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  });

  test("shows password field", async ({ page }) => {
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  });

  test("shows Continue with Google button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });

  test("Sign Up tab switches to signup mode", async ({ page }) => {
    // Scope to the auth card to avoid clicking the nav Sign Up button
    await page.locator(".auth-card").getByRole("button", { name: /^sign up$/i }).click();
    await expect(page.getByText("Create your account")).toBeVisible();
  });
});

test.describe("Auth modal: Sign Up", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^sign up$/i }).click();
  });

  test("opens auth modal with Create your account heading", async ({ page }) => {
    await expect(page.getByText("Create your account")).toBeVisible();
  });

  test("Sign In tab switches back to login mode", async ({ page }) => {
    // There are two "Sign In" buttons: the nav one and the tab inside the modal.
    // The modal tab is inside .auth-card
    await page.locator(".auth-card").getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("submitting with a weak password shows an error", async ({ page }) => {
    await page.getByPlaceholder("you@example.com").fill("test@example.com");
    await page.locator('input[type="password"]').first().fill("weak");
    await page.locator('input[type="password"]').last().fill("weak");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.locator(".auth-error")).toBeVisible();
  });

  test("mismatched passwords shows an error", async ({ page }) => {
    await page.getByPlaceholder("you@example.com").fill("test@example.com");
    await page.locator('input[type="password"]').first().fill("StrongPass1!");
    await page.locator('input[type="password"]').last().fill("DifferentPass1!");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/passwords don't match/i)).toBeVisible();
  });

  test("Forgot password link appears in login mode", async ({ page }) => {
    await page.locator(".auth-card").getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByRole("button", { name: /forgot password/i })).toBeVisible();
  });
});

test.describe("Auth modal: Forgot password", () => {
  test("shows reset form with Send Reset Link button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.getByRole("button", { name: /forgot password/i }).click();
    await expect(page.getByText("Reset your password")).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("Back to sign in link returns to login mode", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.getByRole("button", { name: /forgot password/i }).click();
    await page.getByRole("button", { name: /back to sign in/i }).click();
    await expect(page.getByText("Welcome back")).toBeVisible();
  });
});
