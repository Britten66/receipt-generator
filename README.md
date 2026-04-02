# Here Is The Idea

Invoicing tool for freelancers, contractors, and small businesses. Create, send, and track receipts from any device.

Built solo using LLM to mimic industry standard structure and customer bug fixing this is to practice building and scaling realworld workflows, complex architecture, implementation, debugging, and iteration.

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
