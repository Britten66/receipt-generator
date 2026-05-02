# Uh-oh prevention

The complete list of failure modes that would have hurt you, and where each one is blocked.

## Fraud and abuse

**Self-referral.** User creates a second account, refers themselves, gets a free month.
- Blocked: trigger compares `referrer_profile.user_id` to `referee_profile.user_id` and exits if they match. Marked claimed so it cannot retry.

**Throwaway-email farming.** Bot creates 50 mailinator accounts, refers themselves from one master account.
- Partial block: Supabase requires email confirmation before the account is usable. The trigger only fires on receipts insert, and creating a receipt requires a confirmed user.
- Residual risk: a determined attacker with 50 real-looking emails could still farm grants. The 90-day cap means the maximum loss per attacker is 90 days of Pro = $27 CAD. Acceptable at your stage.

**Code guessing.** Try random codes hoping to attribute referrals to your code.
- Blocked: 8 chars from a 32-symbol alphabet = 1.1 trillion combinations. Not feasible.

**Code spoofing via PUT.** User edits their profile to set their own `referred_by_code` to a popular code, then creates an invoice to claim a grant for someone else.
- Blocked: profile PUT whitelist does not include `referred_by_code`. The column is set once on profile insert and never thereafter via the API.

**Grant tampering.** User edits their profile to set `pro_grant_until` directly.
- Blocked: same whitelist. `pro_grant_until` is not in the PUT body fields. Only the trigger can write it.

**Idempotency abuse.** Friend creates many invoices hoping each grants a month.
- Blocked: `referral_claimed` boolean. Trigger sets it to true on first qualifying receipt. Subsequent receipts skip the grant logic entirely.

**Stack pile-up.** Power user refers 50 friends in a week, expects 50 months of Pro.
- Blocked: trigger caps `pro_grant_until` at `now() + 90 days`. Anything over the cap is silently truncated.

## Operational

**Receipt creation fails after grant fires.** The grant trigger runs as part of the same transaction as the insert. If the insert rolls back, the grant rolls back. No orphan grants.

**Referrer deletes their account before being granted.** The trigger looks up the referrer at fire time. If they are gone, the lookup returns no rows, the trigger marks the referee claimed and exits cleanly. No errors logged.

**Code collision on insert.** The auto-generate trigger loops until it finds a free code. With 1.1 trillion combinations and your scale, this is effectively never going to retry.

**Admin view leaks codes.** The admin view `admin_user_overview` is locked to `service_role` only. The `admin-stats` edge function is gated by your founder email server-side.

## UX

**Existing users have no code.** Migration backfills a code for every existing profile in a `DO $$` block. Run once on deploy.

**Free user sees Pro features disappear when grant expires.** This is correct behavior but feels bad. Mitigation: profile API returns `pro_grant_until`. Frontend can show "X days of Pro left" so the expiry is not a surprise.

**Stripe Pro user gets a grant — does it stack onto their paid sub?** No. The grant timestamp lives independently. When they cancel Stripe, the grant kicks in for whatever days remain. Expected behavior, not a leak.

**User signs up via `?ref=` but never confirms email.** Pending code sits in localStorage forever, gets attached if they later sign up. This is fine and is what you want.

**User signs up via `?ref=` but already has an account.** The pending code is consumed by `fetchProfile` on next call. If their profile already exists, `referred_by_code` is not in the PUT path, so no overwrite happens. Existing users cannot retroactively be referred.

## What is NOT prevented (acceptable risks at your stage)

- Two friends referring each other in a circle within 24 hours. Both get a month. This is essentially "two friends signing up together," which you want.
- A user pasting their own code in a public Reddit thread. Anyone can use it. This is the point of a referral program.
- Bots creating accounts using a referral code that does not exist. Trigger marks claimed and exits silently.
