/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: Stripe Checkout — Block a Second Active Subscription
  File: security/stripe-checkout-guard.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (threat model):
  ─────────────────────────────────
  stripe-checkout used to create a new Checkout Session unconditionally for
  any authenticated user. A double-click, a retried failed request, or a
  replayed request against an already-Pro/Voice user would create a SECOND
  Stripe subscription for the same person, double-billing them with no
  dedupe. The fix checks the caller's profile before creating a session: if
  they already have an active subscription (tier is pro/voice AND a
  stripe_subscription_id is on file), the request is rejected with 409
  instead of opening another Checkout session.

  This is a real-money bug: it would show up as a support ticket ("why was
  I charged twice?") or a chargeback, not a crash.

  KNOWN RESIDUAL GAP (documented, not fixed here):
  This guard only stops a SECOND checkout for someone who is ALREADY
  subscribed (stripe_subscription_id already set by a prior webhook). It does
  NOT close the narrower race where a brand-new subscriber double-clicks
  Upgrade before the first checkout's webhook has landed and written
  stripe_subscription_id — at that instant the profile still looks
  "not subscribed yet" to this guard. That gap is called out explicitly so a
  future change to this file doesn't accidentally claim it's fully closed.

  WHAT WE VERIFY:
  ───────────────
  1. A user with an active subscription is blocked (both pro and voice)
  2. A free user with no subscription is allowed through
  3. A user with a stale/missing stripe_subscription_id is allowed through
     even if tier looks like pro/voice (inconsistent state should not lock
     someone out of ever checking out again)
  4. A brand-new user (no profile row yet) is allowed through
  5. The guard is a pure function of (tier, stripe_subscription_id) only
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";

describe("Security", () => {

// ── Replicated from supabase/functions/stripe-checkout/index.ts ──────────────
function blocksNewCheckout(profile) {
  return !!(profile?.stripe_subscription_id && (profile.tier === "pro" || profile.tier === "voice"));
}
// ─────────────────────────────────────────────────────────────────────────────

describe("blocksNewCheckout: already-subscribed users are blocked", () => {
  it("blocks a Pro user with an active subscription id", () => {
    expect(blocksNewCheckout({ tier: "pro", stripe_subscription_id: "sub_123" })).toBe(true);
  });

  it("blocks a Voice user with an active subscription id", () => {
    expect(blocksNewCheckout({ tier: "voice", stripe_subscription_id: "sub_456" })).toBe(true);
  });
});

describe("blocksNewCheckout: users who should be allowed to check out", () => {
  it("allows a free user with no subscription", () => {
    expect(blocksNewCheckout({ tier: "free", stripe_subscription_id: null })).toBe(false);
  });

  it("allows a brand-new user with no profile row at all", () => {
    expect(blocksNewCheckout(undefined)).toBe(false);
    expect(blocksNewCheckout(null)).toBe(false);
  });

  it("allows a user with pro/voice tier but no subscription id on file (inconsistent state)", () => {
    // e.g. a manually-granted referral tier bump, or a cleared subscription
    // id after a failed webhook - must never permanently lock someone out
    // of Stripe checkout.
    expect(blocksNewCheckout({ tier: "pro", stripe_subscription_id: null })).toBe(false);
    expect(blocksNewCheckout({ tier: "voice", stripe_subscription_id: "" })).toBe(false);
  });

  it("allows a user with a subscription id but free tier (e.g. cancelled and downgraded)", () => {
    expect(blocksNewCheckout({ tier: "free", stripe_subscription_id: "sub_old_cancelled" })).toBe(false);
  });

  it("is case-sensitive and does not treat unrelated tier strings as subscribed", () => {
    expect(blocksNewCheckout({ tier: "Pro", stripe_subscription_id: "sub_1" })).toBe(false);
    expect(blocksNewCheckout({ tier: "admin", stripe_subscription_id: "sub_1" })).toBe(false);
  });
});

}); // Security
