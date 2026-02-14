-- ============================================
-- FORCE FIX RLS - Nuclear Option
-- ============================================
-- Use this if migration 011 didn't work properly
-- This DROPS EVERYTHING and recreates from scratch
-- ============================================

-- ============================================
-- STEP 1: DISABLE RLS temporarily
-- ============================================
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: DROP ALL POLICIES (FORCE)
-- ============================================

-- Drop ALL policies on projects
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'projects') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON projects';
  END LOOP;
END $$;

-- Drop ALL policies on project_members
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'project_members') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON project_members';
  END LOOP;
END $$;

-- Drop ALL policies on modules
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'modules') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON modules';
  END LOOP;
END $$;

-- Drop ALL policies on tasks
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tasks') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON tasks';
  END LOOP;
END $$;

-- Drop ALL policies on subtasks
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'subtasks') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON subtasks';
  END LOOP;
END $$;

-- Drop ALL policies on task_requests
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'task_requests') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON task_requests';
  END LOOP;
END $$;

-- Drop ALL policies on users
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON users';
  END LOOP;
END $$;

-- ============================================
-- STEP 3: DROP OLD FUNCTIONS (if they exist)
-- ============================================
DROP FUNCTION IF EXISTS get_my_role();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_pm_or_admin();
DROP FUNCTION IF EXISTS is_project_member(UUID);
DROP FUNCTION IF EXISTS is_project_manager(UUID);
DROP FUNCTION IF EXISTS get_project_from_module(UUID);
DROP FUNCTION IF EXISTS get_project_from_task(UUID);
DROP FUNCTION IF EXISTS get_project_from_subtask(UUID);

-- ============================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_pm_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('project_manager', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = project_uuid 
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_project_manager(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = project_uuid 
    AND user_id = auth.uid() 
    AND role = 'manager'
  );
$$;

CREATE OR REPLACE FUNCTION get_project_from_module(module_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT project_id FROM modules WHERE id = module_uuid;
$$;

CREATE OR REPLACE FUNCTION get_project_from_task(task_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT m.project_id 
  FROM tasks t
  INNER JOIN modules m ON m.id = t.module_id
  WHERE t.id = task_uuid;
$$;

CREATE OR REPLACE FUNCTION get_project_from_subtask(subtask_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT m.project_id 
  FROM subtasks s
  INNER JOIN tasks t ON t.id = s.parent_id
  INNER JOIN modules m ON m.id = t.module_id
  WHERE s.id = subtask_uuid;
$$;

-- ============================================
-- STEP 5: ENABLE RLS
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: CREATE POLICIES
-- ============================================

-- USERS
CREATE POLICY "view_active_users" ON users FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "update_own_profile" ON users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin_insert_users" ON users FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_delete_users" ON users FOR DELETE TO authenticated USING (is_admin());

-- PROJECTS  
CREATE POLICY "view_member_projects" ON projects FOR SELECT TO authenticated USING (is_project_member(id));
CREATE POLICY "pm_admin_create_projects" ON projects FOR INSERT TO authenticated WITH CHECK (is_pm_or_admin());
CREATE POLICY "manager_admin_update_projects" ON projects FOR UPDATE TO authenticated USING (is_project_manager(id) OR is_admin());
CREATE POLICY "admin_delete_projects" ON projects FOR DELETE TO authenticated USING (is_admin());

-- PROJECT_MEMBERS
CREATE POLICY "view_all_members" ON project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "manager_admin_add_members" ON project_members FOR INSERT TO authenticated WITH CHECK (is_project_manager(project_id) OR is_admin());
CREATE POLICY "manager_admin_remove_members" ON project_members FOR DELETE TO authenticated USING (is_project_manager(project_id) OR is_admin());
CREATE POLICY "update_own_membership" ON project_members FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- MODULES
CREATE POLICY "view_project_modules" ON modules FOR SELECT TO authenticated USING (is_project_member(project_id));
CREATE POLICY "manager_create_modules" ON modules FOR INSERT TO authenticated WITH CHECK (is_project_manager(project_id) OR is_admin());
CREATE POLICY "manager_update_modules" ON modules FOR UPDATE TO authenticated USING (is_project_manager(project_id) OR is_admin());
CREATE POLICY "manager_delete_modules" ON modules FOR DELETE TO authenticated USING (is_project_manager(project_id) OR is_admin());

-- TASKS
CREATE POLICY "view_project_tasks" ON tasks FOR SELECT TO authenticated USING (is_project_member(get_project_from_module(module_id)));
CREATE POLICY "manager_create_tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (is_project_manager(get_project_from_module(module_id)) OR is_admin());
CREATE POLICY "manager_update_tasks" ON tasks FOR UPDATE TO authenticated USING (is_project_manager(get_project_from_module(module_id)) OR is_admin());
CREATE POLICY "manager_delete_tasks" ON tasks FOR DELETE TO authenticated USING (is_project_manager(get_project_from_module(module_id)) OR is_admin());

-- SUBTASKS
CREATE POLICY "view_project_subtasks" ON subtasks FOR SELECT TO authenticated USING (is_project_member(get_project_from_task(parent_id)));
CREATE POLICY "manager_create_subtasks" ON subtasks FOR INSERT TO authenticated WITH CHECK (is_project_manager(get_project_from_task(parent_id)) OR is_admin());
CREATE POLICY "worker_manager_update_subtasks" ON subtasks FOR UPDATE TO authenticated USING (assigned_to = auth.uid() OR claimed_by = auth.uid() OR is_project_manager(get_project_from_task(parent_id)) OR is_admin());
CREATE POLICY "manager_delete_subtasks" ON subtasks FOR DELETE TO authenticated USING (is_project_manager(get_project_from_task(parent_id)) OR is_admin());

-- TASK_REQUESTS
CREATE POLICY "view_project_requests" ON task_requests FOR SELECT TO authenticated USING (is_project_member(get_project_from_module(module_id)));
CREATE POLICY "worker_create_requests" ON task_requests FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid() AND is_project_member(get_project_from_module(module_id)));
CREATE POLICY "manager_update_requests" ON task_requests FOR UPDATE TO authenticated USING (is_project_manager(get_project_from_module(module_id)) OR is_admin());

-- ============================================
-- STEP 7: VERIFY
-- ============================================

-- Test function
SELECT '🧪 Testing is_pm_or_admin()...' as status;
SELECT is_pm_or_admin() as result;

-- Check policies
SELECT '📊 Checking policies...' as status;
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('projects', 'modules', 'tasks', 'subtasks')
GROUP BY tablename;

-- Check RLS
SELECT '🔒 Checking RLS status...' as status;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('projects', 'modules', 'tasks', 'subtasks');

-- ============================================
-- SUCCESS
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ FORCE FIX COMPLETE!';
  RAISE NOTICE '🔐 RLS enabled on all tables';
  RAISE NOTICE '🛡️ All policies recreated';
  RAISE NOTICE '🚀 Try creating a project now!';
END $$;
