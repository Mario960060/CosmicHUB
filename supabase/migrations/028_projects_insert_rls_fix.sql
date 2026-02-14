-- ============================================
-- COSMIC PROJECT HUB - Fix projects RLS for PM
-- Migration 28: Use inline checks instead of helper functions
-- ============================================
-- Problem: Policies use is_pm_or_admin(), is_project_member() which may not exist.
-- Solution: Inline checks - no dependency on helper functions.
-- ============================================

-- 1. SELECT: Users see projects they're members of; Admin sees all
DROP POLICY IF EXISTS "view_member_projects" ON projects;
DROP POLICY IF EXISTS "Users view member projects" ON projects;

CREATE POLICY "view_member_projects"
ON projects FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 2. INSERT: PM and Admin can create projects
DROP POLICY IF EXISTS "pm_admin_create_projects" ON projects;
DROP POLICY IF EXISTS "PMs create projects" ON projects;

CREATE POLICY "pm_admin_create_projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('project_manager', 'admin')
  )
);

-- 3. PROJECT_MEMBERS INSERT: PM/Admin must add themselves when creating project
-- Problem: manager_admin_add_members required is_project_manager(project_id) - but
-- when creating new project, PM isn't in project_members yet (chicken-egg).
DROP POLICY IF EXISTS "manager_admin_add_members" ON project_members;
DROP POLICY IF EXISTS "PMs add members" ON project_members;

CREATE POLICY "manager_admin_add_members"
ON project_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('project_manager', 'admin')
  )
);
