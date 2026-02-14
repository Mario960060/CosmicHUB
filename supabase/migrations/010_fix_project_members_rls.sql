-- ============================================
-- FIX: Project Members RLS (Remove Infinite Recursion)
-- ============================================
-- Problem: Original policies had project_members querying itself = infinite loop
-- Solution: Simplify to allow authenticated users to view, rely on projects RLS

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users view project members" ON project_members;
DROP POLICY IF EXISTS "PMs add project members" ON project_members;
DROP POLICY IF EXISTS "PMs remove project members" ON project_members;

-- ============================================
-- NEW SIMPLIFIED POLICIES (No Recursion)
-- ============================================

-- Allow all authenticated users to VIEW project members
-- Security: They can only act on projects they access via projects table RLS
CREATE POLICY "Authenticated view project members"
ON project_members FOR SELECT
TO authenticated
USING (true);

-- Allow project creators and admins to ADD members
CREATE POLICY "Creators and admins add members"
ON project_members FOR INSERT
TO authenticated
WITH CHECK (
  -- User created the project
  project_id IN (
    SELECT id FROM projects WHERE created_by = auth.uid()
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow project creators and admins to REMOVE members
CREATE POLICY "Creators and admins remove members"
ON project_members FOR DELETE
TO authenticated
USING (
  -- User created the project
  project_id IN (
    SELECT id FROM projects WHERE created_by = auth.uid()
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow users to UPDATE their own membership (e.g., leave project)
CREATE POLICY "Users update own membership"
ON project_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

