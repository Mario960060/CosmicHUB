-- EMERGENCY RESTORE: Fix overwritten admin user in public.users
-- Run this in Supabase SQL Editor

-- STEP 1: Find your admin's ID in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email LIKE '%admin%' OR email = 'admin@cosmic.app'
ORDER BY created_at ASC;

-- STEP 2: Check what's currently in public.users for that ID
-- (Replace ID with result from STEP 1)
SELECT id, email, full_name, role, created_at
FROM public.users
WHERE id = 'YOUR_ADMIN_ID_HERE';

-- STEP 3: Restore admin data
-- Replace values with your actual admin data:
UPDATE public.users
SET 
  email = 'admin@cosmic.app',     -- Your admin email from auth.users
  full_name = 'Admin',             -- Your admin name
  role = 'admin',                  -- Must be 'admin'
  deleted_at = NULL,
  last_seen = NOW()
WHERE id = 'YOUR_ADMIN_ID_HERE';  -- ID from STEP 1

-- STEP 4: Verify
SELECT id, email, full_name, role 
FROM public.users 
WHERE role = 'admin';

-- STEP 5: Delete the corrupted user from auth.users if needed
-- (Only if a NEW user was created with wrong email during invite process)
-- Be VERY CAREFUL - make sure you're not deleting your admin!
-- DELETE FROM auth.users WHERE id = 'CORRUPTED_USER_ID_HERE';
