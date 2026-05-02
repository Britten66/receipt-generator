# End-to-end flow

## Existing user (referrer side)

1. Opens InvoicePrepper, hits Profile.
2. Sees the "Refer a friend" block. Their code is `ABC2KP9X`.
3. Clicks "Copy link". Clipboard has `https://invoiceprepper.com/?ref=ABC2KP9X`.
4. Sends the link to a friend.

## New user (referee side)

1. Clicks the link. Lands on the marketing page with `?ref=ABC2KP9X` in the URL.
2. Frontend `captureRefFromUrl()` runs at app boot, parses the param, stores `pending_ref_code: "ABC2KP9X"` in localStorage.
3. They sign up with their email. Supabase Auth confirms via email.
4. After confirmation, the frontend calls `fetchProfile()`. The pending code rides along as a query param: `GET /functions/v1/profile?ref=ABC2KP9X`.
5. Server creates the profile row with `referred_by_code='ABC2KP9X'`. Localstorage is cleared.
6. They create their first invoice.
7. Database trigger `trg_claim_referral_grant` fires.
   - Looks up referrer by code.
   - Self-referral check (referrer_id != referee user_id). Skip if same.
   - Bumps the referrer's `pro_grant_until` by 30 days.
   - Caps at now + 90 days.
   - Marks the referee's `referral_claimed = true` so the trigger never fires for them again.

## Tier propagation

- The profile API GET handler runs `applyGrantToTier()` on every response.
- If `tier === 'free'` and `pro_grant_until > now()`, the response sets `tier: 'pro'` and adds `stripe_tier: 'free'`.
- Existing `profile?.tier === 'pro'` checks across the frontend continue to work.
- BillingModal can use `stripe_tier` to know if the user is actually paying Stripe versus just on a grant.

## What does NOT happen

- The grant does not extend the user's Stripe subscription. If they are already paying Pro, the grant timestamp is set but doesn't affect their Stripe billing. They get the grant *after* they cancel Stripe Pro, automatically.
- The grant does not auto-upgrade them to Voice AI. Pro only.
- No emails are sent automatically. You email people manually using the template.
