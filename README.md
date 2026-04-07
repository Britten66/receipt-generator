# InvoicePrepper

Invoicing tool for freelancers, contractors, and small businesses. Create, send, and track invoices from any device.

Live at [invoiceprepper.com](https://invoiceprepper.com)

Built solo using LLMs to mimic industry standard structure and co-complete complex tasks. Real architecture, real debugging, real iteration, real deployment as a solo build.

:

## Stack

React 19 + Vite on Cloudflare Pages. Supabase Edge Functions (Deno) for the API. PostgreSQL via Supabase. Stripe for subscriptions. Resend for email. Groq for voice and text AI. jsPDF for PDF generation. PostHog for analytics.

:

## Structure

```
frontend/    React app (Cloudflare Pages)
supabase/    Edge functions (Deno runtime)
docs/        System overview and architecture
```

:

## Setup

Copy `frontend/.env.example` to `frontend/.env` and fill in your Supabase project URL and anon key. Set the remaining secrets in Supabase via `npx supabase secrets set`. Full list in `frontend/.env.example` and `docs/system-overview.md`.

:

## Tiers

| | Free | Pro | Voice AI |
|:|:|:|:|
| Invoices | Unlimited | Unlimited | Unlimited |
| PDF watermark | Yes | No | No |
| Email to client | | Yes | Yes |
| Voice + Text AI | | | Yes |
| Price | Free | CAD $9/mo | CAD $12/mo |
