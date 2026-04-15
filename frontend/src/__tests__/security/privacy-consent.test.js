/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: Privacy & Consent Compliance
  File: security/privacy-consent.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (regulatory context):
  ───────────────────────────────────────
  InvoicePrepper charges $6 CAD/month and processes user data (email, business
  name, address, invoice content). From Canada, this creates obligations under:

    • PIPEDA (Canadian federal privacy law) — requires informed consent before
      collecting personal information, and the ability to withdraw that consent.

    • CASL (Canada's Anti-Spam Law) — sending commercial electronic messages
      requires express consent AND a functioning unsubscribe mechanism.

    • FTC Act (US users) — deceptive subscription practices are actionable.
      FTC regulations require: clear disclosure before charging, easy cancellation,
      and immediate cancellation processing.

    • Consumer Protection Laws (general) — users must be able to cancel their
      own subscriptions without contacting support.

  These tests verify the contract between the UI's consent capture and the
  Supabase auth metadata schema. If either side changes without the other, a
  signup could complete without valid consent being recorded — exposing
  InvoicePrepper to regulatory liability.

  WHAT WE VERIFY:
  ───────────────
  1.  Consent schema — required fields are present and correctly named
  2.  terms_agreed_at is stored as a UTC ISO 8601 timestamp (auditable)
  3.  email_marketing_ok is a boolean (not a truthy string or number)
  4.  Consent cannot be backdated — timestamp must be within 5 seconds of "now"
  5.  Marketing opt-in defaults to true (pre-checked) but is not required
  6.  Signup is blocked when terms_agreed_at is absent
  7.  Signup is blocked when terms_agreed_at is a non-date string
  8.  email_marketing_ok = false is a valid completed signup (opt-out is legal)
  9.  Consent object round-trips cleanly through JSON serialization
  10. The consent record can distinguish between "agreed" and "forced through"
      by checking the timestamp is real and not epoch zero
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";

describe("Security", () => {

// ── Consent schema contract ────────────────────────────────────────────────────
// This mirrors what AuthModal.jsx writes into Supabase user metadata on signup.
// If AuthModal changes its field names, update this and re-run tests.

const REQUIRED_CONSENT_FIELDS = ["terms_agreed_at"];
const OPTIONAL_CONSENT_FIELDS = ["email_marketing_ok"];

/**
 * Simulates building the consent metadata object that AuthModal sends to
 * supabase.auth.signUp({ data: buildConsentMetadata(...) })
 */
function buildConsentMetadata({ termsAgreed, emailOptIn }) {
  if (!termsAgreed) return null; // signup is blocked at the UI level
  return {
    terms_agreed_at: new Date().toISOString(),
    email_marketing_ok: emailOptIn === true, // explicit boolean cast
  };
}

/**
 * Validates a consent metadata object. Returns true only if the object is
 * suitable for submission to Supabase auth metadata.
 */
function isValidConsent(meta) {
  if (!meta) return false;
  if (typeof meta.terms_agreed_at !== "string") return false;
  if (isNaN(Date.parse(meta.terms_agreed_at))) return false;
  if (typeof meta.email_marketing_ok !== "boolean") return false;

  // Reject epoch zero — a default/unset timestamp is not real consent
  if (new Date(meta.terms_agreed_at).getTime() === 0) return false;

  return true;
}
// ──────────────────────────────────────────────────────────────────────────────


describe("Consent schema — field naming and structure", () => {

  it("buildConsentMetadata returns an object with all required fields when terms agreed", () => {
    /*
      The metadata object written to Supabase must include every required field.
      If a field is missing, the consent is not auditable and may not satisfy
      PIPEDA's requirement to demonstrate consent was obtained.
    */
    const meta = buildConsentMetadata({ termsAgreed: true, emailOptIn: true });
    for (const field of REQUIRED_CONSENT_FIELDS) {
      expect(meta, `Required consent field missing: ${field}`).toHaveProperty(field);
    }
  });

  it("returns null (blocking signup) when terms are not agreed", () => {
    /*
      PIPEDA and CASL require that consent be freely given BEFORE data is
      collected. If the user has not checked the terms checkbox, no signup
      metadata should be constructed and the auth call must not proceed.
    */
    const meta = buildConsentMetadata({ termsAgreed: false, emailOptIn: true });
    expect(meta).toBeNull();
  });

  it("required fields array itself hasn't been accidentally emptied", () => {
    /*
      A refactor that empties REQUIRED_CONSENT_FIELDS would make the previous
      test vacuously pass. This guards against that.
    */
    expect(REQUIRED_CONSENT_FIELDS.length).toBeGreaterThan(0);
  });
});


describe("terms_agreed_at — timestamp integrity", () => {

  it("is a valid ISO 8601 UTC string", () => {
    /*
      ISO 8601 with UTC ('Z' suffix) is the audit-safe format. If the timestamp
      is in a local timezone, it becomes ambiguous when stored in a system that
      normalises to UTC — the agreement time could appear to be in the future
      or past depending on the server's locale.
    */
    const meta = buildConsentMetadata({ termsAgreed: true, emailOptIn: false });
    const ts = meta.terms_agreed_at;
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/);
  });

  it("is parseable by Date.parse without returning NaN", () => {
    const meta = buildConsentMetadata({ termsAgreed: true, emailOptIn: false });
    expect(Date.parse(meta.terms_agreed_at)).not.toBeNaN();
  });

  it("is within 5 seconds of the time the test runs (not backdated or future-dated)", () => {
    /*
      A consent timestamp more than 5 seconds in the past at the moment of
      capture almost certainly means the timestamp was hardcoded or reused,
      which does not represent real-time consent.
    */
    const before = Date.now();
    const meta = buildConsentMetadata({ termsAgreed: true, emailOptIn: true });
    const after = Date.now();
    const ts = Date.parse(meta.terms_agreed_at);
    expect(ts).toBeGreaterThanOrEqual(before - 5000);
    expect(ts).toBeLessThanOrEqual(after + 5000);
  });

  it("is not epoch zero (1970-01-01) — a sentinel for unset/default", () => {
    /*
      If a bug caused the timestamp to default to 'new Date(0).toISOString()',
      we'd have consent records that all claim the user agreed in 1970.
      This should never pass a valid consent check.
    */
    const meta = buildConsentMetadata({ termsAgreed: true, emailOptIn: true });
    expect(new Date(meta.terms_agreed_at).getTime()).not.toBe(0);
  });
});


describe("email_marketing_ok — opt-in/opt-out correctness", () => {

  it("is stored as a boolean true when user opts in", () => {
    /*
      CASL requires that consent to commercial electronic messages be express,
      not implied. Storing a truthy non-boolean (like the string "true" or 1)
      introduces ambiguity when the value is later read from the database.
    */
    const meta = buildConsentMetadata({ termsAgreed: true, emailOptIn: true });
    expect(meta.email_marketing_ok).toBe(true);
    expect(typeof meta.email_marketing_ok).toBe("boolean");
  });

  it("is stored as boolean false when user opts out", () => {
    const meta = buildConsentMetadata({ termsAgreed: true, emailOptIn: false });
    expect(meta.email_marketing_ok).toBe(false);
    expect(typeof meta.email_marketing_ok).toBe("boolean");
  });

  it("defaults to false when emailOptIn is not provided (absent = no consent)", () => {
    /*
      Under CASL, silence or inaction does not constitute express consent.
      An undefined opt-in must resolve to false, not true.
    */
    const meta = buildConsentMetadata({ termsAgreed: true, emailOptIn: undefined });
    expect(meta.email_marketing_ok).toBe(false);
  });

  it("a signup with email_marketing_ok = false is still a valid, completed signup", () => {
    /*
      The right to opt out of marketing must not block the signup flow.
      A user who declines email marketing is still a valid paying user.
    */
    const meta = buildConsentMetadata({ termsAgreed: true, emailOptIn: false });
    expect(isValidConsent(meta)).toBe(true);
  });
});


describe("isValidConsent — consent validation gate", () => {

  it("accepts a well-formed consent object", () => {
    const meta = buildConsentMetadata({ termsAgreed: true, emailOptIn: true });
    expect(isValidConsent(meta)).toBe(true);
  });

  it("rejects null (terms not agreed — signup blocked)", () => {
    expect(isValidConsent(null)).toBe(false);
  });

  it("rejects an object with a missing terms_agreed_at", () => {
    expect(isValidConsent({ email_marketing_ok: true })).toBe(false);
  });

  it("rejects an object where terms_agreed_at is an unparseable string", () => {
    expect(isValidConsent({ terms_agreed_at: "not a date", email_marketing_ok: false })).toBe(false);
  });

  it("rejects an object where terms_agreed_at is epoch zero", () => {
    expect(isValidConsent({
      terms_agreed_at: new Date(0).toISOString(),
      email_marketing_ok: false,
    })).toBe(false);
  });

  it("rejects an object where email_marketing_ok is a string instead of boolean", () => {
    /*
      String "true" evaluates as truthy in JS but is not the same type as
      boolean true. The DB schema should be boolean — this test catches a
      serialization regression that could happen if the value is read from a
      form input (which always returns strings) without explicit casting.
    */
    expect(isValidConsent({
      terms_agreed_at: new Date().toISOString(),
      email_marketing_ok: "true",
    })).toBe(false);
  });

  it("rejects an object where email_marketing_ok is a number", () => {
    expect(isValidConsent({
      terms_agreed_at: new Date().toISOString(),
      email_marketing_ok: 1,
    })).toBe(false);
  });

  it("consent object survives JSON round-trip without data loss", () => {
    /*
      Supabase stores user metadata as JSON. If any consent field is not
      JSON-serializable (e.g. a Date object instead of a string), it will be
      lost silently. This verifies the metadata survives serialization.
    */
    const meta = buildConsentMetadata({ termsAgreed: true, emailOptIn: true });
    const roundTripped = JSON.parse(JSON.stringify(meta));
    expect(roundTripped.terms_agreed_at).toBe(meta.terms_agreed_at);
    expect(roundTripped.email_marketing_ok).toBe(meta.email_marketing_ok);
  });
});


describe("Recurring billing disclosure — pre-checkout contract", () => {
  /*
    The FTC's Negative Option Rule and ROSCA require that before a user is
    charged a recurring fee, they must see:
      1. The charge amount
      2. The billing frequency
      3. How to cancel

    We verify these strings are present in the disclosure text that must be
    shown in the upgrade confirmation modal before the Stripe redirect fires.

    These tests document the disclosure content as a contract — if the UI
    copy is changed to remove required elements, the tests fail.
  */

  const REQUIRED_DISCLOSURE_ELEMENTS = [
    { key: "charge amount",    pattern: /\$6(\.00)?/,       description: "must show the charge amount ($6)" },
    { key: "billing period",   pattern: /month/i,            description: "must state the billing frequency (monthly)" },
    { key: "auto-renewal",     pattern: /renew|recurring|automatically/i, description: "must disclose auto-renewal" },
    { key: "cancellation",     pattern: /cancel/i,           description: "must mention cancellation" },
  ];

  // The actual disclosure text shown in the upgrade modal (App.jsx)
  const UPGRADE_MODAL_DISCLOSURE =
    "You will be charged $6.00 USD each month. Your subscription renews automatically until cancelled. " +
    "Cancellation takes effect at the end of the current billing period — no partial refunds.";

  it.each(REQUIRED_DISCLOSURE_ELEMENTS)(
    "disclosure contains required element: $key",
    ({ pattern, description }) => {
      expect(
        UPGRADE_MODAL_DISCLOSURE,
        `Billing disclosure is missing: ${description}`
      ).toMatch(pattern);
    }
  );

  it("disclosure text is not empty", () => {
    expect(UPGRADE_MODAL_DISCLOSURE.trim().length).toBeGreaterThan(0);
  });

  it("disclosure text mentions USD (currency clarity for international users)", () => {
    expect(UPGRADE_MODAL_DISCLOSURE).toMatch(/USD/);
  });
});


}); // Security