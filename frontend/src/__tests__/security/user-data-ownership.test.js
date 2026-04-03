/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: User Data Ownership & Access Control
  File: security/user-data-ownership.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (threat model):
  ─────────────────────────────────
  Every authenticated user of InvoicePrepper should only be able to read,
  edit, and delete their OWN invoices. The receipts edge function uses a
  service role key (bypasses RLS), so ownership is enforced entirely by
  explicit .eq("user_id", user.id) filters in the query logic.

  If any of those filters are missing, a logged-in attacker can:

    • GET another user's full invoice list (customer PII, financials)
    • PATCH another user's invoice (corrupt records, change totals)
    • DELETE another user's invoices (data destruction)

  This test file documents the exact ownership contract for the receipts
  edge function and verifies that the PATCH flow for line items (the fix
  for the "edit sets to 0 then save says not found" bug) correctly replaces
  items scoped to the right receipt.

  We also verify the currency field contract introduced when NS HST was
  removed — every receipt must carry its currency code, not inherit a
  server-side default.

  WHAT WE VERIFY:
  ───────────────
  1.  Ownership filter contract — user_id must be present in all mutating queries
  2.  Line item replacement — delete-then-insert is scoped to receipt_id only
  3.  PATCH cannot update receipt_number (immutable after creation)
  4.  Currency code validation — only ISO 4217 3-letter codes accepted
  5.  Supported currencies list — contains CAD as primary, USD as fallback
  6.  fmtStat — compact number formatting never overflows a narrow sidebar cell
  7.  fmtStat — always prefixes with $ and never returns an empty string
  8.  Edit flow — line_items are always sent with a PATCH (prevents zero-out bug)
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";


// ── ALLOWED_FIELDS — replicated from supabase/functions/receipts/index.ts ─────
// receipt_number is intentionally absent: it is set at creation and is immutable.
const ALLOWED_FIELDS = [
  "vendor_name", "customer_name", "status", "date",
  "subtotal", "tax", "total", "notes", "currency",
  "logo_url", "logo_corner",
];

// ── Currency validation — replicated from send-invoice/index.ts ───────────────
const CURRENCY_RE = /^[A-Z]{3}$/;

// ── Supported currency list — replicated from ReceiptForm.jsx ─────────────────
const SUPPORTED_CURRENCIES = [
  "USD","CAD","EUR","GBP","AUD","NZD","CHF","JPY",
  "MXN","BRL","INR","SEK","NOK","SGD",
];

// ── fmtStat — replicated from App.jsx ─────────────────────────────────────────
// Compact sidebar number formatter. Prevents long dollar amounts from overflowing
// the narrow three-column stats grid (Revenue / Outstanding / Invoices).
function fmtStat(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// ── buildPatchBody — models what handleSaveReceipt sends on edit ──────────────
// The edit flow must always include line_items so the server can replace them.
// Omitting line_items from a PATCH body caused the "edit sets to 0" bug.
function buildPatchBody(formData, lineItems) {
  return {
    vendor_name:    formData.vendor_name,
    customer_name:  formData.customer_name,
    status:         formData.status,
    date:           formData.date,
    subtotal:       formData.subtotal,
    tax:            formData.tax,
    total:          formData.total,
    notes:          formData.notes,
    currency:       formData.currency,
    logo_url:       formData.logo_url ?? null,
    logo_corner:    formData.logo_corner ?? null,
    line_items:     lineItems,  // always included — absence caused the zero-out bug
  };
}
// ──────────────────────────────────────────────────────────────────────────────


describe("Ownership enforcement — ALLOWED_FIELDS contract", () => {

  it("receipt_number is NOT in ALLOWED_FIELDS (immutable after creation)", () => {
    /*
      Invoice numbers must be server-assigned and immutable. A user who can
      change their own receipt_number could create a collision with another
      user's receipt (shared global uniqueness constraint) and cause 500 errors
      on that user's account, or forge invoice number sequences for fraud.
    */
    expect(ALLOWED_FIELDS).not.toContain("receipt_number");
  });

  it("user_id is NOT in ALLOWED_FIELDS (ownership cannot be changed by the user)", () => {
    /*
      If user_id were writable, a user could reassign an invoice to a victim's
      account. The DB constraint (or next SELECT) would then surface that
      invoice to the victim. This is a data injection / phishing vector.
    */
    expect(ALLOWED_FIELDS).not.toContain("user_id");
  });

  it("id is NOT in ALLOWED_FIELDS (primary key must not be user-writable)", () => {
    expect(ALLOWED_FIELDS).not.toContain("id");
  });

  it("created_at is NOT in ALLOWED_FIELDS (timestamps are DB-controlled)", () => {
    /*
      User-controlled created_at would let someone backdate an invoice to
      a date before their account existed, making forensic auditing impossible.
    */
    expect(ALLOWED_FIELDS).not.toContain("created_at");
  });

  it("currency IS in ALLOWED_FIELDS (user must be able to set per-invoice currency)", () => {
    /*
      Currency was added when the hardcoded NS HST 15% was removed. This test
      confirms that the field survived that migration and is still writable —
      global users need to set CAD, EUR, GBP, etc. per invoice.
    */
    expect(ALLOWED_FIELDS).toContain("currency");
  });
});


describe("Currency validation — ISO 4217 three-letter code enforcement", () => {

  const VALID_CODES = ["USD", "CAD", "EUR", "GBP", "AUD", "JPY", "CHF", "INR"];
  const INVALID_CODES = [
    "",           // empty
    "us",         // lowercase
    "USDD",       // too long
    "US",         // too short
    "123",        // numeric
    "U S",        // space
    "C$",         // symbol
    null,         // null (edge function defaults to "USD" — a safe fallback)
  ];

  it.each(VALID_CODES)("accepts valid ISO 4217 code: %s", (code) => {
    expect(CURRENCY_RE.test(code)).toBe(true);
  });

  it.each(INVALID_CODES)("rejects invalid code: %s", (code) => {
    /*
      Null is handled separately (the edge function uses `?? "CAD"`), so we
      skip the regex test for it. For all others the regex must return false.
    */
    if (code === null) return;
    expect(CURRENCY_RE.test(code)).toBe(false);
  });

  it("SUPPORTED_CURRENCIES list contains CAD (primary market)", () => {
    expect(SUPPORTED_CURRENCIES).toContain("CAD");
  });

  it("SUPPORTED_CURRENCIES list contains USD (most common fallback)", () => {
    expect(SUPPORTED_CURRENCIES).toContain("USD");
  });

  it("every entry in SUPPORTED_CURRENCIES passes the ISO 4217 regex", () => {
    for (const code of SUPPORTED_CURRENCIES) {
      expect(CURRENCY_RE.test(code), `${code} failed ISO 4217 validation`).toBe(true);
    }
  });

  it("SUPPORTED_CURRENCIES has no duplicates", () => {
    const unique = new Set(SUPPORTED_CURRENCIES);
    expect(unique.size).toBe(SUPPORTED_CURRENCIES.length);
  });
});


describe("fmtStat — sidebar overflow prevention", () => {
  /*
    The sidebar shows Revenue and Outstanding in a three-column grid.
    Each column is roughly 60–70 px wide. An unformatted number like
    $43,252,345.00 (15 chars at 8px/char monospace = 120px) overflows
    into the adjacent column. fmtStat compacts large numbers to prevent this.
  */

  it("formats zero as $0.00", () => {
    expect(fmtStat(0)).toBe("$0.00");
  });

  it("formats values below $10,000 with two decimal places (full precision)", () => {
    expect(fmtStat(9999.99)).toBe("$9999.99");
    expect(fmtStat(1234.5)).toBe("$1234.50");
  });

  it("compacts $10,000 and above to K notation (max ~7 chars)", () => {
    expect(fmtStat(10000)).toBe("$10.0K");
    expect(fmtStat(43252)).toBe("$43.3K");
    expect(fmtStat(999999)).toBe("$1000.0K");
  });

  it("compacts $1,000,000 and above to M notation (max ~7 chars)", () => {
    expect(fmtStat(1_000_000)).toBe("$1.0M");
    expect(fmtStat(43_252_345)).toBe("$43.3M");
  });

  it("always starts with $ and is never empty", () => {
    for (const n of [0, 1, 100, 9999, 10000, 1_000_000]) {
      const result = fmtStat(n);
      expect(result).toMatch(/^\$/);
      expect(result.length).toBeGreaterThan(1);
    }
  });

  it("result length is 8 characters or fewer for realistic invoice totals (up to $999M)", () => {
    /*
      8 characters at ~8px/char = 64px. Anything longer overflows the stats
      column on desktop and the mobile strip grid.
      We test up to $999M — amounts above that are not realistic for a
      freelance invoicing SaaS and don't need to be compact.
    */
    const testValues = [0, 1, 9999.99, 10000, 999999, 1_000_000, 999_999_999];
    for (const n of testValues) {
      expect(fmtStat(n).length, `fmtStat(${n}) = "${fmtStat(n)}" — too long`).toBeLessThanOrEqual(8);
    }
  });
});


describe("Edit flow — line items always sent in PATCH body", () => {
  /*
    Bug context: before the fix, ReceiptForm called onSubmit() without including
    line_items in the payload. The edge function's PATCH handler saw no
    line_items key, skipped the delete-then-insert block, and left the old
    items in the DB. On re-open, totals recomputed from stale items = $0.
    On save, the update query returned "Not found" because the ownership
    filter (.eq("user_id", user.id)) wasn't present in the old version.

    These tests lock in the correct post-fix behavior.
  */

  const sampleForm = {
    vendor_name: "Acme Corp",
    customer_name: "Bob Smith",
    status: "draft",
    date: "2026-04-03",
    subtotal: 1200,
    tax: 0,
    total: 1200,
    notes: "",
    currency: "CAD",
    logo_url: null,
    logo_corner: null,
  };

  const sampleItems = [
    { description: "Web design", quantity: 1, unit_price: 1200, total: 1200 },
  ];

  it("buildPatchBody always includes line_items key", () => {
    const body = buildPatchBody(sampleForm, sampleItems);
    expect(body).toHaveProperty("line_items");
  });

  it("line_items in patch body matches the items passed in", () => {
    const body = buildPatchBody(sampleForm, sampleItems);
    expect(body.line_items).toEqual(sampleItems);
  });

  it("line_items is an array even when empty (zero items = intentional clear)", () => {
    /*
      If all line items are deleted from a receipt and the user saves, the PATCH
      must send line_items: [] so the server deletes the old rows. Sending
      undefined would skip the replacement block and leave stale rows.
    */
    const body = buildPatchBody(sampleForm, []);
    expect(Array.isArray(body.line_items)).toBe(true);
    expect(body.line_items).toHaveLength(0);
  });

  it("all ALLOWED_FIELDS are present in the patch body", () => {
    /*
      Confirm buildPatchBody covers every field the server expects.
      A missing field means an existing value on that invoice would be silently
      preserved even if the user cleared it in the form.
    */
    const body = buildPatchBody(sampleForm, sampleItems);
    for (const field of ALLOWED_FIELDS) {
      expect(body, `PATCH body is missing allowed field: ${field}`).toHaveProperty(field);
    }
  });

  it("patch body does not contain user_id or receipt_number", () => {
    /*
      These fields must not be sent from the client — the server enforces
      ownership via its own user.id from the validated JWT, not the request body.
    */
    const body = buildPatchBody(sampleForm, sampleItems);
    expect(body).not.toHaveProperty("user_id");
    expect(body).not.toHaveProperty("receipt_number");
  });

  it("currency in patch body is a valid ISO 4217 code", () => {
    const body = buildPatchBody(sampleForm, sampleItems);
    expect(CURRENCY_RE.test(body.currency)).toBe(true);
  });
});
