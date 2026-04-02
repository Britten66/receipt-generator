# Security Tests

Automated security test suite covering the four main attack surfaces of InvoicePrepper. Tests run on every push to main via GitHub Actions. No environment variables required — all tests are pure unit tests that replicate edge function logic in isolation.

Run locally:

```
cd frontend
npm test
```

---

## What Is Tested and Why

### CSS Injection Prevention

**File:** `frontend/src/__tests__/security/themes.test.js`

The palette picker writes CSS custom properties directly to `document.documentElement` via `setProperty()`. If an attacker tampered with localStorage before the page loads, they could inject arbitrary CSS — including `url()` calls that exfiltrate data or overlay the UI for phishing.

The defence is an allowlist. `applyPalette()` only accepts a key from a hardcoded `Set`. Values are looked up from our own palette definitions — user input never reaches `setProperty()` directly.

**Verified:**
- Valid palette keys write the correct CSS vars to the document root
- Invalid, unknown, and injection-style keys clear all managed vars
- `setProperty` is never called with a variable name outside the managed list
- `clearPalette()` removes exactly the managed vars and nothing else
- The palette allowlist contains exactly 6 entries — no silent additions
- Every palette has both a light and dark variant defined

---

### XSS and Input Validation

**File:** `frontend/src/__tests__/security/validation.test.js`

The send-invoice edge function builds a raw HTML email from user-supplied fields. Email clients render HTML, often without a Content Security Policy. Without escaping, a malicious vendor name or invoice note can inject script tags or break out of HTML attributes.

Payment URLs are only emitted into email HTML if they begin with `http://` or `https://`. `javascript:` and `data:` schemes are dropped.

**Verified:**
- `escapeHtml` neutralises all five HTML injection vectors: `<` `>` `&` `"` `'`
- Null and undefined inputs return empty string without throwing
- Full script injection, img onerror, and attribute breakout strings are neutralised
- Valid email addresses pass the regex
- Invalid, multiline, and SMTP header injection addresses are rejected
- `javascript:` and `data:` payment URLs are blocked
- URL scheme check is case-insensitive

---

### CORS Allowlist Integrity

**File:** `frontend/src/__tests__/security/cors.test.js`

If the CORS configuration returns `Access-Control-Allow-Origin: *`, any website can call the API using a logged-in user's JWT from their browser. This would allow an attacker to create, read, or delete invoices, trigger Stripe checkout, or exfiltrate profile data.

The edge functions use an explicit allowlist. Unknown origins receive the production domain, not their own origin — which the browser rejects for cross-origin requests.

**Verified:**
- Allowed production and localhost origins receive their own origin echoed back
- Unknown and attacker-controlled origins are never echoed back
- The wildcard `*` is never returned under any input
- Null origin (server-to-server, no browser) falls back safely
- `Vary: Origin` header is always present (prevents CDN cache poisoning)
- `Authorization` is in the allowed headers list (JWT required)
- The allowlist contains exactly 4 entries — any addition requires updating this count

---

### Mass Assignment Prevention

**File:** `frontend/src/__tests__/security/fields-whitelist.test.js`

Without a field whitelist on the receipts PATCH endpoint, a logged-in attacker can send arbitrary fields in the request body — including `user_id`, `tier`, or `stripe_customer_id`. This is a mass assignment vulnerability (OWASP API6).

The edge function filters the request body through `ALLOWED_FIELDS` before the database query. Any key not in that list is silently dropped.

**Verified:**
- `ALLOWED_FIELDS` contains exactly 11 safe fields — any addition requires updating this count
- Sensitive fields (`user_id`, `id`, `receipt_number`, `created_at`, `tier`, `stripe_*`) are excluded
- The filter correctly strips disallowed fields from a mixed request body
- An all-disallowed body produces zero updates, triggering the 400 guard
- `null` values for optional fields (logo removal) are preserved through the filter
- Prototype pollution via `__proto__` and `constructor` keys is blocked by design
- All five body size limits are defined, above zero, and below 10 MB

---

## CI Pipeline

**File:** `.github/workflows/ci.yml`

Runs on every push and pull request to main.

```
install → security tests → production build → dependency audit
```

The build step uses placeholder values for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` so Vite does not fail on missing environment variables. No real credentials are used in CI.

The dependency audit step runs at `--audit-level=high`. It is set to `continue-on-error: true` until the current moderate vulnerability in a transitive dependency is resolved. Change it to `false` once clean.

---

## Test Count

| File | Tests |
|---|---|
| themes.test.js | 27 |
| validation.test.js | 36 |
| cors.test.js | 38 |
| fields-whitelist.test.js | 29 |
| **Total** | **130** |

---

## Keeping Tests in Sync

The validation, CORS, and field whitelist tests replicate logic from the Supabase edge functions (`send-invoice`, `_shared/cors.ts`, `receipts`). They are intentional mirrors — not shared imports — because the edge functions run in Deno and the tests run in Node.

If you change any of the following in an edge function, update the corresponding test file and re-run `npm test`:

- `escapeHtml` or `EMAIL_RE` in `send-invoice/index.ts`
- `ALLOWED_ORIGINS` in `_shared/cors.ts`
- `ALLOWED_FIELDS` in `receipts/index.ts`
- Any body size limit constant
