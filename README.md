# Keep Track — Invoice & Receipt Generator

A lightweight invoicing tool for freelancers and small businesses. Create, send, and track receipts from any device.

## Features

- Create receipts with line items, tax, subtotal, and totals
- Sequential receipt numbers (REC-000001, REC-000002...)
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

## Deployment

The app deploys from the `frontend/` directory. Since the Vercel GitHub integration was disconnected when the repo was renamed, deploy manually:

```bash
cd frontend
vercel --prod
```

To reconnect auto-deploy: Vercel dashboard → project settings → Git → reconnect to `Britten66/receipt-generator`.
