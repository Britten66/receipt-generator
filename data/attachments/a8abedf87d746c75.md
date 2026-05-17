# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: billing.spec.js >> Billing >> trash button opens recently deleted modal
- Location: src/__tests__/e2e/billing.spec.js:36:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.trash-btn')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - button "Dark" [ref=e6] [cursor=pointer]
      - button "Upgrade" [ref=e7] [cursor=pointer]:
        - generic [ref=e8]: Upgrade
    - generic [ref=e9]: Sunday, May 17
    - generic [ref=e10]:
      - button "Refer a friend" [ref=e11] [cursor=pointer]:
        - img [ref=e12]
      - button "Notifications" [ref=e16] [cursor=pointer]:
        - img [ref=e17]
      - button "User menu" [ref=e20] [cursor=pointer]:
        - generic [ref=e21]: A
  - complementary [ref=e22]:
    - button "Create new invoice" [ref=e24] [cursor=pointer]:
      - img [ref=e25]
      - generic [ref=e26]: New Invoice
    - generic [ref=e27]:
      - generic [ref=e28]:
        - generic [ref=e29]: Revenue
        - generic [ref=e30]: $0.00
      - generic [ref=e31]:
        - generic [ref=e32]: Outstanding
        - generic [ref=e33]: $0.00
        - generic [ref=e34]: inc. tax
      - generic [ref=e35]:
        - generic [ref=e36]: Invoices
        - generic [ref=e37]: "0"
    - generic [ref=e38]:
      - generic [ref=e39]: View
      - button "All 0" [ref=e40] [cursor=pointer]:
        - text: All
        - generic [ref=e41]: "0"
      - button "Draft 0" [ref=e42] [cursor=pointer]:
        - text: Draft
        - generic [ref=e43]: "0"
      - button "Sent 0" [ref=e44] [cursor=pointer]:
        - text: Sent
        - generic [ref=e45]: "0"
      - button "Paid 0" [ref=e46] [cursor=pointer]:
        - text: Paid
        - generic [ref=e47]: "0"
      - button "Voided 0" [ref=e48] [cursor=pointer]:
        - text: Voided
        - generic [ref=e49]: "0"
    - generic [ref=e50]:
      - button "+ Add Business Profile" [ref=e51] [cursor=pointer]
      - group "Account actions" [ref=e52]:
        - button "Billing" [ref=e53] [cursor=pointer]:
          - img [ref=e54]
          - generic [ref=e56]: Billing
        - button "Terms" [ref=e57] [cursor=pointer]:
          - img [ref=e58]
          - generic [ref=e61]: Terms
        - button "Recently deleted" [ref=e62] [cursor=pointer]:
          - img [ref=e63]
          - generic [ref=e66]: Trash
        - button "Help" [ref=e67] [cursor=pointer]:
          - img [ref=e68]
          - generic [ref=e71]: Help
  - main [ref=e72]:
    - generic [ref=e73]:
      - generic [ref=e74]: Good evening, autotester
      - generic [ref=e75]: "All: 0 invoices"
      - button "Switch to card grid" [pressed] [ref=e76] [cursor=pointer]:
        - img [ref=e77]
    - generic [ref=e84]: No invoices found
  - link "Send feedback" [ref=e85] [cursor=pointer]:
    - /url: https://tally.so/r/2EJZRM
    - text: Feedback
```

# Test source

```ts
  1  | /*
  2  |   E2E: Billing: open modal, plan display, close
  3  |   Suite: Billing
  4  | */
  5  | 
  6  | import { test, expect } from "@playwright/test";
  7  | 
  8  | test.describe("Billing", () => {
  9  |   test.beforeEach(async ({ page }) => {
  10 |     await page.goto("/");
  11 |     await page.locator(".sidebar").waitFor({ timeout: 15000 });
  12 |   });
  13 | 
  14 |   test("billing link is visible in sidebar", async ({ page }) => {
  15 |     await expect(page.locator(".sidebar").getByText(/billing/i)).toBeVisible();
  16 |   });
  17 | 
  18 |   test("clicking billing opens modal", async ({ page }) => {
  19 |     await page.locator(".sidebar").getByText(/billing/i).click();
  20 |     await expect(page.locator(".modal-title")).toContainText("Billing");
  21 |   });
  22 | 
  23 |   test("billing modal shows current plan", async ({ page }) => {
  24 |     await page.locator(".sidebar").getByText(/billing/i).click();
  25 |     await page.locator(".modal").waitFor();
  26 |     await expect(page.locator(".modal")).toContainText(/free|pro|voice/i);
  27 |   });
  28 | 
  29 |   test("billing modal closes on Escape", async ({ page }) => {
  30 |     await page.locator(".sidebar").getByText(/billing/i).click();
  31 |     await page.locator(".modal").waitFor();
  32 |     await page.keyboard.press("Escape");
  33 |     await expect(page.locator(".modal")).not.toBeVisible();
  34 |   });
  35 | 
  36 |   test("trash button opens recently deleted modal", async ({ page }) => {
> 37 |     await page.locator(".trash-btn").click();
     |                                      ^ Error: locator.click: Test timeout of 60000ms exceeded.
  38 |     await expect(page.locator(".modal")).toBeVisible();
  39 |   });
  40 | });
  41 | 
```