# Referral program

Double-sided 1-month-Pro-each referral. Built for InvoicePrepper.

## Files in this folder

- `README.md` (this file) — overview and what to do after deploy
- `email-template.html` — paste this into Resend to email existing users
- `flow.md` — end-to-end user journey
- `roi-analysis.md` — the math, the cap, why this version
- `uh-oh-prevention.md` — fraud and edge cases that are blocked
- `to-do-after-merge.md` — your manual deploy steps

## The mechanic in one paragraph

Every user gets a unique 8-character referral code on signup. They share `invoiceprepper.com/?ref=THEIRCODE` with friends. When a friend signs up via that link, the code is stored on the friend's profile. The friend creates their first invoice. A database trigger fires, the friend's referral is marked claimed, and the original user's `pro_grant_until` is extended by 30 days. The friend also lands on Pro for free for 30 days because the server returns `tier=pro` whenever a grant is active.

## What ships

**Database:**
- `profiles.referral_code` (unique 8-char), `referred_by_code`, `pro_grant_until`, `referral_claimed`
- Auto-generate code on profile insert
- Trigger on receipts insert that grants the referrer
- Hardened: SECURITY DEFINER, search_path pinned, EXECUTE revoked from anon and authenticated
- Self-referral blocked, idempotent grant, 90-day cap on grant pile-up

**Backend:**
- `GET /functions/v1/referral-info` — returns the user's code, share URL, friends referred, grant status
- `GET /functions/v1/profile?ref=CODE` — captures the code on the very first profile fetch after signup
- Profile API now returns `tier=pro` when a grant is active and Stripe tier is free, so existing feature gates work without a refactor. The original Stripe-driven tier is exposed as `stripe_tier` for the billing UI.

**Frontend:**
- `captureRefFromUrl()` runs on app boot, parses `?ref=`, stores it in localStorage as `pending_ref_code`
- `fetchProfile()` attaches the pending code to the first profile fetch and clears it on success
- ProfileModal has a new "Refer a friend" block: code, copy-to-clipboard share link, friends referred count, days of Pro remaining

## What you do after merging this PR

See `to-do-after-merge.md`.
