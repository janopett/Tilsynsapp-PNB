-- ============================================================
-- Migration 005: Add case_title to inspections
-- Stores the title of the linked case from PNB/360°
-- so it's visible in the overview without an API call.
-- ============================================================

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS case_title TEXT;
