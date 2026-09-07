/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: Signup Notification Webhook Auth
  File: security/notify-signup.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (threat model):
  ─────────────────────────────────
  notify-signup is a Supabase Database Webhook (Database -> Webhooks, schema
  auth, table users, event INSERT), not an Auth Hook, and not HMAC-signed.
  Supabase Database Webhooks authenticate via a static header you configure
  yourself: "Authorization: Bearer <NOTIFY_SIGNUP_SECRET>". The function's
  only defence is comparing that header to the secret.

  A previous version of this check used `authHeader.includes(webhookSecret)`,
  which accepts any header that merely CONTAINS the secret as a substring
  (e.g. "Bearer wrong-but-contains-the-secret-anyway", or a header with
  extra junk appended). That is not the same as verifying the header IS the
  expected value, and it is not a constant-time comparison either. The fix
  is an exact string comparison: `authHeader === \`Bearer ${webhookSecret}\``.

  If this check is broken, anyone who can guess or leak a substring pattern
  can forge fake "new user" webhook calls, which:
    - Spams the owner's inbox with fake signup notifications
    - Sends the real "your account is ready" welcome email to arbitrary
      addresses, from invoiceprepper.com, on demand

  NOTE: These tests replicate the CURRENT auth check and payload-shape logic
  from supabase/functions/notify-signup/index.ts. If that file changes,
  update this mirror and re-run.
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";

describe("Security", () => {

// ── Replicated from supabase/functions/notify-signup/index.ts ────────────────
function isAuthorized(authHeader, webhookSecret) {
  return authHeader === `Bearer ${webhookSecret}`;
}

// Database webhook sends record at payload.record; falls back to payload.user
// or payload itself for backwards compatibility.
function extractRecord(payload) {
  return payload?.record ?? payload?.user ?? payload;
}

function shouldSendWelcomeEmail(email) {
  return !!(email && email !== "unknown" && email.includes("@"));
}
// ─────────────────────────────────────────────────────────────────────────────

const SECRET = "test-webhook-secret-value";

describe("isAuthorized: exact bearer-token comparison", () => {
  it("accepts the exact expected header", () => {
    expect(isAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("rejects a header that only CONTAINS the secret as a substring", () => {
    // This is the exact bug the fix closes: the old `.includes()` check
    // would have accepted every one of these.
    expect(isAuthorized(`Bearer x${SECRET}`, SECRET)).toBe(false);
    expect(isAuthorized(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isAuthorized(`Bearer prefix-${SECRET}-suffix`, SECRET)).toBe(false);
  });

  it("rejects the secret with no 'Bearer ' prefix", () => {
    expect(isAuthorized(SECRET, SECRET)).toBe(false);
  });

  it("rejects a completely wrong secret", () => {
    expect(isAuthorized(`Bearer wrong-secret`, SECRET)).toBe(false);
  });

  it("rejects an empty header", () => {
    expect(isAuthorized("", SECRET)).toBe(false);
  });

  it("rejects a header with different casing in the scheme", () => {
    expect(isAuthorized(`bearer ${SECRET}`, SECRET)).toBe(false);
  });

  it("rejects a header with extra whitespace", () => {
    expect(isAuthorized(`Bearer  ${SECRET}`, SECRET)).toBe(false);
    expect(isAuthorized(`Bearer ${SECRET} `, SECRET)).toBe(false);
  });

  it("is case-sensitive on the secret itself", () => {
    expect(isAuthorized(`Bearer ${SECRET.toUpperCase()}`, SECRET)).toBe(false);
  });
});

describe("extractRecord: Database Webhook payload shape", () => {
  it("prefers payload.record (Database Webhook shape)", () => {
    const payload = { type: "INSERT", record: { id: "u1", email: "a@example.com" }, old_record: null };
    expect(extractRecord(payload).email).toBe("a@example.com");
  });

  it("falls back to payload.user when record is absent", () => {
    const payload = { user: { id: "u1", email: "b@example.com" } };
    expect(extractRecord(payload).email).toBe("b@example.com");
  });

  it("falls back to the payload itself when neither record nor user is present", () => {
    const payload = { id: "u1", email: "c@example.com" };
    expect(extractRecord(payload).email).toBe("c@example.com");
  });

  it("record takes priority over user when both are somehow present", () => {
    const payload = { record: { email: "record@example.com" }, user: { email: "user@example.com" } };
    expect(extractRecord(payload).email).toBe("record@example.com");
  });
});

describe("shouldSendWelcomeEmail: recipient gating before an extra Resend call", () => {
  it("sends when a real-looking email is present", () => {
    expect(shouldSendWelcomeEmail("new@example.com")).toBe(true);
  });

  it("does not send when email is the 'unknown' sentinel", () => {
    expect(shouldSendWelcomeEmail("unknown")).toBe(false);
  });

  it("does not send when email is missing", () => {
    expect(shouldSendWelcomeEmail(undefined)).toBe(false);
    expect(shouldSendWelcomeEmail(null)).toBe(false);
    expect(shouldSendWelcomeEmail("")).toBe(false);
  });

  it("does not send when the value has no @ (malformed record)", () => {
    expect(shouldSendWelcomeEmail("not-an-email")).toBe(false);
  });
});

}); // Security
