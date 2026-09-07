-- ============================================================
-- Migration 018: enforce free invoice limit at the database level,
-- with existing users grandfathered out of it
--
-- This is a MONTHLY cap (3 invoices per calendar month), not a lifetime
-- cap. It resets on the 1st of every month, matching the "3 free invoices
-- a month" plan copy. Deleting an invoice does NOT free up a slot within
-- the same month: an active-only cap can be beaten by delete-then-recreate
-- inside the same month, so the count includes deleted rows for the current
-- month regardless. Restoring one from trash does not need separate
-- handling either: it doesn't create a new row, the invoice was already
-- counted against the month it was created in.
--
-- The receipts_insert RLS policy (001_rls_and_numbering.sql) only checks
-- ownership (auth.uid()::text = user_id), not plan limits - it has no idea
-- what "free tier" means. The application-level check in the receipts edge
-- function (supabase/functions/receipts/index.ts) is not sufficient on its
-- own for two reasons:
--   1. It is a plain COUNT-then-INSERT with no lock, so concurrent requests
--      can all read the same pre-insert count and all pass.
--   2. Anyone with the public anon key and their own JWT (both are visible
--      in the browser bundle / devtools) can call Supabase's PostgREST API
--      directly and insert into receipts, skipping the edge function's
--      check entirely.
-- This trigger is the real backstop: fires on every INSERT regardless of
-- caller, and takes a per-user advisory lock so concurrent inserts can't
-- all pass the count check before any of them commit.
--
-- Grandfathering: this cap is meant to apply to NEW signups going forward,
-- not to punish people who already signed up under "unlimited invoices,
-- free forever." The exemption backfill below (every profile that exists
-- right now gets flagged exempt) runs in the SAME script as the trigger
-- that enforces the cap, on purpose - running these as two separate
-- dashboard actions would leave a window where the trigger is live but no
-- one is exempted yet, and every existing user gets capped by accident in
-- that gap. One paste, one run, no gap possible.
--
-- Existing free users get ONLY the permanent unlimited-invoices exemption,
-- not a temporary Pro trial. A time-boxed grant of real Pro features
-- (email sending, logo) would silently expire and read as a bug rather
-- than "your trial ended," since nothing in the UI would explain it. The
-- permanent exemption has no expiry to explain: it is just always true.
-- The app surfaces this as an "Unlimited" badge and a one-time notice
-- (frontend/src/App.jsx), not real Pro tier access.
--
-- Run this ENTIRE file in one go in Supabase Dashboard -> SQL Editor.
-- ============================================================

-- 1. Exemption flag. Declared before the backfill and the trigger both use it.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legacy_unlimited_invoices BOOLEAN NOT NULL DEFAULT false;

-- 2. One-time snapshot: every profile that exists at the moment this script
-- runs is permanently exempt from the cap. Any profile created after this
-- point defaults to false (not exempt) and is subject to the cap.
UPDATE profiles SET legacy_unlimited_invoices = true;

-- 3. The actual cap, enforced from this point forward.
CREATE OR REPLACE FUNCTION enforce_free_invoice_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_tier TEXT;
  is_legacy BOOLEAN;
  grant_until TIMESTAMPTZ;
  monthly_count INT;
BEGIN
  SELECT tier, legacy_unlimited_invoices, pro_grant_until
    INTO user_tier, is_legacy, grant_until
    FROM profiles WHERE user_id = NEW.user_id;

  -- Grandfathered users are exempt, permanently, regardless of tier.
  IF COALESCE(is_legacy, false) THEN
    RETURN NEW;
  END IF;

  -- Active temporary Pro grant (referral reward) is also exempt. Without this,
  -- a referred user who sees themselves as Pro everywhere else in the app
  -- (GET /profile overlays their tier to "pro" while a grant is active) would
  -- still get capped and blocked here, since this trigger only sees the raw
  -- underlying tier - matches the same rule supabase/functions/_shared/freeLimit.ts
  -- applies on the app side.
  IF grant_until IS NOT NULL AND grant_until > now() THEN
    RETURN NEW;
  END IF;

  IF COALESCE(user_tier, 'free') = 'free' THEN
    -- Serialize concurrent inserts for this user for the remainder of this
    -- transaction, so the count read below can't race another insert's count
    -- read. Only taken here, not above, so it never runs for Pro/Voice/legacy/
    -- grant-exempt users who can never hit the cap.
    PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id));

    -- Monthly count: every row this user has created since the start of the
    -- current calendar month, active or deleted. Resets naturally next month
    -- because the window itself moves, nothing to reset by hand.
    SELECT COUNT(*) INTO monthly_count FROM receipts
      WHERE user_id = NEW.user_id
        AND created_at >= date_trunc('month', now());

    IF monthly_count >= 3 THEN
      RAISE EXCEPTION 'FREE_LIMIT_REACHED: Free plan is limited to 3 invoices per month.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_enforce_free_invoice_limit ON receipts;
CREATE TRIGGER trigger_enforce_free_invoice_limit
  BEFORE INSERT ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION enforce_free_invoice_limit();
