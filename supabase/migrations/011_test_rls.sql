-- ============================================
-- RLS FIX - TEST QUERIES
-- ============================================
-- Uruchom te queries w Supabase SQL Editor po zaaplikowaniu migration 11
-- ============================================

-- ============================================
-- TEST 1: RLS Status Check
-- ============================================
SELECT 
  '🔒 RLS STATUS CHECK' as test_name;

SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'users', 
  'projects', 
  'project_members', 
  'modules', 
  'tasks', 
  'subtasks', 
  'task_requests'
)
ORDER BY tablename;

-- Expected: All should have rls_enabled = true

-- ============================================
-- TEST 2: Helper Functions Exist
-- ============================================
SELECT 
  '🔧 HELPER FUNCTIONS CHECK' as test_name;

SELECT 
  routine_name as function_name,
  security_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (
  routine_name LIKE 'is_%' 
  OR routine_name LIKE 'get_%'
)
ORDER BY routine_name;

-- Expected: All functions with security_type = 'DEFINER'

-- ============================================
-- TEST 2b: Check Function Volatility (Advanced)
-- ============================================
SELECT 
  '🔧 FUNCTION VOLATILITY CHECK (OPTIONAL)' as test_name;

SELECT 
  p.proname as function_name,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END as volatility,
  CASE p.prosecdef
    WHEN true THEN 'DEFINER'
    WHEN false THEN 'INVOKER'
  END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
  p.proname LIKE 'is_%'
  OR p.proname LIKE 'get_%'
)
ORDER BY p.proname;

-- Expected: All should have volatility = 'STABLE' and security_type = 'DEFINER'

-- ============================================
-- TEST 3: Policies Exist
-- ============================================
SELECT 
  '🛡️ POLICIES CHECK' as test_name;

SELECT 
  tablename,
  cmd as operation,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
  'projects', 
  'project_members', 
  'modules', 
  'tasks', 
  'subtasks', 
  'task_requests'
)
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- Expected: Each table should have policies for SELECT, INSERT, UPDATE, DELETE

-- ============================================
-- TEST 4: Policy Names (Should be new ones)
-- ============================================
SELECT 
  '📝 NEW POLICY NAMES' as test_name;

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'projects'
ORDER BY cmd, policyname;

-- Expected: Should see names like:
-- - view_member_projects
-- - pm_admin_create_projects
-- - manager_admin_update_projects
-- - admin_delete_projects

-- ============================================
-- TEST 5: Test Helper Functions (As Current User)
-- ============================================
SELECT 
  '👤 MY PERMISSIONS' as test_name;

SELECT 
  auth.uid() as my_user_id,
  get_my_role() as my_role,
  is_admin() as is_admin,
  is_pm_or_admin() as is_pm_or_admin;

-- Expected: Should return your actual role and permissions

-- ============================================
-- TEST 6: Check Project Access
-- ============================================
SELECT 
  '🏗️ MY PROJECTS ACCESS' as test_name;

SELECT 
  p.id,
  p.name,
  is_project_member(p.id) as i_am_member,
  is_project_manager(p.id) as i_am_manager
FROM projects p
LIMIT 5;

-- Expected: Should show true/false based on your actual membership

-- ============================================
-- TEST 7: Old Problematic Policies Removed
-- ============================================
SELECT 
  '🗑️ OLD POLICIES CHECK (Should be empty)' as test_name;

SELECT 
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public'
AND (
  policyname LIKE '%Admins and PMs%'
  OR policyname = 'Users view project members'
  OR policyname = 'PMs add members'
  OR policyname = 'Authenticated view project members'
);

-- Expected: EMPTY result (0 rows) - all old policies should be gone

-- ============================================
-- TEST 8: Insert Permission Test (Projects)
-- ============================================
SELECT 
  '✍️ CAN I CREATE PROJECT?' as test_name;

SELECT 
  CASE 
    WHEN is_pm_or_admin() THEN '✅ YES - You can create projects'
    ELSE '❌ NO - You need PM or Admin role'
  END as result;

-- ============================================
-- SUCCESS SUMMARY
-- ============================================
SELECT 
  '🎉 TEST SUMMARY' as test_name;

SELECT 
  '✅ If all tests passed, RLS is properly configured!' as status,
  'Run these in order and check expected results above' as note;
