# InvoicePrepper — Claude Code Context

## Project Summary

Invoicing SaaS for freelancers, contractors, and small businesses. Create, send, and track invoices.

**Domain:** invoiceprepper.com
**App:** React frontend on Cloudflare Pages + Supabase Edge Functions backend

---

## Active Features

- Create / edit / delete invoices with line items
- Invoice statuses: `draft`, `sent`, `paid`, `voided` — sidebar filters for each
- PDF generation (jsPDF) — download, share, preview, and email as attachment
- Email invoice to client (Pro only) via Resend — HTML email with optional PDF attachment
- Logo on PDF: upload to Supabase Storage, place in any of 4 corners (cycles on click). Auto-populates from profile on form open.
- Avatar (topbar) vs logo (PDF) are separate fields: `avatar_url` → `{email}/avatar`, `logo_url` → `{email}/logo`
- remove.bg background removal on logo upload (optional — activates when `VITE_REMOVEBG_API_KEY` is set)
- QR code on invoice detail panel linking to `payment_url` from profile
- Stripe subscription checkout (Pro and Voice AI tier upgrades) + webhook for tier state changes
- Voice AI parsing — speak or type an invoice description, AI fills in fields. Uses Groq Whisper + LLaMA. Audio uploaded to Supabase Storage temp bucket, then retrieved server-side via signed URL.
- RAG context injection — past invoice history (client names, service prices) injected into AI prompt per user for smarter parsing
- Dark mode (persists in localStorage)
- Mobile responsive layout (topbar strip + grid + full-screen detail on tap)
- Landing page with gated entry — `app_entered` in localStorage skips landing on refresh
- Auth via Supabase (email/password). Password recovery flow handled in `onAuthStateChange`.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite 7 |
| Hosting | Cloudflare Pages |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Payments | Stripe (subscriptions) |
| Email | Resend (`invoices@invoiceprepper.com`) |
| AI | Groq (Whisper for transcription, LLaMA 3.3 70B for extraction) |
| PDF | jsPDF 4 + jsPDF-autoTable 5 |
| QR | qrcode.react |
| UI primitives | Radix UI (dropdown), Lucide React (icons) |
| Storage | Supabase Storage |

---

## Project Structure

```
frontend/
  src/
    App.jsx              — main shell: auth, state, layout, detail panel
    api/
      receipts.js        — CRUD wrappers for /receipts edge function
      profile.js         — GET/PUT profile
      billing.js         — startCheckout(), cancelSubscription(), openBillingPortal()
      uploadLogo.js      — Supabase Storage upload + remove.bg call
      aiParse.js         — parseText(), parseAudio(), mapParsedToForm()
    components/
      ReceiptForm.jsx    — create/edit form with logo panel and AI parse button
      ReceiptList.jsx    — grid of invoice cards
      ReceiptPDF.js      — jsPDF generation: download, share, preview, buildPDFBase64
      AuthModal.jsx      — sign in / sign up
      ProfileModal.jsx   — business info + avatar + logo uploads (two sections)
      LandingPage.jsx    — pre-auth landing screen
      HelpModal.jsx
      LegalModal.jsx
      PasswordUpdateModal.jsx
      BillingModal.jsx
      BorderGlow.jsx
    lib/supabase.js      — createClient with VITE_SUPABASE_* keys
supabase/
  functions/
    receipts/index.ts       — GET list/one, POST create, PATCH update (whitelist), DELETE
    profile/index.ts        — GET (auto-create on first login), PUT upsert
    send-invoice/index.ts   — POST email via Resend (Pro+ only, server-enforced)
    voice-parse/index.ts    — POST audio transcription + AI field extraction
    text-parse/index.ts     — POST text description AI field extraction
    stripe-checkout/index.ts
    stripe-webhook/index.ts
    cancel-subscription/index.ts
    billing-portal/index.ts
    _shared/cors.ts         — CORS allowlist + getCorsHeaders()
```

---

## Database Tables

**`receipts`** — vendor_name, customer_name, status, date, subtotal, tax, total, notes, currency, logo_url, logo_corner, receipt_number, user_id, created_at

**`line_items`** — receipt_id, description, quantity, unit_price, total

**`profiles`** — user_id, tier (`free`|`pro`|`voice`), business_name, address, email, phone, bio, website, payment_url, logo_url, avatar_url, stripe_customer_id, stripe_subscription_id, currency

**`voice_usage`** — user_id, date — daily AI parse count for rate limiting (limit: 20/day)

---

## Tier Model

- **Free** — unlimited invoices, PDF with watermark, cannot email clients
- **Pro** — no watermark, email invoices to clients, logo on PDF, themes. CAD $9/mo.
- **Voice AI** — everything in Pro plus voice and text AI parsing. CAD $12/mo. Server-enforced.

---

## Environment Variables

**`frontend/.env`**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_REMOVEBG_API_KEY   # optional
```

**Supabase secrets**
```
RESEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_PRO_PRICE_ID
STRIPE_VOICE_PRICE_ID
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
```

---

## Code Style & Conventions

- Components: PascalCase JSX files in `src/components/`
- API helpers: camelCase functions in `src/api/` — one file per resource
- Edge functions: single `index.ts` per function, Deno runtime
- CSS: custom properties for all colours. Dark mode via `[data-theme="dark"]` on `<html>`. Palette overrides via inline `style.setProperty()` — always use variables, never inline colour literals.
- Toast system: `showToast(msg, "success"|"error"|"upgrade")` — 3.5s auto-dismiss
- `STATUS_CONFIG` / `NAV` / `STATUS_LABELS` constants drive all status-related UI in `App.jsx`
- `App.jsx` uses thorough inline comments explaining intent — keep that pattern when editing
- No m-dashes anywhere in code or copy. Ever.

---

## Theme / Palette System

**File:** `src/lib/themes.js`

- 6 named palettes: `earth`, `water`, `fire`, `forest`, `dusk`, `stone`. Each has a `light` and `dark` variant.
- `applyPalette(key, mode)` — validates key against `PALETTE_KEYS` Set, writes CSS vars to `document.documentElement`. Never accepts raw colour values from user input.
- `clearPalette()` — removes all inline overrides. Called when landing page is showing.
- Per-mode persistence: `theme_light_palette` / `theme_dark_palette` in localStorage.
- Landing page always uses default colours — palette is gated on `entered` state.

**Managed CSS vars:** `--bg`, `--surface`, `--surface-2`, `--border`, `--border-light`, `--text`, `--text-dim`, `--text-muted`, `--accent`, `--accent-dim`
