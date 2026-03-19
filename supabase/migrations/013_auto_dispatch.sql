-- ============================================================
-- Auto-dispatch: trigger DispatchDocuments right after archiving.
-- Also store dispatch result on inspection_archivals.
-- ============================================================

ALTER TABLE sif_settings
  ADD COLUMN IF NOT EXISTS auto_dispatch BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE inspection_archivals
  ADD COLUMN IF NOT EXISTS dispatched      BOOLEAN,
  ADD COLUMN IF NOT EXISTS dispatch_error  TEXT;
