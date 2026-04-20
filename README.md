# InvoicePrepper

Invoicing tool for freelancers, contractors, and small businesses. Create, send, track, and get paid from any device.

Live at [invoiceprepper.com](https://invoiceprepper.com)

---

## How this was built
Built this solo from blank repo to production. Used Claude Code throughout for architecture decisions, test scaffolding, and debugging, but every line that ships I understood, reviewed, and owned. Frontend, backend, edge functions, CI pipeline, DNS, payments. Nothing copy-pasted and forgotten. LLM has been used for high level complex calls that otherwise could break live code, this is being learned from and adjusted as the project grows.


## Test coverage

Test coverage was treated as a primary deliverable. 
Claude was used to generate test scaffolding at speed. This required active oversight. During this build, a ghost test was caught that was testing a locally defined copy of a component rather than the real code, passing silently while covering nothing. That's the real dynamic: AI-assisted test generation accelerates coverage but introduces its own class of errors.
Every test was reviewed and the suite audited for exactly this problem.

372 automated tests across business logic, API security, AI parsing, component behavior, and Playwright end-to-end flows.

---

## Stack

React 19 + Vite on Cloudflare Pages. Supabase Edge Functions (Deno) for the API layer. PostgreSQL via Supabase with row-level security. Stripe for subscription billing. Resend for transactional email. Groq for voice and text AI parsing. jsPDF for client-side PDF generation. PostHog for product analytics. Sentry for error tracking.

## Structure
```
frontend/
  src/
    features/       invoices, auth, billing, profile
    layout/         app shell, landing page, sidebar, topbar
    api/            fetch wrappers (receipts, profile, billing, AI)
    lib/            supabase client, themes, constants
    __tests__/      372 tests: logic, API, security, components, E2E
supabase/
  functions/        Edge functions: receipts, send-invoice, stripe-checkout,
                    voice-parse, text-parse, notify-signup, stripe-webhook
docs/               System overview and architecture
```
## Setup

Copy `frontend/.env.example` to `frontend/.env` and fill in your Supabase project URL and anon key. Set the remaining secrets in Supabase via `npx supabase secrets set`. Full list in `frontend/.env.example` and `docs/system-overview.md`.

Run unit and component tests:

```bash
cd frontend && npx vitest run
```

Run E2E tests (requires dev server, uses real Chromium):

```bash
cd frontend && npx playwright test --workers=2
```

## Voice Parsing Pipeline

This is the core technical piece of the Voice AI tier. No third-party voice-to-invoice service — the entire pipeline is custom built.

1. Browser captures audio via the MediaRecorder API, encoded as webm (mp4 fallback for iOS Safari)
2. Audio blob is uploaded directly to a Supabase Storage bucket scoped to the authenticated user
3. A Supabase Edge Function (Deno) picks up the file, downloads it, and streams it to Groq for transcription
4. The raw transcript is passed to a second Groq LLM call with a structured extraction prompt — the model returns JSON with client name, line items, quantities, unit prices, currency, and notes
5. The JSON maps directly onto the invoice form fields client-side
6. The audio file is deleted from storage immediately after the parse response is returned — nothing is retained

The same extraction logic runs for text input on desktop, minus the audio step. Rate limiting is enforced server-side per user per day, tracked in the voice_usage table. Voice parses cap at 20/day, text parses at 15/day for Pro tier (Voice tier is uncapped).

## Security

Defense in depth across the stack. Row-level security on every table, rate limiting on all cost-bearing endpoints, input validation and escaping, secret scanning on every push, static analysis via Semgrep (OWASP Top 10), and dependency auditing in CI.

To report a vulnerability: support@invoiceprepper.com

## CI Status

![CI](https://github.com/Britten66/receipt-generator/actions/workflows/ci.yml/badge.svg)

## Changelog

[invoiceprepper.com/blog](https://invoiceprepper.com/blog)

Built by [Chris](https://github.com/Britten66)
