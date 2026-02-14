-- ============================================
-- COSMIC PROJECT HUB - DATABASE MIGRATION
-- Migration 6: Storage Configuration
-- ============================================
-- Run this AFTER Migration 5 Part 2
-- Creates: Storage bucket and policies for avatars
-- ============================================

-- ============================================
-- STORAGE BUCKET: avatars
-- ============================================
-- NOTE: Bucket creation must be done via Supabase Dashboard or API
-- Go to: Storage → Create Bucket
-- Name: avatars
-- Public: YES
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- After creating bucket, run these policies:

-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- Users can upload their own avatar
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own avatar
CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own avatar
CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Avatars are publicly readable
CREATE POLICY "Avatars publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Migration 6 completed: Storage policies created';
  RAISE NOTICE '======================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ALL MIGRATIONS COMPLETE! 🎉';
  RAISE NOTICE '';
  RAISE NOTICE 'Database setup finished:';
  RAISE NOTICE '✓ 15 tables created';
  RAISE NOTICE '✓ All indexes created';
  RAISE NOTICE '✓ All triggers active';
  RAISE NOTICE '✓ RLS policies enabled';
  RAISE NOTICE '✓ Storage configured';
  RAISE NOTICE '';
  RAISE NOTICE 'REMINDER: Create avatars bucket manually in Supabase Dashboard';
  RAISE NOTICE 'Storage → Create Bucket → Name: avatars (public, 5MB limit)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Create first admin user';
  RAISE NOTICE '';
END $$;
