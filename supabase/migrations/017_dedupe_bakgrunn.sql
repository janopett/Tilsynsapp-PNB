-- Remove duplicate entries in inspection_list_items that were seeded more than once.
-- Keeps the row with the lowest id (earliest created) for each (category, label) pair.
DELETE FROM inspection_list_items
WHERE id NOT IN (
  SELECT MIN(id)
  FROM inspection_list_items
  GROUP BY category, label
);
