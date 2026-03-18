-- ============================================================
-- Migration 003: Add responsible contact fields to inspection_answers
-- ============================================================
-- Allows selecting an "Ansvarlig" (responsible contact from the SIF case)
-- per checkpoint. Both fields are optional.

ALTER TABLE inspection_answers
  ADD COLUMN IF NOT EXISTS responsible_contact_recno INTEGER,
  ADD COLUMN IF NOT EXISTS responsible_contact_name TEXT;
