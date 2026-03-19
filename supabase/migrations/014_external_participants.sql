-- Migration 014: Add external_participants column to inspections
-- Stores people not linked to the PNB case, e.g. Brannvernleder, Verneombud, etc.
-- Each entry: { id, name, role?, company?, companyRecno? }

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS external_participants JSONB NOT NULL DEFAULT '[]'::jsonb;
