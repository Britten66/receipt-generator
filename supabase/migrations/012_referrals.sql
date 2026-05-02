-- ============================================================
-- Migration 012: Referral program
-- Run in Supabase Dashboard > SQL Editor
--
-- Mechanic:
--   - Every profile gets a unique 8-char uppercase referral_code
--   - Signup with ?ref=CODE stores referred_by_code on the new profile
--   - When the referred user creates their first receipt, the
--     referrer's pro_grant_until is extended by 30 days
--   - One grant per referred user, ever (DB unique constraint)
--   - No stacking beyond +90 days from now (prevents revenue cliff)
--   - Self-referral is blocked
-- ============================================================

-- 1. New columns on profiles.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code      text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_code   text,
  ADD COLUMN IF NOT EXISTS pro_grant_until    timestamptz,
  ADD COLUMN IF NOT EXISTS referral_claimed   boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code     ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_code  ON public.profiles(referred_by_code);

-- 2. Generate a random 8-char uppercase alphanumeric code.
--    Excludes ambiguous chars (0/O, 1/I) for human readability.
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result   text := '';
  i        int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 3. Backfill: every existing profile gets a code if missing.
DO $$
DECLARE
  r record;
  new_code text;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles WHERE referral_code IS NULL LOOP
    LOOP
      new_code := public.generate_referral_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
    END LOOP;
    UPDATE public.profiles SET referral_code = new_code WHERE user_id = r.user_id;
  END LOOP;
END $$;

-- 4. Trigger: auto-generate referral_code on new profile insert.
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := public.generate_referral_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_referral_code ON public.profiles;
CREATE TRIGGER trg_set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_referral_code();

-- 5. Grant logic. Triggered after a receipt insert.
--    Idempotent: referral_claimed boolean ensures only first invoice qualifies.
--    Self-referral blocked: referrer_id != referee user_id.
--    Cap: pro_grant_until cannot exceed now() + 90 days.
CREATE OR REPLACE FUNCTION public.claim_referral_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  referee_profile public.profiles%ROWTYPE;
  referrer_profile public.profiles%ROWTYPE;
  current_grant timestamptz;
  new_grant     timestamptz;
  cap           timestamptz;
BEGIN
  -- Look up the referee's profile.
  SELECT * INTO referee_profile FROM public.profiles WHERE user_id = NEW.user_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Already claimed for this user. Skip.
  IF referee_profile.referral_claimed = true THEN RETURN NEW; END IF;

  -- No referral code on signup. Nothing to do.
  IF referee_profile.referred_by_code IS NULL THEN RETURN NEW; END IF;

  -- Find referrer.
  SELECT * INTO referrer_profile FROM public.profiles WHERE referral_code = referee_profile.referred_by_code;
  IF NOT FOUND THEN
    -- Bad code, mark claimed so we do not re-check on every future receipt.
    UPDATE public.profiles SET referral_claimed = true WHERE user_id = NEW.user_id;
    RETURN NEW;
  END IF;

  -- Self-referral block.
  IF referrer_profile.user_id = referee_profile.user_id THEN
    UPDATE public.profiles SET referral_claimed = true WHERE user_id = NEW.user_id;
    RETURN NEW;
  END IF;

  -- Compute new grant. Extend from current expiry if active, else from now.
  current_grant := COALESCE(referrer_profile.pro_grant_until, now());
  IF current_grant < now() THEN current_grant := now(); END IF;

  new_grant := current_grant + interval '30 days';

  -- Cap at +90 days from now to prevent stacking abuse.
  cap := now() + interval '90 days';
  IF new_grant > cap THEN new_grant := cap; END IF;

  -- Apply grant to referrer.
  UPDATE public.profiles
     SET pro_grant_until = new_grant
   WHERE user_id = referrer_profile.user_id;

  -- Apply 30-day grant to referee as well (the promised "friend gets 1 month free").
  -- Same cap of now() + 90 days. Extends from current expiry if active.
  DECLARE
    referee_current timestamptz := COALESCE(referee_profile.pro_grant_until, now());
    referee_new     timestamptz;
  BEGIN
    IF referee_current < now() THEN referee_current := now(); END IF;
    referee_new := referee_current + interval '30 days';
    IF referee_new > cap THEN referee_new := cap; END IF;
    UPDATE public.profiles
       SET pro_grant_until = referee_new,
           referral_claimed = true
     WHERE user_id = referee_profile.user_id;
  END;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_referral_grant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_referral_grant() FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_referral_grant() FROM authenticated;

-- 6. Trigger: claim referral on receipts INSERT.
DROP TRIGGER IF EXISTS trg_claim_referral_grant ON public.receipts;
CREATE TRIGGER trg_claim_referral_grant
  AFTER INSERT ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_referral_grant();

-- 7. Update admin view to surface referral data.
--    DROP first because CREATE OR REPLACE refuses to reorder columns.
DROP VIEW IF EXISTS public.admin_user_overview;
CREATE VIEW public.admin_user_overview AS
SELECT
  u.id::text                                       AS user_id,
  u.email                                          AS email,
  u.created_at                                     AS signed_up_at,
  COALESCE(p.tier, 'free')                         AS tier,
  p.business_name                                  AS business_name,
  p.terms_agreed_at                                AS terms_agreed_at,
  p.email_marketing_ok                             AS email_marketing_ok,
  p.referral_code                                  AS referral_code,
  p.referred_by_code                               AS referred_by_code,
  p.pro_grant_until                                AS pro_grant_until,
  COALESCE(r.invoice_count, 0)                     AS invoice_count,
  COALESCE(r.sent_count,    0)                     AS sent_count,
  COALESCE(r.paid_count,    0)                     AS paid_count,
  COALESCE(r.draft_count,   0)                     AS draft_count,
  r.last_invoice_at                                AS last_invoice_at,
  EXTRACT(DAY FROM NOW() - u.created_at)::int      AS days_since_signup,
  (SELECT COUNT(*) FROM public.profiles ref
     WHERE ref.referred_by_code = p.referral_code
       AND ref.referral_claimed = true)            AS friends_referred
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id::text
LEFT JOIN (
  SELECT
    user_id,
    COUNT(*)                                  AS invoice_count,
    COUNT(*) FILTER (WHERE status = 'sent')   AS sent_count,
    COUNT(*) FILTER (WHERE status = 'paid')   AS paid_count,
    COUNT(*) FILTER (WHERE status = 'draft')  AS draft_count,
    MAX(created_at)                           AS last_invoice_at
  FROM public.receipts
  GROUP BY user_id
) r ON r.user_id = u.id::text
WHERE u.email_confirmed_at IS NOT NULL;

REVOKE ALL ON public.admin_user_overview FROM PUBLIC;
REVOKE ALL ON public.admin_user_overview FROM anon;
REVOKE ALL ON public.admin_user_overview FROM authenticated;
GRANT  SELECT ON public.admin_user_overview TO service_role;
