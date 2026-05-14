-- ============================================================
-- Migration 017: User-toggleable BCC on invoice emails
-- Run in Supabase Dashboard > SQL Editor
--
-- Adds copy_on_send to profiles. When true, the send-invoice
-- edge function BCCs the user on every invoice they send so
-- they have a paper trail in their own inbox. Default true
-- because the alternative (no record of outbound emails) is
-- the source of the "did it actually send?" anxiety.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS copy_on_send boolean NOT NULL DEFAULT true;
