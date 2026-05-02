# ROI analysis

## Per-referral economics

| Item | Value |
|---|---|
| Referee gets | 30 days of Pro access |
| Referrer gets | 30 days of Pro access |
| Total free-Pro-days given per qualified referral | 60 |
| Foregone revenue if referee was already a Pro buyer | $9 CAD |
| Foregone revenue if referrer was already a Pro buyer | $9 CAD |
| Worst-case foregone revenue per referral | $18 CAD |
| Best-case (both were on Free, both stay on Free after) | $0 actual cost |

## What pays for it

The math works if the long-tail conversion to paid Pro on either side > 17% per referral:
- $18 worst-case foregone revenue per referral.
- One sticky Pro user is worth roughly $50 to $150 over their lifetime (3 to 12 months at $9/mo).
- So if 1 in 6 referrals produces a paying user who would not have come through any other channel, you are even.

At your current scale (1 to 2 active users) the absolute revenue impact is tiny either way. The mechanic is being installed for the moment when active users hit ~50.

## Why no stacking

You asked: stackable only if I say so. I say no, with one nuance.

Grants do *extend* — if you have 12 days of Pro left and a friend qualifies, you now have 42 days. But they cannot pile up beyond **90 days from now**. The cap is hardcoded in the trigger:

```sql
cap := now() + interval '90 days';
IF new_grant > cap THEN new_grant := cap; END IF;
```

So if a power user refers 10 friends in a week, they get 90 days of Pro, not 300 days. Bounded blast radius.

## Worst-case edge cases and what stops them

| Scenario | Block |
|---|---|
| Self-referral via second account | Same `user_id` check in the trigger |
| Referee never confirms email and creates fake invoices | Email confirmation required by Supabase before account is usable; admin view filters unconfirmed |
| Bot loops creating fake referrals | `referral_claimed` boolean is one-shot per referee; trigger marks it claimed even on bad codes so it cannot retry |
| Power user farms grants | 90-day cap hardcoded server-side |
| Frontend tampering to grant Pro | Grant lives in DB column with no client write path; profile PUT whitelist excludes referral fields |
| Code guessing | 8 chars from 32-symbol alphabet = 1.1 trillion combos. Dictionary attack is not practical against your traffic |

## Why "first invoice" is the trigger, not "first paid upgrade"

A first paid upgrade trigger would mean almost no grants ever fire, because most referees stay on the free tier. The mechanic would feel broken. First invoice is:
- Easy to hit (free tier creates them)
- Proof of a real human (bots do not bother)
- Same-day feedback for the referrer (psychologically important)

If you find people farming fake invoices to qualify, we can tighten to "first invoice with at least one line item totaling >= $10" without changing the schema.

## Kill criteria

If after 30 days of having at least 50 active users you see fewer than 5 referrals produce a sticky paid user, kill the mechanic and rebuild based on whatever channel actually worked. Track in the admin view: `friends_referred` column already added.
