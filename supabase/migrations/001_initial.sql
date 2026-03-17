-- ============================================================
-- Tilsynsapp-PNB - Initial Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- inspections
-- ============================================================
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Case metadata
  case_number TEXT,
  property_address TEXT NOT NULL,
  gnr TEXT,
  bnr TEXT,
  applicant_name TEXT,
  inspector_name TEXT,
  inspection_date DATE NOT NULL,
  notes TEXT,

  -- Classification
  measure_type_id TEXT NOT NULL,
  selected_tags TEXT[] NOT NULL DEFAULT '{}',

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'archived'))
);

CREATE INDEX idx_inspections_user_id ON inspections(user_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_measure_type ON inspections(measure_type_id);

-- ============================================================
-- inspection_answers
-- ============================================================
CREATE TABLE inspection_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  checkpoint_definition_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_checked'
    CHECK (status IN ('not_checked', 'ok', 'deviation')),
  comment TEXT,
  UNIQUE(inspection_id, checkpoint_definition_id)
);

CREATE INDEX idx_answers_inspection_id ON inspection_answers(inspection_id);

-- ============================================================
-- attachments
-- ============================================================
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  checkpoint_definition_id TEXT,

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  storage_url TEXT,

  -- SIF sync
  sif_uploaded_file_reference TEXT,
  sif_upload_status TEXT DEFAULT 'pending'
    CHECK (sif_upload_status IN ('pending', 'uploaded', 'failed'))
);

CREATE INDEX idx_attachments_inspection_id ON attachments(inspection_id);
CREATE INDEX idx_attachments_checkpoint ON attachments(checkpoint_definition_id);

-- ============================================================
-- inspection_archivals
-- ============================================================
CREATE TABLE inspection_archivals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed')),

  -- SIF response data
  sif_case_number TEXT,
  sif_case_recno INTEGER,
  sif_document_number TEXT,
  sif_document_recno INTEGER,
  sif_document_url TEXT,

  -- Audit / debug
  request_payload_json JSONB,
  response_payload_json JSONB,
  error_message TEXT,
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_archivals_inspection_id ON inspection_archivals(inspection_id);
CREATE INDEX idx_archivals_status ON inspection_archivals(status);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_answers_updated_at
  BEFORE UPDATE ON inspection_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_archivals_updated_at
  BEFORE UPDATE ON inspection_archivals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_archivals ENABLE ROW LEVEL SECURITY;

-- Inspections: users own their rows
CREATE POLICY "Users can manage own inspections"
  ON inspections FOR ALL
  USING (auth.uid() = user_id);

-- Answers: via inspection ownership
CREATE POLICY "Users can manage answers for own inspections"
  ON inspection_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_answers.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

-- Attachments: via inspection ownership
CREATE POLICY "Users can manage attachments for own inspections"
  ON attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = attachments.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

-- Archivals: via inspection ownership
CREATE POLICY "Users can view archivals for own inspections"
  ON inspection_archivals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_archivals.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

-- Only service role can insert/update archivals
CREATE POLICY "Service role can manage archivals"
  ON inspection_archivals FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- Supabase Storage bucket for inspection attachments
-- ============================================================
-- Run this separately in Supabase dashboard or with supabase CLI:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-attachments', 'inspection-attachments', false);
