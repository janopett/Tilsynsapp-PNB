-- Add optional explicit URL for legal references.
-- When present, used directly instead of the auto-generated Lovdata link.
ALTER TABLE checkpoint_definitions
  ADD COLUMN IF NOT EXISTS legal_reference_url TEXT;
