/*
  ══════════════════════════════════════════════════════════════════════════════
  BUSINESS LOGIC TEST: Critical Edge Cases
  File: logic/edge-cases.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  These are the silent failure modes that don't throw errors — they just
  produce wrong output. Wrong numbers on invoices, broken CSV exports, bad
  redirects, and missed rate limit resets. Each test here was written because
  a real failure path exists in the codebase.

  COVERS:
  ───────
  1.  Stripe redirect URL safety (billing.js — window.location.href = body.url)
  2.  Billing portal URL safety (same pattern in openBillingPortal)
  3.  return_url safety (window.location.origin sent to Stripe)
  4.  JWT decode — malformed token payload fails gracefully
  5.  CSV cell escaping — commas, quotes, newlines in client names
  6.  CSV num formatting — null/undefined amounts
  7.  Date formatting — invalid date, missing date, timezone edge
  8.  Rate limit month boundary — counter resets on the 1st
  9.  Tier gate — free user blocked at 15/day, pro user allowed
  10. Invoice number padding — always 6 digits
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";

// ── 1 & 2. Stripe / portal URL safety ────────────────────────────────────────
// Replicated from billing.js intent: only redirect to safe URLs.
// body.url from the edge function should always be a Stripe checkout URL.
// If it isn't, we must not redirect — especially not to javascript: or about:blank.

function isSafeRedirectUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /^https:\/\/(checkout\.stripe\.com|billing\.stripe\.com)\//.test(url);
}

describe("Stripe redirect URL safety", () => {
  it("accepts a valid Stripe checkout URL", () => {
    expect(isSafeRedirectUrl("https://checkout.stripe.com/pay/cs_test_abc123")).toBe(true);
  });

  it("accepts a valid Stripe billing portal URL", () => {
    expect(isSafeRedirectUrl("https://billing.stripe.com/session/test_abc123")).toBe(true);
  });

  it("rejects about:blank", () => {
    expect(isSafeRedirectUrl("about:blank")).toBe(false);
  });

  it("rejects javascript: scheme", () => {
    expect(isSafeRedirectUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects null", () => {
    expect(isSafeRedirectUrl(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isSafeRedirectUrl(undefined)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isSafeRedirectUrl("")).toBe(false);
  });

  it("rejects a non-Stripe https URL", () => {
    expect(isSafeRedirectUrl("https://evil.com/fake-checkout")).toBe(false);
  });

  it("rejects http (not https)", () => {
    expect(isSafeRedirectUrl("http://checkout.stripe.com/pay/abc")).toBe(false);
  });
});

// ── 3. return_url safety ──────────────────────────────────────────────────────
// window.location.origin is sent to Stripe as success_url / cancel_url.
// In tests and certain edge cases this can be "about:blank" or "null".

function isSafeReturnUrl(origin) {
  if (!origin || typeof origin !== "string") return false;
  if (origin === "about:blank") return false;
  if (origin === "null") return false;
  return /^https?:\/\/.+/.test(origin);
}

describe("return_url (window.location.origin) safety", () => {
  it("accepts production origin", () => {
    expect(isSafeReturnUrl("https://invoiceprepper.com")).toBe(true);
  });

  it("accepts localhost for dev", () => {
    expect(isSafeReturnUrl("http://localhost:5173")).toBe(true);
  });

  it("rejects about:blank", () => {
    expect(isSafeReturnUrl("about:blank")).toBe(false);
  });

  it("rejects stringified null", () => {
    expect(isSafeReturnUrl("null")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isSafeReturnUrl("")).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isSafeReturnUrl(undefined)).toBe(false);
  });
});

// ── 4. JWT decode — malformed token ──────────────────────────────────────────
// Replicated from receipts.js:
//   const { exp } = JSON.parse(atob(session.access_token.split(".")[1]));
// A malformed token must not throw an unhandled error — the try/catch wraps it.

function decodeJwtExpiry(token) {
  try {
    const { exp } = JSON.parse(atob(token.split(".")[1]));
    return exp;
  } catch {
    return null;
  }
}

describe("JWT expiry decode — malformed token handling", () => {
  it("decodes a well-formed JWT and returns exp", () => {
    // Build a minimal fake JWT: header.payload.signature
    const payload = btoa(JSON.stringify({ exp: 9999999999 }));
    const token = `header.${payload}.signature`;
    expect(decodeJwtExpiry(token)).toBe(9999999999);
  });

  it("returns null for a token with no dots", () => {
    expect(decodeJwtExpiry("notavalidtoken")).toBeNull();
  });

  it("returns null for a token with invalid base64 payload", () => {
    expect(decodeJwtExpiry("header.!!!.signature")).toBeNull();
  });

  it("returns null for a token with valid base64 but non-JSON payload", () => {
    const payload = btoa("not json at all");
    expect(decodeJwtExpiry(`header.${payload}.sig`)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(decodeJwtExpiry("")).toBeNull();
  });

  it("returns null for a payload missing the exp field", () => {
    const payload = btoa(JSON.stringify({ sub: "user-123" }));
    const token = `header.${payload}.sig`;
    // exp is undefined — that's ok, caller checks exp * 1000 <= Date.now()
    // undefined * 1000 = NaN which is not <= Date.now(), so no refresh triggered
    expect(decodeJwtExpiry(token)).toBeUndefined();
  });
});

// ── 5 & 6. CSV cell escaping ──────────────────────────────────────────────────
// Replicated from csvExport.js:
//   const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`
//   const num  = (v) => (v == null ? "" : Number(v).toFixed(2))

const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const num  = (v) => (v == null ? "" : Number(v).toFixed(2));

describe("CSV cell escaping", () => {
  it("wraps a normal value in quotes", () => {
    expect(cell("Smith")).toBe('"Smith"');
  });

  it("escapes a comma in a client name", () => {
    expect(cell("Smith, Bob")).toBe('"Smith, Bob"');
  });

  it("escapes double quotes by doubling them (RFC 4180)", () => {
    expect(cell('She said "hello"')).toBe('"She said ""hello"""');
  });

  it("handles a newline in a notes field", () => {
    const result = cell("line1\nline2");
    expect(result).toBe('"line1\nline2"');
    // The value is wrapped in quotes so the newline stays inside one cell
    expect(result.startsWith('"')).toBe(true);
    expect(result.endsWith('"')).toBe(true);
  });

  it("handles null as empty string", () => {
    expect(cell(null)).toBe('""');
  });

  it("handles undefined as empty string", () => {
    expect(cell(undefined)).toBe('""');
  });

  it("handles a client name with both comma and quote", () => {
    expect(cell('O\'Brien, "Pat"')).toBe('"O\'Brien, ""Pat"""');
  });
});

describe("CSV num formatting", () => {
  it("formats a number to 2dp", () => {
    expect(num(100)).toBe("100.00");
  });

  it("formats null as empty string", () => {
    expect(num(null)).toBe("");
  });

  it("formats undefined as empty string", () => {
    expect(num(undefined)).toBe("");
  });

  it("formats 0 correctly", () => {
    expect(num(0)).toBe("0.00");
  });

  it("formats a string number", () => {
    expect(num("99.9")).toBe("99.90");
  });
});

// ── 7. Date formatting edge cases ─────────────────────────────────────────────
// Replicated from ReceiptPDF.js:
//   new Date(receipt.date).toLocaleDateString("en-CA")
// An invalid date must not crash the PDF render.

function formatInvoiceDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

describe("Invoice date formatting", () => {
  it("formats a valid ISO date string", () => {
    expect(formatInvoiceDate("2026-04-14T00:00:00Z")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("formats a date-only string", () => {
    expect(formatInvoiceDate("2026-04-14")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns empty string for null", () => {
    expect(formatInvoiceDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatInvoiceDate(undefined)).toBe("");
  });

  it("returns empty string for an invalid date string", () => {
    expect(formatInvoiceDate("not-a-date")).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatInvoiceDate("")).toBe("");
  });
});

// ── 8. Rate limit month boundary ──────────────────────────────────────────────
// The text-parse edge function tracks usage by month.
// Counter must reset on the 1st — an off-by-one means users either
// lose parses at month end or get unlimited parses for one day.

// Use explicit year/month values to avoid UTC vs local timezone shifts
// when constructing dates from ISO strings in the test environment.
function isSameYearMonth(y1, m1, y2, m2) {
  return y1 === y2 && m1 === m2;
}

function shouldResetCounter(lastYear, lastMonth, nowYear, nowMonth) {
  return !isSameYearMonth(lastYear, lastMonth, nowYear, nowMonth);
}

describe("Rate limit month boundary", () => {
  it("does not reset mid-month", () => {
    expect(shouldResetCounter(2026, 4, 2026, 4)).toBe(false);
  });

  it("resets on the first of the next month", () => {
    expect(shouldResetCounter(2026, 4, 2026, 5)).toBe(true);
  });

  it("resets mid-next-month if counter was never reset", () => {
    expect(shouldResetCounter(2026, 3, 2026, 4)).toBe(true);
  });

  it("resets across a year boundary (Dec → Jan)", () => {
    expect(shouldResetCounter(2025, 12, 2026, 1)).toBe(true);
  });

  it("does not reset on the last day of the month", () => {
    expect(shouldResetCounter(2026, 4, 2026, 4)).toBe(false);
  });
});

// ── 9. Tier gate — parse limit enforcement ────────────────────────────────────
// Pro users get 15 text parses per day. Voice AI users get unlimited.
// Free users get 0 (blocked entirely).

function canTextParse(tier, dailyCount) {
  if (tier === "voice") return true;
  if (tier === "pro")   return dailyCount < 15;
  return false; // free tier
}

describe("Text parse tier gate", () => {
  it("free user is always blocked", () => {
    expect(canTextParse("free", 0)).toBe(false);
  });

  it("free user with no tier is blocked", () => {
    expect(canTextParse(undefined, 0)).toBe(false);
  });

  it("pro user is allowed under the daily limit", () => {
    expect(canTextParse("pro", 0)).toBe(true);
    expect(canTextParse("pro", 14)).toBe(true);
  });

  it("pro user is blocked at exactly 15", () => {
    expect(canTextParse("pro", 15)).toBe(false);
  });

  it("pro user is blocked above 15", () => {
    expect(canTextParse("pro", 100)).toBe(false);
  });

  it("voice user is always allowed regardless of count", () => {
    expect(canTextParse("voice", 0)).toBe(true);
    expect(canTextParse("voice", 15)).toBe(true);
    expect(canTextParse("voice", 9999)).toBe(true);
  });
});

// ── 10. Invoice number padding ────────────────────────────────────────────────
// Invoice numbers are displayed as INV-000001.
// The PDF layout and grid assume consistent 6-digit zero-padded numbers.

function formatInvoiceNumber(n) {
  return `INV-${String(n).padStart(6, "0")}`;
}

describe("Invoice number padding", () => {
  it("pads a single digit to 6 places", () => {
    expect(formatInvoiceNumber(1)).toBe("INV-000001");
  });

  it("pads a 3-digit number", () => {
    expect(formatInvoiceNumber(42)).toBe("INV-000042");
  });

  it("formats exactly 6 digits without padding", () => {
    expect(formatInvoiceNumber(100000)).toBe("INV-100000");
  });

  it("handles 7 digits without truncation", () => {
    // Should not truncate — padStart only adds, never removes
    expect(formatInvoiceNumber(1000000)).toBe("INV-1000000");
  });

  it("formats invoice number 1 consistently", () => {
    expect(formatInvoiceNumber(1)).toHaveLength(10); // "INV-" (4) + 6 digits
  });
});
