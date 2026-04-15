# Edge Case Test Workflow

## How to run tests

```bash
cd frontend
npm test           # run all tests once
npm test -- --watch  # watch mode while developing
npm test -- --reporter=verbose  # full test names
```

All tests live in `frontend/src/__tests__/`. Green = safe to deploy.
Current count: **391 tests, all passing.**

---

## Why 265 tests — and is that normal?

For a production SaaS with real users and billing, yes — this is appropriate. Here's why each group earns its place:

**Security tests (~180 tests)** are the most valuable. They act as a trip-wire: if someone (or an LLM) accidentally weakens a CORS header, removes a tier check, or adds an unsafe field to the PATCH whitelist, the build breaks before it ships. These tests saved real bugs during the two-machine merge workflow when main and dev diverged.

**API/AI tests (~50 tests)** lock in the behaviour of the AI parsing pipeline. The mapParsedToForm function is called on every voice/text parse result. Without tests, a refactor could silently break quantity defaulting or em dash stripping and you'd never know until a user reports garbled invoices.

**Auth edge case tests (~15 tests)** directly mirror a real production bug: mobile iOS users were getting 401s mid-session. The tests document exactly how the fix works and prevent it from regressing.

**Is 265 a lot?** For a solo project with no QA team, billing integration, and an AI pipeline — it's actually lean. Each test is roughly 5-10 lines. The whole suite runs in under 2 seconds. The alternative is manually testing 10+ failure paths every deploy, which you won't do consistently.

**What these tests are NOT:** integration tests against a real Supabase instance or Stripe. Those are the manual checklist below.

---

## What is tested and where

| File | Tests | What it covers |
|------|-------|----------------|
| `security/cors.test.js` | ~35 | CORS allowlist, wildcard prevention, Vary header |
| `security/validation.test.js` | ~25 | Email format, payment URL, field sanitization, XSS |
| `security/themes.test.js` | ~20 | CSS var injection, XSS in theme values |
| `security/send-invoice-sender.test.js` | ~30 | From-field logic, currency sanitization, tier gates |
| `security/fields-whitelist.test.js` | ~15 | PATCH whitelist (11 fields, no user_id/id) |
| `security/privacy-consent.test.js` | ~20 | Consent schema, billing disclosure text |
| `api/ai-parse.test.js` | ~40 | parseText, parseAudio (storage flow), mapParsedToForm, mobile auth fallback |

---

## parseAudio — storage upload flow

Audio is no longer sent as a binary body. The 1MB Supabase gateway limit was killing mobile recordings.

**New flow:**
```
1. client: getUser() to get user ID
2. client: upload blob to audio-temp/{user_id}/audio-{timestamp}.{ext}
3. client: POST { storage_path } as JSON to /voice-parse
4. edge fn: validates storage_path starts with user's own ID
5. edge fn: creates signed URL (60s TTL), fetches audio server-side
6. edge fn: deletes temp file (fire and forget)
7. edge fn: sends to Whisper, then LLaMA
```

Tests in `api/ai-parse.test.js` cover: upload called with correct path, JSON body sent (not binary), iOS mp4 extension, upload failure throws, signed-out user throws.

---

## Mobile auth flow

**Flow in `authHeaders()` (`src/api/aiParse.js`):**

```
1. getSession()   → cached token, no network call
2. token present? → YES: use it
                  → NO: refreshSession() (forces network call to Supabase Auth)
3. still no token → throw "Session expired. Please sign in again."
```

Covers iOS ITP throttling localStorage and long recording sessions expiring tokens mid-use.

---

## Edge function test strategy

Edge functions run as Deno — can't be imported in Vitest. Two levels:

### Level 1: Unit (automated, runs on every save)
Mock `fetch`, `supabase.auth`, and `supabase.storage` in client helpers. Covers all happy paths and failure modes.

### Level 2: Integration (manual checklist before deploying edge functions)

**Voice parse (`/voice-parse`):**
- [ ] Desktop Chrome: record 5s, confirm line items appear
- [ ] iOS Safari: record 5s, confirm line items appear
- [ ] Record silence: expect "No speech detected" error
- [ ] Non-voice tier user: expect 403
- [ ] Free tier user: expect 403
- [ ] Sign out mid-session, try to parse: expect "Session expired" toast

**Text parse (`/text-parse`):**
- [ ] "bill web service and paint service" — expect TWO line items
- [ ] "4 apples at $2" — qty 4, unit_price 2
- [ ] "invoice John for 3 hours consulting at 85 USD" — currency = USD
- [ ] Non-voice tier user: expect 403

---

## Adding a new test

1. Identify the failure mode
2. Find the relevant describe block in `__tests__/`
3. Add using the mockFetch pattern:

```js
it("handles AI returning string quantity", () => {
  const parsed = {
    line_items: [{ description: "Consulting", quantity: "3", unit_price: "85" }],
  };
  const { items } = mapParsedToForm(parsed);
  expect(items[0].total).toBe("255.00");
});
```

4. Run `npm test` — passes = already handled, fails = fix code first, then commit both together.

---

## CI integration

Live on GitHub Actions. Runs on every push to main: install, security tests, production build, Playwright E2E, dependency audit. See `.github/workflows/ci.yml`.
