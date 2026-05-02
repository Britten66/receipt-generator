-- ============================================================
-- Migration 011: Admin user overview view
-- Run in Supabase Dashboard > SQL Editor
--
-- One row per signed-up user, joining auth.users + profiles
-- with aggregate counts from receipts. Used by the /admin
-- page to give the founder a single-table view of who is
-- using the product and what they are doing.
--
-- Access: SELECT granted to service_role only. The admin
-- edge function uses service role and gates by founder email
-- before returning rows.
-- ============================================================

CREATE OR REPLACE VIEW public.admin_user_overview AS
SELECT
  u.id::text                                       AS user_id,
  u.email                                          AS email,
  u.created_at                                     AS signed_up_at,
  COALESCE(p.tier, 'free')                         AS tier,
  p.business_name                                  AS business_name,
  p.terms_agreed_at                                AS terms_agreed_at,
  p.email_marketing_ok                             AS email_marketing_ok,
  COALESCE(r.invoice_count,    0)                  AS invoice_count,
  COALESCE(r.sent_count,       0)                  AS sent_count,
  COALESCE(r.paid_count,       0)                  AS paid_count,
  COALESCE(r.draft_count,      0)                  AS draft_count,
  r.last_invoice_at                                AS last_invoice_at,
  EXTRACT(DAY FROM NOW() - u.created_at)::int      AS days_since_signup
FROM auth.users u
LEFT JOIN public.profiles p
       ON p.user_id = u.id::text
LEFT JOIN (
  SELECT
    user_id,
    COUNT(*)                                              AS invoice_count,
    COUNT(*) FILTER (WHERE status = 'sent')               AS sent_count,
    COUNT(*) FILTER (WHERE status = 'paid')               AS paid_count,
    COUNT(*) FILTER (WHERE status = 'draft')              AS draft_count,
    MAX(created_at)                                       AS last_invoice_at
  FROM public.receipts
  GROUP BY user_id
) r ON r.user_id = u.id::text;

REVOKE ALL ON public.admin_user_overview FROM PUBLIC;
REVOKE ALL ON public.admin_user_overview FROM anon;
REVOKE ALL ON public.admin_user_overview FROM authenticated;
GRANT  SELECT ON public.admin_user_overview TO service_role;
