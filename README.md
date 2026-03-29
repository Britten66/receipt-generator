# Receipt Generator

A lightweight invoicing tool for freelancers. Create, send, and track receipts.

## Features

- Create and manage receipts with line items, tax, subtotal, and totals
- Sequential receipt numbers (REC-000001, REC-000002...)
- Status workflow: Draft, Sent, Paid, Voided
- Business profile that auto-fills vendor info on every receipt
- QR code on unpaid receipts linked to your payment link
- PDF download and mobile share sheet
- Anonymous use with an account upgrade path
- Password reset and account management
- Works on desktop and mobile

## Stack

- Frontend: React (Vite), deployed on Vercel
- API: Vercel serverless functions
- Database: PostgreSQL via Supabase
- Auth: Supabase Auth (anonymous + email/password)
- PDF: jsPDF + jspdf-autotable

## Notes

Claude was used to help with boilerplate structure and configuring the password reset and auth screens.
