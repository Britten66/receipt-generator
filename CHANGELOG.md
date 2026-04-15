# Changelog

Developer-facing log of significant changes. For the user-facing changelog see [invoiceprepper.com/blog](https://invoiceprepper.com/blog).

---

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

<!-- Add new entries at the top, not the bottom -->
<!-- Format: ## MMM DD YYYY followed by bullet points -->
<!-- Keep it developer-facing — what changed in the code, not marketing copy -->
