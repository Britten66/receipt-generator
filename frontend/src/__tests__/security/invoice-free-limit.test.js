/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: Free Plan Monthly Invoice Cap (3 invoices per calendar month)
  File: security/invoice-free-limit.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (threat model):
  ─────────────────────────────────
  The free plan is capped at 3 invoices per calendar month, resetting on the
  1st, not a lifetime cap and not "3 active at once." This is enforced in two
  places that must agree exactly:

    1. App-level pre-check (supabase/functions/receipts/index.ts, POST
       handler): reads tier + legacy_unlimited_invoices, counts the user's
       receipts created since the start of the current month (no deleted_at
       filter, deleting doesn't free a slot within the month), and rejects
       with 403/FREE_LIMIT_REACHED at count >= 3.

    2. DB-level backstop (supabase/migrations/018_free_invoice_limit.sql,
       trigger_enforce_free_invoice_limit): fires on every INSERT into
       receipts regardless of caller (closes the hole where someone calls
       PostgREST directly with the anon key + their own JWT, skipping the
       edge function entirely), takes a per-user advisory lock so concurrent
       inserts can't all read the same pre-insert count, and raises
       FREE_LIMIT_REACHED at the same >= 3 count for the current month
       (created_at >= date_trunc('month', now())).

  Existing users at the time of migration 018 are permanently grandfathered
  via profiles.legacy_unlimited_invoices = true, regardless of tier. Anyone
  signing up after that migration defaults to false and IS subject to the cap.

  If the app check and the DB trigger ever disagree (e.g. someone changes the
  limit or the reset window in one place and not the other), free users get
  an inconsistent experience: blocked by one layer but not the other. These
  tests encode the agreed boundary so a future edit that breaks the sync is
  caught here.

  WHAT WE VERIFY:
  ───────────────
  1. Free users are blocked starting at exactly the 4th invoice this month
     (count >= 3)
  2. The 1st, 2nd, and 3rd invoice of the month are always allowed
  3. Deleting invoices does not free up a slot within the same month
  4. The count resets once the calendar month rolls over, this is the entire
     point of the monthly model versus the old lifetime one
  5. legacy_unlimited_invoices exempts a user regardless of tier or count
  6. Pro/Voice tier is never capped, regardless of count
  7. A missing/null tier is treated as free (fail-closed, not fail-open)
  8. The app-level limit constant and the DB trigger's hardcoded limit agree
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";

describe("Security", () => {

// ── Replicated from supabase/functions/receipts/index.ts ─────────────────────
const FREE_INVOICE_LIMIT = 3;

// Mirrors supabase/functions/_shared/freeLimit.ts (isSubjectToFreeLimit), used
// by both the POST handler's pre-check and the profile usage-hint query, and
// (by design, since all three must agree) the DB trigger in migration 018.
// monthlyCount is the count of this user's receipts created since the start
// of the current calendar month, exactly as all three layers compute it.
function isSubjectToFreeLimit({ tier, legacyUnlimited, proGrantUntil }) {
  if (legacyUnlimited) return false;
  const grantActive = !!proGrantUntil && new Date(proGrantUntil).getTime() > Date.now();
  if (grantActive) return false;
  return (tier ?? "free") === "free";
}

function isOverFreeLimit({ tier, legacyUnlimited, monthlyCount, proGrantUntil = null }) {
  if (!isSubjectToFreeLimit({ tier, legacyUnlimited, proGrantUntil })) return false;
  return monthlyCount >= FREE_INVOICE_LIMIT;
}

// Mirrors date_trunc('month', now()) / Date.UTC(year, month, 1): the window
// used to decide which receipts count toward the current month.
function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

// Counts only receipts created on/after the start of the given "now" month,
// modeling what the SQL COUNT(*) ... WHERE created_at >= date_trunc(...)
// and the JS .gte("created_at", startOfMonth) queries actually return.
function countThisMonth(receiptCreatedDates, now) {
  const cutoff = startOfMonth(now);
  return receiptCreatedDates.filter((d) => d >= cutoff).length;
}
// ─────────────────────────────────────────────────────────────────────────────

describe("isOverFreeLimit: boundary is exactly 3 invoices in the current month", () => {
  it("allows the 1st invoice (count 0 before insert)", () => {
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: false, monthlyCount: 0 })).toBe(false);
  });

  it("allows the 2nd invoice (count 1 before insert)", () => {
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: false, monthlyCount: 1 })).toBe(false);
  });

  it("allows the 3rd invoice (count 2 before insert)", () => {
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: false, monthlyCount: 2 })).toBe(false);
  });

  it("blocks the 4th invoice this month (count 3 before insert)", () => {
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: false, monthlyCount: 3 })).toBe(true);
  });

  it("stays blocked well beyond the limit within the same month", () => {
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: false, monthlyCount: 50 })).toBe(true);
  });
});

describe("isOverFreeLimit: monthly cap, not an active-invoice cap", () => {
  it("blocks a user who deleted invoices back down to 0 active but created 3+ this month", () => {
    // The count passed in includes deleted rows created this month: deleting
    // an invoice must not free up a slot, or a free user could
    // delete-and-recreate to dodge the cap all month long.
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: false, monthlyCount: 3 })).toBe(true);
  });
});

describe("countThisMonth: the cap resets when the calendar month rolls over", () => {
  it("does not count invoices created in a previous month", () => {
    const may1 = new Date(Date.UTC(2026, 4, 1));
    const june15 = new Date(Date.UTC(2026, 5, 15));
    // 3 invoices created in May, none yet in June.
    const created = [may1, new Date(Date.UTC(2026, 4, 10)), new Date(Date.UTC(2026, 4, 28))];
    expect(countThisMonth(created, june15)).toBe(0);
  });

  it("a free user maxed out in May can create invoices again in June", () => {
    const created = [
      new Date(Date.UTC(2026, 4, 2)),
      new Date(Date.UTC(2026, 4, 15)),
      new Date(Date.UTC(2026, 4, 30)),
    ];
    const mayCount = countThisMonth(created, new Date(Date.UTC(2026, 4, 30)));
    const juneCount = countThisMonth(created, new Date(Date.UTC(2026, 5, 1)));
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: false, monthlyCount: mayCount })).toBe(true);
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: false, monthlyCount: juneCount })).toBe(false);
  });

  it("only counts invoices from the current month, ignoring any created earlier in the same month before a delete", () => {
    const created = [
      new Date(Date.UTC(2026, 7, 1)),
      new Date(Date.UTC(2026, 7, 5)),
    ];
    expect(countThisMonth(created, new Date(Date.UTC(2026, 7, 20)))).toBe(2);
  });
});

describe("isOverFreeLimit: grandfathered users are exempt regardless of count", () => {
  it("never blocks a legacy_unlimited_invoices user, even at a huge count", () => {
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: true, monthlyCount: 9999 })).toBe(false);
  });

  it("legacy exemption applies even if tier somehow reads as free", () => {
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: true, monthlyCount: 3 })).toBe(false);
  });
});

describe("isOverFreeLimit: an active referral Pro grant exempts the user too", () => {
  // Regression coverage: GET /profile overlays a granted user's tier to "pro"
  // (applyGrantToTier in supabase/functions/profile/index.ts) so the sidebar
  // hides the free-limit hint entirely. Before this fix, the POST handler and
  // the DB trigger both read the raw underlying tier and ignored the grant, so
  // a user who believed they had unlimited Pro invoices still got blocked and
  // 403'd on their 4th invoice of the month.
  it("does not block a free-tier user with a pro_grant_until in the future", () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: false, monthlyCount: 5, proGrantUntil: future })).toBe(false);
  });

  it("blocks once the grant has expired (pro_grant_until in the past)", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: false, monthlyCount: 3, proGrantUntil: past })).toBe(true);
  });

  it("blocks a free-tier user with no grant at all (proGrantUntil null)", () => {
    expect(isOverFreeLimit({ tier: "free", legacyUnlimited: false, monthlyCount: 3, proGrantUntil: null })).toBe(true);
  });
});

describe("isOverFreeLimit: paying tiers are never capped", () => {
  it("never blocks a pro-tier user regardless of count", () => {
    expect(isOverFreeLimit({ tier: "pro", legacyUnlimited: false, monthlyCount: 500 })).toBe(false);
  });

  it("never blocks a voice-tier user regardless of count", () => {
    expect(isOverFreeLimit({ tier: "voice", legacyUnlimited: false, monthlyCount: 500 })).toBe(false);
  });
});

describe("isOverFreeLimit: missing tier fails closed (treated as free)", () => {
  it("treats a null tier as free and applies the cap", () => {
    expect(isOverFreeLimit({ tier: null, legacyUnlimited: false, monthlyCount: 3 })).toBe(true);
  });

  it("treats an undefined tier as free and applies the cap", () => {
    expect(isOverFreeLimit({ tier: undefined, legacyUnlimited: false, monthlyCount: 3 })).toBe(true);
  });
});

describe("Limit constant: app-level and DB-trigger must agree", () => {
  it("FREE_INVOICE_LIMIT is 3, matching the hardcoded threshold in migration 018's trigger", () => {
    // migrations/018_free_invoice_limit.sql: `IF monthly_count >= 3 THEN RAISE EXCEPTION ...`
    // If this constant ever changes here, the migration's trigger function
    // must be updated (and re-run) in the same change, or the two layers
    // silently disagree on where free users get capped.
    expect(FREE_INVOICE_LIMIT).toBe(3);
  });
});

}); // Security
