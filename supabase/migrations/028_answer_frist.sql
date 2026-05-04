-- Legger til per-avvik-frist på svar, jf. krav om retting av avvik
-- i tilsynsrapporten (SAK10 § 15-3).
ALTER TABLE inspection_answers
  ADD COLUMN IF NOT EXISTS frist DATE;
