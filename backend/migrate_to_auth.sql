-- Add user_id column for Supabase Auth
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
