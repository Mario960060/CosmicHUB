-- FIX: Convert corrupted user back to admin
-- This user already has projects, so we can't delete them - just restore admin data

-- STEP 1: Check current state
SELECT id, email, full_name, role, created_at
FROM public.users
WHERE id = 'dedba74a-6c16-4b23-b399-a9a937105dc3';

-- STEP 2: Check what email is in auth.users for this ID
SELECT id, email, created_at
FROM auth.users
WHERE id = 'dedba74a-6c16-4b23-b399-a9a937105dc3';

-- STEP 3: Restore admin data (UPDATE, not DELETE)
UPDATE public.users
SET 
  email = 'admin@cosmic.app',     -- Your real admin email (check STEP 2!)
  full_name = 'Admin',             -- Your admin name
  role = 'admin',                  -- Change back to admin
  bio = NULL,
  avatar_url = NULL,
  deleted_at = NULL,
  last_seen = NOW()
WHERE id = 'dedba74a-6c16-4b23-b399-a9a937105dc3';

-- STEP 4: Verify admin is restored
SELECT id, email, full_name, role 
FROM public.users 
WHERE id = 'dedba74a-6c16-4b23-b399-a9a937105dc3';

-- STEP 5: Check if there's ANOTHER user we need to delete (the one who SHOULD have been created)
-- Look for users created recently that are NOT admin
SELECT id, email, full_name, role, created_at
FROM public.users
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
