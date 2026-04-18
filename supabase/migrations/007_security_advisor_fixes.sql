-- ============================================================
-- Migration 007: Supabase Security Advisor fixes
-- Run in Supabase Dashboard > SQL Editor
--
-- Fixes three WARN-level findings from Database Advisor:
--   1. `logos` bucket broad SELECT policies allow anonymous
--      listing of every user's logo path (paths contain
--      sanitised emails → user enumeration).
--   2. `public.set_updated_at` has mutable search_path
--      (privilege-escalation hardening).
--   3. Tighten anonymous role on public.* tables to
--      authenticated-only (noise-or-real depending on existing
--      policy bodies; this is defence-in-depth).
--
-- Direct object URLs on the public `logos` bucket continue to
-- work after dropping SELECT policies. getPublicUrl() routes
-- through the public object endpoint which does not require
-- a SELECT policy. Only LIST/enumeration does.
-- ============================================================

-- 1. Drop broad SELECT policies on the logos bucket.
--    getPublicUrl() in uploadLogo.js keeps working because
--    direct object access bypasses storage.objects RLS on
--    public buckets.
DROP POLICY IF EXISTS "Public can read logos"                   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos 1peuqw_1" ON storage.objects;

-- 2. Pin search_path on set_updated_at so the function resolves
--    every unqualified identifier against the `public` schema
--    and nothing else. Blocks schema-injection privilege
--    escalation in SECURITY DEFINER contexts.
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;

-- 3. Re-scope anon-exposed policies on public.* tables to the
--    `authenticated` role only. Every existing body already
--    filters by auth.uid(), which resolves to NULL for anon,
--    but the advisor flags the role grant itself. Recreating
--    the policies with an explicit TO clause removes the flag.

-- receipts
DROP POLICY IF EXISTS receipts_select ON public.receipts;
DROP POLICY IF EXISTS receipts_update ON public.receipts;
DROP POLICY IF EXISTS receipts_delete ON public.receipts;

CREATE POLICY receipts_select ON public.receipts
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY receipts_update ON public.receipts
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY receipts_delete ON public.receipts
  FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- profiles
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_delete ON public.profiles;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- line_items (ownership goes through receipts)
DROP POLICY IF EXISTS line_items_select ON public.line_items;
DROP POLICY IF EXISTS line_items_delete ON public.line_items;

CREATE POLICY line_items_select ON public.line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts r
       WHERE r.id = line_items.receipt_id
         AND r.user_id = auth.uid()::text
    )
  );

CREATE POLICY line_items_delete ON public.line_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts r
       WHERE r.id = line_items.receipt_id
         AND r.user_id = auth.uid()::text
    )
  );

-- voice_usage
-- Note: public.voice_usage.user_id is typed `uuid`, not `text` like
-- receipts/profiles. Compare uuid-to-uuid directly; casting auth.uid()
-- to text against a uuid column raises "operator does not exist:
-- text = uuid" and the CREATE POLICY statement fails.
DROP POLICY IF EXISTS "read own" ON public.voice_usage;

CREATE POLICY "read own" ON public.voice_usage
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
