# Edge Case Test Workflow

## How to run tests

```bash
cd frontend
npm test           # run all tests once
npm test -- --watch  # watch mode while developing
npm test -- --reporter=verbose  # full test names
```

All tests live in `frontend/src/__tests__/`. Green = safe to deploy.

---

## What is tested and where

| File | What it covers |
|------|----------------|
| `security/cors.test.js` | CORS allowlist, wildcard prevention, Vary header |
| `security/validation.test.js` | Email format, payment URL, required fields |
| `security/themes.test.js` | CSS var injection, XSS in theme values |
| `security/send-invoice-sender.test.js` | From-field logic, currency sanitization, tier gates |
| `api/ai-parse.test.js` | parseText, parseAudio, mapParsedToForm, mobile auth fallback |

---

## Mobile auth flow — how it works

The edge functions require a valid JWT in the `Authorization` header. On mobile (especially iOS Safari), the session can expire mid-session due to:
- ITP throttling localStorage access
- Long recording sessions expiring the token mid-recording

**Flow in `authHeaders()` (`src/api/aiParse.js`):**

```
1. getSession()      → returns cached token (no network call, fast)
2. token present?    → YES: use it
                     → NO: fall back to refreshSession() (network call to Supabase Auth)
3. still no token?   → throw "Session expired. Please sign in again."
```

**Tests that cover this (in `api/ai-parse.test.js`):**

- `uses getSession token when session is valid` — happy path, no refresh needed
- `falls back to refreshSession when getSession returns null` — expired token on mobile
- `falls back to refreshSession when getSession returns no access_token` — partial session object
- `throws 'Session expired' when both return null` — completely signed out
- `same fallback applies to parseAudio on mobile` — audio binary requests use same auth

---

## Edge function test strategy

Edge functions run as Deno on Supabase — they can't be imported directly in Vitest. We test them at two levels:

### Level 1: Unit (what we do now)
Mock `fetch` and `supabase` in the client helpers (`aiParse.js`). Fast, runs in CI.

### Level 2: Integration (manual checklist before deploy)

Run through this checklist on staging before pushing to production:

**Voice parse (`/voice-parse`):**
- [ ] Desktop Chrome: record 5s, confirm line items appear
- [ ] iOS Safari: record 5s, confirm line items appear (tests the mobile auth fallback)
- [ ] Record silence: expect "No speech detected" error, not a crash
- [ ] Record noise-only (no words): expect graceful error
- [ ] Non-voice tier user: expect 403 "Voice parsing requires the Voice tier"
- [ ] Free tier user: expect 403 (voice is tier-gated)
- [ ] Record for >30s: confirm large blob still works (up to 10MB cap)

**Text parse (`/text-parse`):**
- [ ] Submit empty text: expect validation error before hitting API
- [ ] "bill web service and paint service": expect TWO line items, not one
- [ ] "4 apples at $2": expect description "Apples", qty 4, price 2
- [ ] "invoice John for 3 hours consulting at 85 USD": confirm currency = USD
- [ ] Non-voice tier user: expect 403

**Auth edge cases (both functions):**
- [ ] Sign out, try to parse: expect "Session expired" toast
- [ ] Use app on mobile after 1 hour idle: confirm token refresh works silently

---

## Adding a new edge case test

1. Identify the failure mode (e.g., "what if the AI returns a number instead of a string for quantity?")
2. Find the relevant describe block in `__tests__/api/ai-parse.test.js` or the relevant security file
3. Add a test using the same `mockFetch` helper pattern:

```js
it("handles AI returning number quantity as string", () => {
  const parsed = {
    line_items: [{ description: "Consulting", quantity: "3", unit_price: "85" }],
  };
  const { items } = mapParsedToForm(parsed);
  expect(items[0].total).toBe("255.00");
});
```

4. Run `npm test` — if it passes, the code already handles it. If it fails, fix the code first.
5. Commit both the test and the fix together.

---

## CI integration (future)

When ready to automate, add this to your Cloudflare Pages build command or a GitHub Action:

```yaml
- name: Run tests
  run: cd frontend && npm test
```

Tests fail the build if any test breaks — zero manual checking needed.
