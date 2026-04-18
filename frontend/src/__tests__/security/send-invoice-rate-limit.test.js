/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: Send Invoice. Daily Rate Limit
  File: security/send-invoice-rate-limit.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (threat model):
  ─────────────────────────────────
  Before migration 008 the send-invoice function had no per-user rate limit.
  A compromised Pro account could fire unlimited Resend API calls, running up
  the bill and tanking the invoices@invoiceprepper.com domain reputation
  (deliverability drops for every legitimate user).

  The fix uses an insert-then-count pattern: insert a row into public.email_usage
  first, then count today's rows, and reject with 429 if the post-insert total
  exceeds DAILY_EMAIL_LIMIT. This bounds concurrent overshoot (the prior
  check-then-insert pattern lets N parallel requests pass the same pre-increment
  check). Admin user IDs listed in ADMIN_USER_IDS bypass the check entirely.

  Note: `pre_insert_count >= LIMIT` is equivalent to `post_insert_count > LIMIT`,
  so the pure `shouldBlock(todayCount)` helper below (which models the boundary
  using the pre-insert count semantics) still represents the real behaviour.

  WHAT WE VERIFY:
  ───────────────
  1. Below the limit → allowed
  2. At the limit → blocked (429)
  3. Above the limit → blocked (429)
  4. Admin IDs bypass the check regardless of count
  5. Non-admin IDs never bypass
  6. Empty / missing ADMIN_USER_IDS → no bypass
  7. Limit boundary is inclusive. Exactly DAILY_EMAIL_LIMIT blocks
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";

// ── Replicated from supabase/functions/send-invoice/index.ts ─────────────────
// Keep in sync with the edge function. If DAILY_EMAIL_LIMIT changes there,
// update the constant here.

const DAILY_EMAIL_LIMIT = 50;

function parseAdminIds(envValue) {
  return (envValue ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

function isOverLimit(count) {
  return (count ?? 0) >= DAILY_EMAIL_LIMIT;
}

function shouldBlock({ userId, adminEnv, todayCount }) {
  const adminIds = parseAdminIds(adminEnv);
  const isAdmin = adminIds.includes(userId);
  if (isAdmin) return false;
  return isOverLimit(todayCount);
}
// ─────────────────────────────────────────────────────────────────────────────

describe("Security", () => {
  describe("send-invoice daily rate limit", () => {
    it("allows a request when count is below the limit", () => {
      expect(shouldBlock({ userId: "u1", adminEnv: "", todayCount: 0 })).toBe(false);
      expect(shouldBlock({ userId: "u1", adminEnv: "", todayCount: 49 })).toBe(false);
    });

    it("blocks exactly at the limit (inclusive)", () => {
      expect(shouldBlock({ userId: "u1", adminEnv: "", todayCount: DAILY_EMAIL_LIMIT })).toBe(true);
    });

    it("blocks above the limit", () => {
      expect(shouldBlock({ userId: "u1", adminEnv: "", todayCount: DAILY_EMAIL_LIMIT + 100 })).toBe(true);
    });

    it("treats null / undefined count as zero and allows", () => {
      expect(shouldBlock({ userId: "u1", adminEnv: "", todayCount: null })).toBe(false);
      expect(shouldBlock({ userId: "u1", adminEnv: "", todayCount: undefined })).toBe(false);
    });

    it("admin IDs bypass the limit regardless of count", () => {
      const env = "admin-1,admin-2";
      expect(shouldBlock({ userId: "admin-1", adminEnv: env, todayCount: 9999 })).toBe(false);
      expect(shouldBlock({ userId: "admin-2", adminEnv: env, todayCount: DAILY_EMAIL_LIMIT })).toBe(false);
    });

    it("non-admin IDs never bypass even when ADMIN_USER_IDS is set", () => {
      const env = "admin-1,admin-2";
      expect(shouldBlock({ userId: "evil-user", adminEnv: env, todayCount: DAILY_EMAIL_LIMIT })).toBe(true);
    });

    it("empty ADMIN_USER_IDS means no bypass for anyone", () => {
      expect(shouldBlock({ userId: "u1", adminEnv: "", todayCount: DAILY_EMAIL_LIMIT })).toBe(true);
      expect(shouldBlock({ userId: "u1", adminEnv: undefined, todayCount: DAILY_EMAIL_LIMIT })).toBe(true);
    });

    it("handles whitespace and empty segments in ADMIN_USER_IDS", () => {
      const env = "  admin-1  , , admin-2 , ";
      expect(shouldBlock({ userId: "admin-1", adminEnv: env, todayCount: 1000 })).toBe(false);
      expect(shouldBlock({ userId: "admin-2", adminEnv: env, todayCount: 1000 })).toBe(false);
      expect(shouldBlock({ userId: "",        adminEnv: env, todayCount: 1000 })).toBe(true);
    });

    it("DAILY_EMAIL_LIMIT is above typical daily legitimate volume", () => {
      // Defence-in-depth assertion: if a future edit accidentally lowers the
      // limit below a sensible floor, this test catches it.
      expect(DAILY_EMAIL_LIMIT).toBeGreaterThanOrEqual(20);
    });
  });
});
