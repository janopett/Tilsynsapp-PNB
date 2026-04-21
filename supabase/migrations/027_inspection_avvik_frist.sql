-- Legger til frist for lukking av avvik på tilsynssaken,
-- jf. SAK10 § 15-3 om krav til tilsynsrapport.
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS avvik_frist DATE;
