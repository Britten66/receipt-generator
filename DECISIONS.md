# Architecture Decisions

---

## Hosting: Cloudflare Pages

**Tool:** Cloudflare Pages | **Features used:** `_headers`, `_redirects`, CDN, Pages deployment

--

Originally went with Vercel before the AI tier, this was the free plan and wanted to see how far scaling was possible, it turns out scaling never stops and just opens more holes for things to fall into, including myself

this turned into the best turn around using Cloudflare Pages, getting the domain and email through Cloudflare was the best move for me at the time all within the same ballpark as any other front end hosting service out there.

---

## Backend: Supabase

**Tool:** Supabase | **Features used:** Postgres, Row Level Security, Auth, Storage, Edge Functions (Deno), Webhooks

--

Supabase was a really cool move for this, other options have come across my desk over the months, I've been using JWT and Express for auth, when I saw Supabase handled the auth internally it was an extra bonus.
Secure auth for users is the main play of this project. Using Google auth through Supabase helps users gain easy entry to our app.

---

## AI: Groq

**Tool:** Groq | **Features used:** Whisper large-v3-turbo (transcription), LLaMA 3.3 70B (structured extraction)

--

Groq is being used for voice and text parsing in this project
new in this project, we are offering beta access and asking for feedback on the regular!
Anything that could help out please don't hesitate to reach out, I'm constantly looking to explore options and RAG or continuous learning patterns would be great to explore.

---

## PDF: jsPDF (client-side)

**Tool:** jsPDF | **Features used:** Client-side PDF generation, blob URLs, download

--

This was the base of the project, using inspirations from multiple softwares that incorporate PDF conversions.
Some of the best over the line charging high end fees use this exact set up.
Nothing fancy, just libraries.

---

## Auth: Supabase Auth

**Tool:** Supabase Auth | **Features used:** Email/password, Google OAuth, JWT, session management

--

This was explained earlier but I feel like I will expand on this as I get more familiar with auth and using Supabase.

tbc

---

## Email: Resend

**Tool:** Resend | **Features used:** Transactional email, REST API, domain verification

--

Resend is awesome and free, included a lot of options and custom themes for your email to user.
Through Cloudflare Pages it makes it really easy to hook up the two and incorporate sending options to clients of the user.

---

## Payments: Stripe

**Tool:** Stripe | **Features used:** Checkout Sessions, Customer Portal, Webhooks, subscription management

--

Safe net payment used by the majority of SaaS from what I can see. This was a no brainer.

---

## Analytics: PostHog

**Tool:** PostHog | **Features used:** Event capture, user identify, feature flags

--

PostHog is also new to me but I'm enjoying the feedback, non-invasive and clear state.
Biggest con is anyone with an adblocker bypasses so it is not 100% accurate.

---

## Testing: Vitest

**Tool:** Vitest | **Features used:** jsdom, globals, Allure reporter, coverage

--

Easy state testing.
E2E got moved to Playwright and uses automation testing through GitHub Actions and Allure!
