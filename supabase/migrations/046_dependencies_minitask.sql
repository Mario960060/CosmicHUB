-- ============================================
-- COSMIC PROJECT HUB - Dependencies
-- Migration 46: Add minitask to polymorphic dependencies
-- ============================================

ALTER TABLE dependencies DROP CONSTRAINT IF EXISTS chk_dep_source_type;
ALTER TABLE dependencies DROP CONSTRAINT IF EXISTS chk_dep_target_type;

ALTER TABLE dependencies
  ADD CONSTRAINT chk_dep_source_type CHECK (source_type IN ('module', 'task', 'subtask', 'minitask')),
  ADD CONSTRAINT chk_dep_target_type CHECK (target_type IN ('module', 'task', 'subtask', 'minitask'));

CREATE OR REPLACE FUNCTION user_has_entity_access(p_type TEXT, p_id UUID)
RETURNS boolean AS $$
BEGIN
  IF p_type = 'subtask' THEN
    RETURN EXISTS (
      SELECT 1 FROM subtasks s WHERE s.id = p_id AND user_has_subtask_access(s)
    );
  ELSIF p_type = 'minitask' THEN
    RETURN EXISTS (
      SELECT 1 FROM minitasks m WHERE m.id = p_id AND user_has_minitask_access(m)
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
  ELSIF p_type = 'minitask' THEN
    RETURN EXISTS (
      SELECT 1 FROM minitasks m WHERE m.id = p_id AND user_pm_has_minitask_access(m)
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
