-- Migration 61: Dependencies RLS – allow admin, project owner, and project manager to view/delete
-- Problem: Admin and project owner could not delete dependencies (406 on SELECT/DELETE)
-- Fix: Add is_admin() and project owner (created_by) to policies

-- Ensure is_admin exists (from migration 041)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
$$;

-- Helper: get project_id from any entity type (for owner check)
CREATE OR REPLACE FUNCTION get_project_from_entity(p_type TEXT, p_id UUID)
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT CASE p_type
    WHEN 'project' THEN p_id
    WHEN 'module' THEN (SELECT project_id FROM modules WHERE id = p_id)
    WHEN 'task' THEN (SELECT m.project_id FROM tasks t INNER JOIN modules m ON m.id = t.module_id WHERE t.id = p_id)
    WHEN 'subtask' THEN (SELECT COALESCE(s.project_id, m.project_id) FROM subtasks s LEFT JOIN modules m ON m.id = s.module_id WHERE s.id = p_id)
    WHEN 'minitask' THEN (SELECT COALESCE(mt.project_id, m.project_id) FROM minitasks mt LEFT JOIN tasks t ON t.id = mt.task_id LEFT JOIN modules m ON m.id = COALESCE(mt.module_id, t.module_id) WHERE mt.id = p_id)
    ELSE NULL
  END;
$$;

-- Helper: can manage dependency (admin OR PM OR project owner)
CREATE OR REPLACE FUNCTION user_can_manage_dependency(p_type TEXT, p_id UUID)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT is_admin()
  OR user_pm_has_entity_access(p_type, p_id)
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = get_project_from_entity(p_type, p_id)
    AND p.created_by = auth.uid()
  );
$$;

-- Update SELECT policy: view if member OR admin
DROP POLICY IF EXISTS "Users view project dependencies" ON dependencies;
CREATE POLICY "Users view project dependencies"
ON dependencies FOR SELECT TO authenticated
USING (
  user_has_entity_access(source_type, source_id)
  OR is_admin()
);

-- Update DELETE policy: delete if PM OR admin OR project owner
DROP POLICY IF EXISTS "PMs delete dependencies" ON dependencies;
CREATE POLICY "PMs delete dependencies"
ON dependencies FOR DELETE TO authenticated
USING (
  user_can_manage_dependency(source_type, source_id)
);
