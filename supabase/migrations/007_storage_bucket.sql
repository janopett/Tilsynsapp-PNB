-- ============================================================
-- Storage bucket + policies for inspection attachments
-- ============================================================

-- Create the bucket (safe to re-run; does nothing if it already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-attachments',
  'inspection-attachments',
  false,
  10485760, -- 10 MB per file
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/heic',
    'image/heif', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS policies ─────────────────────────────────────
-- Path format: {inspection_id}/{checkpoint_definition_id}/{filename}
-- We verify that the first path segment (inspection_id) matches an
-- inspection owned by the authenticated user.

-- INSERT: allow upload to own inspections
CREATE POLICY "Users can upload to own inspections"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-attachments'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM public.inspections WHERE user_id = auth.uid()
  )
);

-- SELECT: allow read/signed-URL generation for own inspections
CREATE POLICY "Users can read own inspection attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-attachments'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM public.inspections WHERE user_id = auth.uid()
  )
);

-- DELETE: allow deletion for own inspections
CREATE POLICY "Users can delete own inspection attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-attachments'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM public.inspections WHERE user_id = auth.uid()
  )
);

-- Service role has full access (for archival/SIF upload flows)
CREATE POLICY "Service role has full access to inspection attachments"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'inspection-attachments')
WITH CHECK (bucket_id = 'inspection-attachments');
