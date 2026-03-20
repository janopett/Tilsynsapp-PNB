-- ============================================================
-- Add English labels to inspection_list_items.
-- en_label is optional; falls back to label when null.
-- ============================================================

ALTER TABLE inspection_list_items
  ADD COLUMN IF NOT EXISTS en_label TEXT;

-- ── Tilsynsområde ─────────────────────────────────────────────
UPDATE inspection_list_items SET en_label = 'Building products'                    WHERE category = 'tilsynsomrade' AND label = 'Produkter til byggverk';
UPDATE inspection_list_items SET en_label = 'Fire safety'                          WHERE category = 'tilsynsomrade' AND label = 'Sikkerhet ved brann';
UPDATE inspection_list_items SET en_label = 'Structural safety'                    WHERE category = 'tilsynsomrade' AND label = 'Sikkerhet - bæreevne';
UPDATE inspection_list_items SET en_label = 'Placement'                            WHERE category = 'tilsynsomrade' AND label = 'Plassering';
UPDATE inspection_list_items SET en_label = 'Energy use'                           WHERE category = 'tilsynsomrade' AND label = 'Energibruk';
UPDATE inspection_list_items SET en_label = 'Environment and health'               WHERE category = 'tilsynsomrade' AND label = 'Miljø og helse';
UPDATE inspection_list_items SET en_label = 'External environment'                 WHERE category = 'tilsynsomrade' AND label = 'Ytre miljø';
UPDATE inspection_list_items SET en_label = 'Installations and systems'            WHERE category = 'tilsynsomrade' AND label = 'Installasjoner og anlegg';
UPDATE inspection_list_items SET en_label = 'Outdoor areas – accessibility'        WHERE category = 'tilsynsomrade' AND label = 'Utearealer - UU';
UPDATE inspection_list_items SET en_label = 'Floor plan – accessibility'           WHERE category = 'tilsynsomrade' AND label = 'Planløsning - UU';
UPDATE inspection_list_items SET en_label = 'O&M documentation'                   WHERE category = 'tilsynsomrade' AND label = 'FDV';
UPDATE inspection_list_items SET en_label = 'Final documentation'                  WHERE category = 'tilsynsomrade' AND label = 'Sluttdokumentasjon';
UPDATE inspection_list_items SET en_label = 'Waste plans – environmental remediation' WHERE category = 'tilsynsomrade' AND label = 'Avfallsplaner - miljøsanering';
UPDATE inspection_list_items SET en_label = 'Cultural heritage'                    WHERE category = 'tilsynsomrade' AND label = 'Kulturminner - kulturmiljøer';
UPDATE inspection_list_items SET en_label = 'Other'                                WHERE category = 'tilsynsomrade' AND label = 'Annet';

-- ── Tilsynstype ───────────────────────────────────────────────
UPDATE inspection_list_items SET en_label = 'Document inspection' WHERE category = 'tilsynstype' AND label = 'Dokumenttilsyn';
UPDATE inspection_list_items SET en_label = 'On-site inspection'  WHERE category = 'tilsynstype' AND label = 'Stedlig tilsyn';
UPDATE inspection_list_items SET en_label = 'Enterprise audit'    WHERE category = 'tilsynstype' AND label = 'Foretakstilsyn';

-- ── Bakgrunn ──────────────────────────────────────────────────
UPDATE inspection_list_items SET en_label = 'Established routine at the building office' WHERE category = 'bakgrunn' AND label = 'Etablert rutine ved byggesakskontoret';
UPDATE inspection_list_items SET en_label = 'Complaint received'                         WHERE category = 'bakgrunn' AND label = 'Bekymringsmelding';
UPDATE inspection_list_items SET en_label = 'Unwanted incident'                          WHERE category = 'bakgrunn' AND label = 'Uønsket hendelse';
UPDATE inspection_list_items SET en_label = 'Sectioning'                                 WHERE category = 'bakgrunn' AND label = 'Seksjonering';
UPDATE inspection_list_items SET en_label = 'Special fire object'                        WHERE category = 'bakgrunn' AND label = 'Særskilt brannobjekt';
UPDATE inspection_list_items SET en_label = 'Public building'                            WHERE category = 'bakgrunn' AND label = 'Publikumsbygg';
