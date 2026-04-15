-- Add consent tracking fields to profiles
-- terms_agreed_at: timestamp when user agreed to Terms and Privacy Policy
-- email_marketing_ok: whether user opted in to email notifications
-- These are required for CASL / PIPEDA compliance and to legally contact users

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terms_agreed_at   timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_marketing_ok boolean     DEFAULT NULL;
