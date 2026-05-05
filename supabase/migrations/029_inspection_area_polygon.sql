-- Add polygon/area storage for inspection-level survey area (tilsynsområde)
-- Stored as GeoJSON Polygon (JSONB) — no PostGIS required.
-- Example: {"type":"Polygon","coordinates":[[[lng,lat],[lng,lat],...,[lng,lat]]]}

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS area_geojson JSONB;
