-- ============================================
-- COSMIC PROJECT HUB - DATABASE MIGRATION
-- Migration 39: Polymorphic Dependencies
-- ============================================
-- Dependencies can now connect any entities: module, task, subtask
-- Source = dependent side (A depends on B => source=A, target=B)
-- ============================================

-- Add new polymorphic columns
ALTER TABLE dependencies
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS target_type TEXT,
  ADD COLUMN IF NOT EXISTS target_id UUID;

-- Migrate existing data (all current deps are subtask->subtask)
UPDATE dependencies
SET source_type = 'subtask',
    source_id = dependent_task_id,
    target_type = 'subtask',
    target_id = depends_on_task_id
WHERE source_type IS NULL;

-- Drop old UNIQUE constraint
ALTER TABLE dependencies DROP CONSTRAINT IF EXISTS dependencies_dependent_task_id_depends_on_task_id_key;

-- Drop old CHECK constraint (dependent_task_id != depends_on_task_id)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'public.dependencies'::regclass AND contype = 'c')
  LOOP
    EXECUTE format('ALTER TABLE dependencies DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Make new columns NOT NULL
ALTER TABLE dependencies
  ALTER COLUMN source_type SET NOT NULL,
  ALTER COLUMN source_id SET NOT NULL,
  ALTER COLUMN target_type SET NOT NULL,
  ALTER COLUMN target_id SET NOT NULL;

-- Add new constraints
ALTER TABLE dependencies
  ADD CONSTRAINT chk_dep_source_type CHECK (source_type IN ('module', 'task', 'subtask')),
  ADD CONSTRAINT chk_dep_target_type CHECK (target_type IN ('module', 'task', 'subtask')),
  ADD CONSTRAINT chk_dep_no_self CHECK (NOT (source_type = target_type AND source_id = target_id)),
  ADD CONSTRAINT uq_dep_polymorphic UNIQUE (source_type, source_id, target_type, target_id);

-- Make old columns nullable (kept for reference, apps should use new columns)
ALTER TABLE dependencies
  ALTER COLUMN dependent_task_id DROP NOT NULL,
  ALTER COLUMN depends_on_task_id DROP NOT NULL;

-- Indexes for polymorphic queries
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target_type, target_id);

-- ============================================
-- RLS: Helper functions for polymorphic access
-- ============================================

CREATE OR REPLACE FUNCTION user_has_entity_access(p_type TEXT, p_id UUID)
RETURNS boolean AS $$
BEGIN
  IF p_type = 'subtask' THEN
    RETURN EXISTS (
      SELECT 1 FROM subtasks s WHERE s.id = p_id AND user_has_subtask_access(s)
    );
  ELSIF p_type = 'task' THEN
    RETURN EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN modules m ON m.id = t.module_id
      INNER JOIN project_members pm ON pm.project_id = m.project_id
      WHERE t.id = p_id AND pm.user_id = auth.uid()
    );
  ELSIF p_type = 'module' THEN
    RETURN EXISTS (
      SELECT 1 FROM modules m
      INNER JOIN project_members pm ON pm.project_id = m.project_id
      WHERE m.id = p_id AND pm.user_id = auth.uid()
    );
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_pm_has_entity_access(p_type TEXT, p_id UUID)
RETURNS boolean AS $$
BEGIN
  IF p_type = 'subtask' THEN
    RETURN EXISTS (
      SELECT 1 FROM subtasks s WHERE s.id = p_id AND user_pm_has_subtask_access(s)
    );
  ELSIF p_type = 'task' THEN
    RETURN EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN modules m ON m.id = t.module_id
      INNER JOIN project_members pm ON pm.project_id = m.project_id AND pm.role = 'manager'
      WHERE t.id = p_id AND pm.user_id = auth.uid()
    );
  ELSIF p_type = 'module' THEN
    RETURN EXISTS (
      SELECT 1 FROM modules m
      INNER JOIN project_members pm ON pm.project_id = m.project_id AND pm.role = 'manager'
      WHERE m.id = p_id AND pm.user_id = auth.uid()
    );
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- RLS: Update dependencies policies
-- ============================================

DROP POLICY IF EXISTS "Users view project dependencies" ON dependencies;
DROP POLICY IF EXISTS "PMs create dependencies" ON dependencies;
DROP POLICY IF EXISTS "PMs delete dependencies" ON dependencies;

CREATE POLICY "Users view project dependencies"
ON dependencies FOR SELECT TO authenticated
USING (user_has_entity_access(source_type, source_id));

CREATE POLICY "PMs create dependencies"
ON dependencies FOR INSERT TO authenticated
WITH CHECK (user_pm_has_entity_access(source_type, source_id));

CREATE POLICY "PMs delete dependencies"
ON dependencies FOR DELETE TO authenticated
USING (user_pm_has_entity_access(source_type, source_id));
