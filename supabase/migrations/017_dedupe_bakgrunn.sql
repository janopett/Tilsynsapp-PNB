-- Remove duplicate entries in inspection_list_items seeded more than once.
-- Uses a self-join to keep the earliest duplicate per (category, label).
-- MIN(id) fails on UUID — use created_at to pick the winner instead.
DELETE FROM inspection_list_items a
USING inspection_list_items b
WHERE a.category = b.category
  AND a.label    = b.label
  AND a.created_at > b.created_at;
