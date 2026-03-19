-- ============================================================
-- Configurable list items for Tilsynsområde and Tilsynstype.
-- Admins can add/remove items via the admin panel.
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_list_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT        NOT NULL,   -- 'tilsynsomrade' | 'tilsynstype'
  label       TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- All authenticated users can read active items
ALTER TABLE inspection_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON inspection_list_items
  FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "admin_all" ON inspection_list_items
  FOR ALL TO service_role USING (true);

-- ── Seed: Tilsynsområde ──────────────────────────────────────────────────────
INSERT INTO inspection_list_items (category, label, sort_order) VALUES
  ('tilsynsomrade', 'Produkter til byggverk',        10),
  ('tilsynsomrade', 'Sikkerhet ved brann',            20),
  ('tilsynsomrade', 'Sikkerhet - bæreevne',           30),
  ('tilsynsomrade', 'Plassering',                     40),
  ('tilsynsomrade', 'Energibruk',                     50),
  ('tilsynsomrade', 'Miljø og helse',                 60),
  ('tilsynsomrade', 'Ytre miljø',                     70),
  ('tilsynsomrade', 'Installasjoner og anlegg',       80),
  ('tilsynsomrade', 'Utearealer - UU',                90),
  ('tilsynsomrade', 'Planløsning - UU',              100),
  ('tilsynsomrade', 'FDV',                           110),
  ('tilsynsomrade', 'Sluttdokumentasjon',            120),
  ('tilsynsomrade', 'Avfallsplaner - miljøsanering', 130),
  ('tilsynsomrade', 'Kulturminner - kulturmiljøer',  140),
  ('tilsynsomrade', 'Annet',                         150);

-- ── Seed: Tilsynstype ────────────────────────────────────────────────────────
INSERT INTO inspection_list_items (category, label, sort_order) VALUES
  ('tilsynstype', 'Dokumenttilsyn',   10),
  ('tilsynstype', 'Stedlig tilsyn',   20),
  ('tilsynstype', 'Foretakstilsyn',   30);

-- ── Add columns to inspections ───────────────────────────────────────────────
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS tilsynsomrade TEXT,
  ADD COLUMN IF NOT EXISTS tilsynstype   TEXT;
