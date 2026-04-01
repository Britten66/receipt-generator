-- ============================================================
-- Migration 001: RLS + per-user receipt numbering
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Drop ALL existing policies on receipts and line_items (clean slate)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'receipts' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON receipts';
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'line_items' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON line_items';
  END LOOP;
END $$;

-- 2. user_id already exists as TEXT — just ensure NOT NULL
ALTER TABLE receipts ALTER COLUMN user_id SET NOT NULL;

-- 3. Drop global unique constraint on receipt_number, add per-user one
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_receipt_number_key;
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_receipt_number_user_unique;
ALTER TABLE receipts ADD CONSTRAINT receipts_receipt_number_user_unique UNIQUE (user_id, receipt_number);

-- 4. Replace device_id index with user_id index
DROP INDEX IF EXISTS idx_receipts_device_id;
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);

-- 5. Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;

-- 6. Receipts policies — user_id is TEXT, cast auth.uid() to text
CREATE POLICY receipts_select ON receipts FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY receipts_insert ON receipts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY receipts_update ON receipts FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY receipts_delete ON receipts FOR DELETE USING (auth.uid()::text = user_id);

-- 7. Line items policies — both id and receipt_id are UUID, safe to compare directly
CREATE POLICY line_items_select ON line_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM receipts
    WHERE receipts.id = line_items.receipt_id
      AND receipts.user_id = auth.uid()::text
  ));

CREATE POLICY line_items_insert ON line_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM receipts
    WHERE receipts.id = line_items.receipt_id
      AND receipts.user_id = auth.uid()::text
  ));

CREATE POLICY line_items_delete ON line_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM receipts
    WHERE receipts.id = line_items.receipt_id
      AND receipts.user_id = auth.uid()::text
  ));

-- 8. Per-user sequential receipt numbering trigger
CREATE OR REPLACE FUNCTION set_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM receipts
   WHERE user_id = NEW.user_id
     AND receipt_number ~ '^REC-[0-9]+$';

  NEW.receipt_number = 'REC-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_receipt_number ON receipts;
CREATE TRIGGER trigger_set_receipt_number
  BEFORE INSERT ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION set_receipt_number();
