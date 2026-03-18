-- ============================================================
-- SIF Settings – admin-managed configuration for Plan & Build integration
-- Singleton table (max one row enforced via unique index).
-- ============================================================

CREATE TABLE sif_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ── Connection ──────────────────────────────────────────────
  base_url TEXT NOT NULL DEFAULT '',
  rpc_path TEXT NOT NULL DEFAULT '/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC',
  auth_mode TEXT NOT NULL DEFAULT 'authkey'
    CHECK (auth_mode IN ('authkey', 'combined_daemon')),
  authkey TEXT NOT NULL DEFAULT '',
  timeout_ms INTEGER NOT NULL DEFAULT 30000,

  -- ── OAuth / combined_daemon fields ──────────────────────────
  oauth_client_id TEXT NOT NULL DEFAULT '',
  oauth_client_secret TEXT NOT NULL DEFAULT '',
  oauth_token_url TEXT NOT NULL DEFAULT '',
  oauth_scope TEXT NOT NULL DEFAULT '',

  -- ── Document mapping ────────────────────────────────────────
  doc_archive TEXT NOT NULL DEFAULT 'recno:2',
  doc_category TEXT NOT NULL DEFAULT 'recno:111',
  doc_status TEXT NOT NULL DEFAULT 'J',
  doc_title_template TEXT NOT NULL DEFAULT 'Tilsynsrapport - {{propertyAddress}} - {{date}}',
  doc_main_file_relation_type TEXT NOT NULL DEFAULT 'H',
  doc_attachment_relation_type TEXT NOT NULL DEFAULT 'V',

  -- ── Contact roles ────────────────────────────────────────────
  role_municipality_sender TEXT NOT NULL DEFAULT 'AV',
  role_applicant_recipient TEXT NOT NULL DEFAULT 'EM',

  -- ── Defaults ─────────────────────────────────────────────────
  responsible_person_recno INTEGER NOT NULL DEFAULT 0
);

-- Enforce singleton – at most one settings row
CREATE UNIQUE INDEX sif_settings_singleton ON sif_settings ((true));

-- updated_at trigger
CREATE TRIGGER update_sif_settings_updated_at
  BEFORE UPDATE ON sif_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE sif_settings ENABLE ROW LEVEL SECURITY;

-- Service role (API routes using SUPABASE_SERVICE_ROLE_KEY) has full access
CREATE POLICY "Service role full access"
  ON sif_settings FOR ALL
  USING (auth.role() = 'service_role');

-- Users with app_metadata.is_admin = true can read
CREATE POLICY "Admins can read sif_settings"
  ON sif_settings FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean IS TRUE);

-- Users with app_metadata.is_admin = true can insert/update
CREATE POLICY "Admins can write sif_settings"
  ON sif_settings FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean IS TRUE);

CREATE POLICY "Admins can update sif_settings"
  ON sif_settings FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean IS TRUE);
