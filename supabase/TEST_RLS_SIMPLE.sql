-- ============================================
-- TEST RLS AFTER MIGRATION 012
-- ============================================
-- Run this AFTER migration 012 to verify everything works
-- Login as admin@cosmic.app in your app first!
-- ============================================

-- ============================================
-- TEST 1: Check authentication
-- ============================================
SELECT '🔍 TEST 1: Authentication' as test;

SELECT 
  auth.uid() as my_user_id,
  auth.role() as my_auth_role,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NOT AUTHENTICATED'
    ELSE '✅ AUTHENTICATED'
  END as status;

-- Expected: my_user_id = your UUID, status = AUTHENTICATED

-- ============================================
-- TEST 2: Check user data
-- ============================================
SELECT '🔍 TEST 2: Your User Data' as test;

SELECT 
  id,
  email,
  role,
  deleted_at,
  CASE 
    WHEN role IN ('admin', 'project_manager') THEN '✅ CAN CREATE PROJECTS'
    ELSE '❌ CANNOT CREATE PROJECTS'
  END as can_create_projects
FROM users 
WHERE id = auth.uid();

-- Expected: role = 'admin', can_create_projects = '✅ CAN CREATE PROJECTS'

-- ============================================
-- TEST 3: Check RLS is enabled
-- ============================================
SELECT '🔍 TEST 3: RLS Status' as test;

SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('projects', 'modules', 'tasks', 'subtasks')
ORDER BY tablename;

-- Expected: All should show rls_enabled = true

-- ============================================
-- TEST 4: Check policies exist
-- ============================================
SELECT '🔍 TEST 4: Policy Count' as test;

SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS POLICIES'
    ELSE '❌ NO POLICIES'
  END as status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('projects', 'modules', 'tasks', 'subtasks')
GROUP BY tablename
ORDER BY tablename;

-- Expected: All should have multiple policies

-- ============================================
-- TEST 5: Check INSERT policy on projects
-- ============================================
SELECT '🔍 TEST 5: Projects INSERT Policy' as test;

SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'projects' 
AND cmd = 'INSERT';

-- Expected: Should show 'projects_insert' policy

-- ============================================
-- TEST 6: Check no SECURITY DEFINER functions exist
-- ============================================
SELECT '🔍 TEST 6: SECURITY DEFINER Functions' as test;

SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname IN ('is_admin', 'is_pm_or_admin', 'is_project_member', 'is_project_manager')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Expected: Should return 0 rows (no functions)

-- ============================================
-- TEST 7: Simulate INSERT check (without actually inserting)
-- ============================================
SELECT '🔍 TEST 7: Simulate INSERT Permission' as test;

-- This simulates what the INSERT policy checks
SELECT 
  auth.uid() as my_id,
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('project_manager', 'admin')
    AND users.deleted_at IS NULL
  ) as policy_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('project_manager', 'admin')
      AND users.deleted_at IS NULL
    ) THEN '✅ POLICY WOULD ALLOW INSERT'
    ELSE '❌ POLICY WOULD DENY INSERT'
  END as result;

-- Expected: policy_check = true, result = '✅ POLICY WOULD ALLOW INSERT'

-- ============================================
-- TEST 8: Actual INSERT test (OPTIONAL - will create test project)
-- ============================================
-- Uncomment to actually test creating a project
-- WARNING: This will create a real project in your database!

/*
SELECT '🔍 TEST 8: Actual INSERT Test' as test;

INSERT INTO projects (name, description, created_by)
VALUES (
  'TEST PROJECT - DELETE ME',
  'This is a test project created by RLS test. Safe to delete.',
  auth.uid()
)
RETURNING id, name, created_by;

-- Expected: Should return the created project ID
-- If this works, RLS is fixed! 🎉
*/

-- ============================================
-- SUMMARY
-- ============================================
SELECT '📊 SUMMARY' as test;

SELECT 
  '✅ If all tests pass, RLS is working correctly!' as note
UNION ALL
SELECT 
  '✅ Try creating a project in the app now!' as note
UNION ALL
SELECT 
  '❌ If TEST 7 shows DENY, check your user role in the database' as note
UNION ALL
SELECT 
  '❌ If TEST 1 shows NOT AUTHENTICATED, you need to login first' as note;
