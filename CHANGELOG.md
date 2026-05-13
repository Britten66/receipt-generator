# Changelog

Developer-facing log of significant changes. For the user-facing changelog see [invoiceprepper.com/blog](https://invoiceprepper.com/blog).

---

## May 13 2026

**Invoicing**

- Added billing unit selector to invoices. Each invoice can now be set to Qty, Hrs, or Days. The column header, quantity step, and input mode update automatically to match the selected unit.
- Added a total unit summary line to the invoice preview panel and generated PDF. When an invoice uses Hrs or Days, the total unit count is displayed above the subtotal so clients can verify hours at a glance.
- Due date now appears in the invoice detail preview panel. Previously the due date was saved and included in the PDF but was not shown in the side panel.
- Added an optional Billing Period field to invoices. Appears in the form, the detail preview, and on the generated PDF when filled in. Intended for hourly and contract work billed by time range.
- Double-clicking an invoice card in the dashboard now opens the edit form directly.
- Closing the invoice creation form without saving now auto-saves the in-progress entry as a draft, provided a client name or at least one line item description has been entered. This prevents data loss when navigating away mid-invoice.
- Vendor contact details (address, phone, email, website) now appear on generated PDFs beneath the business name. Fields render only when filled in on the profile. Layout adjusts dynamically so invoices without contact info are unaffected.

**Bug Fixes**

- Fixed invoice preview panel showing hardcoded Qty in the table header regardless of the selected billing unit.
- Fixed billing unit label reverting to Qty on page reload. Root cause was a missing database column. Migration applied.
- Fixed Playwright end-to-end tests failing due to strict mode violations. Invoice form modal now carries a dedicated CSS class so test locators do not resolve to multiple elements when the consent modal is also present.
- Fixed test setup not correctly dismissing the consent modal. The consent modal has no close or cancel button by design. The global setup now checks the terms checkbox and clicks Continue to properly persist acceptance before saving session state.
- Fixed the help modal test using the wrong CSS class selector. The help window uses a floating draggable style and carries a separate class from standard modals.

**Database**

- Added unit_label column to receipts table with constraint limiting values to Qty, Hrs, and Days. Existing invoices default to Qty.
- Added billing_period column to receipts table as optional free text, maximum 100 characters.

## Apr 15 2026

- Fixed PDF preview about:blank on desktop — switched from document.write embed to direct blob URL navigation
- Removed email from posthog.identify — user ID only, no PII sent to analytics
- Restyled changelog page — dark by default, bold dates, Steam patch-note format, nav matches landing
- Fixed Playwright HTML reporter auto-opening Chrome after test runs — added open: "never"
- Updated docs — test count, CI status, PostHog PII note, text parse rate limit (15/day not 15/month)
- Moved ROADMAP.md to docs/
- Added DECISIONS.md, PROMPTS.md, CHANGELOG.md to docs

## Apr 13 2026

- Consent modal added for Google OAuth users — blocks app until terms_agreed_at written to profile
- Signup form simplified — email, password, confirm only
- Forgot password flow added
- Password strength indicator inline
- Fixed PostHog identify not firing correctly after redirect sign-in

## Apr 7 2026

- Text AI invoice parsing deployed — Pro tier, 15 parses per day
- Desktop-only text input, mobile defaults to voice
- Rate limit counter in profiles table, resets daily

## Mar 31 2026

- Voice AI invoice parsing deployed
- MediaRecorder API, webm/mp4, Groq Whisper transcription, LLaMA extraction
- Audio deleted from storage immediately after parse
- RAG context from recent invoice history injected into prompt

## Mar 24 2026

- Trash with 30-day restore
- Six dashboard colour themes, light and dark
- CSV export of all invoices

## Mar 17 2026

- Business logo upload — appears on PDFs
- Mobile share via Web Share API
- Stripe Customer Portal integration
- Cancelled subscription end-date notice

## Mar 10 2026

- Pro plan launched — CAD/USD $9/month
- Email invoices to clients via Resend
- Payment reminders for sent invoices

## Mar 3 2026

- Business profile fields — address, phone, email, bio on PDFs
- Tax rate and label configurable per account
- Currency preference CAD/USD
- Profile modal save button pinned to bottom
- Fixed notes field hidden behind voice bar on mobile

## Feb 24 2026

- v1.0 — invoice creation, PDF generation, status tracking
- Draft / Sent / Paid / Voided statuses
- Per-user sequential invoice numbers from INV-000100
- Filter by status
- Cloudflare Pages deployment

---
