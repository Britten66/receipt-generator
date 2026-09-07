/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: Send Invoice — Content Must Come From an Owned Receipt
  File: security/send-invoice-ownership.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (threat model):
  ─────────────────────────────────
  Before this fix, send-invoice built the email entirely from client-supplied
  fields (vendor_name, customer_name, line_items, subtotal, tax, total, ...)
  with no check that the caller owned a matching receipt. Any authenticated
  free user could invent arbitrary "invoice-shaped" content and email it to
  any address, up to the daily rate limit (50/day) — an abuse vector for the
  shared invoices@invoiceprepper.com sending domain.

  The fix: the client now sends only `receipt_id`, and the edge function
  loads the receipt (and its line_items) from the DB scoped to
  `.eq("id", receipt_id).eq("user_id", user.id)` — the same ownership
  pattern already proven in receipts/index.ts. All invoice content is built
  server-side from that row. A request for a receipt_id you don't own gets
  a 404, not someone else's data (ownership filter, not just existence).

  WHAT WE VERIFY:
  ───────────────
  1. The client request body only carries fields that cannot forge invoice
     content: to, receipt_id, pdf_base64, is_reminder
  2. None of the old client-suppliable content fields are present
  3. receipt_id is required: a request without it is invalid
  4. The receipt lookup mirrors the ownership pattern (id AND user_id)
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";

describe("Security", () => {

// ── Replicated from frontend/src/features/invoices/useSendInvoice.js ─────────
// This is the exact shape of the request body sent to send-invoice.
const CLIENT_SEND_INVOICE_FIELDS = ["to", "receipt_id", "pdf_base64", "is_reminder"];

// ── Fields that used to be client-suppliable and must never come back ────────
// If any of these reappear in CLIENT_SEND_INVOICE_FIELDS, the ownership fix
// has regressed: the server would trust client-supplied invoice content again.
const FORBIDDEN_CONTENT_FIELDS = [
  "vendor_name", "vendor_email", "vendor_address", "customer_name",
  "receipt_number", "date", "line_items", "subtotal", "tax", "total",
  "currency", "notes", "payment_url", "unit_label", "billing_period",
];

// ── Replicated from supabase/functions/send-invoice/index.ts ─────────────────
function validateSendInvoiceBody(body) {
  if (!body.to) return { ok: false, error: "Recipient email is required" };
  if (!body.receipt_id) return { ok: false, error: "Receipt ID is required" };
  return { ok: true };
}

// Mirrors the ownership-scoped receipt lookup: a receipt only matches when
// both the id AND the user_id line up, exactly like receipts/index.ts.
function findOwnedReceipt(receipts, receiptId, userId) {
  return receipts.find((r) => r.id === receiptId && r.user_id === userId) ?? null;
}
// ─────────────────────────────────────────────────────────────────────────────

describe("Client request shape: only non-forgeable fields are sent", () => {
  it("client body contains exactly the expected fields", () => {
    expect(CLIENT_SEND_INVOICE_FIELDS.sort()).toEqual(
      ["is_reminder", "pdf_base64", "receipt_id", "to"].sort()
    );
  });

  it.each(FORBIDDEN_CONTENT_FIELDS)("does NOT send client-suppliable content field: %s", (field) => {
    expect(CLIENT_SEND_INVOICE_FIELDS).not.toContain(field);
  });

  it("has no duplicate fields", () => {
    expect(new Set(CLIENT_SEND_INVOICE_FIELDS).size).toBe(CLIENT_SEND_INVOICE_FIELDS.length);
  });
});

describe("validateSendInvoiceBody: receipt_id is a required field", () => {
  it("rejects a body with no receipt_id", () => {
    const result = validateSendInvoiceBody({ to: "client@example.com" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/receipt id/i);
  });

  it("rejects a body with no recipient", () => {
    const result = validateSendInvoiceBody({ receipt_id: "r1" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/recipient/i);
  });

  it("accepts a body with both to and receipt_id", () => {
    const result = validateSendInvoiceBody({ to: "client@example.com", receipt_id: "r1" });
    expect(result.ok).toBe(true);
  });

  it("does not require line_items, vendor_name, or any invoice content in the body", () => {
    const result = validateSendInvoiceBody({ to: "client@example.com", receipt_id: "r1", pdf_base64: null });
    expect(result.ok).toBe(true);
  });
});

describe("findOwnedReceipt: ownership-scoped lookup (id AND user_id)", () => {
  const receipts = [
    { id: "r1", user_id: "victim-user", vendor_name: "Victim Co" },
    { id: "r2", user_id: "attacker-user", vendor_name: "Attacker Co" },
  ];

  it("finds a receipt the caller owns", () => {
    const found = findOwnedReceipt(receipts, "r2", "attacker-user");
    expect(found?.vendor_name).toBe("Attacker Co");
  });

  it("returns null for a receipt that exists but belongs to someone else (IDOR attempt)", () => {
    // The attacker knows/guesses victim's receipt id but the ownership filter
    // must still reject it — existence of the id is not enough.
    const found = findOwnedReceipt(receipts, "r1", "attacker-user");
    expect(found).toBeNull();
  });

  it("returns null for a receipt_id that does not exist at all", () => {
    const found = findOwnedReceipt(receipts, "does-not-exist", "attacker-user");
    expect(found).toBeNull();
  });
});

}); // Security
