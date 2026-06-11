-- ============================================================
-- User profiles — stores PNB/360° contact recno per Supabase user.
-- Used to grant ViewFile permissions when archiving documents.
-- ============================================================

CREATE TABLE user_profiles (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pnb_contact_recno INTEGER,
  pnb_login TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read and update own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all profiles"
  ON user_profiles FOR ALL
  USING (auth.role() = 'service_role');
