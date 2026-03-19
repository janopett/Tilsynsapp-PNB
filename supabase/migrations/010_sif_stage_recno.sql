-- ============================================================
-- Store the selected SIF stage recno on the inspection.
-- Used to track which stage the inspection is associated with.
-- Note: SIF CreateDocument/UpdateDocument does not support StageRecno
-- as an input parameter, so this is for informational/tracking purposes.
-- ============================================================
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS sif_stage_recno INTEGER;
