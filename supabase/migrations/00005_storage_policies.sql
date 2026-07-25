-- ============================================
-- Fix: Create storage bucket for images + RLS policies
-- ============================================

-- 1. Ensure the 'images' storage bucket exists
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,  -- public bucket (files are publicly accessible)
  false,
  5242880,  -- 5MB file size limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read access to any file in the images bucket
-- This lets anyone view profile pictures/post images
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- 3. Allow authenticated users to upload files to their own folder
-- Path pattern: <user_id>/<filename>
DROP POLICY IF EXISTS "Authenticated users can upload their own files" ON storage.objects;
CREATE POLICY "Authenticated users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Allow users to update their own files (e.g., replace avatar)
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Allow users to delete their own files
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

