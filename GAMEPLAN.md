# New SaaS Gameplan: Trades Follow-Up + Review Platform

## What It Is

An AI-powered follow-up and Google review tool built for tradespeople.
Targets plumbers, electricians, HVAC, landscapers, general contractors.

Founder advantage: mechanic by trade, Red Seal tradesman as teammate.
Domain knowledge is the distribution edge.

---

## The Problem It Solves

- Quotes sent, no follow-up, jobs lost to a competitor who called back
- Google reviews never happen because nobody asks at the right moment
- Leads fall through the cracks tracked on paper or in someone's head

## The Fix

1. Tradesperson sends a quote, auto follow-up email fires in 24h if no reply
2. Job marked done, review request SMS fires in the 2-hour window post-job
3. Simple dashboard: open quotes, pending follow-ups, review count

## Why It Makes Money

- ServiceTitan customers report 25% revenue increase year one
- Automated review + follow-up is the #1 reason trades businesses switch tools
- Solo tradesperson price point: $49/month
- Small shop (3-5 employees): $149/month
- Direct measurable ROI for the customer = low churn, high willingness to pay

---

## Pain Points We Fix on Day One (Fast User Acquisition)

These are Reddit-validated complaints about ServiceTitan, Jobber, and Housecall Pro.
Fix these out of the gate and tradespeople will switch immediately.

| Pain Point | Who Has It | What We Do |
|---|---|---|
| Onboarding takes months | ServiceTitan | Under 10 min to first quote sent |
| $250-$500/month per tech | ServiceTitan | Flat $49/month, one price |
| Follow-up is a paid add-on | Housecall Pro | Included in base plan, always |
| Review requests cost extra | Housecall Pro | Included in base plan, always |
| Bill doubles from add-on creep | Housecall Pro | No add-ons. One price covers it |
| No offline access | Jobber | Works offline, syncs when back |
| QuickBooks sync breaks | Jobber | No QuickBooks dependency at launch |
| Rigid, can't customize | Jobber | Simple flows that match how trades work |
| Human support replaced by AI | Housecall Pro (2025) | Real human support while small |
| Can't export your data when leaving | ServiceTitan | Your data is yours, exportable anytime |
| Review requests feel generic, get flagged | All of them | Timed 2hr post-job trigger, personal tone |

### The one-liner for sales conversations:
> "Jobber and Housecall Pro charge you extra for follow-up and reviews.
> We built a tool where that IS the product, for $49 flat."

---

## Tech Stack (Same as InvoicePrepper)

- React + Vite (frontend)
- Supabase (auth, database, edge functions)
- Cloudflare Pages (hosting + deploy)
- Stripe (billing)
- Resend (email follow-ups, already know it)
- Twilio (SMS review requests, add in v2 after email ships)
- Same CI/CD pipeline, same auth pattern, same billing flow

---

## What to Copy from InvoicePrepper

| Keep | Leave Behind |
|---|---|
| Auth (AuthModal, Supabase session) | ReceiptForm, InvoiceGrid, InvoiceDetail |
| Billing (Stripe checkout, PlansModal) | PDF generation (jsPDF) |
| Cloudflare Pages config + CI/CD | QR code generation |
| Base CSS variables, dark/light mode | Voice/text AI parse (add back in v2) |
| Toast system | Referral system (add at 50 users) |
| BorderGlow component | Admin page (rebuild when needed) |
| Profile modal skeleton | Notifications bell |

Start fresh repo. Do not fork. Copy only what is listed above.

---

## Database Schema (Simpler than InvoicePrepper)

```
profiles       (user_id, business_name, email, phone, tier, stripe info)
contacts       (id, user_id, name, phone, email, trade_type, notes)
quotes         (id, user_id, contact_id, amount, description, status, sent_at, follow_up_at)
jobs           (id, user_id, contact_id, amount, description, completed_at)
messages       (id, user_id, type: follow_up|review_request, status, sent_at, contact_id)
```

---

## Build Order (Ship Fast)

1. Dashboard shell + contacts list
2. Quote creation + send via email (Resend)
3. Auto follow-up if no reply in 24h (edge function + scheduled trigger)
4. Job done button fires review request email
5. Pipeline view: open quotes, waiting, reviews sent
6. Add SMS via Twilio (v2)
7. Add scheduling view (v3)

---

## Pricing

| Tier | Price | Who |
|---|---|---|
| Solo | $49/month | One tradesperson |
| Shop | $149/month | Small shop, 3-5 employees |

Higher than InvoicePrepper because ROI is direct and measurable.

---

## Distribution Strategy

- Your mechanic background = credibility with shops
- Teammate Red Seal network = warm intros to certified tradespeople
- Start with one trade, go deep before expanding
- No Product Hunt, no cold ads: direct conversations first
- Target: 5 paying shops in first 60 days

---

## Milestones

| Target | Goal |
|---|---|
| Week 1 | New repo scaffolded, auth + billing working |
| Week 2-3 | Contacts + quote send live |
| Week 4 | Auto follow-up working end to end |
| Week 5-6 | Review request trigger working |
| Month 2 | First paying customer |
| Month 3 | 5 paying shops |
| Month 6 | Add SMS, expand to second trade |

---

## InvoicePrepper (Keep Running, Minimal Touch)

Status: Stable. 3 users, not yet active.
Goal: $200-300 MRR (~30 Pro users at $9/month)
Strategy: Free PDF hook, SEO pages per trade, let it grow passively

Cleanup done:
- Removed dead packages: pg, posthog-node, @react-three/fiber (freed 26 packages)
- Renamed AuthPage.css to AuthModal.css
- Payment URL HTTPS validation added
- Admin page filter state now persists in localStorage
- PlansModal Pro card synced to landing page
- CI badge and test report link on admin page

Pending cleanup (next session):
- Split ReceiptForm.jsx (1071 lines) into sub-components
- Split App.css (2113 lines) into themes.css + components.css
- Run npm audit fix for 4 moderate vulnerabilities
