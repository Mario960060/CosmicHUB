-- EMERGENCY: Restore admin in public.users if it was overwritten

-- STEP 1: Find admin's ID in auth.users
-- Replace with your actual admin email if different
SELECT id, email FROM auth.users WHERE email = 'admin@cosmic.app' OR email LIKE '%admin%';

-- STEP 2: Check if that ID exists in public.users
-- SELECT * FROM public.users WHERE id = '<ID_FROM_STEP_1>';

-- STEP 3: If admin was overwritten, restore it
-- Replace the ID and values with your actual admin data:

UPDATE public.users
SET 
  email = 'admin@cosmic.app',     -- Your admin email
  full_name = 'Admin',             -- Your admin name
  role = 'admin',
  bio = NULL,
  avatar_url = NULL,
  deleted_at = NULL,
  last_seen = NOW()
WHERE id = '14ed4f68-bfc3-44b2-aaff-6ea36ee2b1a5';  -- ID from auth.users

-- STEP 4: Verify
SELECT id, email, full_name, role FROM public.users WHERE id = '14ed4f68-bfc3-44b2-aaff-6ea36ee2b1a5';
