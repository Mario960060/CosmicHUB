-- ============================================
-- RLS: Add minitask_id support to subtask create/delete
-- ============================================
-- can_edit_subtask: handle minitask parent
-- user_can_add_subtask: handle minitask_id parameter
-- ============================================

-- can_edit_subtask: add minitask_id branch
CREATE OR REPLACE FUNCTION can_edit_subtask(s subtasks)
RETURNS boolean AS $$
DECLARE
  v_task_id UUID;
  v_module_id UUID;
  v_project_id UUID;
BEGIN
  IF is_admin() THEN RETURN true; END IF;
  IF s.created_by = auth.uid() THEN RETURN true; END IF;
  -- parent_id (task)
  IF s.parent_id IS NOT NULL THEN
    v_task_id := s.parent_id;
    v_module_id := get_module_from_task(v_task_id);
    v_project_id := get_project_from_module(v_module_id);
    IF is_task_responsible(v_task_id) THEN RETURN true; END IF;
    IF is_module_lead(v_module_id) THEN RETURN true; END IF;
    IF is_project_manager(v_project_id) THEN RETURN true; END IF;
  -- module_id
  ELSIF s.module_id IS NOT NULL THEN
    v_module_id := s.module_id;
    v_project_id := get_project_from_module(v_module_id);
    IF is_module_lead(v_module_id) THEN RETURN true; END IF;
    IF is_project_manager(v_project_id) THEN RETURN true; END IF;
  -- project_id
  ELSIF s.project_id IS NOT NULL THEN
    v_project_id := s.project_id;
    IF is_project_manager(v_project_id) THEN RETURN true; END IF;
  -- minitask_id
  ELSIF s.minitask_id IS NOT NULL THEN
    SELECT mt.task_id, mt.module_id, mt.project_id INTO v_task_id, v_module_id, v_project_id
    FROM minitasks mt WHERE mt.id = s.minitask_id;
    IF v_task_id IS NOT NULL THEN
      IF is_task_responsible(v_task_id) THEN RETURN true; END IF;
      IF is_module_lead(get_module_from_task(v_task_id)) THEN RETURN true; END IF;
      IF is_project_manager(get_project_from_task(v_task_id)) THEN RETURN true; END IF;
    ELSIF v_module_id IS NOT NULL THEN
      IF is_module_lead(v_module_id) THEN RETURN true; END IF;
      IF is_project_manager(get_project_from_module(v_module_id)) THEN RETURN true; END IF;
    ELSIF v_project_id IS NOT NULL THEN
      IF is_project_manager(v_project_id) THEN RETURN true; END IF;
    END IF;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- user_can_add_subtask: add minitask_id parameter
CREATE OR REPLACE FUNCTION user_can_add_subtask(
  p_parent_id UUID, p_module_id UUID, p_project_id UUID, p_minitask_id UUID DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_task_id UUID;
  v_module_id UUID;
  v_project_id UUID;
BEGIN
  IF is_admin() THEN RETURN true; END IF;
  -- Explicit parent_id
  IF p_parent_id IS NOT NULL THEN
    IF is_project_manager(get_project_from_task(p_parent_id)) THEN RETURN true; END IF;
    IF is_task_member(p_parent_id) THEN RETURN true; END IF;
    IF is_module_lead(get_module_from_task(p_parent_id)) THEN RETURN true; END IF;
    IF EXISTS (SELECT 1 FROM module_members mm WHERE mm.module_id = get_module_from_task(p_parent_id) AND mm.user_id = auth.uid()) THEN RETURN true; END IF;
    IF is_project_member(get_project_from_task(p_parent_id)) THEN RETURN true; END IF;
  END IF;
  -- Explicit module_id
  IF p_module_id IS NOT NULL THEN
    IF is_project_manager(get_project_from_module(p_module_id)) THEN RETURN true; END IF;
    IF is_module_lead(p_module_id) THEN RETURN true; END IF;
    IF EXISTS (SELECT 1 FROM module_members mm WHERE mm.module_id = p_module_id AND mm.user_id = auth.uid()) THEN RETURN true; END IF;
    IF is_project_member(get_project_from_module(p_module_id)) THEN RETURN true; END IF;
  END IF;
  -- Explicit project_id
  IF p_project_id IS NOT NULL THEN
    IF is_project_member(p_project_id) THEN RETURN true; END IF;
  END IF;
  -- minitask_id: resolve to task/module/project
  IF p_minitask_id IS NOT NULL THEN
    SELECT mt.task_id, mt.module_id, mt.project_id INTO v_task_id, v_module_id, v_project_id
    FROM minitasks mt WHERE mt.id = p_minitask_id;
    IF v_task_id IS NOT NULL THEN
      IF is_task_member(v_task_id) THEN RETURN true; END IF;
      IF is_module_lead(get_module_from_task(v_task_id)) THEN RETURN true; END IF;
      IF EXISTS (SELECT 1 FROM module_members mm WHERE mm.module_id = get_module_from_task(v_task_id) AND mm.user_id = auth.uid()) THEN RETURN true; END IF;
      IF is_project_member(get_project_from_task(v_task_id)) THEN RETURN true; END IF;
    ELSIF v_module_id IS NOT NULL THEN
      IF is_module_lead(v_module_id) THEN RETURN true; END IF;
      IF EXISTS (SELECT 1 FROM module_members mm WHERE mm.module_id = v_module_id AND mm.user_id = auth.uid()) THEN RETURN true; END IF;
      IF is_project_member(get_project_from_module(v_module_id)) THEN RETURN true; END IF;
    ELSIF v_project_id IS NOT NULL THEN
      IF is_project_member(v_project_id) THEN RETURN true; END IF;
    END IF;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update INSERT policy to pass minitask_id
DROP POLICY IF EXISTS "Assigned users create subtasks" ON subtasks;
CREATE POLICY "Assigned users create subtasks"
ON subtasks FOR INSERT TO authenticated
WITH CHECK (
  user_can_add_subtask(parent_id, module_id, project_id, minitask_id)
);
