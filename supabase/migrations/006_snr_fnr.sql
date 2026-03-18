-- ============================================================
-- Migration 006: Add snr (seksjonsnummer) and fnr (festenummer)
-- to inspections table for full matrikkel identification.
-- ============================================================

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS snr TEXT,
  ADD COLUMN IF NOT EXISTS fnr TEXT;
