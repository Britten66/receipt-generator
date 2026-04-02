# InvoicePrepper — Claude Code Context

## Project Summary

Invoicing SaaS for freelancers, contractors, and small businesses. Create, send, and track invoices. Built solo as a real-world workflow and architecture exercise.

**Domain:** invoiceprepper.com (bought, live)
**App:** React frontend on Vercel + Supabase Edge Functions backend

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
- Stripe subscription checkout (Pro tier upgrade) + webhook for tier state changes
- Dark mode (persists in localStorage)
- Mobile responsive layout (topbar → strip + grid → full-screen detail on tap)
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
| PDF | jsPDF 4 + jsPDF-autoTable 5 |
| QR | qrcode.react |
| UI primitives | Radix UI (dropdown), Lucide React (icons) |
| Storage | Supabase Storage (public bucket) |

---

## Project Structure

```
frontend/
  src/
    App.jsx              — main shell: auth, state, layout, detail panel
    api/
      receipts.js        — CRUD wrappers for /receipts edge function
      profile.js         — GET/PUT profile
      billing.js         — startCheckout()
      uploadLogo.js      — Supabase Storage upload + remove.bg call
    components/
      ReceiptForm.jsx    — create/edit form with logo panel (Pro)
      ReceiptList.jsx    — grid of invoice cards
      ReceiptPDF.js      — jsPDF generation: download, share, preview, buildPDFBase64
      AuthModal.jsx      — sign in / sign up
      ProfileModal.jsx   — business info + avatar + logo uploads (two sections)
      LandingPage.jsx    — pre-auth landing screen
      HelpModal.jsx
      LegalModal.jsx
      PasswordUpdateModal.jsx
      BorderGlow.jsx
    lib/supabase.js      — createClient with VITE_SUPABASE_* keys
supabase/
  functions/
    receipts/index.ts    — GET list/one, POST create, PATCH update (whitelist), DELETE
    profile/index.ts     — GET (auto-create on first login), PUT upsert
    send-invoice/index.ts — POST email via Resend (Pro only, server-enforced)
    stripe-checkout/index.ts — POST → create Stripe Checkout session
    stripe-webhook/index.ts  — checkout.session.completed → tier=pro; subscription.deleted → tier=free
    _shared/cors.ts      — CORS allowlist + getCorsHeaders()
docs/
  april-2-changes.md    — running changelog of recent work
  legacy-backend/       — old Express/Vercel API (reference only, not in use)
```

---

## Database Tables (inferred from edge functions)

**`receipts`** — vendor_name, customer_name, status, date, subtotal, tax, total, notes, currency, logo_url, logo_corner, receipt_number, user_id, created_at

**`line_items`** — receipt_id, description, quantity, unit_price, total

**`profiles`** — user_id, tier (`free`|`pro`), business_name, address, email, phone, bio, website, payment_url, logo_url, avatar_url, stripe_customer_id, stripe_subscription_id

---

## Tier Model

- **Free** — unlimited invoices, PDF watermark, cannot send email
- **Pro** — no watermark, can email invoices to clients via Resend. Enforced server-side in `send-invoice` function.
- Tier state lives in `profiles.tier`. Set to `pro` by stripe-webhook on `checkout.session.completed`, reset to `free` on `customer.subscription.deleted`.

---

## Security Model

- JWT sent on every request (`Authorization` header) — Supabase validates against anon key
- Service role key used only in `stripe-webhook` (bypasses RLS to update any user's profile)
- Body size limits: receipts 64 KB, profile 32 KB, stripe-checkout 4 KB, send-invoice 3 MB (PDF attachment), PDF attachment itself capped at 2 MB base64
- PATCH on receipts uses an `ALLOWED_FIELDS` whitelist — no arbitrary column writes
- HTML escaping (`escapeHtml`) on all user fields in email HTML
- CORS allowlist: `invoiceprepper.com`, `www.invoiceprepper.com`, `localhost:5173`, `localhost:3000`
- Vercel headers: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options`, HSTS, Referrer-Policy, Permissions-Policy
- Bot filtering + DDoS protection at edge (Cloudflare — see commit `afb2f7e`)

---

## Environment Variables

**`frontend/.env`**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_REMOVEBG_API_KEY   # optional — activates background removal on logo upload
```

**Supabase secrets**
```
RESEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_PRO_PRICE_ID
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

**Cloudflare** — also needs `VITE_REMOVEBG_API_KEY` if using remove.bg in production.

---

## Code Style & Conventions

- Components: PascalCase JSX files in `src/components/`
- API helpers: camelCase functions in `src/api/` — one file per resource
- Edge functions: single `index.ts` per function, Deno runtime
- CSS: custom properties for all colours. Dark mode via `[data-theme="dark"]` on `<html>`. Palette overrides via inline `style.setProperty()` — always use variables, never inline colour literals.
- Toast system: `showToast(msg, "success"|"error")` — 3.5s auto-dismiss
- `STATUS_CONFIG` / `NAV` / `STATUS_LABELS` constants drive all status-related UI in `App.jsx`
- `App.jsx` uses thorough inline comments explaining intent — keep that pattern when editing

---

## Theme / Palette System

**File:** `src/lib/themes.js`

**How it works:**
- 6 named palettes: `earth`, `water`, `fire`, `forest`, `dusk`, `stone`. Each has a `light` and `dark` variant.
- `applyPalette(key, mode)` — validates key against `PALETTE_KEYS` Set, then writes CSS vars to `document.documentElement` via `setProperty`. Never accepts raw colour values from user input.
- `clearPalette()` — removes all inline custom property overrides; App.css `:root` / `[data-theme="dark"]` defaults take over. Called whenever the user is on the landing page.
- `PALETTE_META` — display info (label, lightAccent, darkAccent, lightBg, darkBg) for rendering swatch circles in the picker UI.

**Per-mode persistence (localStorage):**
- `theme_light_palette` — key for light mode (or absent = default)
- `theme_dark_palette` — key for dark mode (or absent = default)

**Landing page isolation:**
- `applyPalette` / `clearPalette` are gated on `entered` state in App.jsx.
- When `entered === false` (landing page showing), `clearPalette()` is called so the public landing page always uses default colours regardless of the user's saved palette.

**Managed CSS vars (the ones palettes override):**
`--bg`, `--surface`, `--surface-2`, `--border`, `--border-light`, `--text`, `--text-dim`, `--text-muted`, `--accent`, `--accent-dim`

**Picker UI:**
- Swatch strip sits in topbar Column 1 (left of the dark-toggle).
- Each swatch is an 18 px circle with a `linear-gradient(135deg, bg 50%, accent 50%)` split to preview both tones.
- Default swatch has a diagonal slash and clears to App.css defaults.
- Active swatch shows an accent-coloured ring via `box-shadow`.
- Hidden on screens narrower than 400 px to protect topbar layout.

---

## Known Bugs

1. **Receipt numbers are global, not per-user sequential.** The DB constraint is `UNIQUE(receipt_number)`. Fix requires:
   - Change to `UNIQUE(user_id, receipt_number)`
   - Add a `prefix` field to `profiles` for custom invoice number prefixes (e.g. `INV-`)

---

## Planned / Next TODOs

1. **Public invoice payment page** — `invoiceprepper.com/pay/INV-000042`
   - Shows full invoice in browser with a "Pay Now" button → Stripe
   - Supabase anon role RLS handles public read (no extra backend needed)
   - Planned after domain is confirmed live

2. **Stripe payment link with prefilled amount** — QR code on invoice should open a Stripe payment link with the invoice total pre-filled via URL param (better than a static link)

3. **Tester access portal** — lightweight invite codes that unlock the app or Pro tier for invited testers, without touching the public signup flow

4. **Per-user receipt numbering** — see Known Bugs #1

---

## Test Scenarios Not Yet Completed

- [ ] Full end-to-end: create invoice → email to client (Pro) → client pays via Stripe → webhook fires → tier upgrades correctly
- [ ] Stripe `customer.subscription.deleted` event actually resets tier to `free` in DB
- [ ] remove.bg fallback path (API key missing or call fails) — confirm original logo still uploads
- [ ] Logo corner persistence: all 4 corners render correctly in PDF and survive a full reload
- [ ] Mobile: swipe-to-dismiss on invoice cards
- [ ] Password recovery flow: email link → app → PasswordUpdateModal → redirect after save
- [ ] Free tier watermark visible in PDF, absent for Pro
- [ ] Expired JWT on page reload: TOKEN_REFRESHED fires correctly, no flash of unauthenticated state
- [ ] Receipt number uniqueness collision under concurrent creates (global constraint still in place)
