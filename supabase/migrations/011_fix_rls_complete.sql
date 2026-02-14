-- ============================================
-- COSMIC PROJECT HUB - FIX RLS COMPLETELY
-- Migration 11: Complete RLS Overhaul
-- ============================================
-- This migration:
-- 1. Drops all problematic policies
-- 2. Creates helper functions (SECURITY DEFINER)
-- 3. Re-enables RLS on all core tables
-- 4. Creates simple, non-recursive policies
-- ============================================

-- ============================================
-- STEP 1: DROP ALL OLD POLICIES
-- ============================================

-- Users policies
DROP POLICY IF EXISTS "Users view active users" ON users;
DROP POLICY IF EXISTS "Users update own profile" ON users;
DROP POLICY IF EXISTS "Admins insert users" ON users;
DROP POLICY IF EXISTS "Admins delete users" ON users;

-- Projects policies
DROP POLICY IF EXISTS "Users view member projects" ON projects;
DROP POLICY IF EXISTS "PMs create projects" ON projects;
DROP POLICY IF EXISTS "PMs update projects" ON projects;
DROP POLICY IF EXISTS "Admins delete projects" ON projects;
DROP POLICY IF EXISTS "Admins and PMs create projects" ON projects;

-- Project members policies
DROP POLICY IF EXISTS "Users view project members" ON project_members;
DROP POLICY IF EXISTS "PMs add members" ON project_members;
DROP POLICY IF EXISTS "PMs remove members" ON project_members;
DROP POLICY IF EXISTS "Authenticated view project members" ON project_members;
DROP POLICY IF EXISTS "Creators and admins add members" ON project_members;
DROP POLICY IF EXISTS "Creators and admins remove members" ON project_members;
DROP POLICY IF EXISTS "Users update own membership" ON project_members;

-- Modules policies
DROP POLICY IF EXISTS "Users view project modules" ON modules;
DROP POLICY IF EXISTS "PMs create modules" ON modules;
DROP POLICY IF EXISTS "PMs update modules" ON modules;
DROP POLICY IF EXISTS "PMs delete modules" ON modules;

-- Tasks policies
DROP POLICY IF EXISTS "Users view project tasks" ON tasks;
DROP POLICY IF EXISTS "PMs create tasks" ON tasks;
DROP POLICY IF EXISTS "PMs update tasks" ON tasks;
DROP POLICY IF EXISTS "PMs delete tasks" ON tasks;

-- Subtasks policies
DROP POLICY IF EXISTS "Users view project subtasks" ON subtasks;
DROP POLICY IF EXISTS "PMs create subtasks" ON subtasks;
DROP POLICY IF EXISTS "Workers update own subtasks" ON subtasks;
DROP POLICY IF EXISTS "PMs delete subtasks" ON subtasks;

-- Task requests policies
DROP POLICY IF EXISTS "Users view project requests" ON task_requests;
DROP POLICY IF EXISTS "Workers create requests" ON task_requests;
DROP POLICY IF EXISTS "PMs update requests" ON task_requests;

-- ============================================
-- STEP 2: CREATE HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================

-- Function: Get user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Function: Check if user is admin
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

-- Function: Check if user is PM or admin
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

-- Function: Check if user is member of project
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

-- Function: Check if user is manager of project
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

-- Function: Get project_id from module_id
CREATE OR REPLACE FUNCTION get_project_from_module(module_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT project_id FROM modules WHERE id = module_uuid;
$$;

-- Function: Get project_id from task_id
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

-- Function: Get project_id from subtask_id
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
-- STEP 3: RE-ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE NEW SIMPLE POLICIES
-- ============================================

-- ============================================
-- USERS TABLE
-- ============================================

-- Everyone can view active users
CREATE POLICY "view_active_users"
ON users FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- Users can update own profile
CREATE POLICY "update_own_profile"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admins can insert users
CREATE POLICY "admin_insert_users"
ON users FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Admins can delete users (soft delete)
CREATE POLICY "admin_delete_users"
ON users FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- PROJECTS TABLE
-- ============================================

-- View projects where user is member
CREATE POLICY "view_member_projects"
ON projects FOR SELECT
TO authenticated
USING (is_project_member(id));

-- PM or Admin can create projects
CREATE POLICY "pm_admin_create_projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (is_pm_or_admin());

-- Manager of project or admin can update
CREATE POLICY "manager_admin_update_projects"
ON projects FOR UPDATE
TO authenticated
USING (is_project_manager(id) OR is_admin());

-- Admin can delete projects
CREATE POLICY "admin_delete_projects"
ON projects FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- PROJECT_MEMBERS TABLE
-- ============================================

-- Everyone can view members (needed for joins)
CREATE POLICY "view_all_members"
ON project_members FOR SELECT
TO authenticated
USING (true);

-- Manager or admin can add members
CREATE POLICY "manager_admin_add_members"
ON project_members FOR INSERT
TO authenticated
WITH CHECK (
  is_project_manager(project_id) OR is_admin()
);

-- Manager or admin can remove members
CREATE POLICY "manager_admin_remove_members"
ON project_members FOR DELETE
TO authenticated
USING (
  is_project_manager(project_id) OR is_admin()
);

-- Users can update own membership
CREATE POLICY "update_own_membership"
ON project_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- MODULES TABLE
-- ============================================

-- View modules in projects user is member of
CREATE POLICY "view_project_modules"
ON modules FOR SELECT
TO authenticated
USING (is_project_member(project_id));

-- Manager can create modules
CREATE POLICY "manager_create_modules"
ON modules FOR INSERT
TO authenticated
WITH CHECK (
  is_project_manager(project_id) OR is_admin()
);

-- Manager can update modules
CREATE POLICY "manager_update_modules"
ON modules FOR UPDATE
TO authenticated
USING (
  is_project_manager(project_id) OR is_admin()
);

-- Manager can delete modules
CREATE POLICY "manager_delete_modules"
ON modules FOR DELETE
TO authenticated
USING (
  is_project_manager(project_id) OR is_admin()
);

-- ============================================
-- TASKS TABLE
-- ============================================

-- View tasks in projects user is member of
CREATE POLICY "view_project_tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  is_project_member(get_project_from_module(module_id))
);

-- Manager can create tasks
CREATE POLICY "manager_create_tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  is_project_manager(get_project_from_module(module_id)) OR is_admin()
);

-- Manager can update tasks
CREATE POLICY "manager_update_tasks"
ON tasks FOR UPDATE
TO authenticated
USING (
  is_project_manager(get_project_from_module(module_id)) OR is_admin()
);

-- Manager can delete tasks
CREATE POLICY "manager_delete_tasks"
ON tasks FOR DELETE
TO authenticated
USING (
  is_project_manager(get_project_from_module(module_id)) OR is_admin()
);

-- ============================================
-- SUBTASKS TABLE
-- ============================================

-- View subtasks in projects user is member of
CREATE POLICY "view_project_subtasks"
ON subtasks FOR SELECT
TO authenticated
USING (
  is_project_member(get_project_from_task(parent_id))
);

-- Manager can create subtasks
CREATE POLICY "manager_create_subtasks"
ON subtasks FOR INSERT
TO authenticated
WITH CHECK (
  is_project_manager(get_project_from_task(parent_id)) OR is_admin()
);

-- Workers can update own subtasks, managers can update all
CREATE POLICY "worker_manager_update_subtasks"
ON subtasks FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid() 
  OR claimed_by = auth.uid()
  OR is_project_manager(get_project_from_task(parent_id)) 
  OR is_admin()
);

-- Manager can delete subtasks
CREATE POLICY "manager_delete_subtasks"
ON subtasks FOR DELETE
TO authenticated
USING (
  is_project_manager(get_project_from_task(parent_id)) OR is_admin()
);

-- ============================================
-- TASK_REQUESTS TABLE
-- ============================================

-- View requests in projects user is member of
CREATE POLICY "view_project_requests"
ON task_requests FOR SELECT
TO authenticated
USING (
  is_project_member(get_project_from_module(module_id))
);

-- Workers can create requests
CREATE POLICY "worker_create_requests"
ON task_requests FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND is_project_member(get_project_from_module(module_id))
);

-- Manager can update requests (approve/reject)
CREATE POLICY "manager_update_requests"
ON task_requests FOR UPDATE
TO authenticated
USING (
  is_project_manager(get_project_from_module(module_id)) OR is_admin()
);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration 11 completed successfully!';
  RAISE NOTICE '🔐 RLS re-enabled on all core tables';
  RAISE NOTICE '🛡️ New simple policies created using SECURITY DEFINER functions';
  RAISE NOTICE '🚀 Database security is now properly configured!';
END $$;
