-- ============================================
-- CREATE FIRST ADMIN USER
-- ============================================
-- Run this in Supabase SQL Editor after all migrations
-- This creates a test admin user for initial login
-- 
-- CREDENTIALS:
-- Email: admin@cosmic.app
-- Password: CosmicAdmin2026!
-- 
-- IMPORTANT: Change password after first login!
-- ============================================

-- First, create auth.users entry
-- You can do this via Supabase Dashboard → Authentication → Users → Add User
-- OR run this SQL if you have service_role access:

-- Note: This INSERT may fail if you don't have proper permissions
-- In that case, create user via Dashboard instead

DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Try to create auth user (may require service_role)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@cosmic.app',
    crypt('CosmicAdmin2026!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Create users table entry
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    bio
  ) VALUES (
    new_user_id,
    'admin@cosmic.app',
    'Cosmic Admin',
    'admin',
    'System Administrator - Change this bio after first login'
  );

  RAISE NOTICE '✅ Admin user created successfully!';
  RAISE NOTICE 'Email: admin@cosmic.app';
  RAISE NOTICE 'Password: CosmicAdmin2026!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Change password after first login!';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Failed to create user automatically';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Manual Steps:';
    RAISE NOTICE '1. Go to Supabase Dashboard → Authentication → Users';
    RAISE NOTICE '2. Click "Add User"';
    RAISE NOTICE '3. Email: admin@cosmic.app';
    RAISE NOTICE '4. Password: CosmicAdmin2026!';
    RAISE NOTICE '5. Auto Confirm User: YES';
    RAISE NOTICE '6. Then run this SQL to create users table entry:';
    RAISE NOTICE '';
    RAISE NOTICE 'INSERT INTO public.users (id, email, full_name, role)';
    RAISE NOTICE 'SELECT id, email, ''Cosmic Admin'', ''admin''';
    RAISE NOTICE 'FROM auth.users';
    RAISE NOTICE 'WHERE email = ''admin@cosmic.app'';';
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify admin was created:

SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at
FROM users u
WHERE u.email = 'admin@cosmic.app';

-- Should return 1 row with role = 'admin'
