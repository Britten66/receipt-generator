-- ============================================================
-- Migration 002: Stripe tier on profiles
-- profiles already has: user_id (text), stripe_customer_id (text), plan (text)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add tier column (profiles already has 'plan' — tier is what the app reads)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 2. Drop ALL existing policies on profiles (clean slate)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
  END LOOP;
END $$;

-- 3. Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Profiles policies — user_id is TEXT
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid()::text = user_id);
