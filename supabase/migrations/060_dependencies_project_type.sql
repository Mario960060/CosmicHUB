-- Migration 60: Add 'project' to dependencies source/target types (allow dependencies to/from sun)

ALTER TABLE dependencies DROP CONSTRAINT IF EXISTS chk_dep_source_type;
ALTER TABLE dependencies DROP CONSTRAINT IF EXISTS chk_dep_target_type;

ALTER TABLE dependencies
  ADD CONSTRAINT chk_dep_source_type CHECK (source_type IN ('module', 'task', 'subtask', 'minitask', 'project')),
  ADD CONSTRAINT chk_dep_target_type CHECK (target_type IN ('module', 'task', 'subtask', 'minitask', 'project'));

-- Update RLS helper to allow project access
CREATE OR REPLACE FUNCTION user_has_entity_access(p_type TEXT, p_id UUID)
RETURNS boolean AS $$
BEGIN
  IF p_type = 'project' THEN
    RETURN EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = p_id AND pm.user_id = auth.uid()
    );
  ELSIF p_type = 'subtask' THEN
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
  ELSIF p_type = 'minitask' THEN
    RETURN EXISTS (
      SELECT 1 FROM minitasks mt
      LEFT JOIN tasks t ON t.id = mt.task_id
      LEFT JOIN modules m ON m.id = COALESCE(mt.module_id, t.module_id)
      LEFT JOIN project_members pm ON pm.project_id = COALESCE(m.project_id, mt.project_id)
      WHERE mt.id = p_id AND pm.user_id = auth.uid()
    );
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_pm_has_entity_access(p_type TEXT, p_id UUID)
RETURNS boolean AS $$
BEGIN
  IF p_type = 'project' THEN
    RETURN EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = p_id AND pm.user_id = auth.uid() AND pm.role = 'manager'
    );
  ELSIF p_type = 'subtask' THEN
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
  ELSIF p_type = 'minitask' THEN
    RETURN EXISTS (
      SELECT 1 FROM minitasks mt
      LEFT JOIN tasks t ON t.id = mt.task_id
      LEFT JOIN modules m ON m.id = COALESCE(mt.module_id, t.module_id)
      LEFT JOIN project_members pm ON pm.project_id = COALESCE(m.project_id, mt.project_id) AND pm.role = 'manager'
      WHERE mt.id = p_id AND pm.user_id = auth.uid()
    );
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
