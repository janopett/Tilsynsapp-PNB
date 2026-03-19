-- ============================================================
-- Add doc_access_code to sif_settings
-- Allows setting an explicit access code (tilgangskode) on archived documents.
-- When set, 360° skips access-code inheritance from file sub-items,
-- which avoids a NullReferenceException in PrepareDocumentInheritAccessCodeFromFileSubItems.
-- Leave empty to use 360°'s default behaviour (no explicit access code).
-- ============================================================

ALTER TABLE sif_settings
  ADD COLUMN IF NOT EXISTS doc_access_code TEXT NOT NULL DEFAULT '';
