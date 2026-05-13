# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.js >> Accessibility: WCAG + best practice >> sign in modal has no violations
- Location: src/__tests__/e2e/accessibility.spec.js:66:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 35

- Array []
+ Array [
+   Object {
+     "description": "Ensure table headers have discernible text",
+     "help": "Table header text should not be empty",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/empty-table-header?application=playwright",
+     "id": "empty-table-header",
+     "impact": "minor",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "has-visible-text",
+             "impact": "minor",
+             "message": "Element does not have text that is visible to screen readers",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element does not have text that is visible to screen readers",
+         "html": "<th class=\"lv2-cth-feature\" aria-label=\"Feature\"></th>",
+         "impact": "minor",
+         "none": Array [],
+         "target": Array [
+           ".lv2-cth-feature",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.name-role-value",
+       "best-practice",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - navigation [ref=e4]:
      - button "Dark" [ref=e6] [cursor=pointer]
      - generic [ref=e7]:
        - link "What's new" [ref=e8] [cursor=pointer]:
          - /url: /blog
          - img [ref=e9]
        - button "Refer a friend" [ref=e12] [cursor=pointer]:
          - img [ref=e13]
        - combobox "Select currency" [ref=e17] [cursor=pointer]:
          - option "$ CAD" [selected]
          - option "$ USD"
        - button "Sign In" [ref=e18] [cursor=pointer]
        - button "Sign Up" [ref=e19] [cursor=pointer]
    - main [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]:
          - paragraph [ref=e23]: InvoicePrepper
          - heading "The invoice generator for people who just want to get paid." [level=1] [ref=e24]:
            - text: The invoice generator
            - text: for people who
            - text: just want to get paid.
          - paragraph [ref=e25]: Create professional invoices, email to clients, and track what's paid; all in one place. Built for independent workers, contractors, and small businesses. No bloat, no learning curve.
          - button "Start Invoicing Free" [ref=e26] [cursor=pointer]
          - paragraph [ref=e27]: Free forever · No credit card required
        - generic "Sample invoice preview" [ref=e31]:
          - generic [ref=e32]:
            - generic [ref=e33]:
              - generic [ref=e34]: INVOICE
              - generic [ref=e35]: INV-001042
            - generic [ref=e36]:
              - generic [ref=e37]:
                - generic [ref=e38]: FROM
                - generic [ref=e39]: Maple & Co. Creative
              - generic [ref=e40]:
                - generic [ref=e41]: BILLED TO
                - generic [ref=e42]: Summit Tech Solutions
            - generic [ref=e43]:
              - generic [ref=e44]: March 14, 2026
              - generic [ref=e45]:
                - img [ref=e46]
                - text: Sent
            - table [ref=e50]:
              - rowgroup [ref=e51]:
                - row "Description Qty Unit Total" [ref=e52]:
                  - columnheader "Description" [ref=e53]
                  - columnheader "Qty" [ref=e54]
                  - columnheader "Unit" [ref=e55]
                  - columnheader "Total" [ref=e56]
              - rowgroup [ref=e57]:
                - row "Brand Identity Package 1 $1,200.00 $1,200.00" [ref=e58]:
                  - cell "Brand Identity Package" [ref=e59]
                  - cell "1" [ref=e60]
                  - cell "$1,200.00" [ref=e61]
                  - cell "$1,200.00" [ref=e62]
                - row "Social Media Asset Kit 3 $180.00 $540.00" [ref=e63]:
                  - cell "Social Media Asset Kit" [ref=e64]
                  - cell "3" [ref=e65]
                  - cell "$180.00" [ref=e66]
                  - cell "$540.00" [ref=e67]
                - row "Revision Round 2 $95.00 $190.00" [ref=e68]:
                  - cell "Revision Round" [ref=e69]
                  - cell "2" [ref=e70]
                  - cell "$95.00" [ref=e71]
                  - cell "$190.00" [ref=e72]
            - generic [ref=e73]:
              - generic [ref=e74]:
                - generic [ref=e75]: Subtotal
                - generic [ref=e76]: $1,930.00
              - generic [ref=e77]:
                - generic [ref=e78]: Tax (13%)
                - generic [ref=e79]: $250.90
              - generic [ref=e80]:
                - generic [ref=e81]: Total
                - generic [ref=e82]: $2,180.90
            - generic [ref=e83]: Payment due within 14 days. Thank you for your business.
          - button "Open a sample PDF" [ref=e84] [cursor=pointer]: Example
      - generic [ref=e85]:
        - paragraph [ref=e86]: How it works
        - heading "Invoice sent in under 60 seconds" [level=2] [ref=e87]
        - generic [ref=e88]:
          - generic [ref=e89]:
            - generic [ref=e90]: "01"
            - generic [ref=e91]: Fill in your invoice
            - paragraph [ref=e92]: Enter your client, line items, and amounts in a clean simple form. On Pro, describe the job and AI fills it in for you.
          - generic [ref=e93]:
            - generic [ref=e94]: "02"
            - generic [ref=e95]: Download or send
            - paragraph [ref=e96]: Get a professional PDF instantly. Share the link, download it, or email it directly to your client from the app.
          - generic [ref=e97]:
            - generic [ref=e98]: "03"
            - generic [ref=e99]: Track what is paid
            - paragraph [ref=e100]: Every invoice shows Draft, Sent, or Paid. See your outstanding balance at a glance without touching a spreadsheet.
      - generic [ref=e104]:
        - heading "Simple pricing" [level=2] [ref=e105]
        - paragraph [ref=e106]: Start free. Upgrade when you're ready.
        - generic [ref=e107]:
          - generic [ref=e110]:
            - generic [ref=e111]: Basic
            - generic [ref=e112]: Free
            - paragraph [ref=e113]: No credit card required
            - list [ref=e114]:
              - listitem [ref=e115]: · Unlimited invoices
              - listitem [ref=e116]: · Clean PDF, no watermark
              - listitem [ref=e117]: · Download and share link
              - listitem [ref=e118]: · Pay Now button on invoices
              - listitem [ref=e119]: · Draft, sent, paid tracking
              - listitem [ref=e120]: · Dark mode
              - listitem [ref=e121]: · No app to install. Works in any browser
              - listitem [ref=e122]: · Syncs across desktop and mobile
            - button "Get Started Free" [ref=e123] [cursor=pointer]
          - generic [ref=e126]:
            - button "Check out our promotion" [ref=e127] [cursor=pointer]:
              - img [ref=e128]
              - generic [ref=e132]: Check out our promotion
            - generic [ref=e133]: Pro
            - generic [ref=e134]: CAD $9/mo
            - paragraph [ref=e135]: Billed monthly · Cancel anytime
            - list [ref=e136]:
              - listitem [ref=e137]: · Everything in Basic
              - listitem [ref=e138]: · Email invoices to clients with your logo
              - listitem [ref=e139]: · Recurring invoices
              - listitem [ref=e140]: "· Text AI parsing: describe an invoice, the form fills itself"
              - listitem [ref=e141]: · Send payment reminders to clients
              - listitem [ref=e142]: · CSV export
              - listitem [ref=e143]: · Custom dashboard themes
            - button "Get Pro" [ref=e144] [cursor=pointer]
          - generic [ref=e147]:
            - generic [ref=e148]: Voice AI
            - generic [ref=e149]: CAD $12/mo
            - paragraph [ref=e150]: Billed monthly · Cancel anytime
            - list [ref=e151]:
              - listitem [ref=e152]: · Includes Pro Plan
              - listitem [ref=e153]: · Speak your invoice, AI fills it in
              - listitem [ref=e154]: · Works on mobile, hands-free
              - listitem [ref=e155]: · Detects line items, prices, and clients
              - listitem [ref=e156]: · Remembers your regular clients and rates
              - listitem [ref=e157]: · Create invoices on the fly, anywhere
              - listitem [ref=e158]: · Unlimited Voice AI and Text AI parses
              - listitem [ref=e159]: · Your invoicing companion on every job
              - listitem [ref=e160]: · Speak or type. Smart parsing does the rest
              - listitem [ref=e161]: · First access to new AI features
            - button "Get Voice AI" [ref=e162] [cursor=pointer]
      - generic [ref=e163]:
        - paragraph [ref=e164]: How we compare
        - heading "What other apps charge for. Plus AI they don't have." [level=2] [ref=e165]
        - table [ref=e167]:
          - rowgroup [ref=e168]:
            - row "Feature Basic Pro Voice AI Other apps" [ref=e169]:
              - columnheader "Feature" [ref=e170]
              - columnheader "Basic" [ref=e171]:
                - button "Basic" [ref=e172] [cursor=pointer]
              - columnheader "Pro" [ref=e173]:
                - button "Pro" [ref=e174] [cursor=pointer]
              - columnheader "Voice AI" [ref=e175]:
                - button "Voice AI" [ref=e176] [cursor=pointer]
              - columnheader "Other apps" [ref=e177]
            - row "Free $9 / mo $12 / mo" [ref=e178]:
              - cell [ref=e179]
              - cell "Free" [ref=e180]
              - cell "$9 / mo" [ref=e181]
              - cell "$12 / mo" [ref=e182]
              - cell [ref=e183]
          - rowgroup [ref=e184]:
            - row "Free forever, unlimited invoices — —" [ref=e185]:
              - cell "Free forever, unlimited invoices" [ref=e186]
              - cell [ref=e187]:
                - img [ref=e188]
              - cell "—" [ref=e190]
              - cell "—" [ref=e191]
              - cell [ref=e192]:
                - img [ref=e193]
            - row "Multiple currencies on free plan — —" [ref=e196]:
              - cell "Multiple currencies on free plan" [ref=e197]
              - cell [ref=e198]:
                - img [ref=e199]
              - cell "—" [ref=e201]
              - cell "—" [ref=e202]
              - cell [ref=e203]:
                - img [ref=e204]
            - row "Works in any browser, nothing to install — —" [ref=e207]:
              - cell "Works in any browser, nothing to install" [ref=e208]
              - cell [ref=e209]:
                - img [ref=e210]
              - cell "—" [ref=e212]
              - cell "—" [ref=e213]
              - cell [ref=e214]:
                - img [ref=e215]
            - row "Email invoices to clients —" [ref=e218]:
              - cell "Email invoices to clients" [ref=e219]
              - cell "—" [ref=e220]
              - cell [ref=e221]:
                - img [ref=e222]
              - cell [ref=e224]:
                - img [ref=e225]
              - cell [ref=e227]:
                - img [ref=e228]
            - row "Recurring invoices —" [ref=e230]:
              - cell "Recurring invoices" [ref=e231]
              - cell "—" [ref=e232]
              - cell [ref=e233]:
                - img [ref=e234]
              - cell [ref=e236]:
                - img [ref=e237]
              - cell [ref=e239]:
                - img [ref=e240]
            - row "CSV export —" [ref=e242]:
              - cell "CSV export" [ref=e243]
              - cell "—" [ref=e244]
              - cell [ref=e245]:
                - img [ref=e246]
              - cell [ref=e248]:
                - img [ref=e249]
              - cell [ref=e251]:
                - img [ref=e252]
            - row "Refer a friend, both get a free month — —" [ref=e254]:
              - cell "Refer a friend, both get a free month" [ref=e255]
              - cell "—" [ref=e256]
              - cell [ref=e257]:
                - img [ref=e258]
              - cell "—" [ref=e260]
              - cell [ref=e261]:
                - img [ref=e262]
            - row "AI text parsing —" [ref=e265]:
              - cell "AI text parsing" [ref=e266]
              - cell "—" [ref=e267]
              - cell [ref=e268]:
                - img [ref=e269]
              - cell [ref=e271]:
                - img [ref=e272]
              - cell [ref=e274]:
                - img [ref=e275]
            - 'row "Voice AI: speak your invoice — —" [ref=e278]':
              - 'cell "Voice AI: speak your invoice" [ref=e279]'
              - cell "—" [ref=e280]
              - cell "—" [ref=e281]
              - cell [ref=e282]:
                - img [ref=e283]
              - cell [ref=e285]:
                - img [ref=e286]
            - row "Remembers your clients and rates — —" [ref=e289]:
              - cell "Remembers your clients and rates" [ref=e290]
              - cell "—" [ref=e291]
              - cell "—" [ref=e292]
              - cell [ref=e293]:
                - img [ref=e294]
              - cell [ref=e296]:
                - img [ref=e297]
      - generic [ref=e300]:
        - generic [ref=e301]:
          - generic [ref=e302]: Common Questions
          - heading "Simple answers." [level=2] [ref=e303]
          - paragraph [ref=e304]: Everything you need to know before you send your first invoice.
        - generic [ref=e305]:
          - generic [ref=e306]:
            - heading "Is the free plan really free?" [level=3] [ref=e307]
            - paragraph [ref=e308]: Yes, forever. No ads, no watermark, no credit card. Built to solve the pain points other tools create. Just invoices.
          - generic [ref=e309]:
            - heading "Can I download my invoices as PDFs?" [level=3] [ref=e310]
            - paragraph [ref=e311]: Yes, the second you hit generate. Built for convenience. And if something feels off, let us know at support@invoiceprepper.com, feedback helps us build better and smarter.
          - generic [ref=e312]:
            - heading "Can I email invoices directly to clients?" [level=3] [ref=e313]
            - paragraph [ref=e314]: Pro users can send directly from the dashboard with their business name shown in the email. Free users can use the mobile share button to send via any app on their phone, same result, no cost.
          - generic [ref=e315]:
            - heading "How do I track which invoices are paid?" [level=3] [ref=e316]
            - paragraph [ref=e317]: "Every invoice has a status: Draft, Sent, Paid, or Voided. Your dashboard shows outstanding balance and total revenue so you always know where you stand."
          - generic [ref=e318]:
            - heading "What is the Voice AI plan?" [level=3] [ref=e319]
            - paragraph [ref=e320]: Say your invoice out loud and the AI fills in your client, line items, and prices automatically. It uses your invoice history to suggest your regular clients and rates. You always review before sending.
          - generic [ref=e321]:
            - heading "Can I export my invoices?" [level=3] [ref=e322]
            - paragraph [ref=e323]: Yes, on Pro and above. Download all your invoices as a CSV directly from your account settings. Opens in Excel and Google Sheets with all line items included.
          - generic [ref=e324]:
            - heading "Can I cancel anytime?" [level=3] [ref=e325]
            - paragraph [ref=e326]: Yes. Cancel from inside the app in one tap. You keep access until the end of your billing period. No fees, no questions.
          - generic [ref=e327]:
            - heading "Need help?" [level=3] [ref=e328]
            - paragraph [ref=e329]:
              - text: Email
              - link "support@invoiceprepper.com" [ref=e330] [cursor=pointer]:
                - /url: mailto:support@invoiceprepper.com
              - text: and we will get back to you.
      - generic [ref=e331]:
        - heading "Ready to send your first invoice?" [level=2] [ref=e332]
        - paragraph [ref=e333]: Free forever. No credit card. Takes two minutes.
        - button "Start Invoicing Free" [ref=e334] [cursor=pointer]
    - contentinfo [ref=e335]:
      - generic [ref=e336]:
        - generic [ref=e337]:
          - generic [ref=e338]: InvoicePrepper
          - paragraph [ref=e339]: Invoicing that gets out of your way.
        - generic [ref=e340]:
          - generic [ref=e341]:
            - heading "For" [level=3] [ref=e342]
            - link "Freelancers" [ref=e343] [cursor=pointer]:
              - /url: /invoice-for-freelancers
            - link "Contractors" [ref=e344] [cursor=pointer]:
              - /url: /invoice-for-contractors
            - link "Designers" [ref=e345] [cursor=pointer]:
              - /url: /invoice-for-designers
            - link "Photographers" [ref=e346] [cursor=pointer]:
              - /url: /invoice-for-photographers
            - link "Tutors" [ref=e347] [cursor=pointer]:
              - /url: /invoice-for-tutors
            - link "Personal trainers" [ref=e348] [cursor=pointer]:
              - /url: /invoice-for-personal-trainers
          - generic [ref=e349]:
            - heading "Trades" [level=3] [ref=e350]
            - link "Cleaners" [ref=e351] [cursor=pointer]:
              - /url: /invoice-for-cleaners
            - link "Electricians" [ref=e352] [cursor=pointer]:
              - /url: /invoice-for-electricians
            - link "Plumbers" [ref=e353] [cursor=pointer]:
              - /url: /invoice-for-plumbers
            - link "Painters" [ref=e354] [cursor=pointer]:
              - /url: /invoice-for-painters
            - link "Landscapers" [ref=e355] [cursor=pointer]:
              - /url: /invoice-for-landscapers
            - link "Handymen" [ref=e356] [cursor=pointer]:
              - /url: /invoice-for-handymen
          - generic [ref=e357]:
            - heading "Resources" [level=3] [ref=e358]
            - link "Free invoice generator" [ref=e359] [cursor=pointer]:
              - /url: /free-invoice-generator
            - link "Voice invoicing" [ref=e360] [cursor=pointer]:
              - /url: /voice-invoicing
            - link "How to invoice clients" [ref=e361] [cursor=pointer]:
              - /url: /how-to-invoice-clients
            - link "Blog" [ref=e362] [cursor=pointer]:
              - /url: /blog
          - generic [ref=e363]:
            - heading "Company" [level=3] [ref=e364]
            - link "Terms" [ref=e365] [cursor=pointer]:
              - /url: /terms
            - link "Privacy" [ref=e366] [cursor=pointer]:
              - /url: /privacy
      - generic [ref=e367]:
        - generic [ref=e368]: © 2026 InvoicePrepper
        - generic [ref=e369]: For personal record-keeping. Not a substitute for professional accounting or tax advice.
  - dialog "Welcome back" [ref=e371]:
    - button "← Back" [ref=e372] [cursor=pointer]
    - generic [ref=e373]: InvoicePrepper
    - generic [ref=e374]: Welcome back
    - generic [ref=e375]:
      - button "Sign Up" [ref=e376] [cursor=pointer]
      - button "Sign In" [ref=e377] [cursor=pointer]
    - button "Continue with Google" [ref=e378] [cursor=pointer]:
      - img [ref=e379]
      - text: Continue with Google
    - generic [ref=e385]: or
    - generic [ref=e386]:
      - generic:
        - textbox
      - generic [ref=e387]:
        - generic [ref=e388]: Email
        - textbox "Email" [active] [ref=e389]:
          - /placeholder: you@example.com
      - generic [ref=e390]:
        - generic [ref=e391]: Password
        - textbox "Password" [ref=e392]:
          - /placeholder: ••••••••
      - button "Sign In" [ref=e393] [cursor=pointer]
      - button "Forgot password?" [ref=e394] [cursor=pointer]
```

# Test source

```ts
  1   | /*
  2   |   ══════════════════════════════════════════════════════════════════════════════
  3   |   E2E: Accessibility: WCAG 2.1 AA + structural layout compliance
  4   |   File: e2e/accessibility.spec.js
  5   |   ══════════════════════════════════════════════════════════════════════════════
  6   | 
  7   |   WHY THIS MATTERS:
  8   |   ─────────────────
  9   |   Accessibility is a legal requirement in Canada (AODA), the US (ADA), and the
  10  |   EU (EAA). axe-core scans for WCAG violations automatically. Structural tests
  11  |   verify the page is correctly organised for screen readers and keyboard users.
  12  | 
  13  |   WHAT WE VERIFY:
  14  |   ───────────────
  15  |   WCAG + BEST PRACTICE (axe-core):
  16  |     1.  Landing page: no WCAG 2.1 AA or best-practice violations
  17  |     2.  Sign in modal: no WCAG 2.1 AA or best-practice violations
  18  |     3.  Sign up modal: no WCAG 2.1 AA or best-practice violations
  19  | 
  20  |   LAYOUT STRUCTURE (Playwright):
  21  |     4.  Page has exactly one <h1>
  22  |     5.  Heading hierarchy is not broken (no level skipped)
  23  |     6.  Page has a <nav> landmark
  24  |     7.  Page has a <main> or role="main" landmark
  25  |     8.  All images have non-empty alt text
  26  |     9.  All buttons have an accessible name
  27  |     10. All form inputs have an associated label
  28  |     11. Page <title> is set and non-empty
  29  | 
  30  |   KEYBOARD + INTERACTION:
  31  |     12. Sign In modal opens and closes with Escape
  32  |     13. Sign Up modal opens and closes with Escape
  33  |     14. First focusable element inside the auth modal receives focus on open
  34  | 
  35  |   WCAG LEVELS CHECKED:
  36  |   ────────────────────
  37  |   wcag2a, wcag2aa: legal standard (AODA, ADA, EAA)
  38  |   best-practice  : structural and semantic correctness
  39  |   ══════════════════════════════════════════════════════════════════════════════
  40  | */
  41  | 
  42  | import { test, expect } from "@playwright/test";
  43  | import AxeBuilder from "@axe-core/playwright";
  44  | 
  45  | // ─── HELPERS ─────────────────────────────────────────────────────────────────
  46  | 
  47  | async function finishAnimations(page) {
  48  |   await page.evaluate(() =>
  49  |     document.querySelectorAll("*").forEach((el) =>
  50  |       el.getAnimations().forEach((a) => a.finish())
  51  |     )
  52  |   );
  53  | }
  54  | 
  55  | // ─── WCAG + BEST PRACTICE ────────────────────────────────────────────────────
  56  | 
  57  | test.describe("Accessibility: WCAG + best practice", () => {
  58  |   test("landing page has no violations", async ({ page }) => {
  59  |     await page.goto("/");
  60  |     const results = await new AxeBuilder({ page })
  61  |       .withTags(["wcag2a", "wcag2aa", "best-practice"])
  62  |       .analyze();
  63  |     expect(results.violations).toEqual([]);
  64  |   });
  65  | 
  66  |   test("sign in modal has no violations", async ({ page }) => {
  67  |     await page.emulateMedia({ reducedMotion: "reduce" });
  68  |     await page.goto("/");
  69  |     await page.getByRole("button", { name: /^sign in$/i }).click();
  70  |     await page.getByText("Welcome back").waitFor();
  71  |     await finishAnimations(page);
  72  |     const results = await new AxeBuilder({ page })
  73  |       .withTags(["wcag2a", "wcag2aa", "best-practice"])
  74  |       .analyze();
> 75  |     expect(results.violations).toEqual([]);
      |                                ^ Error: expect(received).toEqual(expected) // deep equality
  76  |   });
  77  | 
  78  |   test("sign up modal has no violations", async ({ page }) => {
  79  |     await page.emulateMedia({ reducedMotion: "reduce" });
  80  |     await page.goto("/");
  81  |     await page.getByRole("button", { name: /^sign up$/i }).click();
  82  |     await page.getByText("Create your account").waitFor();
  83  |     await finishAnimations(page);
  84  |     const results = await new AxeBuilder({ page })
  85  |       .withTags(["wcag2a", "wcag2aa", "best-practice"])
  86  |       .analyze();
  87  |     expect(results.violations).toEqual([]);
  88  |   });
  89  | });
  90  | 
  91  | // ─── LAYOUT STRUCTURE ────────────────────────────────────────────────────────
  92  | 
  93  | test.describe("Accessibility: Layout structure", () => {
  94  |   test.beforeEach(async ({ page }) => {
  95  |     await page.goto("/");
  96  |     // Wait for React to render: nav is the first landmark React produces
  97  |     await page.locator("nav").first().waitFor({ timeout: 15000 });
  98  |   });
  99  | 
  100 |   test("page has exactly one h1", async ({ page }) => {
  101 |     const h1s = await page.locator("h1").all();
  102 |     expect(h1s.length).toBe(1);
  103 |   });
  104 | 
  105 |   test("heading hierarchy has no skipped levels", async ({ page }) => {
  106 |     const levels = await page.evaluate(() =>
  107 |       Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((el) =>
  108 |         parseInt(el.tagName[1])
  109 |       )
  110 |     );
  111 |     for (let i = 1; i < levels.length; i++) {
  112 |       expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  113 |     }
  114 |   });
  115 | 
  116 |   test("page has a navigation landmark", async ({ page }) => {
  117 |     await expect(page.locator("nav, [role='navigation']").first()).toBeVisible();
  118 |   });
  119 | 
  120 |   test("page has a main landmark", async ({ page }) => {
  121 |     const main = page.locator("main, [role='main']").first();
  122 |     const count = await page.locator("main, [role='main']").count();
  123 |     expect(count).toBeGreaterThanOrEqual(1);
  124 |     if (count > 0) await expect(main).toBeAttached();
  125 |   });
  126 | 
  127 |   test("all images have non-empty alt text", async ({ page }) => {
  128 |     const images = await page.locator("img").all();
  129 |     for (const img of images) {
  130 |       const alt = await img.getAttribute("alt");
  131 |       expect(alt).not.toBeNull();
  132 |       expect(alt?.trim().length).toBeGreaterThan(0);
  133 |     }
  134 |   });
  135 | 
  136 |   test("all buttons have an accessible name", async ({ page }) => {
  137 |     const unnamed = await page.evaluate(() =>
  138 |       Array.from(document.querySelectorAll("button")).filter(
  139 |         (el) =>
  140 |           !(
  141 |             el.getAttribute("aria-label")?.trim() ||
  142 |             el.getAttribute("title")?.trim() ||
  143 |             el.textContent?.trim()
  144 |           )
  145 |       ).length
  146 |     );
  147 |     expect(unnamed).toBe(0);
  148 |   });
  149 | 
  150 |   test("page title is set and non-empty", async ({ page }) => {
  151 |     const title = await page.title();
  152 |     expect(title.trim().length).toBeGreaterThan(0);
  153 |     expect(title).toContain("InvoicePrepper");
  154 |   });
  155 | });
  156 | 
  157 | test.describe("Accessibility: Form labels", () => {
  158 |   test("sign in form inputs all have labels", async ({ page }) => {
  159 |     await page.emulateMedia({ reducedMotion: "reduce" });
  160 |     await page.goto("/");
  161 |     await page.getByRole("button", { name: /^sign in$/i }).click();
  162 |     await page.getByText("Welcome back").waitFor();
  163 |     await finishAnimations(page);
  164 |     const inputs = await page.locator("input:not([type='hidden']):not([aria-hidden='true'])").all();
  165 |     for (const input of inputs) {
  166 |       const id = await input.getAttribute("id");
  167 |       const ariaLabel = await input.getAttribute("aria-label");
  168 |       const ariaLabelledBy = await input.getAttribute("aria-labelledby");
  169 |       const hasLabel = id
  170 |         ? (await page.locator(`label[for="${id}"]`).count()) > 0
  171 |         : false;
  172 |       const hasAriaLabel = !!ariaLabel || !!ariaLabelledBy;
  173 |       const hasPlaceholder = !!(await input.getAttribute("placeholder"));
  174 |       expect(hasLabel || hasAriaLabel || hasPlaceholder).toBe(true);
  175 |     }
```