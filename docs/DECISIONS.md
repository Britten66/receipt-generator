# Architecture Decisions

Why things were built the way they were. Useful for interviews, onboarding, and revisiting choices later.

---

## Hosting — Cloudflare Pages over Vercel

Cloudflare Pages has zero cold starts on the CDN layer, a generous free tier, and native support for `_headers` and `_redirects` files which handle CSP and routing without a config file. Vercel is excellent but adds Next.js pressure and has a more complex pricing model at scale. Since the frontend is pure React with no SSR needs, Cloudflare was the simpler and faster choice.

---

## Backend — Supabase Edge Functions over Firebase / AWS Lambda

Supabase gives Postgres with row-level security, Auth, Storage, and Edge Functions in one platform with one dashboard. Firebase has no native Postgres and its security rules are harder to audit. AWS Lambda is more powerful but adds IAM complexity, cold starts, and billing unpredictability for a solo project. Supabase's Deno-based Edge Functions run close to the user and have no cold start penalty.

---

## AI — Groq over OpenAI

Groq inference is significantly faster than OpenAI for the same model family. For voice parsing, speed matters — the user is waiting with a microphone in hand. Groq's LLaMA 3.3 70B produces output quality comparable to GPT-4o-mini for structured extraction tasks at lower cost. OpenAI remains the fallback option if Groq has reliability issues.

---

## PDF — jsPDF (client-side) over server-side generation

Generating PDFs in the browser eliminates a round-trip to the server, removes the need to transmit invoice data over the network for rendering, and keeps the invoice generation free regardless of volume. The tradeoff is limited layout control compared to HTML-to-PDF tools like Puppeteer. A migration to `@react-pdf/renderer` is planned to improve template flexibility.

---

## Auth — Supabase Auth over Auth0 / Clerk

Auth0 and Clerk are excellent but add a third-party dependency for something Supabase handles natively and free. Since the entire backend already lives in Supabase, keeping auth there means one JWT, one dashboard, and no cross-service token exchange.

---

## Email — Resend over SendGrid / Mailgun

Resend has a clean API, excellent deliverability, and a developer-friendly free tier. SendGrid has a long history of spam reputation issues. Mailgun is strong but more complex to configure. Resend's React email templates are a future option for improving invoice email design.

---

## Payments — Stripe over Paddle / LemonSqueezy

Stripe is the industry standard with the best documentation, widest payment method support, and most predictable behaviour. Paddle and LemonSqueezy handle tax compliance automatically (Merchant of Record model) which is appealing, but Stripe's ecosystem, webhook reliability, and Customer Portal are more mature. Tax compliance is handled manually for now.

---

## Analytics — PostHog over Mixpanel / Amplitude

PostHog is open source, self-hostable, privacy-first by default, and has a generous free tier. Mixpanel and Amplitude are strong but expensive at scale and require more careful PII handling. PostHog's feature flag system also handles the A/B test on the hero CTA without a separate tool.

---

## Testing — Vitest over Jest

Vitest is native to the Vite ecosystem, runs faster than Jest on Vite projects, and uses the same config file. No transform config needed for ESM. The switch would be painful if the project ever moved off Vite, but that's not planned.

---

## Notes / Decisions to Revisit

<!-- Add your own notes here -->
<!-- e.g. "reconsidering jsPDF — react-pdf would make template changes much easier" -->
<!-- e.g. "Groq rate limits hit during load test — may need OpenAI fallback" -->
