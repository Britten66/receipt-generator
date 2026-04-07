# InvoicePrepper

Invoicing tool for freelancers, contractors, and small businesses. Create, send, and track invoices from any device.

Live at [invoiceprepper.com](https://invoiceprepper.com)

Built solo using LLMs to mimic industry standard structure and co-complete complex tasks. The goal was to practice building something real -- real architecture, real debugging, real iteration, real deployment. This is what that looks like as a solo build.

---

## What It Does

- Create, edit, and delete invoices with line items
- PDF generation -- download, share, or email as attachment
- Invoice statuses: Draft, Sent, Paid, Voided
- Email invoices to clients (Pro)
- Business logo on every PDF (Pro)
- QR code on invoice linking to a payment URL
- Voice AI -- speak your invoice, AI fills in client, line items, and prices
- Text AI -- describe a job in plain text, AI extracts the fields
- RAG context -- AI uses your invoice history to suggest your regular clients and rates
- Stripe subscriptions with CAD and USD pricing
- Dark mode, color themes (Pro)
- Mobile responsive

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite 7 |
| Hosting | Cloudflare Pages |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Payments | Stripe |
| Email | Resend |
| AI | Groq (Whisper + LLaMA 3.3 70B) |
| PDF | jsPDF + jsPDF-autoTable |
| Analytics | PostHog |

---

## Project Structure

```
frontend/          React + Vite app (Cloudflare Pages)
  src/
    App.jsx        Main shell -- auth, state, layout
    api/           CRUD wrappers for each edge function
    components/    All UI components
    lib/           Supabase client, theme helpers

supabase/
  functions/       Edge functions (Deno runtime)
    receipts/      Invoice CRUD
    profile/       User profile
    send-invoice/  Email via Resend
    voice-parse/   Whisper transcription + AI extraction
    text-parse/    AI field extraction from text
    stripe-*/      Checkout, webhook, billing portal
    notify-signup/ New user admin alert + welcome email
```

---

## Environment

**`frontend/.env`**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_REMOVEBG_API_KEY   # optional -- background removal on logo upload
```

**Supabase secrets**
```
RESEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_PRO_PRICE_ID
STRIPE_PRO_PRICE_ID_USD
STRIPE_VOICE_PRICE_ID
STRIPE_VOICE_PRICE_ID_USD
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
NOTIFY_EMAIL
NOTIFY_SIGNUP_SECRET
POSTHOG_API_KEY
POSTHOG_HOST
```

---

## Tiers

| | Free | Pro | Voice AI |
|---|---|---|---|
| Invoices | Unlimited | Unlimited | Unlimited |
| PDF | Watermark | No watermark | No watermark |
| Logo on PDF | | Yes | Yes |
| Email to client | | Yes | Yes |
| Themes | | Yes | Yes |
| Voice + Text AI | | | Yes |
| Price | Free | CAD $9/mo | CAD $12/mo |

---

## Known Issues

Receipt numbers are global across all users instead of per-user sequential. Fix requires changing the DB constraint from `UNIQUE(receipt_number)` to `UNIQUE(user_id, receipt_number)` and adding a prefix field to profiles.

---

## Planned

Public invoice URL -- `invoiceprepper.com/pay/INV-000042` where the client sees the full invoice in the browser and hits Pay Now to go to Stripe. Supabase anon role RLS handles the public read with no extra backend needed.
