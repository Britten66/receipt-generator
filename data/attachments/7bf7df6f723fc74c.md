# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.js >> Landing page >> How it works section is present
- Location: src/__tests__/e2e/landing.spec.js:61:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('How it works')
Expected: visible
Error: strict mode violation: getByText('How it works') resolved to 2 elements:
    1) <a class="lv2-nav-link" href="#how-it-works">How it works</a> aka getByLabel('Primary').getByText('How it works')
    2) <p class="lv2-steps-eyebrow">How it works</p> aka locator('#how-it-works').getByText('How it works')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('How it works')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation "Primary" [ref=e4]:
    - generic [ref=e6]:
      - button "Dark" [ref=e7] [cursor=pointer]
      - combobox "Select currency" [ref=e8] [cursor=pointer]:
        - option "$ CAD" [selected]
        - option "$ USD"
        - option "£ GBP"
        - option "€ EUR"
        - option "$ AUD"
        - option "₹ INR"
      - button "Sign In" [ref=e9] [cursor=pointer]
      - button "Sign Up" [ref=e10] [cursor=pointer]
  - main [ref=e11]:
    - generic [ref=e12]:
      - generic [ref=e13]:
        - paragraph [ref=e14]: InvoicePrepper
        - heading "The invoice generator for people who just want to get paid." [level=1] [ref=e15]:
          - text: The invoice generator
          - text: for people who
          - text: just want to get paid.
        - paragraph [ref=e16]: Create, send, and track invoices. Free forever. No credit card, no setup, no learning curve.
        - button "Make your first invoice free" [ref=e17] [cursor=pointer]
        - paragraph [ref=e18]: Trusted by freelancers and small businesses · No credit card required
      - generic "Sample invoice preview" [ref=e22]:
        - generic "Voice to invoice demo" [ref=e23]
        - button "Open a sample PDF" [ref=e24] [cursor=pointer]: See a sample invoice
    - generic [ref=e25]:
      - paragraph [ref=e26]: How it works
      - heading "Invoice sent in under 60 seconds" [level=2] [ref=e27]
      - generic [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]: "01"
          - generic [ref=e31]: Fill in your invoice
          - paragraph [ref=e32]: Enter your client, line items, and amounts in a clean simple form. On Pro, describe the job and AI fills it in for you.
        - generic [ref=e33]:
          - generic [ref=e34]: "02"
          - generic [ref=e35]: Download or send
          - paragraph [ref=e36]: Get a professional PDF instantly. Share the link, download it, or email it directly to your client from the app.
        - generic [ref=e37]:
          - generic [ref=e38]: "03"
          - generic [ref=e39]: Track what is paid
          - paragraph [ref=e40]: Every invoice shows Draft, Sent, or Paid. See your outstanding balance at a glance without touching a spreadsheet.
    - generic [ref=e44]:
      - heading "Simple pricing" [level=2] [ref=e45]
      - paragraph [ref=e46]: Start free. Upgrade when you're ready.
      - generic [ref=e47]:
        - generic [ref=e50]:
          - generic [ref=e51]: Basic
          - generic [ref=e52]: Free
          - paragraph [ref=e53]: No credit card required
          - list [ref=e54]:
            - listitem [ref=e55]: · Unlimited invoices
            - listitem [ref=e56]: · Clean PDF, no watermark
            - listitem [ref=e57]: · Download and share link
            - listitem [ref=e58]: · Pay Now button on invoices
            - listitem [ref=e59]: · Draft, sent, paid tracking
            - listitem [ref=e60]: · Dark mode
            - listitem [ref=e61]: · No app to install. Works in any browser
            - listitem [ref=e62]: · Syncs across desktop and mobile
          - button "Get Started Free" [ref=e63] [cursor=pointer]
        - generic [ref=e66]:
          - button "Check out our promotion" [ref=e67] [cursor=pointer]:
            - img [ref=e68]
            - generic [ref=e72]: Check out our promotion
          - generic [ref=e73]: Pro
          - generic [ref=e74]: $9/mo
          - paragraph [ref=e75]: Billed monthly in CAD · Cancel anytime
          - list [ref=e76]:
            - listitem [ref=e77]: · Everything in Basic
            - listitem [ref=e78]: · Email invoices to clients with your logo
            - listitem [ref=e79]: · Send payment reminders to clients
            - listitem [ref=e80]: · CSV export
            - listitem [ref=e81]: · Custom dashboard themes
            - listitem [ref=e82]: "· Text AI parsing: describe an invoice, the form fills itself"
            - listitem [ref=e83]: · AI remembers your regular clients and rates
          - button "Get Pro" [ref=e84] [cursor=pointer]
        - generic [ref=e87]:
          - generic [ref=e88]: Voice AI
          - generic [ref=e89]: $12/mo
          - paragraph [ref=e90]: Billed monthly in CAD · Cancel anytime
          - list [ref=e91]:
            - listitem [ref=e92]: · Includes Pro Plan
            - listitem [ref=e93]: · Works on mobile, hands-free
            - listitem [ref=e94]: · Create invoices on the fly, anywhere
            - listitem [ref=e95]: · Speak your invoice, AI fills it in
            - listitem [ref=e96]: · Detects line items, prices, and clients
            - listitem [ref=e97]: · Remembers your regular clients and rates
            - listitem [ref=e98]: "· Smart pricing: AI suggests rates from your history"
            - listitem [ref=e99]: · Translate invoices into your client's language
            - listitem [ref=e100]: · First access to new AI features
          - button "Get Voice AI" [ref=e101] [cursor=pointer]
    - text: Basic Pro Voice AI Other apps Basic Pro Voice AI Other apps Basic Pro Voice AI Other apps Basic Pro Voice AI Other apps Basic Pro Voice AI Other apps Basic Pro Voice AI Other apps Basic Pro Voice AI Other apps Basic Pro Voice AI Other apps Basic Pro Voice AI Other apps Basic Pro Voice AI Other apps
    - generic [ref=e102]:
      - generic [ref=e103]:
        - generic [ref=e104]: Common Questions
        - heading "Simple answers." [level=2] [ref=e105]
        - paragraph [ref=e106]: Everything you need to know before you send your first invoice.
      - generic [ref=e107]:
        - generic [ref=e108]:
          - heading "Is the free plan really free?" [level=3] [ref=e109]
          - paragraph [ref=e110]: Yes, forever. No ads, no watermark, no credit card. Built to solve the pain points other tools create. Just invoices.
        - generic [ref=e111]:
          - heading "Can I download my invoices as PDFs?" [level=3] [ref=e112]
          - paragraph [ref=e113]: Yes, the second you hit generate. Built for convenience. And if something feels off, let us know at support@invoiceprepper.com, feedback helps us build better and smarter.
        - generic [ref=e114]:
          - heading "Can I email invoices directly to clients?" [level=3] [ref=e115]
          - paragraph [ref=e116]: Pro users can send directly from the dashboard with their business name shown in the email. Free users can use the mobile share button to send via any app on their phone, same result, no cost.
        - generic [ref=e117]:
          - heading "How do I track which invoices are paid?" [level=3] [ref=e118]
          - paragraph [ref=e119]: "Every invoice has a status: Draft, Sent, Paid, or Voided. Your dashboard shows outstanding balance and total revenue so you always know where you stand."
        - generic [ref=e120]:
          - heading "What is the Voice AI plan?" [level=3] [ref=e121]
          - paragraph [ref=e122]: Say your invoice out loud and the AI fills in your client, line items, and prices automatically. It uses your invoice history to suggest your regular clients and rates. You always review before sending.
        - generic [ref=e123]:
          - heading "Can I export my invoices?" [level=3] [ref=e124]
          - paragraph [ref=e125]: Yes, on Pro and above. Download all your invoices as a CSV directly from your account settings. Opens in Excel and Google Sheets with all line items included.
        - generic [ref=e126]:
          - heading "Can I cancel anytime?" [level=3] [ref=e127]
          - paragraph [ref=e128]: Yes. Cancel from inside the app in one tap. You keep access until the end of your billing period. No fees, no questions.
        - generic [ref=e129]:
          - heading "Need help?" [level=3] [ref=e130]
          - paragraph [ref=e131]:
            - text: Email
            - link "support@invoiceprepper.com" [ref=e132] [cursor=pointer]:
              - /url: mailto:support@invoiceprepper.com
            - text: and we will get back to you.
    - generic [ref=e133]:
      - heading "Ready to send your first invoice?" [level=2] [ref=e134]
      - paragraph [ref=e135]: Free forever. No credit card. Takes two minutes.
      - button "Start Invoicing Free" [ref=e136] [cursor=pointer]
  - contentinfo [ref=e137]:
    - generic [ref=e138]:
      - generic [ref=e139]:
        - generic [ref=e140]: InvoicePrepper
        - paragraph [ref=e141]: Invoicing that gets out of your way.
      - generic [ref=e142]:
        - generic [ref=e143]:
          - heading "For" [level=3] [ref=e144]
          - link "Freelancers" [ref=e145] [cursor=pointer]:
            - /url: /invoice-for-freelancers
          - link "Contractors" [ref=e146] [cursor=pointer]:
            - /url: /invoice-for-contractors
          - link "Designers" [ref=e147] [cursor=pointer]:
            - /url: /invoice-for-designers
          - link "Photographers" [ref=e148] [cursor=pointer]:
            - /url: /invoice-for-photographers
          - link "Tutors" [ref=e149] [cursor=pointer]:
            - /url: /invoice-for-tutors
          - link "Personal trainers" [ref=e150] [cursor=pointer]:
            - /url: /invoice-for-personal-trainers
        - generic [ref=e151]:
          - heading "Trades" [level=3] [ref=e152]
          - link "Cleaners" [ref=e153] [cursor=pointer]:
            - /url: /invoice-for-cleaners
          - link "Electricians" [ref=e154] [cursor=pointer]:
            - /url: /invoice-for-electricians
          - link "Plumbers" [ref=e155] [cursor=pointer]:
            - /url: /invoice-for-plumbers
          - link "Painters" [ref=e156] [cursor=pointer]:
            - /url: /invoice-for-painters
          - link "Landscapers" [ref=e157] [cursor=pointer]:
            - /url: /invoice-for-landscapers
          - link "Handymen" [ref=e158] [cursor=pointer]:
            - /url: /invoice-for-handymen
        - generic [ref=e159]:
          - heading "Resources" [level=3] [ref=e160]
          - link "Free invoice generator" [ref=e161] [cursor=pointer]:
            - /url: /free-invoice-generator
          - link "Voice invoicing" [ref=e162] [cursor=pointer]:
            - /url: /voice-invoicing
          - link "How to invoice clients" [ref=e163] [cursor=pointer]:
            - /url: /how-to-invoice-clients
          - link "Our story" [ref=e164] [cursor=pointer]:
            - /url: /blog
          - link "What's new" [ref=e165] [cursor=pointer]:
            - /url: /changelog
        - generic [ref=e166]:
          - heading "Company" [level=3] [ref=e167]
          - link "Terms" [ref=e168] [cursor=pointer]:
            - /url: /terms
          - link "Privacy" [ref=e169] [cursor=pointer]:
            - /url: /privacy
    - generic [ref=e170]:
      - generic [ref=e171]: © 2026 InvoicePrepper
      - generic [ref=e172]: For personal record-keeping. Not a substitute for professional accounting or tax advice.
```

# Test source

```ts
  1  | /*
  2  |   ══════════════════════════════════════════════════════════════════════════════
  3  |   E2E: Landing Page
  4  |   File: e2e/landing.spec.js
  5  |   ══════════════════════════════════════════════════════════════════════════════
  6  | 
  7  |   WHY THIS MATTERS:
  8  |   ─────────────────
  9  |   The landing page is the top of the funnel. Every new user lands here.
  10 |   If the hero CTA is broken, nobody signs up. If Sign In is missing, paid
  11 |   users are locked out. These tests run against the real Vite dev server.
  12 | 
  13 |   WHAT WE VERIFY:
  14 |   ───────────────
  15 |   1.  Page title contains "InvoicePrepper"
  16 |   2.  Hero headline is visible
  17 |   3.  Hero CTA button is visible and clickable
  18 |   4.  "Start Invoicing Free" or "Create Your First Invoice" CTA text
  19 |   5.  "Sign In" nav button is visible
  20 |   6.  "Sign Up" nav button is visible
  21 |   7.  Mock invoice preview renders in hero section
  22 |   8.  "How it works" section is present
  23 |   9.  Footer has a Terms link
  24 |   10. Footer has a Privacy link
  25 |   ══════════════════════════════════════════════════════════════════════════════
  26 | */
  27 | 
  28 | import { test, expect } from "@playwright/test";
  29 | 
  30 | test.describe("Landing page", () => {
  31 |   test.beforeEach(async ({ page }) => {
  32 |     await page.goto("/");
  33 |   });
  34 | 
  35 |   test("page title contains InvoicePrepper", async ({ page }) => {
  36 |     await expect(page).toHaveTitle(/InvoicePrepper/i);
  37 |   });
  38 | 
  39 |   test("hero headline is visible", async ({ page }) => {
  40 |     await expect(page.getByText(/just want to get paid/i)).toBeVisible();
  41 |   });
  42 | 
  43 |   test("hero CTA button is visible", async ({ page }) => {
  44 |     // Multiple CTA buttons exist on the page (hero + pricing section): check the first one
  45 |     const cta = page.getByRole("button", { name: /start invoicing free|create your first invoice/i }).first();
  46 |     await expect(cta).toBeVisible();
  47 |   });
  48 | 
  49 |   test("Sign In nav button is visible", async ({ page }) => {
  50 |     await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  51 |   });
  52 | 
  53 |   test("Sign Up nav button is visible", async ({ page }) => {
  54 |     await expect(page.getByRole("button", { name: /^sign up$/i })).toBeVisible();
  55 |   });
  56 | 
  57 |   test("mock invoice preview renders in hero", async ({ page }) => {
  58 |     await expect(page.getByLabel("Sample invoice preview")).toBeVisible();
  59 |   });
  60 | 
  61 |   test("How it works section is present", async ({ page }) => {
> 62 |     await expect(page.getByText("How it works")).toBeVisible();
     |                                                  ^ Error: expect(locator).toBeVisible() failed
  63 |   });
  64 | 
  65 |   test("footer has Terms link", async ({ page }) => {
  66 |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  67 |     // Footer uses <a href="/terms"> with text "Terms"
  68 |     await expect(page.locator("footer a[href='/terms']")).toBeVisible();
  69 |   });
  70 | 
  71 |   test("footer has Privacy link", async ({ page }) => {
  72 |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  73 |     // Footer uses <a href="/privacy"> with text "Privacy"
  74 |     await expect(page.locator("footer a[href='/privacy']")).toBeVisible();
  75 |   });
  76 | });
  77 | 
```