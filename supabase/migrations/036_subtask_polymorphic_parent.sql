-- ============================================
-- COSMIC PROJECT HUB - DATABASE MIGRATION
-- Migration 36: Subtask polymorphic parent
-- ============================================
-- Subtask can belong to: task (parent_id), module (module_id), or project (project_id)
-- Exactly one must be set.
-- ============================================

-- Add new parent columns
ALTER TABLE subtasks
  ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Make parent_id nullable (existing rows keep their parent_id)
ALTER TABLE subtasks
  ALTER COLUMN parent_id DROP NOT NULL;

-- Ensure exactly one parent is set
ALTER TABLE subtasks
  DROP CONSTRAINT IF EXISTS subtask_one_parent;
ALTER TABLE subtasks
  ADD CONSTRAINT subtask_one_parent CHECK (
    (
      (parent_id IS NOT NULL)::int +
      (module_id IS NOT NULL)::int +
      (project_id IS NOT NULL)::int
    ) = 1
  );

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_subtasks_module ON subtasks(module_id) WHERE module_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subtasks_project ON subtasks(project_id) WHERE project_id IS NOT NULL;

-- ============================================
-- RLS: Update subtask policies for polymorphic parent
-- ============================================

DROP POLICY IF EXISTS "Users view project subtasks" ON subtasks;
DROP POLICY IF EXISTS "PMs create subtasks" ON subtasks;
DROP POLICY IF EXISTS "Workers update own subtasks" ON subtasks;
DROP POLICY IF EXISTS "PMs delete subtasks" ON subtasks;

-- Helper: user has access to subtask via any parent type
CREATE OR REPLACE FUNCTION user_has_subtask_access(s subtasks)
RETURNS boolean AS $$
BEGIN
  RETURN (
    -- Via parent_id -> task -> module -> project
    (s.parent_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN modules m ON m.id = t.module_id
      INNER JOIN project_members pm ON pm.project_id = m.project_id
      WHERE t.id = s.parent_id AND pm.user_id = auth.uid()
    ))
    OR
    -- Via module_id -> module -> project
    (s.module_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM modules m
      INNER JOIN project_members pm ON pm.project_id = m.project_id
      WHERE m.id = s.module_id AND pm.user_id = auth.uid()
    ))
    OR
    -- Via project_id
    (s.project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = s.project_id AND pm.user_id = auth.uid()
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_pm_has_subtask_access(s subtasks)
RETURNS boolean AS $$
BEGIN
  RETURN (
    (s.parent_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN modules m ON m.id = t.module_id
      INNER JOIN project_members pm ON pm.project_id = m.project_id
      WHERE t.id = s.parent_id AND pm.user_id = auth.uid() AND pm.role = 'manager'
    ))
    OR
    (s.module_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM modules m
      INNER JOIN project_members pm ON pm.project_id = m.project_id
      WHERE m.id = s.module_id AND pm.user_id = auth.uid() AND pm.role = 'manager'
    ))
    OR
    (s.project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = s.project_id AND pm.user_id = auth.uid() AND pm.role = 'manager'
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Users can view subtasks in their projects
CREATE POLICY "Users view project subtasks"
ON subtasks FOR SELECT TO authenticated
USING (user_has_subtask_access(subtasks));

-- PMs can create subtasks
CREATE POLICY "PMs create subtasks"
ON subtasks FOR INSERT TO authenticated
WITH CHECK (user_pm_has_subtask_access(subtasks));

-- Workers can update their own subtasks, PMs can update all
CREATE POLICY "Workers update own subtasks"
ON subtasks FOR UPDATE TO authenticated
USING (
  assigned_to = auth.uid() OR user_pm_has_subtask_access(subtasks)
);

-- PMs can delete subtasks
CREATE POLICY "PMs delete subtasks"
ON subtasks FOR DELETE TO authenticated
USING (user_pm_has_subtask_access(subtasks));

-- ============================================
-- RLS: Update dependencies policies (subtasks can have module_id/project_id)
-- ============================================

DROP POLICY IF EXISTS "Users view project dependencies" ON dependencies;
DROP POLICY IF EXISTS "PMs create dependencies" ON dependencies;
DROP POLICY IF EXISTS "PMs delete dependencies" ON dependencies;

CREATE POLICY "Users view project dependencies"
ON dependencies FOR SELECT TO authenticated
USING (
  dependent_task_id IN (
    SELECT s.id FROM subtasks s WHERE user_has_subtask_access(s)
  )
);

CREATE POLICY "PMs create dependencies"
ON dependencies FOR INSERT TO authenticated
WITH CHECK (
  dependent_task_id IN (
    SELECT s.id FROM subtasks s WHERE user_pm_has_subtask_access(s)
  )
);

CREATE POLICY "PMs delete dependencies"
ON dependencies FOR DELETE TO authenticated
USING (
  dependent_task_id IN (
    SELECT s.id FROM subtasks s WHERE user_pm_has_subtask_access(s)
  )
);

-- ============================================
-- RLS: Update work_logs policies
-- ============================================

DROP POLICY IF EXISTS "Users view project work logs" ON work_logs;
DROP POLICY IF EXISTS "Workers create work logs" ON work_logs;

CREATE POLICY "Users view project work logs"
ON work_logs FOR SELECT TO authenticated
USING (
  subtask_id IN (
    SELECT s.id FROM subtasks s WHERE user_has_subtask_access(s)
  )
);

CREATE POLICY "Workers create work logs"
ON work_logs FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND subtask_id IN (
    SELECT s.id FROM subtasks s WHERE user_has_subtask_access(s)
  )
);
