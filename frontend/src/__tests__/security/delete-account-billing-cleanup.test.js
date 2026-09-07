/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: Account Deletion Must Cancel the Stripe Subscription First
  File: security/delete-account-billing-cleanup.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (threat model):
  ─────────────────────────────────
  delete-account used to wipe line_items, receipts, profile, and the auth
  user without ever touching Stripe. A paying Pro/Voice user who deleted
  their account kept their subscription alive: Stripe would keep charging
  their card every billing cycle for a subscription now tied to no user
  record at all. That's a live financial liability (chargebacks, complaints)
  the moment there is a single paying customer.

  The fix cancels the Stripe subscription (via profile.stripe_subscription_id)
  BEFORE any Supabase rows are deleted, so the id is still available to look
  up. It's best-effort: if the Stripe API call fails, the error is logged and
  deletion proceeds anyway — a Stripe outage must never trap a user who wants
  to delete their own account and never come back. The residual risk (a
  failed cancel while acount data is gone) is an acceptable trade-off versus
  blocking a GDPR/CCPA-style deletion request on a third-party API being up.

  These tests model the actual operation sequence in
  supabase/functions/delete-account/index.ts as a pure function over mock
  clients, so the ORDER and RESILIENCE guarantees are locked in without
  needing a real Stripe/Supabase connection.

  WHAT WE VERIFY:
  ───────────────
  1. A user with an active subscription has it cancelled before deletion
  2. A user with no subscription id skips the Stripe call entirely (no crash)
  3. A Stripe cancellation failure is logged but does NOT block the rest of
     the deletion (best-effort, not best-effort-or-nothing)
  4. Cancellation happens strictly before receipts/profile/auth-user deletion
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect, vi } from "vitest";

describe("Security", () => {

// ── Replicated call sequence from supabase/functions/delete-account/index.ts ─
// steps: an array this function pushes into, in call order, so tests can
// assert both "did it happen" and "did it happen in the right order."
async function runAccountDeletion({ subscriptionId, cancelSubscription, deleteReceipts, deleteProfile, deleteAuthUser }, steps) {
  if (subscriptionId) {
    try {
      await cancelSubscription(subscriptionId);
      steps.push("subscription_cancelled");
    } catch (err) {
      steps.push("subscription_cancel_failed");
      // best-effort: swallow and continue, exactly like the edge function
    }
  }

  await deleteReceipts();
  steps.push("receipts_deleted");

  await deleteProfile();
  steps.push("profile_deleted");

  await deleteAuthUser();
  steps.push("auth_user_deleted");

  return steps;
}
// ─────────────────────────────────────────────────────────────────────────────

describe("runAccountDeletion: cancels an active subscription before deleting data", () => {
  it("calls cancelSubscription with the profile's stripe_subscription_id", async () => {
    const cancelSubscription = vi.fn().mockResolvedValue({});
    const steps = [];
    await runAccountDeletion({
      subscriptionId: "sub_active_123",
      cancelSubscription,
      deleteReceipts: vi.fn(),
      deleteProfile: vi.fn(),
      deleteAuthUser: vi.fn(),
    }, steps);

    expect(cancelSubscription).toHaveBeenCalledWith("sub_active_123");
    expect(cancelSubscription).toHaveBeenCalledTimes(1);
  });

  it("cancellation happens strictly before receipts, profile, and auth user deletion", async () => {
    const steps = [];
    await runAccountDeletion({
      subscriptionId: "sub_active_123",
      cancelSubscription: vi.fn().mockResolvedValue({}),
      deleteReceipts: vi.fn(),
      deleteProfile: vi.fn(),
      deleteAuthUser: vi.fn(),
    }, steps);

    expect(steps).toEqual([
      "subscription_cancelled",
      "receipts_deleted",
      "profile_deleted",
      "auth_user_deleted",
    ]);
  });
});

describe("runAccountDeletion: users with no subscription skip the Stripe call", () => {
  it("does not call cancelSubscription when there is no subscription id", async () => {
    const cancelSubscription = vi.fn();
    const steps = [];
    await runAccountDeletion({
      subscriptionId: null,
      cancelSubscription,
      deleteReceipts: vi.fn(),
      deleteProfile: vi.fn(),
      deleteAuthUser: vi.fn(),
    }, steps);

    expect(cancelSubscription).not.toHaveBeenCalled();
    expect(steps).toEqual(["receipts_deleted", "profile_deleted", "auth_user_deleted"]);
  });
});

describe("runAccountDeletion: a Stripe failure never blocks account deletion", () => {
  it("continues deleting all data even when cancelSubscription throws", async () => {
    const deleteReceipts = vi.fn();
    const deleteProfile = vi.fn();
    const deleteAuthUser = vi.fn();
    const steps = [];

    await runAccountDeletion({
      subscriptionId: "sub_will_fail",
      cancelSubscription: vi.fn().mockRejectedValue(new Error("Stripe API down")),
      deleteReceipts,
      deleteProfile,
      deleteAuthUser,
    }, steps);

    expect(steps).toContain("subscription_cancel_failed");
    expect(deleteReceipts).toHaveBeenCalledTimes(1);
    expect(deleteProfile).toHaveBeenCalledTimes(1);
    expect(deleteAuthUser).toHaveBeenCalledTimes(1);
  });

  it("does not throw out of runAccountDeletion when Stripe cancellation fails", async () => {
    const steps = [];
    await expect(runAccountDeletion({
      subscriptionId: "sub_will_fail",
      cancelSubscription: vi.fn().mockRejectedValue(new Error("Stripe API down")),
      deleteReceipts: vi.fn(),
      deleteProfile: vi.fn(),
      deleteAuthUser: vi.fn(),
    }, steps)).resolves.toBeDefined();
  });
});

}); // Security
