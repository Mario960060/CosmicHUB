-- ============================================
-- DIAGNOSE RLS ISSUE - Admin Can't Create Project
-- ============================================
-- Run these queries IN ORDER to find the problem
-- ============================================

-- ============================================
-- TEST 1: Check your user data
-- ============================================
SELECT '🔍 TEST 1: Your User Data' as test;

SELECT 
  id,
  email,
  role,
  deleted_at
FROM users 
WHERE email = 'admin@cosmic.app';

-- Expected: Should show role = 'admin' and deleted_at = null

-- ============================================
-- TEST 2: Test helper function directly
-- ============================================
SELECT '🔍 TEST 2: Test is_pm_or_admin() function' as test;

-- This simulates what the policy does
SELECT is_pm_or_admin() as result;

-- Expected: Should return TRUE

-- ============================================
-- TEST 3: Test helper function with explicit user
-- ============================================
SELECT '🔍 TEST 3: Check if function sees the user' as test;

SELECT 
  auth.uid() as current_auth_uid,
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('project_manager', 'admin')
  ) as manual_check,
  is_pm_or_admin() as function_result;

-- Expected: All should be the same value

-- ============================================
-- TEST 4: Check policy exists
-- ============================================
SELECT '🔍 TEST 4: Check INSERT policy on projects' as test;

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'projects' 
AND cmd = 'INSERT';

-- Expected: Should show pm_admin_create_projects policy

-- ============================================
-- TEST 5: Check RLS is enabled
-- ============================================
SELECT '🔍 TEST 5: Check RLS status' as test;

SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'projects';

-- Expected: rls_enabled = true

-- ============================================
-- TEST 6: Check for conflicting policies
-- ============================================
SELECT '🔍 TEST 6: All INSERT policies on projects' as test;

SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'projects' 
AND cmd = 'INSERT';

-- Expected: Should see only pm_admin_create_projects

-- ============================================
-- TEST 7: Test function internals
-- ============================================
SELECT '🔍 TEST 7: Debug function query' as test;

-- This is what the function does internally
SELECT 
  auth.uid() as my_uid,
  (SELECT COUNT(*) FROM users WHERE id = auth.uid()) as user_exists,
  (SELECT role FROM users WHERE id = auth.uid()) as my_role,
  (SELECT role IN ('project_manager', 'admin') FROM users WHERE id = auth.uid()) as role_matches;

-- Expected: user_exists = 1, my_role = 'admin', role_matches = true

-- ============================================
-- TEST 8: Try manual insert with function
-- ============================================
SELECT '🔍 TEST 8: Test policy condition manually' as test;

-- This tests if the policy condition would pass
SELECT 
  CASE 
    WHEN is_pm_or_admin() THEN 'Policy would ALLOW insert'
    ELSE 'Policy would DENY insert'
  END as policy_result;

-- Expected: 'Policy would ALLOW insert'

-- ============================================
-- TEST 9: Check auth.uid() is set
-- ============================================
SELECT '🔍 TEST 9: Check authentication' as test;

SELECT 
  auth.uid() as my_user_id,
  auth.role() as my_auth_role,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NOT AUTHENTICATED'
    ELSE '✅ AUTHENTICATED'
  END as auth_status;

-- Expected: my_user_id should be your UUID, auth_status = AUTHENTICATED

-- ============================================
-- SUMMARY
-- ============================================
SELECT '📊 SUMMARY: Run all tests and check results' as test;

SELECT 
  '✅ If all tests pass, the issue might be in application layer (JWT not sent correctly)' as note
UNION ALL
SELECT 
  '❌ If TEST 2 returns FALSE, the function does not see your user correctly' as note
UNION ALL
SELECT 
  '❌ If TEST 4 shows no policy, migration 011 did not apply correctly' as note
UNION ALL
SELECT 
  '❌ If TEST 7 shows my_role = NULL, user is not in public.users table' as note;
