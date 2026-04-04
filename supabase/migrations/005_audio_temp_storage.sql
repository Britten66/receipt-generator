-- Migration 005: RLS policies for audio-temp Storage bucket
--
-- The audio-temp bucket must be created MANUALLY in Supabase Dashboard:
--   Storage → New Bucket → Name: "audio-temp" → Public: OFF (private)
--
-- These policies ensure each user can only access their own audio files.
-- Storage paths follow the pattern: {user_id}/audio-{timestamp}.{ext}

-- Allow authenticated users to upload audio to their own folder
CREATE POLICY "Users can upload their own audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio-temp'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to create signed URLs / download their own audio
CREATE POLICY "Users can read their own audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio-temp'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own audio (cleanup)
CREATE POLICY "Users can delete their own audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio-temp'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
