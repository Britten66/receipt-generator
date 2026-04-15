# InvoicePrepper

Invoicing tool for freelancers, contractors, and small businesses. Create, send, track, and get paid from any device.

Live at [invoiceprepper.com](https://invoiceprepper.com)

---

## How this was built

Built this solo from a frame work I had an LLM help get to industry spec.  frontend, backend, edge functions, CI pipeline, DNS, and payments. The goal was to build it the way a proper engineering team would.

feature based structure, edge functions, row level security on every table, rate limiting on AI endpoints, and a full test suite.



### Test coverage

QA and test coverage were treated as a primary deliverable, not a post-launch afterthought. By leveraging AI to rapidly scale boilerplate test generation during feature builds, a robust, production-grade testing suite was implemented across 391 automated tests.

**Business logic.** Pure function coverage for all invoice math, tax calculations, currency formatting, and edge cases including zero quantities, floating point rounding, and large totals.

**API and security.** Comprehensive coverage enforcing strict API behaviors, security boundaries, and complex authentication edge cases including JWT handling, rate limiting, webhook signature verification, and input sanitization.

**AI parsing validation.** Dedicated test paths securing all AI data parsing logic against unpredictable outputs, malformed responses, and missing fields.

**Component tests.** Full coverage of every modal, form, and key UI surface: tier gates, consent flows, billing states, status transitions, and callback wiring.

**End-to-end tests.** Playwright tests running against real Chromium covering the full landing page funnel, auth modal flows, consent gate enforcement, and all SEO pages.

**Continuous regression.** Every edge case discovered during debugging was immediately codified into an automated regression test, ensuring the same bug cannot reappear silently.

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
    __tests__/      391 tests: logic, API, security, components, E2E
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

## Tiers

| | Free | Pro | Voice AI |
|---|---|---|---|
| Invoices | Unlimited | Unlimited | Unlimited |
| Clean PDF, no watermark | Yes | Yes | Yes |
| Download PDF | Yes | Yes | Yes |
| Email invoice to client | | Yes | Yes |
| Share invoice PDF from mobile | | Yes | Yes |
| Business name on outgoing emails | | Yes | Yes |
| Upload logo to PDF | | Yes | Yes |
| Send payment reminders | | Yes | Yes |
| Text AI parsing (15 per day) | | Yes | Yes |
| Dashboard themes | | Yes | Yes |
| CSV export | | Yes | Yes |
| Voice AI (unlimited) | | | Yes |
| Text AI (unlimited) | | | Yes |
| First access to new AI features | | | Yes |
| Price | Free | CAD $9/mo | CAD $12/mo |

## Features

**Invoicing.** Create invoices with line items, tax, due dates, and notes. Download as PDF or email directly to clients. Track status from Draft to Sent to Paid. Outstanding balance updates automatically.

**AI parsing.** Describe a job in plain text or speak it aloud. The AI fills in the invoice fields, detects line items and prices, and infers currency from context. Pro users get 15 text parses per day. Voice AI users get unlimited voice and text parses.

**Email delivery.** Pro and Voice AI users can email invoices directly to clients with their business name in the sender field. Send payment reminders for unpaid invoices.

**PDF sharing.** Every invoice generates a clean PDF. Pro and Voice AI users can share the PDF directly from their phone using the native share sheet.

**Subscriptions.** Stripe handles billing for Pro (CAD/USD $9/mo) and Voice AI (CAD/USD $12/mo). Post-checkout webhook upgrades the user tier in Supabase automatically.

**Analytics and error tracking.** PostHog tracks activation events: signup, invoice created, invoice sent, invoice paid, upgrade, PDF downloaded. Sentry catches frontend errors in production.

**Notifications.** A database webhook fires on every new user registration, sending an admin notification and a welcome email via Resend.

**SEO.** Static HTML pages in `/public` for trade and service verticals. Sitemap at `/sitemap.xml`.

## Voice Parsing Pipeline

This is the core technical piece of the Voice AI tier. No third-party voice-to-invoice service — the entire pipeline is custom built.

1. Browser captures audio via the MediaRecorder API, encoded as webm (mp4 fallback for iOS Safari)
2. Audio blob is uploaded directly to a Supabase Storage bucket scoped to the authenticated user
3. A Supabase Edge Function (Deno) picks up the file, downloads it, and streams it to Groq for transcription
4. The raw transcript is passed to a second Groq LLM call with a structured extraction prompt — the model returns JSON with client name, line items, quantities, unit prices, currency, and notes
5. The JSON maps directly onto the invoice form fields client-side
6. The audio file is deleted from storage immediately after the parse response is returned — nothing is retained

The same extraction logic runs for text input on desktop, minus the audio step. Rate limiting is enforced server-side per user per month using a counter in the profiles table.

## Changelog

[invoiceprepper.com/blog](https://invoiceprepper.com/blog)

Built by [Chris](https://github.com/Britten66)
