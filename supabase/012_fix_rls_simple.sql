-- ============================================
-- COSMIC PROJECT HUB - SIMPLE RLS FIX
-- Migration 012: Simplified Inline Policies
-- ============================================
-- This migration:
-- 1. Drops all problematic SECURITY DEFINER functions
-- 2. Drops all existing policies
-- 3. Creates simple inline policies (no helper functions!)
-- 4. Re-enables RLS on all tables
-- ============================================

-- ============================================
-- STEP 1: DROP ALL OLD FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS get_my_role() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS is_pm_or_admin() CASCADE;
DROP FUNCTION IF EXISTS is_project_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_project_manager(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_project_from_module(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_project_from_task(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_project_from_subtask(UUID) CASCADE;

-- ============================================
-- STEP 2: DROP ALL OLD POLICIES
-- ============================================

-- Users policies
DROP POLICY IF EXISTS "view_active_users" ON users;
DROP POLICY IF EXISTS "update_own_profile" ON users;
DROP POLICY IF EXISTS "admin_insert_users" ON users;
DROP POLICY IF EXISTS "admin_delete_users" ON users;
DROP POLICY IF EXISTS "Users view active users" ON users;
DROP POLICY IF EXISTS "Users update own profile" ON users;
DROP POLICY IF EXISTS "Admins insert users" ON users;
DROP POLICY IF EXISTS "Admins delete users" ON users;

-- Projects policies
DROP POLICY IF EXISTS "view_member_projects" ON projects;
DROP POLICY IF EXISTS "pm_admin_create_projects" ON projects;
DROP POLICY IF EXISTS "manager_admin_update_projects" ON projects;
DROP POLICY IF EXISTS "admin_delete_projects" ON projects;
DROP POLICY IF EXISTS "Users view member projects" ON projects;
DROP POLICY IF EXISTS "PMs create projects" ON projects;
DROP POLICY IF EXISTS "PMs update projects" ON projects;
DROP POLICY IF EXISTS "Admins delete projects" ON projects;
DROP POLICY IF EXISTS "Admins and PMs create projects" ON projects;

-- Project members policies
DROP POLICY IF EXISTS "view_all_members" ON project_members;
DROP POLICY IF EXISTS "manager_admin_add_members" ON project_members;
DROP POLICY IF EXISTS "manager_admin_remove_members" ON project_members;
DROP POLICY IF EXISTS "update_own_membership" ON project_members;
DROP POLICY IF EXISTS "Users view project members" ON project_members;
DROP POLICY IF EXISTS "PMs add members" ON project_members;
DROP POLICY IF EXISTS "PMs remove members" ON project_members;
DROP POLICY IF EXISTS "Authenticated view project members" ON project_members;
DROP POLICY IF EXISTS "Creators and admins add members" ON project_members;
DROP POLICY IF EXISTS "Creators and admins remove members" ON project_members;

-- Modules policies
DROP POLICY IF EXISTS "view_project_modules" ON modules;
DROP POLICY IF EXISTS "manager_create_modules" ON modules;
DROP POLICY IF EXISTS "manager_update_modules" ON modules;
DROP POLICY IF EXISTS "manager_delete_modules" ON modules;
DROP POLICY IF EXISTS "Users view project modules" ON modules;
DROP POLICY IF EXISTS "PMs create modules" ON modules;
DROP POLICY IF EXISTS "PMs update modules" ON modules;
DROP POLICY IF EXISTS "PMs delete modules" ON modules;

-- Tasks policies
DROP POLICY IF EXISTS "view_project_tasks" ON tasks;
DROP POLICY IF EXISTS "manager_create_tasks" ON tasks;
DROP POLICY IF EXISTS "manager_update_tasks" ON tasks;
DROP POLICY IF EXISTS "manager_delete_tasks" ON tasks;
DROP POLICY IF EXISTS "Users view project tasks" ON tasks;
DROP POLICY IF EXISTS "PMs create tasks" ON tasks;
DROP POLICY IF EXISTS "PMs update tasks" ON tasks;
DROP POLICY IF EXISTS "PMs delete tasks" ON tasks;

-- Subtasks policies
DROP POLICY IF EXISTS "view_project_subtasks" ON subtasks;
DROP POLICY IF EXISTS "manager_create_subtasks" ON subtasks;
DROP POLICY IF EXISTS "worker_manager_update_subtasks" ON subtasks;
DROP POLICY IF EXISTS "manager_delete_subtasks" ON subtasks;
DROP POLICY IF EXISTS "Users view project subtasks" ON subtasks;
DROP POLICY IF EXISTS "PMs create subtasks" ON subtasks;
DROP POLICY IF EXISTS "Workers update own subtasks" ON subtasks;
DROP POLICY IF EXISTS "PMs delete subtasks" ON subtasks;

-- Task requests policies
DROP POLICY IF EXISTS "view_project_requests" ON task_requests;
DROP POLICY IF EXISTS "worker_create_requests" ON task_requests;
DROP POLICY IF EXISTS "manager_update_requests" ON task_requests;
DROP POLICY IF EXISTS "Users view project requests" ON task_requests;
DROP POLICY IF EXISTS "Workers create requests" ON task_requests;
DROP POLICY IF EXISTS "PMs update requests" ON task_requests;

-- Work logs policies
DROP POLICY IF EXISTS "view_own_logs" ON work_logs;
DROP POLICY IF EXISTS "create_own_logs" ON work_logs;
DROP POLICY IF EXISTS "update_own_logs" ON work_logs;
DROP POLICY IF EXISTS "delete_own_logs" ON work_logs;

-- Dependencies policies
DROP POLICY IF EXISTS "view_project_dependencies" ON dependencies;
DROP POLICY IF EXISTS "manager_manage_dependencies" ON dependencies;

-- ============================================
-- STEP 3: ENSURE RLS IS ENABLED
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE SIMPLE INLINE POLICIES
-- ============================================

-- ============================================
-- USERS TABLE
-- ============================================

-- Everyone can view active users
CREATE POLICY "users_select"
ON users FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- Users can update own profile
CREATE POLICY "users_update"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Only admins can insert users
CREATE POLICY "users_insert"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Only admins can delete users
CREATE POLICY "users_delete"
ON users FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- ============================================
-- PROJECTS TABLE
-- ============================================

-- View projects where user is member OR is admin
CREATE POLICY "projects_select"
ON projects FOR SELECT
TO authenticated
USING (
  -- User is member of project
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = projects.id
    AND project_members.user_id = auth.uid()
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Only PM or Admin can create projects
CREATE POLICY "projects_insert"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('project_manager', 'admin')
    AND users.deleted_at IS NULL
  )
);

-- Manager of project OR admin can update
CREATE POLICY "projects_update"
ON projects FOR UPDATE
TO authenticated
USING (
  -- User is manager of project
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = projects.id
    AND project_members.user_id = auth.uid()
    AND project_members.role = 'manager'
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Only admin can delete projects
CREATE POLICY "projects_delete"
ON projects FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- ============================================
-- PROJECT_MEMBERS TABLE
-- ============================================

-- Everyone can view all members (needed for joins)
CREATE POLICY "project_members_select"
ON project_members FOR SELECT
TO authenticated
USING (true);

-- Manager of project OR admin can add members
CREATE POLICY "project_members_insert"
ON project_members FOR INSERT
TO authenticated
WITH CHECK (
  -- User is manager of project
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'manager'
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Manager or admin can remove members
CREATE POLICY "project_members_delete"
ON project_members FOR DELETE
TO authenticated
USING (
  -- User is manager of project
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'manager'
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Users can update own membership info (but not role)
CREATE POLICY "project_members_update"
ON project_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- MODULES TABLE
-- ============================================

-- View modules in projects where user is member OR is admin
CREATE POLICY "modules_select"
ON modules FOR SELECT
TO authenticated
USING (
  -- User is member of project
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = modules.project_id
    AND project_members.user_id = auth.uid()
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Manager of project OR admin can create modules
CREATE POLICY "modules_insert"
ON modules FOR INSERT
TO authenticated
WITH CHECK (
  -- User is manager of project
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'manager'
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
    AND u.deleted_at IS NULL
  )
);

-- Manager or admin can update modules
CREATE POLICY "modules_update"
ON modules FOR UPDATE
TO authenticated
USING (
  -- User is manager of project
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = modules.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role = 'manager'
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Only admin can delete modules
CREATE POLICY "modules_delete"
ON modules FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- ============================================
-- TASKS TABLE
-- ============================================

-- View tasks in projects where user is member OR is admin
CREATE POLICY "tasks_select"
ON tasks FOR SELECT
TO authenticated
USING (
  -- User is member of project
  EXISTS (
    SELECT 1 FROM modules m
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE m.id = tasks.module_id
    AND pm.user_id = auth.uid()
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Manager or admin can create tasks
CREATE POLICY "tasks_insert"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  -- User is manager of project
  EXISTS (
    SELECT 1 FROM modules m
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE m.id = module_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'manager'
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Manager or admin can update tasks
CREATE POLICY "tasks_update"
ON tasks FOR UPDATE
TO authenticated
USING (
  -- User is manager of project
  EXISTS (
    SELECT 1 FROM modules m
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE m.id = tasks.module_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'manager'
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Only admin can delete tasks
CREATE POLICY "tasks_delete"
ON tasks FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- ============================================
-- SUBTASKS TABLE
-- ============================================

-- View subtasks: assigned user OR project member OR admin
CREATE POLICY "subtasks_select"
ON subtasks FOR SELECT
TO authenticated
USING (
  -- User is assigned
  subtasks.assigned_to = auth.uid()
  OR
  subtasks.claimed_by = auth.uid()
  OR
  -- User is member of project
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN modules m ON m.id = t.module_id
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE t.id = subtasks.parent_id
    AND pm.user_id = auth.uid()
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Create subtasks: manager OR admin (for assigning work)
CREATE POLICY "subtasks_insert"
ON subtasks FOR INSERT
TO authenticated
WITH CHECK (
  -- User is manager of project
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN modules m ON m.id = t.module_id
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE t.id = parent_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'manager'
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Update subtasks: assigned user (for status/progress) OR manager OR admin
CREATE POLICY "subtasks_update"
ON subtasks FOR UPDATE
TO authenticated
USING (
  -- User is assigned
  subtasks.assigned_to = auth.uid()
  OR
  subtasks.claimed_by = auth.uid()
  OR
  -- User is manager of project
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN modules m ON m.id = t.module_id
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE t.id = subtasks.parent_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'manager'
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Delete subtasks: only admin
CREATE POLICY "subtasks_delete"
ON subtasks FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- ============================================
-- TASK_REQUESTS TABLE
-- ============================================

-- View requests: project members OR admin
CREATE POLICY "task_requests_select"
ON task_requests FOR SELECT
TO authenticated
USING (
  -- User is member of project
  EXISTS (
    SELECT 1 FROM modules m
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE m.id = task_requests.module_id
    AND pm.user_id = auth.uid()
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Create requests: workers in project
CREATE POLICY "task_requests_insert"
ON task_requests FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND
  -- User is member of project
  EXISTS (
    SELECT 1 FROM modules m
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE m.id = module_id
    AND pm.user_id = auth.uid()
  )
);

-- Update requests: manager OR admin (for approval/rejection)
CREATE POLICY "task_requests_update"
ON task_requests FOR UPDATE
TO authenticated
USING (
  -- User is manager of project
  EXISTS (
    SELECT 1 FROM modules m
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE m.id = task_requests.module_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'manager'
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- ============================================
-- WORK_LOGS TABLE
-- ============================================

-- View own logs OR project manager OR admin
CREATE POLICY "work_logs_select"
ON work_logs FOR SELECT
TO authenticated
USING (
  -- Own logs
  user_id = auth.uid()
  OR
  -- Manager of project
  EXISTS (
    SELECT 1 FROM subtasks s
    JOIN tasks t ON t.id = s.parent_id
    JOIN modules m ON m.id = t.module_id
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE s.id = work_logs.subtask_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'manager'
  )
  OR
  -- Admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Create own logs
CREATE POLICY "work_logs_insert"
ON work_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Update own logs
CREATE POLICY "work_logs_update"
ON work_logs FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Delete own logs
CREATE POLICY "work_logs_delete"
ON work_logs FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- DEPENDENCIES TABLE
-- ============================================

-- View dependencies: project members OR admin
CREATE POLICY "dependencies_select"
ON dependencies FOR SELECT
TO authenticated
USING (
  -- User is member of project (via subtask -> task -> module)
  EXISTS (
    SELECT 1 FROM subtasks s
    JOIN tasks t ON t.id = s.parent_id
    JOIN modules m ON m.id = t.module_id
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE s.id = dependencies.dependent_task_id
    AND pm.user_id = auth.uid()
  )
  OR
  -- Admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- Manage dependencies: manager OR admin
CREATE POLICY "dependencies_insert"
ON dependencies FOR INSERT
TO authenticated
WITH CHECK (
  -- User is manager of project
  EXISTS (
    SELECT 1 FROM subtasks s
    JOIN tasks t ON t.id = s.parent_id
    JOIN modules m ON m.id = t.module_id
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE s.id = dependent_task_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'manager'
  )
  OR
  -- Admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

CREATE POLICY "dependencies_delete"
ON dependencies FOR DELETE
TO authenticated
USING (
  -- User is manager of project
  EXISTS (
    SELECT 1 FROM subtasks s
    JOIN tasks t ON t.id = s.parent_id
    JOIN modules m ON m.id = t.module_id
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE s.id = dependencies.dependent_task_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'manager'
  )
  OR
  -- Admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.deleted_at IS NULL
  )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('users', 'projects', 'project_members', 'modules', 'tasks', 'subtasks', 'task_requests', 'work_logs', 'dependencies')
GROUP BY tablename
ORDER BY tablename;

-- Check RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('users', 'projects', 'project_members', 'modules', 'tasks', 'subtasks', 'task_requests', 'work_logs', 'dependencies')
ORDER BY tablename;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration 012 completed successfully!';
  RAISE NOTICE '🔐 RLS enabled with SIMPLE INLINE POLICIES';
  RAISE NOTICE '🚫 All SECURITY DEFINER functions removed';
  RAISE NOTICE '✨ Zero complexity, maximum security!';
  RAISE NOTICE '🚀 Try creating a project now - it should work!';
END $$;
