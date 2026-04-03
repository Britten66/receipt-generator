# Security Tests

Automated security test suite covering the main attack surfaces of InvoicePrepper. Tests run on every push to main via GitHub Actions. No environment variables required — all tests are pure unit tests that replicate edge function logic in isolation.

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

### Signup Notification Webhook Integrity

**File:** `frontend/src/__tests__/security/notify-signup.test.js`

The `notify-signup` edge function fires when a new user registers. It receives a POST request from Supabase Auth Hooks and sends an email to the owner via Resend. Because this function has no CORS protection (it is server-to-server), it relies entirely on HMAC-SHA256 request signing. Without signature verification, any attacker who discovers the URL could forge fake signup events or probe for valid accounts.

Supabase signs every Auth Hook request with a shared secret using the format `v1,whsec_<base64>`. The function parses the `v1=<hex>` signature from the header and verifies it using `crypto.subtle.verify` (constant-time).

**Verified:**
- A correctly signed payload passes verification
- A tampered body fails — signature no longer matches
- A wrong secret fails
- Empty, null, undefined, and single-space signature headers all fail
- A single byte flipped in the signature fails
- Both Supabase payload shapes are handled: `{ user: {...} }` and flat user object
- Missing user fields fall back gracefully without throwing
- Constant-time comparison behaviour verified for both length-mismatch and same-length wrong signatures

---

### Privacy and Consent Compliance

**File:** `frontend/src/__tests__/security/privacy-consent.test.js`

InvoicePrepper charges a recurring subscription and processes personal data. This creates obligations under PIPEDA (Canadian federal privacy law), CASL (Canada's Anti-Spam Law), and FTC regulations for US users. These tests lock in the consent capture contract so a refactor cannot silently remove required consent fields or weaken billing disclosures.

**Verified:**
- Signup is blocked when terms have not been agreed — no consent metadata is built
- `terms_agreed_at` is a valid ISO 8601 UTC timestamp, not backdated, not epoch zero
- Timestamp is within 5 seconds of capture time — not hardcoded or reused
- `email_marketing_ok` is a strict boolean — not a string or number (CASL requires express, unambiguous consent)
- Opting out of email marketing (`false`) still produces a valid, completed signup
- Consent object survives JSON round-trip without data loss (Supabase stores metadata as JSON)
- Billing disclosure text contains all FTC-required elements: charge amount, billing frequency, auto-renewal notice, and cancellation instructions

---

### User Data Ownership and Access Control

**File:** `frontend/src/__tests__/security/user-data-ownership.test.js`

The receipts edge function uses a service role key that bypasses Supabase RLS. Ownership is enforced entirely by explicit `user_id` filters in every query. These tests document that contract and lock in the post-fix behaviour for the line items edit bug (editing an invoice was zeroing out totals and returning "not found" on save).

**Verified:**
- `receipt_number`, `user_id`, `id`, and `created_at` are absent from `ALLOWED_FIELDS` — immutable after creation
- `currency` is present in `ALLOWED_FIELDS` — required after removing the hardcoded NS HST rate
- Every currency in the supported list passes ISO 4217 validation, no duplicates
- CAD is the primary currency (Canadian market), USD is present as fallback
- PATCH body always includes `line_items` — the zero-out regression cannot recur silently
- An empty `line_items: []` array is valid and triggers deletion of existing rows
- PATCH body never contains `user_id` or `receipt_number`
- `fmtStat` compact formatter never overflows an 8-character budget for realistic totals (up to $999M)

---

### HTTP Client Contracts

**File:** `frontend/src/__tests__/api/receipts.test.js`

Verifies that the frontend API wrappers build the correct HTTP requests — right URL, method, headers, and body shape — for all five receipt operations.

**Verified:**
- `fetchReceipts` issues GET with auth headers
- `fetchReceiptById` appends `?id=` query param
- `createReceipt` issues POST with JSON body
- `updateReceipt` issues PATCH with `?id=` and correct body
- `deleteReceipt` issues DELETE with `?id=`
- Auth header is always `Bearer <token>`
- 404 responses are returned as error objects, not thrown

---

## CI Pipeline

**File:** `.github/workflows/ci.yml`

Runs on every push and pull request to main.

```
install → security tests → production build → dependency audit
```

The build step uses placeholder values for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` so Vite does not fail on missing environment variables. No real credentials are used in CI.

The dependency audit step runs at `--audit-level=high`. It is set to `continue-on-error: true` until the current moderate vulnerability in a transitive dependency is resolved.

---

## Test Count

| File | Tests |
|---|---|
| themes.test.js | 27 |
| validation.test.js | 36 |
| cors.test.js | 38 |
| fields-whitelist.test.js | 29 |
| notify-signup.test.js | 19 |
| privacy-consent.test.js | 26 |
| user-data-ownership.test.js | 34 |
| receipts.test.js | 10 |
| **Total** | **219** |

---

## Keeping Tests in Sync

The validation, CORS, field whitelist, privacy-consent, and user-data-ownership tests replicate logic from the Supabase edge functions. They are intentional mirrors — not shared imports — because the edge functions run in Deno and the tests run in Node.

If you change any of the following, update the corresponding test file and re-run `npm test`:

| What changed | Test file to update |
|---|---|
| `escapeHtml` or `EMAIL_RE` in `send-invoice/index.ts` | `validation.test.js` |
| `ALLOWED_ORIGINS` in `_shared/cors.ts` | `cors.test.js` |
| `ALLOWED_FIELDS` in `receipts/index.ts` | `fields-whitelist.test.js`, `user-data-ownership.test.js` |
| Any body size limit constant | `fields-whitelist.test.js` |
| HMAC logic in `notify-signup/index.ts` | `notify-signup.test.js` |
| Consent fields in `AuthModal.jsx` | `privacy-consent.test.js` |
| Billing disclosure copy in `App.jsx` | `privacy-consent.test.js` |
| Currency list in `ReceiptForm.jsx` | `user-data-ownership.test.js` |
| `fmtStat` in `App.jsx` | `user-data-ownership.test.js` |
