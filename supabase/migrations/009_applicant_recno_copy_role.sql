-- ============================================================
-- 1. Store the SIF contact recno for søker on the inspection.
--    Allows setting søker as a registered mottaker on the archived document.
-- ============================================================
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS applicant_recno INTEGER;

-- ============================================================
-- 2. Add copy-recipient role to sif_settings.
--    Used when setting participants as kopimottakere on the document.
--    Default: "KM" (Kopimottaker) — adjust to the customer's 360° code.
-- ============================================================
ALTER TABLE sif_settings
  ADD COLUMN IF NOT EXISTS role_copy_recipient TEXT NOT NULL DEFAULT 'KM';
