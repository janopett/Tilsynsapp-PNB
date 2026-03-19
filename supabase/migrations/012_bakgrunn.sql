-- ============================================================
-- Bakgrunn for tilsynet — multi-select configurable list.
-- Stored as a TEXT[] array on the inspections table.
-- ============================================================

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS bakgrunn TEXT[] DEFAULT '{}';

-- ── Seed: Bakgrunn for tilsynet ──────────────────────────────
INSERT INTO inspection_list_items (category, label, sort_order) VALUES
  ('bakgrunn', 'Etablert rutine ved byggesakskontoret', 10),
  ('bakgrunn', 'Bekymringsmelding',                     20),
  ('bakgrunn', 'Uønsket hendelse',                      30),
  ('bakgrunn', 'Seksjonering',                          40),
  ('bakgrunn', 'Særskilt brannobjekt',                  50),
  ('bakgrunn', 'Publikumsbygg',                         60);
