# InvoicePrepper -- System Overview

---

## Table of Contents

1. What This Product Is
2. Tech Stack
3. How the Codebase Is Organized
4. Frontend Features
5. API Layer
6. Backend Edge Functions
7. Database Tables
8. Auth Flow
9. Tier Model and Billing
10. Key User Flows
11. Environment Variables
12. Deployment
13. SEO and Public Pages
14. Coding Patterns
15. What Can Break and Where to Look

---

## 1. What This Product Is

InvoicePrepper is a SaaS invoicing tool for freelancers, contractors, and independent workers. Users create invoices, download or email them as PDFs, and track payment status. Voice AI and Text AI allow users to describe a job out loud or in text and have the invoice filled in automatically.

Live at: invoiceprepper.com
Pricing: Free, Pro at CAD $9/month, Voice AI at CAD $12/month

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 + Vite 7 | UI, state, routing |
| Hosting | Cloudflare Pages | Serves the React app and static HTML pages |
| Backend | Supabase Edge Functions (Deno) | Server-side logic, auth, AI calls |
| Database | PostgreSQL via Supabase | Stores invoices, profiles, usage |
| Auth | Supabase Auth | Email/password and Google OAuth |
| Payments | Stripe | Subscriptions, webhooks, billing portal |
| Email | Resend | Invoice emails to clients, signup notifications |
| AI Transcription | Groq Whisper | Converts voice audio to text |
| AI Extraction | Groq LLaMA 3.3 70B | Parses text into structured invoice fields |
| PDF | jsPDF 4 + jsPDF-autoTable 5 | Generates invoice PDFs in the browser |
| Storage | Supabase Storage | Logos, avatars, temp audio files |
| Analytics | PostHog | Activation events, funnel tracking, A/B flags |
| Error Tracking | Sentry | Frontend error capture and reporting |
| UI Primitives | Radix UI | Dropdown menus |
| Icons | Lucide React | UI icons |

---

## 3. How the Codebase Is Organized

```
receipt-generator/
  frontend/
    public/
      _headers               - Cloudflare HTTP security headers and CSP
      _redirects             - Cloudflare routing rules
      sitemap.xml            - Google sitemap
      blog/                  - Changelog (static HTML)
      invoice-for-*.html     - SEO landing pages (11 pages)
      free-invoice-generator.html
      how-to-invoice-clients.html
      voice-invoicing.html
      terms.html
      privacy.html
    src/
      App.jsx                - Main shell: all state, effects, modal wiring
      App.css                - Global styles, CSS variables, dark mode
      features/
        auth/                - AuthModal, AuthContext, WelcomeModal, ConsentModal
        invoices/            - ReceiptForm, InvoiceGrid, InvoiceDetail, ReceiptPDF, useInvoices, trash/
        billing/             - BillingModal, PlansModal, UpgradeConfirmModal, UpgradeThanksModal
        profile/             - ProfileModal, HelpModal, LegalModal, PasswordUpdateModal
      layout/                - AppTopbar, AppSidebar, LandingPage, BorderGlow, ThemePicker, Threads
      api/                   - Thin fetch wrappers: receipts, profile, billing, aiParse, uploadLogo
      lib/                   - supabase client, themes, constants
      services/              - csvExport
      __tests__/             - 391 tests: logic, components, security, E2E
  supabase/
    functions/               - One folder per edge function
      _shared/cors.ts        - Shared CORS headers
    migrations/              - SQL migration files
  docs/
    system-overview.md       - This document
    edge-case-test-workflow.md
```

---

## 4. Frontend Features

### App.jsx
Main shell. All UI state, effects, and modal wiring live here. Organized into labeled sections: imports, state, effects, handlers, derived values, early returns, render, modals.

Layout: topbar / sidebar / invoice grid / detail panel side by side on desktop. Full-screen detail panel on mobile tap.

### LandingPage.jsx
Pre-auth marketing page. Shows when user has not entered the app. Contains hero, How It Works, pricing cards, FAQ. All CTAs call props passed from App.jsx.

### AuthModal.jsx
Sign in, sign up, and forgot password in one modal. Calls Supabase auth directly. Google OAuth supported via supabase.auth.signInWithOAuth.

### ConsentModal.jsx
Fires once for any user whose profile has no terms_agreed_at. Covers Google OAuth users who skip the signup form. Blocks the app until accepted. Saves terms_agreed_at and email_marketing_ok to the profile.

### ReceiptForm.jsx
Invoice creation and editing form. Handles line items, logo upload, AI parse (voice and text), currency, tax, due date, notes. Voice recording uses MediaRecorder API.

### ReceiptPDF.js
Not a React component. Exports downloadReceiptPDF, shareReceiptPDF, getPDFBlobUrl, buildPDFBase64. All PDF generation is client-side using jsPDF. Currency symbol reads from receipt.currency.

### ProfileModal.jsx
Business info, logo, avatar, tax settings, currency, preferences, and security (password change).

### BillingModal.jsx
Shows current plan, renewal date, and links to Stripe billing portal. Shows cancellation notice when cancel_at_period_end is true.

### PlansModal.jsx
Pro and Voice AI upgrade cards with pricing. Triggers UpgradeConfirmModal before going to Stripe.

### UpgradeConfirmModal.jsx
Pre-Stripe consent step. User must check a recurring billing agreement checkbox before checkout opens.

### WelcomeModal.jsx
Shown once to new users. Triggered when account created_at is less than 2 minutes old.

### HelpModal.jsx
Help content with minimize/restore. Links to Terms and Privacy. Feedback and bug report links on mobile.

### TrashModal.jsx
Shows soft-deleted invoices. Users can restore within 30 days or permanently delete.

### BorderGlow.jsx
Visual effect component. Tracks mouse position and animates a gradient around the card border. Used on pricing cards and hero invoice preview.

---

## 5. API Layer

Located in `src/api/`. Each file adds the Supabase JWT to the Authorization header automatically.

### receipts.js
fetchReceipts, fetchReceiptById, createReceipt, updateReceipt, deleteReceipt

### profile.js
fetchProfile, saveProfile

### billing.js
startCheckout, cancelSubscription, openBillingPortal, fetchSubscriptionStatus

### aiParse.js
parseText, parseAudio, mapParsedToForm

### uploadLogo.js
Uploads logo to Supabase Storage. Optionally calls remove.bg API if VITE_REMOVEBG_API_KEY is set.

---

## 6. Backend Edge Functions

Located in `supabase/functions/`. All run on Deno. All share the CORS handler from `_shared/cors.ts`. All verify the JWT before executing.

### receipts/index.ts
Full invoice CRUD. GET (all or by ID), POST (creates receipt and line items in a transaction), PATCH, DELETE. Invoice numbers are per-user sequential starting at INV-000100, incremented atomically in a Postgres function.

### profile/index.ts
GET returns profile row, auto-creates on first login. PUT upserts all profile fields including terms_agreed_at and email_marketing_ok.

### send-invoice/index.ts
Sends HTML invoice email via Resend. Pro tier only, enforced server-side. Includes PDF attachment and Pay Now button if payment_url is set.

### voice-parse/index.ts
1. Receives signed URL to audio file in Supabase Storage
2. Downloads audio server-side
3. Transcribes via Groq Whisper
4. Injects user's recent invoice history as RAG context
5. Sends to Groq LLaMA for structured JSON extraction
6. Deletes audio from storage
7. Returns customer_name, line_items, notes

### text-parse/index.ts
Same as voice-parse but skips transcription. Takes plain text directly to LLaMA. Rate limited to 15 parses per month on Pro, unlimited on Voice AI. Counter stored in profiles.month_parse_count, resets monthly.

### stripe-checkout/index.ts
Creates Stripe Checkout session. Returns checkout URL.

### stripe-webhook/index.ts
Handles checkout.session.completed (upgrades tier) and customer.subscription.deleted (downgrades to free).

### cancel-subscription/index.ts
Sets cancel_at_period_end on the Stripe subscription. Access continues until period ends.

### billing-portal/index.ts
Creates Stripe Customer Portal session. Returns portal URL.

### notify-signup/index.ts
Sends admin notification email via Resend when a new user registers. Called via Supabase Auth webhook. Authenticated with NOTIFY_SIGNUP_SECRET.

### delete-account/index.ts
Removes all user data: receipts, line items, profile, storage files, Stripe subscription, and Supabase auth account.

### subscription-status/index.ts
Returns current tier and subscription state for the logged-in user.

---

## 7. Database Tables

### receipts

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| receipt_number | text | INV-000100+, per-user sequential |
| vendor_name | text | |
| customer_name | text | |
| status | text | draft, sent, paid, voided |
| date | date | |
| due_date | date | Optional |
| subtotal | numeric | |
| tax | numeric | |
| total | numeric | |
| notes | text | |
| currency | text | CAD, USD, etc. |
| logo_url | text | |
| logo_corner | text | top-left, top-right, bottom-left, bottom-right |
| deleted_at | timestamptz | Soft delete, null means active |
| created_at | timestamptz | |

### line_items

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| receipt_id | uuid | Foreign key to receipts |
| description | text | |
| quantity | numeric | |
| unit_price | numeric | |
| total | numeric | |

### profiles

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | Primary key |
| tier | text | free, pro, voice |
| business_name | text | |
| address | text | |
| email | text | Business contact email |
| phone | text | |
| bio | text | |
| website | text | |
| payment_url | text | User's payment link for QR code |
| logo_url | text | |
| avatar_url | text | |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| currency | text | |
| tax_rate | numeric | |
| tax_label | text | |
| month_parse_count | integer | Text AI usage counter, resets monthly |
| terms_agreed_at | timestamptz | Consent timestamp, required for contact |
| email_marketing_ok | boolean | Email opt-in preference |

---

## 8. Auth Flow

1. App loads, calls supabase.auth.getSession() to check for existing session
2. If session exists, load profile and receipts, show app
3. If no session, show LandingPage
4. LandingPage has Sign In and Sign Up buttons that open AuthModal
5. Email signup: create account, confirm email, sign in
6. Google OAuth: click Continue with Google, redirect to Google, redirect back to app with session
7. On SIGNED_IN event, posthog.identify fires with user ID and email
8. ConsentModal checks profile.terms_agreed_at -- if null, blocks app until accepted
9. Password reset: user requests reset, Supabase emails link, link returns to app, PasswordUpdateModal opens
10. Sign out: supabase.auth.signOut(), state clears, LandingPage shows

JWT from session.access_token is passed to every API call. Edge functions verify server-side before executing.

---

## 9. Tier Model and Billing

| Feature | Free | Pro | Voice AI |
|---|---|---|---|
| Create invoices | Unlimited | Unlimited | Unlimited |
| PDF download | Yes | Yes | Yes |
| Email to client | No | Yes | Yes |
| Share PDF from mobile | No | Yes | Yes |
| Send payment reminders | No | Yes | Yes |
| Logo on PDF | No | Yes | Yes |
| Dashboard themes | No | Yes | Yes |
| CSV export | No | Yes | Yes |
| Text AI parsing | No | 15/month | Unlimited |
| Voice AI parsing | No | No | Unlimited |
| Price | Free | CAD $9/mo | CAD $12/mo |

Tier enforcement: stored in profiles.tier, verified server-side in every gated edge function. Stripe webhook updates it on subscription change. Frontend reads it for UI gating only.

Upgrade flow: PlansModal > UpgradeConfirmModal (consent checkbox) > Stripe Checkout > webhook updates tier > frontend polls for change > UpgradeThanksModal shown once.

---

## 10. Key User Flows

### Create an Invoice
New Invoice button > ReceiptForm opens > fill fields > submit > createReceipt POST > appears in grid as Draft.

### Send Invoice to Client (Pro)
Open invoice > Send by Email > builds PDF as base64 > POST to send-invoice edge function > Resend delivers HTML email with PDF > status updates to Sent.

### Voice AI Invoice
Open New Invoice > tap microphone (Voice AI only) > speak description > stop > audio uploaded to Storage > signed URL sent to voice-parse > Groq transcribes > LLaMA extracts fields > audio deleted > form populates.

### Mark Invoice Paid
Open invoice > click Paid button > PATCH status to paid > revenue counter updates > invoice moves to Paid filter.

### Upgrade to Pro
Click upgrade > PlansModal > select plan > UpgradeConfirmModal > agree to billing terms > Stripe Checkout > return to app > post-checkout poll confirms tier change > UpgradeThanksModal.

---

## 11. Environment Variables

### Frontend (.env in frontend/)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_REMOVEBG_API_KEY      - Optional, activates background removal on logo upload
```

### Supabase Edge Function Secrets
```
RESEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_PRO_PRICE_ID
STRIPE_VOICE_PRICE_ID
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
NOTIFY_SIGNUP_SECRET       - Plain string used to authenticate the notify-signup webhook
NOTIFY_EMAIL               - Admin email address for signup notifications
```

---

## 12. Deployment

**Frontend:** Cloudflare Pages, connected to GitHub main branch. Auto-deploys on push. Build command: `npm run build`. Output: `dist/`.

**CI:** GitHub Actions runs all 391 tests and a production build check on every push. Deploy is separate from CI -- Cloudflare picks up the push independently.

**Backend:** `npx supabase functions deploy [function-name]`. Deno runtime, no npm.

**Database migrations:** `npx supabase db push` applies any new .sql files in `supabase/migrations/`.

**Static pages:** Everything in `public/` is served directly at the root domain by Cloudflare. No React routing involved. Folder structure maps directly to URL paths -- do not restructure without updating canonical URLs.

---

## 13. SEO and Public Pages

All static HTML in `frontend/public/`. Served directly by Cloudflare Pages.

| URL | Target |
|---|---|
| /invoice-for-cleaners | cleaning businesses |
| /invoice-for-electricians | electricians |
| /invoice-for-landscapers | landscapers |
| /invoice-for-painters | painters |
| /invoice-for-plumbers | plumbers |
| /invoice-for-tutors | tutors |
| /invoice-for-handymen | handymen |
| /invoice-for-photographers | photographers |
| /invoice-for-personal-trainers | personal trainers |
| /invoice-for-contractors | contractors |
| /invoice-for-freelancers | freelancers |
| /free-invoice-generator | free tool |
| /how-to-invoice-clients | guide |
| /voice-invoicing | voice feature |
| /blog | changelog |

Sitemap at `/sitemap.xml`. Submitted to Google Search Console.

---

## 14. Coding Patterns

**Lazy useState initializers:** State that reads from localStorage uses a function initializer so it runs once on mount, not every render.

**TDZ rule:** Every useState and useRef in App.jsx must be declared before any useEffect that references it. Production builds will white-screen silently if this order is wrong.

**Controlled inputs with string state:** Numeric fields store strings in state. Conversion to numbers happens only at submit time. Avoids issues with partial input like "1." mid-typing.

**Optimistic UI:** Status changes update React state immediately before server confirmation. Reverted on failure.

**CSS custom properties for theming:** All colors are CSS variables. applyPalette writes directly to document.documentElement.style. No React re-renders needed for theme changes.

**Upsert pattern:** Profile PUT always uses INSERT ... ON CONFLICT DO UPDATE. No need to check if a row exists first.

**Transaction wrapping:** Receipt creation wraps receipts and line_items inserts in a Postgres transaction. Nothing is left half-saved.

**Race condition retry:** Invoice number generation retries up to 10 times on unique constraint violation. Prevents duplicate numbers under concurrent writes.

**iOS scroll lock:** Standard overflow:hidden does not prevent scroll on iOS Safari. Fix: save scrollY, set body to position:fixed with top:-scrollY, restore on modal close.

---

## 15. What Can Break and Where to Look

**White screen on load**
State declared after a useEffect that references it. Move all useState to the STATE section at the top of App.jsx.

**Invoices not loading**
Supabase dashboard > Edge Functions > receipts > Logs. Look for 401 (bad token) or 500 (DB error).

**Voice AI not working**
voice-parse edge function logs. Common causes: GROQ_API_KEY expired, Storage permissions, daily limit hit.

**Email not sending**
send-invoice edge function logs. Common causes: RESEND_API_KEY expired, user is not Pro server-side.

**Stripe checkout not opening**
stripe-checkout logs. Common causes: wrong key environment (test vs live), price ID mismatch.

**Tier not updating after payment**
stripe-webhook logs. Common causes: STRIPE_WEBHOOK_SECRET wrong, webhook not registered in Stripe dashboard.

**Signup notification not arriving**
notify-signup logs. Check NOTIFY_SIGNUP_SECRET matches what is set in the Supabase Auth webhook Authorization header.

**CSP blocking a new script**
Edit `frontend/public/_headers`. Add the domain to the script-src directive.

**Consent modal showing for existing users**
profiles.terms_agreed_at is null for that user. Run SQL to backfill if needed: `UPDATE profiles SET terms_agreed_at = now() WHERE terms_agreed_at IS NULL AND tier != 'free'` -- or just let them go through it once.

---

*Last updated April 2026.*
