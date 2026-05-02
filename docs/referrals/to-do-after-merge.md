# Manual deploy steps

## 1. Run migration 012

Supabase Dashboard → SQL Editor → paste the contents of `supabase/migrations/012_referrals.sql` → Run.

This will:
- Add `referral_code`, `referred_by_code`, `pro_grant_until`, `referral_claimed` columns to profiles
- Backfill a code on every existing profile
- Install the auto-generate code trigger
- Install the grant-on-receipt-insert trigger
- Update the admin view to surface referral data

Verify with:
```sql
SELECT user_id, referral_code FROM public.profiles ORDER BY created_at DESC LIMIT 5;
```

Every row should have a code now.

## 2. Deploy edge functions

```
supabase functions deploy referral-info
supabase functions deploy profile
```

Both required:
- `referral-info` is the new endpoint that powers the profile modal block
- `profile` was modified to consume `?ref=` on first fetch and to overlay grants on tier

## 3. Push the frontend

Already pushed via git. Cloudflare Pages auto-deploys.

## 4. Email your existing users

Open `docs/referrals/email-template.html`. Get each user's `referral_code` from the admin view:

```sql
SELECT email, referral_code FROM public.admin_user_overview ORDER BY signed_up_at DESC;
```

Paste the email into Resend, replace `{{REFERRAL_CODE}}` per recipient (or use Resend's variable substitution if you set it up).

Send.

## 5. Verify end-to-end

Use a test email you control:

1. Sign up for a new account at `invoiceprepper.com/?ref=YOUR_CODE`
2. Confirm the email
3. Sign in. Profile modal should show your code in the Referral block.
4. Open the test account, create one invoice with any data, save it.
5. Refresh your profile. `pro_grant_until` should now be ~30 days in the future.
6. The test account should also see Pro features unlocked (the server returns `tier=pro` because of the grant).

If steps 4 and 5 work, the trigger is alive. Ship it.

## What to watch in admin

The admin view now includes:
- `referral_code` per user
- `referred_by_code` (who invited them)
- `pro_grant_until` (when their grant expires)
- `friends_referred` (count of confirmed grants they have driven)

Sort by `friends_referred DESC` to find power referrers. Email them personally to thank them.
