-- ============================================
-- COSMIC PROJECT HUB - DATABASE MIGRATION
-- Migration 44: Minitasks (asteroids) + Task System view
-- ============================================
-- Creates minitasks table (asteroids belonging to tasks)
-- Extends subtask polymorphic parent to include minitask_id
-- ============================================

-- ============================================
-- 1. MINITASKS TABLE
-- ============================================

CREATE TABLE minitasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 200),
  description TEXT,
  estimated_hours NUMERIC(10, 2),
  status TEXT DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  priority_stars NUMERIC(2, 1) DEFAULT 1.0
    CHECK (priority_stars >= 0.5 AND priority_stars <= 3.0),
  asteroid_type TEXT DEFAULT 'rocky',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_minitasks_task ON minitasks(task_id);
CREATE INDEX idx_minitasks_status ON minitasks(status);
CREATE INDEX idx_minitasks_priority ON minitasks(priority_stars DESC);

-- ============================================
-- 2. SUBTASKS - ADD minitask_id, UPDATE CONSTRAINT
-- ============================================

ALTER TABLE subtasks
  ADD COLUMN IF NOT EXISTS minitask_id UUID REFERENCES minitasks(id) ON DELETE CASCADE;

ALTER TABLE subtasks
  DROP CONSTRAINT IF EXISTS subtask_one_parent;

ALTER TABLE subtasks
  ADD CONSTRAINT subtask_one_parent CHECK (
    (
      (parent_id IS NOT NULL)::int +
      (module_id IS NOT NULL)::int +
      (project_id IS NOT NULL)::int +
      (minitask_id IS NOT NULL)::int
    ) = 1
  );

CREATE INDEX IF NOT EXISTS idx_subtasks_minitask ON subtasks(minitask_id) WHERE minitask_id IS NOT NULL;

-- ============================================
-- 3. RLS - MINITASKS
-- ============================================

ALTER TABLE minitasks ENABLE ROW LEVEL SECURITY;

-- Helper: user has access to minitask via task -> module -> project
CREATE OR REPLACE FUNCTION user_has_minitask_access(m minitasks)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tasks t
    INNER JOIN modules mod ON mod.id = t.module_id
    INNER JOIN project_members pm ON pm.project_id = mod.project_id
    WHERE t.id = m.task_id AND pm.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_pm_has_minitask_access(m minitasks)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tasks t
    INNER JOIN modules mod ON mod.id = t.module_id
    INNER JOIN project_members pm ON pm.project_id = mod.project_id
    WHERE t.id = m.task_id AND pm.user_id = auth.uid() AND pm.role = 'manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Users view project minitasks"
ON minitasks FOR SELECT TO authenticated
USING (user_has_minitask_access(minitasks));

CREATE POLICY "PMs create minitasks"
ON minitasks FOR INSERT TO authenticated
WITH CHECK (user_pm_has_minitask_access(minitasks));

CREATE POLICY "PMs update minitasks"
ON minitasks FOR UPDATE TO authenticated
USING (user_pm_has_minitask_access(minitasks));

CREATE POLICY "PMs delete minitasks"
ON minitasks FOR DELETE TO authenticated
USING (user_pm_has_minitask_access(minitasks));

-- ============================================
-- 4. RLS - UPDATE SUBTASK ACCESS FUNCTIONS FOR minitask_id
-- ============================================

CREATE OR REPLACE FUNCTION user_has_subtask_access(s subtasks)
RETURNS boolean AS $$
BEGIN
  RETURN (
    (s.parent_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN modules m ON m.id = t.module_id
      INNER JOIN project_members pm ON pm.project_id = m.project_id
      WHERE t.id = s.parent_id AND pm.user_id = auth.uid()
    ))
    OR
    (s.module_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM modules m
      INNER JOIN project_members pm ON pm.project_id = m.project_id
      WHERE m.id = s.module_id AND pm.user_id = auth.uid()
    ))
    OR
    (s.project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = s.project_id AND pm.user_id = auth.uid()
    ))
    OR
    (s.minitask_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM minitasks mt
      INNER JOIN tasks t ON t.id = mt.task_id
      INNER JOIN modules m ON m.id = t.module_id
      INNER JOIN project_members pm ON pm.project_id = m.project_id
      WHERE mt.id = s.minitask_id AND pm.user_id = auth.uid()
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
    OR
    (s.minitask_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM minitasks mt
      INNER JOIN tasks t ON t.id = mt.task_id
      INNER JOIN modules m ON m.id = t.module_id
      INNER JOIN project_members pm ON pm.project_id = m.project_id
      WHERE mt.id = s.minitask_id AND pm.user_id = auth.uid() AND pm.role = 'manager'
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 5. GALAXY_POSITIONS - Add minitask entity type and task view
-- ============================================

ALTER TABLE galaxy_positions
  DROP CONSTRAINT IF EXISTS galaxy_positions_entity_type_check;

ALTER TABLE galaxy_positions
  ADD CONSTRAINT galaxy_positions_entity_type_check
  CHECK (entity_type IN ('project', 'module', 'task', 'subtask', 'portal', 'minitask'));

ALTER TABLE galaxy_positions
  DROP CONSTRAINT IF EXISTS galaxy_positions_view_context_check;

ALTER TABLE galaxy_positions
  ADD CONSTRAINT galaxy_positions_view_context_check
  CHECK (view_context IN ('solar_system', 'module', 'task'));

ALTER TABLE galaxy_positions
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_galaxy_pos_task ON galaxy_positions(task_id) WHERE task_id IS NOT NULL;

-- ============================================
-- SUCCESS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 044: minitasks table and subtask minitask_id added successfully!';
END $$;
