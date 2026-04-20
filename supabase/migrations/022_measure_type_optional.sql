-- measure_type_id og selected_tags er ikke lenger obligatoriske;
-- sjekkpunkter filtreres nå via befaringsomrade og tiltakstype (SIF-kodetabeller).
ALTER TABLE inspections
  ALTER COLUMN measure_type_id DROP NOT NULL,
  ALTER COLUMN measure_type_id SET DEFAULT NULL;
