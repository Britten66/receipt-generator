-- ============================================================
-- Migration 014: Optional invoice due date
-- Run in Supabase Dashboard > SQL Editor
--
-- Adds a nullable due_by date on receipts. Surfaces in the
-- notifications bell as "due in N days" or "overdue" so the
-- user has a single place to track what needs chasing.
-- ============================================================

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS due_by date;

CREATE INDEX IF NOT EXISTS idx_receipts_due_by
  ON public.receipts(due_by)
  WHERE due_by IS NOT NULL;
