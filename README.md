# Keep Track — Invoice & Receipt Generator

A lightweight invoicing tool for freelancers and small businesses. Create, send, and track receipts from any device.

## Features

- Create receipts with line items, tax, subtotal, and totals
- Auto-generated receipt numbers (REC-000001 format, globally unique across all users)
- Status workflow: Draft, Sent, Paid, Voided
- Business profile that auto-fills vendor info on new receipts
- QR code on unpaid receipts linked to your payment URL
- Email invoices directly to clients via Resend
- PDF download and native mobile share sheet (Web Share API)
- Dark mode with preference saved to localStorage
- Guest (anonymous) use with a seamless account upgrade path
- Password reset and full account management
- HTTP security headers (XSS, clickjacking, MIME sniffing, HSTS)
- Works on desktop and mobile

## Stack

- **Frontend:** React (Vite), deployed on Vercel
- **API:** Vercel serverless functions (`frontend/api/`)
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth — anonymous sessions + email/password
- **Email:** Resend (`RESEND_API_KEY` required in Vercel env vars)
- **PDF:** jsPDF + jspdf-autotable
- **UI:** Radix UI (dropdown), qrcode.react (QR codes)

## Project Structure

```
frontend/
  api/                  Vercel serverless functions (live API)
    _lib.js             Shared DB pool and Supabase auth helper
    receipts/
      index.js          GET all receipts, POST create receipt
      [id].js           GET, PATCH, DELETE a single receipt
    profile.js          GET and PATCH user profile
    send-invoice.js     POST — sends HTML email via Resend
    billing.js          Stripe billing (reserved, not active in UI)
    billing-webhook.js  Stripe webhook handler (reserved)
  src/
    App.jsx             Main app shell — auth, layout, receipt list, detail panel
    api/                Fetch wrappers used by the frontend
    components/         React components (forms, modals, PDF, landing page)
  vercel.json           Routing rewrites + HTTP security headers

backend/                Local Express server — not used in production.
                        Vercel serverless functions are the live API.
```

## API

See [docs/api-queries.txt](docs/api-queries.txt) for a full breakdown of every endpoint, request inputs, response shapes, auth flow, and the frontend fetch wrappers.

## Environment Variables

Set these in Vercel project settings:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string (use the pooler URL) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `RESEND_API_KEY` | Resend API key for sending invoice emails |

## Known Issues — Help Wanted

### Invoice Numbering (biggest open problem)

The current system generates invoice numbers globally across all users (e.g. REC-000001). This means:

- Two users creating receipts at the same time will get non-sequential numbers (one gets 001, the other gets 002, the first user's next receipt is 003 — their own sequence has a gap)
- All users share one number pool, so a new user's first invoice might be REC-004731
- The number format (REC-000001) is hardcoded and not customisable

**What the right solution looks like:**
- Per-user sequential numbering so each user's invoices are always 001, 002, 003...
- User-defined prefix set in profile settings (e.g. `SMITH`, `ACME`, or `INV`)
- Optional year prefix (e.g. `2026-001`) which resets each year — standard in professional invoicing
- A starting number field in profile so existing businesses can continue from where they left off
- DB constraint changed from `UNIQUE(receipt_number)` to `UNIQUE(user_id, receipt_number)`

If you have a clean implementation of this, please open a PR. The relevant files are:
- `frontend/api/receipts/index.js` — where the number is generated on POST
- `frontend/api/profile.js` — where profile fields are saved
- `frontend/src/components/ProfileModal.jsx` — the profile settings UI
- The `profiles` table in Supabase would need `invoice_prefix` and `invoice_start` columns

## Deployment

The app deploys from the `frontend/` directory. Since the Vercel GitHub integration was disconnected when the repo was renamed, deploy manually:

```bash
cd frontend
vercel --prod
```

To reconnect auto-deploy: Vercel dashboard → project settings → Git → reconnect to `Britten66/receipt-generator`.
