-- ============================================
-- COSMIC PROJECT HUB - Minitasks assignable to modules
-- Migration 48: Add module_id to minitasks (minitask can belong to task OR module)
-- ============================================

-- Add module_id, make task_id nullable
ALTER TABLE minitasks ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE CASCADE;
ALTER TABLE minitasks ALTER COLUMN task_id DROP NOT NULL;

-- Constraint: exactly one of task_id or module_id
ALTER TABLE minitasks DROP CONSTRAINT IF EXISTS minitask_one_parent;
ALTER TABLE minitasks ADD CONSTRAINT minitask_one_parent CHECK (
  (task_id IS NOT NULL)::int + (module_id IS NOT NULL)::int = 1
);

CREATE INDEX IF NOT EXISTS idx_minitasks_module ON minitasks(module_id) WHERE module_id IS NOT NULL;

-- ============================================
-- RLS - Update minitask access for module_id
-- ============================================

CREATE OR REPLACE FUNCTION user_has_minitask_access(m minitasks)
RETURNS boolean AS $$
BEGIN
  RETURN (
    (m.task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN modules mod ON mod.id = t.module_id
      INNER JOIN project_members pm ON pm.project_id = mod.project_id
      WHERE t.id = m.task_id AND pm.user_id = auth.uid()
    ))
    OR
    (m.module_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM modules mod
      INNER JOIN project_members pm ON pm.project_id = mod.project_id
      WHERE mod.id = m.module_id AND pm.user_id = auth.uid()
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_pm_has_minitask_access(m minitasks)
RETURNS boolean AS $$
BEGIN
  RETURN (
    (m.task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN modules mod ON mod.id = t.module_id
      INNER JOIN project_members pm ON pm.project_id = mod.project_id
      WHERE t.id = m.task_id AND pm.user_id = auth.uid() AND pm.role = 'manager'
    ))
    OR
    (m.module_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM modules mod
      INNER JOIN project_members pm ON pm.project_id = mod.project_id
      WHERE mod.id = m.module_id AND pm.user_id = auth.uid() AND pm.role = 'manager'
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- RLS - Update subtask access for minitask (task_id OR module_id)
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
      LEFT JOIN tasks t ON t.id = mt.task_id
      LEFT JOIN modules m ON m.id = COALESCE(t.module_id, mt.module_id)
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
      LEFT JOIN tasks t ON t.id = mt.task_id
      LEFT JOIN modules m ON m.id = COALESCE(t.module_id, mt.module_id)
      INNER JOIN project_members pm ON pm.project_id = m.project_id
      WHERE mt.id = s.minitask_id AND pm.user_id = auth.uid() AND pm.role = 'manager'
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
