/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: Stripe Webhook — Tier Resolution Must Fail Closed
  File: security/stripe-webhook-tier.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (threat model):
  ─────────────────────────────────
  On checkout.session.completed, the webhook must look up which price the
  customer actually subscribed to (Pro vs. Voice) before writing their tier.
  The old code initialised tier = "pro" as a "safe default" and only
  overwrote it if stripe.subscriptions.retrieve() succeeded — but if that
  call THREW (transient Stripe/network error), the code fell straight
  through to upserting tier = "pro" anyway. A customer who just paid for the
  pricier Voice plan would be silently downgraded to Pro with no error
  surfaced and no way to tell "resolved to pro" apart from "defaulted to pro
  on failure."

  The fix: when a subscription needs to be inspected (there IS a
  session.subscription and voice pricing is configured) and the retrieve
  call fails, the handler returns 500 instead of upserting anything. A
  non-2xx response makes Stripe retry the webhook with backoff, so the tier
  eventually resolves correctly instead of locking in a wrong guess.

  The "pro" default is still correct and intentional for the case where
  there's genuinely nothing to look up (no voice pricing configured, or
  no subscription on the session) - only the FAILURE path must not fall
  through to it.

  WHAT WE VERIFY:
  ───────────────
  1. tierFromPriceId maps every known price id (CAD + USD) to the right tier
  2. tierFromPriceId returns null for an unrecognised price
  3. resolveCheckoutTier resolves the correct tier when the lookup succeeds
  4. resolveCheckoutTier defaults to "pro" only when there's nothing to check
  5. resolveCheckoutTier signals RETRY (never a silent "pro") when the
     lookup throws and a subscription should have been checked
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";

describe("Security", () => {

// ── Replicated from supabase/functions/stripe-webhook/index.ts ───────────────
const PRICE_IDS = {
  voice: ["price_voice_cad", "price_voice_usd"],
  pro:   ["price_pro_cad", "price_pro_usd"],
};

function tierFromPriceId(priceId) {
  if (!priceId) return null;
  if (PRICE_IDS.voice.includes(priceId)) return "voice";
  if (PRICE_IDS.pro.includes(priceId))   return "pro";
  return null;
}

// Mirrors the checkout.session.completed handler's tier-resolution flow.
// retrieveSubscription: () => priceId | throws
function resolveCheckoutTier({ voicePriceConfigured, hasSubscription, retrieveSubscription }) {
  let tier = "pro"; // safe default when there's no subscription to inspect

  if (voicePriceConfigured && hasSubscription) {
    try {
      const priceId = retrieveSubscription();
      const resolved = tierFromPriceId(priceId);
      if (resolved) tier = resolved;
    } catch {
      return "RETRY"; // must never fall through to the "pro" default
    }
  }

  return tier;
}
// ─────────────────────────────────────────────────────────────────────────────

describe("tierFromPriceId: price -> tier mapping", () => {
  it("maps CAD and USD voice prices to voice", () => {
    expect(tierFromPriceId("price_voice_cad")).toBe("voice");
    expect(tierFromPriceId("price_voice_usd")).toBe("voice");
  });

  it("maps CAD and USD pro prices to pro", () => {
    expect(tierFromPriceId("price_pro_cad")).toBe("pro");
    expect(tierFromPriceId("price_pro_usd")).toBe("pro");
  });

  it("returns null for an unrecognised price id", () => {
    expect(tierFromPriceId("price_totally_unknown")).toBeNull();
  });

  it("returns null for a missing price id", () => {
    expect(tierFromPriceId(null)).toBeNull();
    expect(tierFromPriceId(undefined)).toBeNull();
  });
});

describe("resolveCheckoutTier: defaults to pro only when there's nothing to check", () => {
  it("defaults to pro when voice pricing isn't configured in this environment", () => {
    const tier = resolveCheckoutTier({ voicePriceConfigured: false, hasSubscription: true, retrieveSubscription: () => { throw new Error("should never be called"); } });
    expect(tier).toBe("pro");
  });

  it("defaults to pro when the checkout session has no subscription to inspect", () => {
    const tier = resolveCheckoutTier({ voicePriceConfigured: true, hasSubscription: false, retrieveSubscription: () => { throw new Error("should never be called"); } });
    expect(tier).toBe("pro");
  });
});

describe("resolveCheckoutTier: resolves the real tier when the lookup succeeds", () => {
  it("resolves to voice when the subscription's price is the voice price", () => {
    const tier = resolveCheckoutTier({ voicePriceConfigured: true, hasSubscription: true, retrieveSubscription: () => "price_voice_cad" });
    expect(tier).toBe("voice");
  });

  it("resolves to pro when the subscription's price is the pro price", () => {
    const tier = resolveCheckoutTier({ voicePriceConfigured: true, hasSubscription: true, retrieveSubscription: () => "price_pro_usd" });
    expect(tier).toBe("pro");
  });

  it("keeps the pro default if the resolved price id is unrecognised (does not throw)", () => {
    const tier = resolveCheckoutTier({ voicePriceConfigured: true, hasSubscription: true, retrieveSubscription: () => "price_mystery" });
    expect(tier).toBe("pro");
  });
});

describe("resolveCheckoutTier: fails closed (RETRY) instead of silently defaulting to pro", () => {
  it("signals RETRY when stripe.subscriptions.retrieve throws", () => {
    const tier = resolveCheckoutTier({
      voicePriceConfigured: true,
      hasSubscription: true,
      retrieveSubscription: () => { throw new Error("Stripe API network error"); },
    });
    expect(tier).toBe("RETRY");
    expect(tier).not.toBe("pro");
  });

  it("this is the exact regression the fix closes: a Voice buyer must never silently become Pro on error", () => {
    // Before the fix, this scenario upserted tier = "pro" with no signal
    // that anything went wrong. The fix must make it retry instead.
    const result = resolveCheckoutTier({
      voicePriceConfigured: true,
      hasSubscription: true,
      retrieveSubscription: () => { throw new Error("transient"); },
    });
    expect(result).not.toBe("pro");
    expect(result).not.toBe("voice");
    expect(result).toBe("RETRY");
  });
});

}); // Security
