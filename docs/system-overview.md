# InvoicePrepper — System Overview
### Onboarding Documentation for the Solo Developer

---

## Table of Contents

1. What This Product Is
2. Tech Stack
3. How the Codebase Is Organized
4. Frontend Components
5. API Layer
6. Backend Edge Functions
7. Database Tables
8. Auth Flow
9. Tier Model and Billing
10. Key User Flows
11. Environment Variables
12. Deployment
13. SEO and Public Pages
14. Coding Patterns and Techniques
15. Complex Implementations Explained
16. What Can Break and Where to Look

---

## 1. What This Product Is

InvoicePrepper is a SaaS invoicing tool for freelancers, contractors, and independent workers. Users create invoices, download or email them as PDFs, and track payment status. The differentiating feature is Voice AI — users can speak an invoice description out loud and the AI parses it into a filled form automatically.

**Live at:** invoiceprepper.com
**Pricing:** Free (limited), Pro at CAD $9/month, Voice AI at CAD $12/month

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 + Vite 7 | UI, state, routing |
| Hosting | Cloudflare Pages | Serves the React app and static HTML pages |
| Backend | Supabase Edge Functions (Deno) | Server-side logic, auth, AI calls |
| Database | PostgreSQL via Supabase | Stores invoices, profiles, usage |
| Auth | Supabase Auth | Email/password login, sessions, password reset |
| Payments | Stripe | Subscriptions, webhooks, billing portal |
| Email | Resend | Invoice emails to clients, signup notifications |
| AI Transcription | Groq Whisper | Converts voice audio to text |
| AI Extraction | Groq LLaMA 3.3 70B | Parses text into structured invoice fields |
| PDF | jsPDF 4 + jsPDF-autoTable 5 | Generates invoice PDFs in the browser |
| QR Codes | qrcode.react | Renders QR code linking to payment URL |
| UI Primitives | Radix UI | Dropdown menus |
| Icons | Lucide React | All UI icons |
| Storage | Supabase Storage | Logos, avatars, temp audio files |

---

## 3. How the Codebase Is Organized

```
receipt-generator/
  frontend/
    index.html               - App entry point, meta tags, favicon refs
    public/
      _headers               - Cloudflare HTTP security headers and CSP
      _redirects             - Cloudflare routing rules
      sitemap.xml            - Google sitemap listing all pages
      site.webmanifest       - PWA manifest for mobile home screen
      voice-invoicing.html   - SEO landing page: voice invoice feature
      free-invoice-generator.html  - SEO landing page: free tool
      invoice-for-contractors.html - SEO landing page: trades audience
      invoice-for-freelancers.html - SEO landing page: freelancer audience
      how-to-invoice-clients.html  - SEO guide article
    src/
      App.jsx                - Main shell: all state, effects, layout
      App.css                - Global styles, CSS variables, dark mode
      api/                   - Thin fetch wrappers, one file per resource
      components/            - All React UI components
      lib/
        supabase.js          - Supabase client initialization
        themes.js            - Palette system (6 color themes)
  supabase/
    functions/               - One folder per edge function
      _shared/cors.ts        - Shared CORS headers used by all functions
  docs/
    api-queries.txt          - Plain English explanation of every API call
    system-overview.md       - This document
```

---

## 4. Frontend Components

### App.jsx
The main shell of the entire app. Every piece of state lives here. It is organized into labeled sections you can jump to with Ctrl+F:

- **IMPORTS** - all external packages and components
- **CONSTANTS** - STATUS_CONFIG (four invoice states), NAV (sidebar filters), formatting helpers
- **STATE** - every useState and useRef in one block. Do not move state declarations below the effects that reference them or you will get a production crash.
- **EFFECTS** - dark mode, palette, auth session, data loading, post-checkout poll
- **HANDLERS** - save invoice, delete, status change, send email, open/close modals
- **DERIVED VALUES** - counts per status, revenue total, outstanding balance, filtered list
- **EARLY RETURNS** - loading spinner, landing page gate, auth gate
- **RENDER** - topbar, sidebar, invoice grid, detail panel
- **MODALS** - all modal components rendered at the bottom

**Layout:**
- Desktop: topbar / sidebar / invoice grid / detail panel (side by side)
- Mobile: topbar / stats strip / invoice grid / full screen detail on tap

---

### LandingPage.jsx + LandingPage.css
The pre-auth marketing page shown to users who have not yet entered the app. Uses localStorage key `app_entered` to decide whether to show. Once a user clicks in or signs up, this never shows again on that device.

Contains: hero section, How It Works, pricing cards with BorderGlow, FAQ. All CTAs call `onEnter` or `onSignIn` passed down from App.jsx. The palette is always default here regardless of the user's theme setting.

---

### AuthModal.jsx
Handles sign in and sign up in a single modal. Toggles between two views. Calls Supabase auth directly. Password reset triggers `supabase.auth.resetPasswordForEmail()` which sends an email with a link back to the app.

---

### ReceiptForm.jsx
The invoice creation and editing form. The most complex component in the app.

Key responsibilities:
- Renders all invoice fields: vendor, customer, line items, date, due date, notes, currency
- Logo panel: shows current logo, allows upload, cycles corner position on click
- AI parse button: opens voice recording or text input, sends to backend, maps result to form fields
- Voice recording: uses MediaRecorder API, uploads audio blob to Supabase Storage, sends signed URL to edge function
- Chime system: Web Audio API plays 4-note ascending start, 3-note descending stop, 1 long ding on completion
- Voice readback: speaks parsed invoice back using SpeechSynthesis (can be toggled off in Profile)
- On submit: calls createReceipt or updateReceipt depending on whether editingReceipt is set

---

### ReceiptPDF.js
Not a React component. A module that exports PDF generation functions using jsPDF.

Functions:
- `downloadReceiptPDF(receipt, profile)` - generates PDF and triggers browser download
- `shareReceiptPDF(receipt, profile)` - uses Web Share API for mobile sharing
- `getPDFBlobUrl(receipt, profile)` - returns a blob URL for in-browser preview
- `buildPDFBase64(receipt, profile)` - returns base64 string for email attachment

PDF contents: logo (if profile has one, placed in chosen corner), vendor info, client info, invoice number, date, due date, line items table, subtotal, tax, total, notes, payment QR code (if payment_url set and status is not paid).

Watermark: "INVOICEPREPPER.COM" appears diagonally on every PDF for free tier users. Pro removes it.

---

### ProfileModal.jsx
User settings panel. Two major sections:

**Business Info** - business name, address, email, phone, bio, website, payment URL, tax rate, currency, default due days
**Logo** - separate from avatar. Uploaded to Supabase Storage at `{email}/logo`. Appears on PDFs.
**Avatar** - topbar profile image. Uploaded to `{email}/avatar`. Does not appear on PDFs.
**Preferences** - voice readback toggle. Stored in localStorage as `voice_readback` (1 = on, 0 = off).
**Security** - change password link.

---

### PlansModal.jsx
Shows the Pro and Voice AI upgrade cards with BorderGlow effect. Calls `onSelectPro` or `onSelectVoice` which triggers UpgradeConfirmModal before going to Stripe.

---

### UpgradeConfirmModal.jsx
Pre-Stripe consent step. User must check an agreement checkbox before the Stripe checkout session opens. Prevents accidental subscription starts.

---

### BillingModal.jsx
Shows current plan, links to Stripe billing portal for managing subscription, and cancel subscription option.

---

### WelcomeModal.jsx
One-time modal shown to new users. Triggered when account `created_at` is less than 2 minutes ago. Explains the first steps. Dismissed permanently after closing.

---

### UpgradeThanksModal.jsx
One-time modal shown after a successful Stripe checkout. Triggered by the `upgrade_thanks` localStorage key set after the post-checkout poll confirms tier change.

---

### HelpModal.jsx
Static help content. Keyboard shortcuts, feature explanations, support email.

---

### LegalModal.jsx
Privacy policy and terms of service. Displayed in-app rather than on a separate page.

---

### PasswordUpdateModal.jsx
Shown when a user arrives via a password reset email link. Supabase sets the session via the URL hash. This modal captures the new password and calls `supabase.auth.updateUser()`.

---

### BorderGlow.jsx
A visual effect component. Tracks mouse position and renders a gradient glow that follows the cursor around the border of the card. Used on pricing cards and the hero invoice preview on the landing page.

Props: `glowColor`, `glowIntensity`, `glowRadius`, `colors` (array of border colors that cycle).

---

### ThemePicker.jsx
Renders the 6 color palette options. Calls `applyPalette(key, mode)` from themes.js when a palette is selected. Only visible when the app is in the entered/authenticated state.

---

## 5. API Layer

Located in `frontend/src/api/`. Each file is a set of thin fetch wrappers that add the Supabase JWT token to the Authorization header automatically.

### receipts.js
- `fetchReceipts(token)` - GET all invoices for the logged-in user
- `fetchReceiptById(id, token)` - GET one invoice with line items
- `createReceipt(data, token)` - POST new invoice
- `updateReceipt(id, data, token)` - PATCH update fields
- `deleteReceipt(id, token)` - DELETE permanently

### profile.js
- `fetchProfile(token)` - GET profile row or empty object if none exists
- `saveProfile(data, token)` - PUT upsert profile

### billing.js
- `startCheckout(tier, token)` - POST to stripe-checkout edge function, returns Stripe checkout URL
- `cancelSubscription(token)` - POST to cancel-subscription edge function
- `openBillingPortal(token)` - POST to billing-portal edge function, returns Stripe portal URL

### aiParse.js
- `parseText(description, token)` - POST text to text-parse edge function
- `parseAudio(audioBlob, token)` - uploads audio to Supabase Storage, POST signed URL to voice-parse
- `mapParsedToForm(parsed)` - converts AI response object into ReceiptForm field shape

### uploadLogo.js
- Uploads logo image to Supabase Storage
- Optionally calls remove.bg API to remove background if `VITE_REMOVEBG_API_KEY` is set
- Returns public URL of uploaded logo

### account.js
- `deleteAccount(token)` - POST to delete-account edge function. Removes all user data.

---

## 6. Backend Edge Functions

Located in `supabase/functions/`. Each runs on Deno in Supabase's edge runtime. All share the CORS handler from `_shared/cors.ts`.

Every function authenticates the request by verifying the JWT token from the Authorization header before doing anything else.

### receipts/index.ts
Handles all invoice CRUD.
- GET with no ID: returns all receipts for the user, newest first
- GET with ID: returns one receipt with its line items
- POST: creates receipt and line items in a transaction. Generates sequential receipt number globally (REC-000001, REC-000002, etc.) with retry logic for race conditions.
- PATCH: updates specific fields on a receipt
- DELETE: permanently removes a receipt

### profile/index.ts
- GET: returns profile row, auto-creates empty row on first login
- PUT: upserts (insert or update) profile data

### send-invoice/index.ts
Sends an HTML invoice email to the client via Resend. Pro tier only — enforced server-side by checking the user's tier in the profiles table. Builds the full HTML email on the server. Includes a Pay Now button if `payment_url` is set in the profile. Can include a PDF attachment if base64 PDF data is sent in the request body.

### voice-parse/index.ts
Handles the voice AI feature.
1. Receives a signed URL pointing to the audio file in Supabase Storage
2. Downloads the audio file server-side
3. Sends to Groq Whisper for transcription
4. Sends transcript to Groq LLaMA 3.3 70B with RAG context (past invoices for this user) injected into the prompt
5. Returns structured JSON: customer_name, line_items array, notes
6. Checks and increments the daily usage counter in `voice_usage` table (limit: 20/day)
7. Audio file is deleted from storage after processing

### text-parse/index.ts
Same as voice-parse but skips the audio transcription step. Takes a plain text description and sends directly to LLaMA for extraction. Also rate-limited via `voice_usage`.

### stripe-checkout/index.ts
Creates a Stripe Checkout session for Pro or Voice AI tier. Stores or retrieves the Stripe customer ID from the user's profile. Returns the checkout URL that the frontend redirects to.

### stripe-webhook/index.ts
Listens for Stripe events. Key events handled:
- `checkout.session.completed` - upgrades user tier in profiles table
- `customer.subscription.deleted` - downgrades user tier back to free

### cancel-subscription/index.ts
Cancels the user's active Stripe subscription. Sets cancel_at_period_end so they keep access until the billing period ends.

### billing-portal/index.ts
Creates a Stripe Customer Portal session. Returns URL that the frontend redirects to for managing payment method, viewing invoices, etc.

### notify-signup/index.ts
Sends a notification email to the admin (you) when a new user signs up. Called via Supabase Auth webhook.

### delete-account/index.ts
Removes all user data: receipts, line items, profile, storage files, Stripe subscription, and Supabase auth account.

### subscription-status/index.ts
Returns the current tier and subscription state for the logged-in user.

---

## 7. Database Tables

### receipts
Stores every invoice.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| receipt_number | text | REC-000001, globally unique |
| vendor_name | text | Business name from profile |
| customer_name | text | Client name |
| status | text | draft, sent, paid, voided |
| date | date | Invoice date |
| subtotal | numeric | Before tax |
| tax | numeric | Tax amount |
| total | numeric | Final amount |
| notes | text | Optional footer notes |
| currency | text | CAD, USD, etc. |
| logo_url | text | URL from Supabase Storage |
| logo_corner | text | top-left, top-right, bottom-left, bottom-right |
| created_at | timestamptz | Auto set |

### line_items
Each row is one line on an invoice.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| receipt_id | uuid | Foreign key to receipts |
| description | text | What was done |
| quantity | numeric | Hours, units, etc. |
| unit_price | numeric | Price per unit |
| total | numeric | quantity x unit_price |

### profiles
One row per user. Auto-created on first login.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | Primary key, foreign key to auth.users |
| tier | text | free, pro, voice |
| business_name | text | |
| address | text | |
| email | text | Business contact email |
| phone | text | |
| bio | text | Optional tagline |
| website | text | |
| payment_url | text | Stripe/PayPal link for QR code |
| logo_url | text | PDF logo |
| avatar_url | text | Topbar avatar |
| stripe_customer_id | text | Stripe customer reference |
| stripe_subscription_id | text | Active subscription reference |
| currency | text | Default currency |

### voice_usage
Rate limiting table for AI features.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| date | date | The calendar day |

One row per parse. Count rows for `user_id` + today's `date` to get daily usage. Limit is 20.

---

## 8. Auth Flow

1. App loads, calls `supabase.auth.getSession()` to check for existing session
2. If session exists, load profile and receipts, show app
3. If no session, show LandingPage
4. LandingPage has Sign In and Sign Up buttons that open AuthModal
5. On successful auth, `onAuthStateChange` fires, session is stored, app loads
6. Password reset: user requests reset, Supabase emails a link, link returns to app with hash, `onAuthStateChange` detects `PASSWORD_RECOVERY` event, PasswordUpdateModal opens
7. Sign out: calls `supabase.auth.signOut()`, state clears, LandingPage shows

**Important:** The JWT token from `session.access_token` is passed to every API call. Edge functions verify this token server-side before doing anything. Never send requests without it.

---

## 9. Tier Model and Billing

### Tiers

| Feature | Free | Pro | Voice AI |
|---|---|---|---|
| Create invoices | Unlimited | Unlimited | Unlimited |
| PDF download | Yes (watermark) | Yes (no watermark) | Yes (no watermark) |
| Email to client | No | Yes | Yes |
| Logo on PDF | No | Yes | Yes |
| Dashboard themes | No | Yes | Yes |
| Voice AI parsing | No | No | Yes |
| Text AI parsing | No | No | Yes |
| Price | Free | CAD $9/mo | CAD $12/mo |

### How Tier Enforcement Works
- Tier is stored in `profiles.tier` column
- Edge functions read this column server-side before executing Pro/Voice gated actions
- Frontend reads `profile.tier` to show/hide UI elements
- Stripe webhook updates the tier column when a subscription starts or ends
- Tier changes are not trusted from the frontend alone

### Upgrade Flow
1. User clicks upgrade
2. PlansModal shows plan options
3. UpgradeConfirmModal shows terms, user agrees
4. `startCheckout(tier, token)` calls stripe-checkout edge function
5. User is redirected to Stripe hosted checkout page
6. On success, Stripe sends `checkout.session.completed` webhook to stripe-webhook edge function
7. Edge function updates `profiles.tier`
8. Frontend polls for tier change after returning from Stripe
9. UpgradeThanksModal shows once

---

## 10. Key User Flows

### Create an Invoice
1. Click New Invoice button (topbar or empty state)
2. ReceiptForm opens
3. Fill in customer name, line items, date, notes
4. Submit
5. `createReceipt()` POST to receipts edge function
6. New invoice appears in the grid as Draft
7. Detail panel opens showing the invoice

### Send Invoice to Client (Pro)
1. Open an invoice in the detail panel
2. Click Send by Email
3. App checks profile.tier is pro or voice
4. Calls `buildPDFBase64()` to generate PDF
5. POST to send-invoice edge function with PDF attachment
6. Resend delivers HTML email with PDF to client
7. Invoice status updates to Sent

### Voice AI Invoice
1. Open New Invoice form
2. Click the microphone button (Voice AI tier only)
3. ReceiptForm starts recording via MediaRecorder
4. 4-note ascending chime plays
5. User speaks: "Invoice John Smith, 4 hours at $95, and $140 for materials"
6. User clicks stop
7. 3-note descending chime plays
8. Audio blob uploaded to Supabase Storage temp bucket
9. Signed URL sent to voice-parse edge function
10. Groq Whisper transcribes audio
11. LLaMA parses transcript into structured fields
12. Audio deleted from storage
13. Single long ding plays
14. Form fields populate automatically
15. Voice readback speaks the invoice summary (if enabled in preferences)

### Mark Invoice Paid
1. Open invoice in detail panel
2. Click the Paid status button
3. `updateReceipt()` PATCH with `{ status: "paid" }`
4. Revenue counter in sidebar updates
5. Invoice moves to Paid filter tab

---

## 11. Environment Variables

### Frontend (.env in frontend/)
```
VITE_SUPABASE_URL          - Your Supabase project URL
VITE_SUPABASE_ANON_KEY     - Supabase anonymous key (safe to expose)
VITE_REMOVEBG_API_KEY      - Optional. Activates background removal on logo upload.
```

### Supabase Edge Function Secrets
Set in Supabase Dashboard under Project Settings > Edge Functions > Secrets.
```
RESEND_API_KEY             - For sending invoice emails and signup notifications
STRIPE_SECRET_KEY          - Stripe API key for checkout and webhooks
STRIPE_PRO_PRICE_ID        - Stripe price ID for the Pro plan
STRIPE_VOICE_PRICE_ID      - Stripe price ID for the Voice AI plan
STRIPE_WEBHOOK_SECRET      - For verifying Stripe webhook signatures
SUPABASE_SERVICE_ROLE_KEY  - For edge functions that need admin DB access
GROQ_API_KEY               - For Whisper transcription and LLaMA extraction
```

---

## 12. Deployment

**Frontend:** Cloudflare Pages
- Connected to the GitHub repo main branch
- Auto-deploys on every push to main
- Build command: `npm run build` (runs Vite)
- Build output directory: `dist`
- Environment variables set in Cloudflare Pages dashboard

**Backend:** Supabase Edge Functions
- Deployed with `supabase functions deploy [function-name]`
- Deno runtime, no npm, no node_modules
- Secrets managed in Supabase dashboard

**Static pages in `public/`:**
- Cloudflare Pages serves everything in `public/` directly at the root domain
- `public/voice-invoicing.html` is served at `invoiceprepper.com/voice-invoicing`
- No React routing involved, pure HTML

**Security headers:**
Defined in `frontend/public/_headers`. Applied by Cloudflare to every response.
Includes: Content Security Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HTTPS enforcement.

---

## 13. SEO and Public Pages

Five static HTML pages live in `frontend/public/`. They are served directly by Cloudflare Pages with no React involved.

| URL | File | Target Keyword |
|---|---|---|
| /voice-invoicing | voice-invoicing.html | voice invoice generator |
| /free-invoice-generator | free-invoice-generator.html | free invoice generator |
| /invoice-for-contractors | invoice-for-contractors.html | invoice app for contractors |
| /invoice-for-freelancers | invoice-for-freelancers.html | invoice generator for freelancers |
| /how-to-invoice-clients | how-to-invoice-clients.html | how to invoice clients |

All pages:
- Have canonical URLs, Open Graph tags, and Schema.org structured data
- Cross-link to each other in footers so Google crawls the full network
- Use the same visual style as the main app (CSS variables, same palette)
- Have CTAs pointing back to invoiceprepper.com

Sitemap is at `public/sitemap.xml` and has been submitted to Google Search Console.

---

## 14. What Can Break and Where to Look

### White screen on load
**Cause:** State declared after a useEffect that references it. React hits a TDZ crash in production builds.
**Fix:** Make sure all useState declarations are in the STATE section at the top of App.jsx, before any useEffect.

### Invoices not loading after login
**Check:** Supabase dashboard > Edge Functions > receipts > Logs. Look for 401 (bad token) or 500 (DB error).

### Voice AI not working
**Check:** voice-parse edge function logs. Common causes: GROQ_API_KEY expired, audio file not uploaded (Storage permissions), daily limit hit.

### Email not sending
**Check:** send-invoice edge function logs. Common causes: RESEND_API_KEY expired, user is not Pro tier server-side.

### Stripe checkout not opening
**Check:** stripe-checkout edge function logs. Common causes: STRIPE_SECRET_KEY wrong environment (test vs live), price ID mismatch.

### Tier not updating after payment
**Check:** stripe-webhook edge function logs. Common causes: STRIPE_WEBHOOK_SECRET wrong, webhook not registered in Stripe dashboard, event type not handled.

### CSP blocking a new script
**File:** `frontend/public/_headers`
**Fix:** Add the domain to the `script-src` directive.

### Logo not showing on PDF
**Check:** profile.logo_url is set and the Supabase Storage bucket has public read access.

### PDF watermark still showing for Pro user
**Check:** `profile.tier` is actually `pro` or `voice` in the database. If Stripe webhook did not fire, tier was not updated.

---

---

## 14. Coding Patterns and Techniques

### Lazy useState Initializers
Throughout the app, `useState` is initialized with a function rather than a value when the initial state comes from localStorage or a computation. This runs the function only once on mount instead of on every render.

```js
// Runs once — reads from localStorage once, not on every render
const [darkMode, setDarkMode] = useState(() => localStorage.getItem("dark_mode") === "1");
```

This pattern is used for: dark mode, palette, entered state, voice readback, currency preference.

### State Declaration Order Matters (TDZ Rule)
In production builds, Vite/Rollup hoists function declarations but NOT const declarations. If a `useEffect` dependency array references a state variable that is declared later in the file, you get a Temporal Dead Zone (TDZ) crash — a white screen with no error message in the console.

**Rule: Every `useState` and `useRef` must be declared in the STATE section at the top of App.jsx, before any `useEffect` that references it.**

This was the cause of the white screen bug that occurred after the App.jsx refactor.

### Controlled Inputs with String-to-Number Conversion
All numeric form fields (quantity, unit_price, tax rate) are stored as strings in React state because HTML inputs always return strings. Conversion to numbers happens only in `handleSubmit` before sending to the server. This avoids problems with partial input like "1." where the user is mid-typing.

```js
// Stored as string
const [items, setItems] = useState([{ quantity: "1", unit_price: "", ... }]);

// Converted at submit time
quantity: parseFloat(item.quantity) || 0
```

### Refs for Non-Rendering State
`useRef` is used for values that need to persist across renders but should NOT trigger a re-render when they change. In this app:

- `mediaRecorderRef` — the active MediaRecorder instance
- `audioChunksRef` — accumulating audio data chunks during recording
- `voiceTimerRef` — the setInterval timer ID for recording countdown
- `voiceMimeRef` — detected audio MIME type
- `touchStartX` — touch position for swipe detection
- `proIntentRef` — stores which tier the user wanted before being interrupted by auth

### Optimistic UI
Status changes (draft/sent/paid/voided) update React state immediately before the server confirms success. If the server call fails, the state is reverted. This makes the UI feel instant even on slow connections.

### useMemo for Derived Values
Filtered receipt lists, status counts, revenue totals, and outstanding balance are all computed with `useMemo`. They only recompute when `receipts` or `filter` changes, not on every render.

### CSS Custom Properties for Theming
All colors are defined as CSS custom properties (variables) on `:root` in App.css. Dark mode overrides them under `[data-theme="dark"]`. The `applyPalette()` function in themes.js writes new values directly to `document.documentElement.style.setProperty()`, overriding the defaults inline. Calling `clearPalette()` removes the inline overrides and the CSS file defaults take back over.

This means themes work with zero React re-renders — the browser repaints automatically when CSS vars change.

### CORS Shared Handler
All Supabase edge functions import `getCorsHeaders()` from `_shared/cors.ts`. This returns the correct CORS headers based on the request's Origin header, checked against an allowlist. Every function handles the OPTIONS preflight request before doing any logic. This prevents cross-origin errors when the frontend calls backend functions.

### Upsert Pattern (Profile)
The profile edge function uses PostgreSQL `INSERT ... ON CONFLICT DO UPDATE` (upsert). This means you call the same PUT endpoint whether creating a profile for the first time or updating an existing one. You never need to check if a row exists first.

### Transaction Wrapping (Receipt Creation)
Creating a receipt involves two table writes: one to `receipts` and one to `line_items`. These are wrapped in a PostgreSQL transaction. If the line items insert fails, the receipt insert is also rolled back. Nothing is left half-saved.

### Race Condition Retry (Receipt Numbers)
Receipt numbers (REC-000001, etc.) are generated by reading the current highest number and incrementing by one. In a serverless environment, two simultaneous requests could read the same max and try to insert the same number. The edge function retries up to 10 times with the next available number if a unique constraint violation occurs.

### Content Security Policy
Defined in `frontend/public/_headers`. Cloudflare applies these headers to every response. The CSP `script-src` directive is an allowlist — only scripts from approved domains can execute. Adding a new third-party script requires adding its domain to this file or the browser will silently block it.

---

## 15. Complex Implementations Explained

### Voice AI Pipeline (the hardest part of the codebase)

This is a multi-step async pipeline across the frontend and two external AI services.

**Step 1: MIME type detection**
Different browsers support different audio formats. The `getMimeType()` function tests `MediaRecorder.isTypeSupported()` against a priority list: webm, mp4, ogg, wav. The first supported type wins and is stored in `voiceMimeRef` so the blob is created with the right type.

**Step 2: MediaRecorder**
The Web MediaRecorder API streams audio from the microphone into chunks. Each `ondataavailable` event appends a chunk to `audioChunksRef`. On stop, all chunks are combined into a single Blob.

```js
recorder.ondataavailable = (e) => {
  if (e.data.size > 0) audioChunksRef.current.push(e.data);
};
recorder.onstop = async () => {
  const blob = new Blob(audioChunksRef.current, { type: voiceMimeRef.current });
  await parseVoice(blob);
};
```

**Step 3: Upload to Supabase Storage**
The audio blob is uploaded to a temp bucket in Supabase Storage. A signed URL is generated with a short expiry. This URL is sent to the edge function instead of the raw audio data — edge functions have request size limits that make direct blob upload unreliable.

**Step 4: Edge function fetches and transcribes**
The `voice-parse` edge function downloads the audio from the signed URL server-side, sends it to Groq Whisper as multipart/form-data, and gets back a text transcript.

**Step 5: RAG context injection**
Before calling LLaMA, the edge function queries the user's recent invoices (client names, service descriptions, typical prices). This history is injected into the LLaMA prompt as context. This is why the AI can recognize "John from last week" or suggest your usual hourly rate.

**Step 6: LLaMA extraction**
The transcript plus context is sent to Groq LLaMA 3.3 70B with a structured prompt that demands a specific JSON shape: `customer_name`, `line_items` array, `notes`. The response is parsed and returned to the frontend.

**Step 7: Cleanup and form fill**
Audio is deleted from Storage. `mapParsedToForm()` converts the AI response into the exact shape ReceiptForm expects. Form fields update. Voice readback speaks a summary.

---

### Web Audio API Chime System

The chime system creates audio programmatically — no audio files loaded, no external dependencies.

Each call to `playChime(type)` creates a fresh `AudioContext`. Inside it, a `note()` helper function:
1. Creates an `OscillatorNode` (generates a sine wave at a given frequency)
2. Creates a `GainNode` (controls volume over time)
3. Connects: Oscillator → Gain → destination (speakers)
4. Uses `linearRampToValueAtTime` to fade in and `exponentialRampToValueAtTime` to fade out

Three sequences:
- **start** (4 ascending notes): C5(523Hz) → D5(587Hz) → E5(659Hz) → G5(784Hz), 160ms apart
- **stop** (3 descending notes): G5(784Hz) → E5(659Hz) → C5(523Hz), 160ms apart
- **done** (1 long ding): A5(880Hz), 650ms duration

All notes are scheduled ahead of time using `ctx.currentTime` offsets. The AudioContext handles timing precisely without JavaScript timers.

---

### Theme and Palette System

The palette system is built for zero-flicker theme switching without React re-renders.

`themes.js` exports a hardcoded `PALETTES` object with 6 named palettes, each with a `light` and `dark` variant. Each variant is a flat object of CSS variable names to hex values.

`applyPalette(key, mode)` validates the key against `PALETTE_KEYS` (a Set for O(1) lookup), then writes each CSS var directly to `document.documentElement.style.setProperty()`. The browser re-paints immediately.

`clearPalette()` calls `removeProperty()` on each managed var, restoring the App.css defaults.

Per-mode persistence: `theme_light_palette` and `theme_dark_palette` are stored separately in localStorage so switching dark/light mode restores the last palette used in each mode independently.

Security: the function only accepts known keys. Raw color values from user input are never written to the DOM.

---

### iOS Safari Scroll Lock

Standard `overflow: hidden` on `body` does not prevent scroll on iOS Safari when a modal is open — the page scrolls behind the modal. The fix used here:

1. Save the current `window.scrollY` position
2. Set `body { position: fixed; top: -scrollY; width: 100%; }`
3. On modal close, remove those styles and restore `window.scrollY`

This is implemented in the modal open/close `useEffect` in App.jsx and handles every modal in the app from one place.

---

### BorderGlow Component

`BorderGlow.jsx` wraps any card in a container that tracks mouse position via `onMouseMove`. It calculates the angle from the card center to the cursor and uses that to animate a gradient that sweeps around the border.

The glow colors cycle through an array of hex values (`colors` prop). The intensity and radius are configurable. On the landing page hero and pricing cards, the colors are silver/gold/blue to match the free/pro/voice tier theme.

This is a purely visual component. It has no effect on functionality and can be removed without breaking anything.

---

*Document generated April 2026. Update this file when new features or functions are added.*
