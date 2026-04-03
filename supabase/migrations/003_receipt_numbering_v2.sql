-- ============================================================
-- Migration 003: Receipt numbering format change
-- Old format: REC-000001 (starts at 1)
-- New format: 001001     (6-digit numeric, starts at 1001)
--
-- Run this in Supabase Dashboard → SQL Editor
--
-- Safe on existing data:
--   Old-format receipts (REC-XXXXXX) are excluded by the
--   '^[0-9]{6}$' regex so they never conflict with new ones.
--   UNIQUE constraint (user_id, receipt_number) catches any
--   concurrent-insert race — the DB rejects the duplicate.
-- ============================================================

CREATE OR REPLACE FUNCTION set_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Find the highest existing receipt number in the new 6-digit format.
  -- CAST to INTEGER works because the regex guarantees only digits.
  -- COALESCE to 1000 so the first invoice for any user becomes 1001 → '001001'.
  -- Old REC-XXXXXX receipts are filtered out by the regex and never influence next_num.
  SELECT COALESCE(MAX(CAST(receipt_number AS INTEGER)), 1000) + 1
    INTO next_num
    FROM receipts
   WHERE user_id = NEW.user_id
     AND receipt_number ~ '^[0-9]{6}$';

  NEW.receipt_number = LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists from migration 001 — no need to recreate it.
-- The trigger calls set_receipt_number() by name, so replacing the
-- function above is all that is required.
