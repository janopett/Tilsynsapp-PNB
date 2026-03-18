-- ============================================================
-- Migration 004: Add participants, estates, and coordinates
-- ============================================================

-- Participants: list of contacts attending the inspection (from SIF case)
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS participants JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Estates: list of properties linked to the inspection (from SIF GetEstates)
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS estates JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Map coordinates for the main inspection location
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Map coordinates per checkpoint
ALTER TABLE inspection_answers
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
