-- ============================================================
-- Migration 004: Security hardening
-- Run this in Supabase Dashboard > SQL Editor
--
-- Fixes:
--   1. set_receipt_number() SECURITY DEFINER function missing
--      SET search_path — mutable search path allows privilege
--      escalation via schema injection. Fix: pin to public.
--
--   2. profiles RLS missing DELETE policy — authenticated users
--      could not delete their own profile row, and anon role had
--      implicit access through missing policy.
-- ============================================================

-- 1. Patch set_receipt_number() with explicit search_path
--    Identical logic to migration 003, adds SET search_path = public.
CREATE OR REPLACE FUNCTION set_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(receipt_number AS INTEGER)), 1000) + 1
    INTO next_num
    FROM receipts
   WHERE user_id = NEW.user_id
     AND receipt_number ~ '^[0-9]{6}$';

  NEW.receipt_number = LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- 2. Add DELETE policy on profiles so authenticated users can
--    remove their own row (e.g. account deletion). Keeps anon out.
CREATE POLICY profiles_delete ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- 3. Explicitly scope existing profiles policies to authenticated role
--    (they were created without TO clause — defaults to PUBLIC which
--    includes the anon role). Recreate them scoped properly.
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;

CREATE POLICY profiles_select ON profiles
  FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY profiles_insert ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY profiles_update ON profiles
  FOR UPDATE TO authenticated USING (auth.uid()::text = user_id);

-- 4. Scope receipts and line_items policies to authenticated as well
DROP POLICY IF EXISTS receipts_select ON receipts;
DROP POLICY IF EXISTS receipts_insert ON receipts;
DROP POLICY IF EXISTS receipts_update ON receipts;
DROP POLICY IF EXISTS receipts_delete ON receipts;
DROP POLICY IF EXISTS line_items_select ON line_items;
DROP POLICY IF EXISTS line_items_insert ON line_items;
DROP POLICY IF EXISTS line_items_delete ON line_items;

CREATE POLICY receipts_select ON receipts
  FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY receipts_insert ON receipts
  FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY receipts_update ON receipts
  FOR UPDATE TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY receipts_delete ON receipts
  FOR DELETE TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY line_items_select ON line_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM receipts
    WHERE receipts.id = line_items.receipt_id
      AND receipts.user_id = auth.uid()::text
  ));

CREATE POLICY line_items_insert ON line_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM receipts
    WHERE receipts.id = line_items.receipt_id
      AND receipts.user_id = auth.uid()::text
  ));

CREATE POLICY line_items_delete ON line_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM receipts
    WHERE receipts.id = line_items.receipt_id
      AND receipts.user_id = auth.uid()::text
  ));
