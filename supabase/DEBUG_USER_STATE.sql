-- Emergency: Check current state of users and auth.users

-- 1. Check auth.users (authentication)
SELECT 
  id,
  email,
  created_at,
  confirmed_at,
  raw_user_meta_data->>'full_name' as metadata_name
FROM auth.users
ORDER BY created_at DESC;

-- 2. Check public.users (application data)
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- 3. Find admin in auth.users
SELECT id, email FROM auth.users WHERE email LIKE '%admin%';

-- 4. Check if admin exists in public.users
SELECT id, email, role FROM public.users WHERE role = 'admin';
