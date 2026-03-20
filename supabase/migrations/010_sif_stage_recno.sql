-- ============================================================
-- Store the selected SIF stage recno on the inspection.
-- Used to link the document to the correct case stage at archival time.
-- Sent via AdditionalListFields on CreateDocument:
--   { Name: "<stage title>", Value: { Recno: <sif_stage_recno> } }
-- The stage title is resolved from the case's Stages list (IncludeStages: true).
-- ============================================================
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS sif_stage_recno INTEGER;
