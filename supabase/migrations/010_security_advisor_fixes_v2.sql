-- ============================================================
-- Migration 010: Supabase Security Advisor fixes (round 2)
-- Run in Supabase Dashboard > SQL Editor
--
-- Fixes WARN-level findings from Database Advisor:
--   1. Three SECURITY DEFINER functions in public schema are
--      callable by anon and authenticated roles via the auto-
--      generated /rest/v1/rpc/* endpoints.
--   2. Trigger functions still fire correctly after EXECUTE is
--      revoked: triggers run as the table owner, not the
--      caller, so REVOKE on the function does not affect them.
--
-- Auth-side: enable "Leaked password protection" in the
-- Supabase dashboard under Authentication > Policies. There is
-- no SQL equivalent; it is a project-level toggle.
-- ============================================================

-- 1. set_receipt_number(): trigger function on public.receipts
--    that assigns the next per-user invoice number on insert.
--    Should never be called directly via RPC.
REVOKE EXECUTE ON FUNCTION public.set_receipt_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_receipt_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_receipt_number() FROM authenticated;

-- 2. increment_invoice_seq(uid text): counter helper used by
--    set_receipt_number() and the per-user invoice sequence
--    flow. Internal use only.
REVOKE EXECUTE ON FUNCTION public.increment_invoice_seq(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_invoice_seq(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_invoice_seq(text) FROM authenticated;

-- 3. rls_auto_enable(): setup helper. Not part of the runtime
--    surface; should not be reachable from client roles.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
