-- ============================================================
-- Migration 013: Invoice reminders (Pro+ feature)
-- Run in Supabase Dashboard > SQL Editor
--
-- A self-reminder column on receipts. The user picks a date for
-- when they want to be reminded to follow up on an invoice. The
-- notification dropdown surfaces upcoming reminders.
--
-- Pro+ gating is enforced client-side and via the receipts edge
-- function whitelist. Free users cannot set reminder_at.
-- ============================================================

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS reminder_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_receipts_reminder_at
  ON public.receipts(reminder_at)
  WHERE reminder_at IS NOT NULL;
