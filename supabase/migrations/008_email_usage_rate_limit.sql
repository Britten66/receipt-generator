-- ============================================================
-- Migration 008: email_usage table for send-invoice rate limit
-- Run in Supabase Dashboard > SQL Editor
--
-- Mirrors voice_usage shape. One row per successful invoice
-- email. send-invoice counts today's rows before calling Resend;
-- if the user is over the daily limit the request is rejected
-- with 429. Protects the Resend bill and domain reputation from
-- a compromised Pro account.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_usage (
  id         bigserial PRIMARY KEY,
  user_id    text NOT NULL,
  date       date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_usage_user_date_idx
  ON public.email_usage (user_id, date);

ALTER TABLE public.email_usage ENABLE ROW LEVEL SECURITY;

-- Users can read and insert their own rows only. Same shape as
-- voice_usage so the edge function can use the user-scoped
-- client for both the count query and the fire-and-forget log.
CREATE POLICY email_usage_select_own ON public.email_usage
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY email_usage_insert_own ON public.email_usage
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);
