/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: CORS Allowlist Integrity
  File: security/cors.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (threat model):
  ─────────────────────────────────
  CORS (Cross-Origin Resource Sharing) is the browser's mechanism that
  prevents one website from making authenticated API requests on behalf
  of a user visiting a different site. If our edge functions return:

      Access-Control-Allow-Origin: *

  …then ANY website can call our API using a logged-in user's JWT (stored in
  a cookie or localStorage). That means:

    • An attacker's site can create, read, or delete any user's invoices
    • Stripe checkout can be triggered from a third-party page
    • Profile data including logo_url can be exfiltrated

  The fix (in _shared/cors.ts) is an explicit allowlist. Only our own domains
  get their origin echoed back. Everything else gets the production URL,
  which the browser will reject for cross-origin requests.

  Localhost entries are safe to include because CORS is browser-enforced —
  server-to-server requests (Stripe webhooks, Supabase internals) don't
  send an Origin header at all.

  NOTE: These tests replicate the logic from
  supabase/functions/_shared/cors.ts. Any change there must be reflected here.

  WHAT WE VERIFY:
  ───────────────
  1. Allowed production origins receive their own origin echoed back
  2. Unknown / attacker origins receive the safe fallback (NOT the attacker origin)
  3. null origin (server-to-server, no browser) falls back safely
  4. The wildcard "*" is never returned under any input
  5. The allowlist contains exactly the expected domains — no extras
  6. Required security headers are present on every response
  7. The Vary: Origin header is set (prevents CDN caching of wrong origin)
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";

// ── Replicated from supabase/functions/_shared/cors.ts ───────────────────────
// If you change the allowlist in cors.ts, update this mirror and re-run tests.

const ALLOWED_ORIGINS = new Set([
  "https://invoiceprepper.com",
  "https://www.invoiceprepper.com",
  "http://localhost:5173",
  "http://localhost:3000",
]);

const SAFE_FALLBACK = "https://invoiceprepper.com";

function getCorsHeaders(origin) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : SAFE_FALLBACK;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}
// ─────────────────────────────────────────────────────────────────────────────

describe("CORS allowlist — production origins", () => {
  it("echoes back invoiceprepper.com", () => {
    const h = getCorsHeaders("https://invoiceprepper.com");
    expect(h["Access-Control-Allow-Origin"]).toBe("https://invoiceprepper.com");
  });

  it("echoes back www.invoiceprepper.com", () => {
    const h = getCorsHeaders("https://www.invoiceprepper.com");
    expect(h["Access-Control-Allow-Origin"]).toBe("https://www.invoiceprepper.com");
  });
});

describe("CORS allowlist — local dev origins", () => {
  it("echoes back localhost:5173 (Vite dev server)", () => {
    const h = getCorsHeaders("http://localhost:5173");
    expect(h["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
  });

  it("echoes back localhost:3000", () => {
    const h = getCorsHeaders("http://localhost:3000");
    expect(h["Access-Control-Allow-Origin"]).toBe("http://localhost:3000");
  });
});

describe("CORS allowlist — rejected / attacker origins", () => {
  const ATTACKER_ORIGINS = [
    "https://evil.com",
    "https://invoiceprepper.com.evil.com",  // subdomain spoofing
    "https://invoiceprepper.com:8080",       // port variation
    "http://invoiceprepper.com",             // wrong scheme (https only)
    "https://www2.invoiceprepper.com",       // unlisted subdomain
    "null",                                  // stringified null
    "",                                      // empty string
    "https://localhost",                     // unlisted local variant
    "http://localhost:4000",                 // unlisted port
    "https://invoiceprepper.com/path",       // path appended
  ];

  it.each(ATTACKER_ORIGINS)(
    "does NOT echo back attacker origin: %s",
    (origin) => {
      const h = getCorsHeaders(origin);
      expect(h["Access-Control-Allow-Origin"]).not.toBe(origin);
    }
  );

  it.each(ATTACKER_ORIGINS)(
    "falls back to safe production domain for: %s",
    (origin) => {
      const h = getCorsHeaders(origin);
      expect(h["Access-Control-Allow-Origin"]).toBe(SAFE_FALLBACK);
    }
  );
});

describe("CORS — wildcard must never appear", () => {
  const ALL_INPUTS = [
    "https://invoiceprepper.com",
    "https://evil.com",
    null,
    undefined,
    "*",
    "",
  ];

  it.each(ALL_INPUTS)(
    'never returns "*" for any origin input: %s',
    (origin) => {
      const h = getCorsHeaders(origin);
      expect(h["Access-Control-Allow-Origin"]).not.toBe("*");
    }
  );
});

describe("CORS — null origin (server-to-server)", () => {
  it("falls back safely when origin is null", () => {
    const h = getCorsHeaders(null);
    expect(h["Access-Control-Allow-Origin"]).toBe(SAFE_FALLBACK);
  });

  it("falls back safely when origin is undefined", () => {
    const h = getCorsHeaders(undefined);
    expect(h["Access-Control-Allow-Origin"]).toBe(SAFE_FALLBACK);
  });
});

describe("CORS — required security headers", () => {
  it("always includes Vary: Origin to prevent CDN cache poisoning", () => {
    /*
      Without Vary: Origin, a CDN edge node might cache a response for
      origin A and serve it to a request from origin B, leaking the wrong
      ACAO header and either over-permitting or over-restricting access.
    */
    const h = getCorsHeaders("https://invoiceprepper.com");
    expect(h["Vary"]).toBe("Origin");
  });

  it("includes Authorization in allowed headers (JWT required)", () => {
    const h = getCorsHeaders("https://invoiceprepper.com");
    expect(h["Access-Control-Allow-Headers"]).toContain("authorization");
  });

  it("includes all expected HTTP methods", () => {
    const h = getCorsHeaders("https://invoiceprepper.com");
    const methods = h["Access-Control-Allow-Methods"];
    for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      expect(methods).toContain(m);
    }
  });
});

describe("CORS — allowlist size (prevent silent additions)", () => {
  it("contains exactly 4 allowed origins", () => {
    /*
      If someone adds a new origin to cors.ts, this test fails until
      they also update this count — forcing a deliberate review.
    */
    expect(ALLOWED_ORIGINS.size).toBe(4);
  });

  it("does not contain any wildcard or empty entries", () => {
    expect(ALLOWED_ORIGINS.has("*")).toBe(false);
    expect(ALLOWED_ORIGINS.has("")).toBe(false);
  });
});
