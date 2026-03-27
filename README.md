# Receipt Generator

A lightweight invoicing tool built for freelance developers. Create, send, and track receipts without the bloat of enterprise billing software.

## MVP

- Create and manage receipts with line items, tax, subtotal, and totals
- Sequential receipt numbers (REC-001, REC-002...)
- Status workflow — Draft → Sent → Paid → Voided
- Business profile that auto-fills vendor info on every receipt
- QR code on unpaid receipts linked to your Stripe Payment Link
- PDF download of any receipt
- Time-based greeting with Gravatar avatar
- Anonymous use with upgrade path to a full account
- Password reset and account management
- Responsive — works on desktop and mobile

## Stack

- **Frontend** — React (Vite), deployed on Vercel
- **API** — Vercel serverless functions
- **Database** — PostgreSQL via Supabase
- **Auth** — Supabase Auth (anonymous + email/password)
- **PDF** — jsPDF + jspdf-autotable

## AI

Claude was used to help duplicate boilerplate structure and assist with configuring the password reset and auth screens — specifically the data flow changes needed when authorizing reset tokens during the MVP launch configuration.
