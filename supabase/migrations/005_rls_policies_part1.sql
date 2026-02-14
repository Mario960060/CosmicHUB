-- ============================================
-- COSMIC PROJECT HUB - DATABASE MIGRATION
-- Migration 5: Row Level Security Policies
-- ============================================
-- Run this AFTER Migration 4
-- Creates: RLS policies for all tables
-- CRITICAL: This enables security - do not skip!
-- ============================================

-- ============================================
-- USERS TABLE RLS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view all active users
CREATE POLICY "Users view active users"
ON users FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- Users can update their own profile
CREATE POLICY "Users update own profile"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Only admins can insert users
CREATE POLICY "Admins insert users"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Only admins can delete users
CREATE POLICY "Admins delete users"
ON users FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- PROJECTS TABLE RLS
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can view projects they're members of
CREATE POLICY "Users view member projects"
ON projects FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT project_id 
    FROM project_members 
    WHERE user_id = auth.uid()
  )
);

-- PMs and Admins can create projects
CREATE POLICY "PMs create projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'project_manager')
  )
);

-- PMs can update their projects, Admins can update all
CREATE POLICY "PMs update projects"
ON projects FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT project_id 
    FROM project_members 
    WHERE user_id = auth.uid() 
    AND role = 'manager'
  )
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Only admins can delete projects
CREATE POLICY "Admins delete projects"
ON projects FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- PROJECT MEMBERS TABLE RLS
-- ============================================

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Users can view members of their projects
CREATE POLICY "Users view project members"
ON project_members FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id 
    FROM project_members 
    WHERE user_id = auth.uid()
  )
);

-- PMs can add members to their projects
CREATE POLICY "PMs add members"
ON project_members FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT project_id 
    FROM project_members 
    WHERE user_id = auth.uid() 
    AND role = 'manager'
  )
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- PMs can remove members from their projects
CREATE POLICY "PMs remove members"
ON project_members FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT project_id 
    FROM project_members 
    WHERE user_id = auth.uid() 
    AND role = 'manager'
  )
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- MODULES TABLE RLS
-- ============================================

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Users can view modules in their projects
CREATE POLICY "Users view project modules"
ON modules FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id 
    FROM project_members 
    WHERE user_id = auth.uid()
  )
);

-- PMs can create modules in their projects
CREATE POLICY "PMs create modules"
ON modules FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT project_id 
    FROM project_members 
    WHERE user_id = auth.uid() 
    AND role = 'manager'
  )
);

-- PMs can update modules in their projects
CREATE POLICY "PMs update modules"
ON modules FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT project_id 
    FROM project_members 
    WHERE user_id = auth.uid() 
    AND role = 'manager'
  )
);

-- PMs can delete modules in their projects
CREATE POLICY "PMs delete modules"
ON modules FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT project_id 
    FROM project_members 
    WHERE user_id = auth.uid() 
    AND role = 'manager'
  )
);

-- ============================================
-- TASKS TABLE RLS
-- ============================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can view tasks in their projects
CREATE POLICY "Users view project tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  module_id IN (
    SELECT m.id 
    FROM modules m
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid()
  )
);

-- PMs can create tasks
CREATE POLICY "PMs create tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  module_id IN (
    SELECT m.id 
    FROM modules m
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() 
    AND pm.role = 'manager'
  )
);

-- PMs can update tasks
CREATE POLICY "PMs update tasks"
ON tasks FOR UPDATE
TO authenticated
USING (
  module_id IN (
    SELECT m.id 
    FROM modules m
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() 
    AND pm.role = 'manager'
  )
);

-- PMs can delete tasks
CREATE POLICY "PMs delete tasks"
ON tasks FOR DELETE
TO authenticated
USING (
  module_id IN (
    SELECT m.id 
    FROM modules m
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() 
    AND pm.role = 'manager'
  )
);

-- ============================================
-- SUCCESS MESSAGE (Part 1)
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE 'Migration 5 (Part 1/2) completed: RLS policies for users, projects, project_members, modules, tasks';
END $$;
