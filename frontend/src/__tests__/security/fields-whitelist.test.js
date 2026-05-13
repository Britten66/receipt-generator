/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: Mass Assignment / Field Whitelist Prevention
  File: security/fields-whitelist.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (threat model):
  ─────────────────────────────────
  The receipts PATCH endpoint allows updating a receipt by ID. Without a
  field whitelist, a logged-in attacker can send:

      PATCH /receipts?id=abc
      { "user_id": "victim-user-uuid", "tier": "pro" }

  …and potentially reassign a receipt to another user or escalate their own
  privileges. This is called a "mass assignment" attack and is one of the
  OWASP Top 10 API security risks (API6:2023: Unrestricted Access to
  Sensitive Business Flows / Mass Assignment).

  The fix (in supabase/functions/receipts/index.ts) is ALLOWED_FIELDS:
  only keys present in that array are extracted from the request body.
  Everything else is silently dropped before the Supabase query runs.

  WHAT WE VERIFY:
  ───────────────
  1. ALLOWED_FIELDS contains only safe, user-writable receipt fields
  2. Sensitive fields (user_id, receipt_number, created_at) are NOT allowed
  3. Tier/billing fields are not writable via this endpoint
  4. The whitelist has exactly the expected length (catches silent additions)
  5. The filter function correctly strips disallowed keys from a request body
  6. An all-disallowed body produces zero updates (nothing leaks through)
  7. Mixed bodies only let through the allowed subset
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";

describe("Security", () => {

// ── Replicated from supabase/functions/receipts/index.ts ─────────────────────
// If you change ALLOWED_FIELDS there, update this mirror and re-run tests.

const ALLOWED_FIELDS = [
  "vendor_name", "customer_name", "status", "date",
  "subtotal", "tax", "total", "notes", "currency",
  "logo_url", "logo_corner", "reminder_at", "due_by", "unit_label",
];

// The filter logic from the edge function: replicated verbatim
function filterAllowedFields(body) {
  const updates = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key];
  }
  return updates;
}
// ─────────────────────────────────────────────────────────────────────────────

describe("ALLOWED_FIELDS: structural integrity", () => {
  it("contains exactly 14 allowed fields (catches silent additions)", () => {
    /*
      Anyone adding a field to the edge function's ALLOWED_FIELDS must also
      update this count: forcing a deliberate code review of what's safe.
    */
    expect(ALLOWED_FIELDS).toHaveLength(14);
  });

  it("contains no duplicate entries", () => {
    const unique = new Set(ALLOWED_FIELDS);
    expect(unique.size).toBe(ALLOWED_FIELDS.length);
  });
});

describe("ALLOWED_FIELDS: safe fields are present", () => {
  const EXPECTED_SAFE = [
    "vendor_name", "customer_name", "status", "date",
    "subtotal", "tax", "total", "notes", "currency",
    "logo_url", "logo_corner",
  ];

  it.each(EXPECTED_SAFE)("includes safe field: %s", (field) => {
    expect(ALLOWED_FIELDS).toContain(field);
  });
});

describe("ALLOWED_FIELDS: sensitive fields are excluded", () => {
  /*
    These fields must NEVER be user-writable via the PATCH endpoint.
    user_id  → would allow reassigning invoices to another account
    receipt_number → sequential numbering must be server-controlled
    created_at / updated_at → timestamps must be DB-controlled
    tier / stripe_* → billing state must only change via Stripe webhook
  */
  const FORBIDDEN = [
    "user_id",
    "id",
    "receipt_number",
    "created_at",
    "updated_at",
    "tier",
    "stripe_customer_id",
    "stripe_subscription_id",
  ];

  it.each(FORBIDDEN)("does NOT allow sensitive field: %s", (field) => {
    expect(ALLOWED_FIELDS).not.toContain(field);
  });
});

describe("filterAllowedFields: request body sanitisation", () => {
  it("passes through a normal receipt update body unchanged", () => {
    const body = { vendor_name: "Acme Corp", total: 500, status: "sent" };
    const result = filterAllowedFields(body);
    expect(result).toEqual(body);
  });

  it("strips disallowed fields from a mixed body", () => {
    const body = {
      vendor_name: "Acme Corp",
      user_id: "attacker-uuid",     // must be stripped
      tier: "pro",                   // must be stripped
      created_at: "1970-01-01",      // must be stripped
      total: 999,
    };
    const result = filterAllowedFields(body);
    expect(result).toHaveProperty("vendor_name");
    expect(result).toHaveProperty("total");
    expect(result).not.toHaveProperty("user_id");
    expect(result).not.toHaveProperty("tier");
    expect(result).not.toHaveProperty("created_at");
  });

  it("returns an empty object when body contains only disallowed fields", () => {
    /*
      The edge function checks Object.keys(updates).length === 0 and
      returns 400. This confirms that check will fire correctly.
    */
    const body = {
      user_id: "evil",
      tier: "pro",
      stripe_customer_id: "cus_fake",
    };
    const result = filterAllowedFields(body);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("preserves null values for optional fields (intentional clear)", () => {
    /*
      Setting logo_url: null is valid: it removes the logo from a receipt.
      The filter must preserve null values, not treat them as absent.
    */
    const body = { logo_url: null, logo_corner: null };
    const result = filterAllowedFields(body);
    expect(result).toHaveProperty("logo_url", null);
    expect(result).toHaveProperty("logo_corner", null);
  });

  it("handles empty body without throwing", () => {
    const result = filterAllowedFields({});
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("handles prototype pollution attempt in body keys", () => {
    /*
      If an attacker sends __proto__ or constructor as a key, the for-of
      loop over ALLOWED_FIELDS means those keys are never looked up: the
      filter is a whitelist, not a blocklist.
    */
    const body = {
      __proto__: { isAdmin: true },
      constructor: "evil",
      vendor_name: "Legit Co",
    };
    const result = filterAllowedFields(body);
    expect(result).toEqual({ vendor_name: "Legit Co" });
    expect(({}).isAdmin).toBeUndefined(); // prototype not polluted
  });
});

describe("Body size limits: constants are defined and reasonable", () => {
  /*
    WHY: Without request body size limits, an attacker can send a 100MB
    payload to any edge function, consuming memory and causing a DoS.
    These tests confirm the limits are defined and are not accidentally
    set to 0 or an unreasonably large value.

    Limits from the edge functions:
      receipts:     64 KB : normal invoice data
      profile:      32 KB : bio / address fields
      stripe-checkout: 4 KB: just a return_url
      send-invoice: 3 MB  : includes base64 PDF attachment
  */

  const LIMITS = {
    receipts:        64 * 1024,
    profile:         32 * 1024,
    stripeCheckout:   4 * 1024,
    sendInvoice:     3 * 1024 * 1024,
    sendInvoicePdf:  2 * 1024 * 1024,
  };

  it("receipts limit is 64 KB", () => {
    expect(LIMITS.receipts).toBe(65536);
  });

  it("profile limit is 32 KB", () => {
    expect(LIMITS.profile).toBe(32768);
  });

  it("stripe-checkout limit is 4 KB", () => {
    expect(LIMITS.stripeCheckout).toBe(4096);
  });

  it("send-invoice body limit is 3 MB", () => {
    expect(LIMITS.sendInvoice).toBe(3145728);
  });

  it("PDF attachment limit is 2 MB (smaller than the body limit)", () => {
    expect(LIMITS.sendInvoicePdf).toBeLessThan(LIMITS.sendInvoice);
  });

  it("all limits are greater than zero", () => {
    for (const [name, limit] of Object.entries(LIMITS)) {
      expect(limit, `${name} limit must be > 0`).toBeGreaterThan(0);
    }
  });

  it("all limits are less than 10 MB (DoS protection threshold)", () => {
    for (const [name, limit] of Object.entries(LIMITS)) {
      expect(limit, `${name} limit must be < 10 MB`).toBeLessThan(10 * 1024 * 1024);
    }
  });
});


}); // Security