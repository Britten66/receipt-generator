# InvoicePrepper Roadmap

Internal only. Built to be converted to a visual interface later.
Last updated: April 2026

---

## NOW
> Closing out current build. These are either live or shippable this week.

- [x] 372 automated tests: unit, component, E2E
- [x] CI pipeline blocks bad deploys
- [x] Notify-signup email on new user registration
- [x] PostHog activation events: signup, invoice created, sent, paid, upgraded, PDF downloaded
- [x] Consent modal: fires once for Google OAuth users, saves terms_agreed_at to profile, covers CASL
- [x] Email signup form simplified: terms checkbox removed, handled by consent modal for all users
- [x] PostHog identify sends user ID only — no PII (email removed Apr 2026)
- [x] Changelog page rewritten as a plain developer changelog, not a marketing page
- [ ] PostHog notifications: alert founder on first invoice created, pro wall hit, upgrade
- [ ] Payment link field wired up: profile field, saved to Supabase, rendered in PDF and invoice detail
- [ ] Confirm email confirmation flow works end to end for new signups

---

## NEXT UPDATE
> Payment features. This is what gets showcased and what converts free to paid.

- [ ] Payment link on invoice: user pastes their Stripe, PayPal, or e-transfer link in profile, appears as a Pay Now button on the invoice PDF and detail view
- [ ] Client-facing invoice page: hosted URL a client can open in browser, no login, shows invoice and Pay Now button
- [ ] Seen receipt: notify the user when their client opens the invoice link
- [ ] Deposit invoice: send a partial invoice upfront, remainder on completion
- [ ] Invoice aging view: 0-30, 31-60, 60+ days outstanding at a glance

---

## NEXT 5 FEATURES
> First wave after payment update ships. Aim to close these within 2 months.
> Focus: make the free tier stickier and the pro tier feel essential.

1. **Recurring invoices** -- create once, duplicate and send on a schedule. Monthly retainer clients set it and forget it. Pro feature.
2. **Client portal** -- login-free link for a specific client to see all their invoices from this user. Reduces resend requests, looks professional.
3. **Late fee automation** -- user sets a percentage, app calculates and flags overdue invoices. Legal disclosure added to invoice footer automatically.
4. **Expense attachment** -- attach a receipt photo to a line item. Contractors billing for materials, photographers billing for travel. Pro feature.
5. **Tax summary export** -- one click generates a tax year summary: total invoiced, collected, outstanding, HST collected. Hands directly to an accountant. Pro feature.

---

## NEXT 10 FEATURES
> Second wave. Senior judgment calls. Ship these when the first 5 are stable and user count justifies.
> Aim: 3 to 6 months out.

1. **Multi-currency per invoice** -- user sets their default, can override per invoice. CAD, USD, GBP, AUD. International freelancers are underserved.
2. **Quote to invoice conversion** -- send a quote first, client approves, one click converts to invoice. Standard in trades and agencies.
3. **Team accounts** -- one business, multiple users. Owner plus contractor or bookkeeper. Unlocks a higher price tier.
4. **Invoice templates** -- save a named template with pre-filled line items. Photographers, cleaners, trainers bill the same things repeatedly.
5. **Branded invoice domain** -- invoice links come from invoiceprepper.com/pay/their-business-name instead of a UUID. Trust signal for clients.
6. **Stripe Connect integration** -- users connect their own Stripe account, clients pay directly, funds go straight to the freelancer. No middleman, no float.
7. **Mobile app** -- PWA or React Native. Voice AI already works on mobile but a native install increases retention significantly.
8. **Xero and QuickBooks export** -- one click sends paid invoices to their accounting software. Removes the only reason a power user would leave.
9. **Annual billing** -- 2 months free on yearly plan. Reduces churn, improves cash flow predictability.
10. **Referral program** -- free month for every paying user referred. Word of mouth is the only acquisition channel that compounds for a solo SaaS.

---

## NEXT YEAR
> Vision. These require meaningful user volume to justify.

- **Tester access portal** -- internal tool to create test accounts at any tier without Stripe
- **White label** -- agencies resell InvoicePrepper under their own brand to their clients
- **Payment processing** -- take a small percentage of payments processed through the platform instead of or alongside subscription revenue
- **AI contract generation** -- user describes the job, AI drafts a simple service agreement. Huge value for freelancers who never had contracts.
- **Business credit scoring integration** -- flag clients who are slow payers across the platform anonymously. Protect the freelancer before work starts.
- **Marketplace** -- freelancers list services, clients find and hire, invoice is auto-generated on booking

---

## FOUNDER OPS
> Infrastructure for staying on top of growth. Not user-facing.

- [ ] PostHog funnel: landing page view to signup to first invoice -- know exactly where people drop
- [ ] Weekly digest: new signups, invoices created, upgrades, churns
- [ ] Inactive user query: signed up more than 7 days ago, zero invoices created
- [ ] Staging environment: test deploys against a real Cloudflare preview URL before pushing to production
- [ ] Dependabot: auto PRs when dependencies have CVEs
- [ ] Gate Cloudflare deploy on CI pass: tests failing should never reach production
