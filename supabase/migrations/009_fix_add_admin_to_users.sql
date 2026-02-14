-- ============================================
-- FIX: Add existing auth user to users table
-- ============================================
-- Use this when user exists in auth.users but not in public.users
-- ============================================

-- Check if admin exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@cosmic.app';

-- If above returns a row, run this to add to public.users:
INSERT INTO public.users (id, email, full_name, role, bio)
SELECT 
  id,
  'admin@cosmic.app',
  'Cosmic Admin',
  'admin',
  'System Administrator'
FROM auth.users
WHERE email = 'admin@cosmic.app'
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'admin',
  full_name = 'Cosmic Admin';

-- Verify admin is now in users table
SELECT id, email, full_name, role, created_at
FROM public.users
WHERE email = 'admin@cosmic.app';

-- Should return 1 row with role = 'admin'

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Admin user added to users table!';
  RAISE NOTICE 'Email: admin@cosmic.app';
  RAISE NOTICE 'Role: admin';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '1. Login at /login';
  RAISE NOTICE '2. Access /workstation';
  RAISE NOTICE '3. Create test data with 008_test_data_simple.sql';
END $$;
