# Here Is The Idea

Invoicing tool for freelancers, contractors, and small businesses. Create, send, and track receipts from any device.

Built solo with help using LLMs to mimic industry standard structure and co-complete complex tasks to move forward in the project and think through bug fixing tasks, writing full tests, this is to practice building and seeing how it feels to scale a somewhat of a realworld workflow, view complex architecture, solo implementation, real.. very real debugging, and complete iteration, this is what it can look like as a small step.

## Stack

React + Vite frontend on Vercel. Supabase Edge Functions (Deno) for the API. PostgreSQL via Supabase. Stripe for subscriptions. Resend for transactional email. jsPDF for PDF generation.

## Docs

API structure, request/response shapes, and edge function details are in `docs/api-queries.txt`.

## Environment ( SO FAR )

Frontend (`frontend/.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Supabase secrets: `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`

## Known Issues ( ALSO SO FAR )

Receipt numbers are currently global across all users rather than per-user sequential. The fix requires changing the DB constraint from `UNIQUE(receipt_number)` to `UNIQUE(user_id, receipt_number)` and adding a prefix field to profiles.

## Planned

Tester access portal — a lightweight way to issue codes that unlock the app or pro tier for invited testers, without touching the public signup flow.

## new add on

fetch() doesn't have the canvas taint problem SO it just reads the bytes directly.

what I found out is as long as the bucket is public
(which it is now), this will work without any CORS config changes.

## new add on

instead of emailing a PDF, the plan is to send a link the client opens in a browser with a Pay Now button. a QR code on the invoice that opens the stripe link for the user that entered it.

what i found out is a static stripe payment link works but the better version is a stripe payment link with the amount prefilled via URL param so the client scans, lands on stripe, and the number is already there from the invoice total.

the full version down the road is a public URL like invoiceprepper.com/pay/INV-000042 that shows the invoice in the browser. client sees the full invoice, hits Pay Now, goes to stripe. supabase can handle the public read with anon role RLS so no extra backend needed. probably builds after the domain is set up.
