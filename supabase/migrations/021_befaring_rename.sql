-- ============================================================
-- Befaring: legg til multi-select klassifiseringsfelt hentet
-- fra PNB-kodetabeller.
--
-- befaringsomrade text[] — fra kodetabell "eBy Supervision area"
--   Erstatter enkeltverdi-kolonnen tilsynsomrade (beholdes for
--   bakoverkompatibilitet med eksisterende data).
--
-- tiltakstype text[]     — fra kodetabell "eBy Measure type"
--   Ny multi-select, erstatter enkeltverdi-kolonnen tilsynstype.
--
-- applies_to_omrade / applies_to_type_codes på sjekkpunkter —
--   Lar admin styre hvilke sjekkpunkter som vises for en gitt
--   kombinasjon av befaringsomrade / tiltakstype.
--   Tom matrise = sjekkpunktet gjelder for alle verdier.
-- ============================================================

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS befaringsomrade  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tiltakstype      TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE checkpoint_definitions
  ADD COLUMN IF NOT EXISTS applies_to_omrade     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applies_to_type_codes TEXT[] NOT NULL DEFAULT '{}';
