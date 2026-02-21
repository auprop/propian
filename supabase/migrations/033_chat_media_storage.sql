-- Create a storage bucket for chat media uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view chat media (public bucket)
CREATE POLICY "Chat media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media');

-- Authenticated users can upload chat media
CREATE POLICY "Users can upload chat media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own chat media
CREATE POLICY "Users can delete their own chat media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
