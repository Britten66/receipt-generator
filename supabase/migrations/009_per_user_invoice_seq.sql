-- ============================================================
-- Migration 009: per-user invoice sequence
-- Replaces global COUNT(*) with an atomic per-user counter.
-- Each user's invoices are numbered independently from INV-001001.
-- ============================================================

-- 1. Add counter column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invoice_seq INTEGER NOT NULL DEFAULT 0;

-- 2. Atomic increment function — safe under concurrent requests
CREATE OR REPLACE FUNCTION increment_invoice_seq(uid text)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles
  SET invoice_seq = invoice_seq + 1
  WHERE user_id = uid
  RETURNING invoice_seq;
$$;
