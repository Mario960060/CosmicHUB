-- ============================================
-- COSMIC PROJECT HUB - DATABASE MIGRATION
-- Migration 41: task_members table + auto-cascade + RLS
-- ============================================
-- Task-level assignment with responsible/member roles
-- Auto-cascade: task -> module -> project
-- Cascade removal: project -> module -> task
-- ============================================

-- ============================================
-- 0. ENSURE HELPER FUNCTIONS EXIST (may be missing if migration 011 not applied)
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION is_project_manager(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = project_uuid AND user_id = auth.uid() AND role = 'manager'
  );
$$;

CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = project_uuid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION get_project_from_module(module_uuid UUID)
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT project_id FROM modules WHERE id = module_uuid;
$$;

CREATE OR REPLACE FUNCTION get_project_from_task(task_uuid UUID)
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT m.project_id FROM tasks t
  INNER JOIN modules m ON m.id = t.module_id
  WHERE t.id = task_uuid;
$$;

-- ============================================
-- 1. CREATE task_members TABLE
-- ============================================

CREATE TABLE task_members (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('responsible', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

-- Exactly 1 responsible per task
CREATE UNIQUE INDEX task_one_responsible ON task_members (task_id) WHERE role = 'responsible';

CREATE INDEX idx_task_members_user ON task_members(user_id);
CREATE INDEX idx_task_members_task ON task_members(task_id);

ALTER TABLE task_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. HELPER FUNCTIONS
-- ============================================

-- Get module_id from task_id
CREATE OR REPLACE FUNCTION get_module_from_task(task_uuid UUID)
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT module_id FROM tasks WHERE id = task_uuid;
$$;

-- Check if user is task member
CREATE OR REPLACE FUNCTION is_task_member(task_uuid UUID)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM task_members
    WHERE task_id = task_uuid AND user_id = auth.uid()
  );
$$;

-- Check if user is task responsible
CREATE OR REPLACE FUNCTION is_task_responsible(task_uuid UUID)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM task_members
    WHERE task_id = task_uuid AND user_id = auth.uid() AND role = 'responsible'
  );
$$;

-- Check if user is module lead
CREATE OR REPLACE FUNCTION is_module_lead(module_uuid UUID)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM module_members
    WHERE module_id = module_uuid AND user_id = auth.uid() AND role = 'lead'
  );
$$;

-- Can assign regular members to task (PM, module lead, admin)
CREATE OR REPLACE FUNCTION can_assign_task_member(task_uuid UUID)
RETURNS boolean AS $$
DECLARE
  v_module_id UUID;
  v_project_id UUID;
BEGIN
  IF is_admin() THEN RETURN true; END IF;
  v_module_id := get_module_from_task(task_uuid);
  v_project_id := get_project_from_module(v_module_id);
  -- PM of project
  IF is_project_manager(v_project_id) THEN RETURN true; END IF;
  -- Module lead
  IF is_module_lead(v_module_id) THEN RETURN true; END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Can assign responsible role (PM or admin ONLY)
CREATE OR REPLACE FUNCTION can_assign_task_responsible(task_uuid UUID)
RETURNS boolean AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF is_admin() THEN RETURN true; END IF;
  v_project_id := get_project_from_task(task_uuid);
  RETURN is_project_manager(v_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Can edit/delete subtask: own OR task responsible OR module lead OR PM OR admin
CREATE OR REPLACE FUNCTION can_edit_subtask(s subtasks)
RETURNS boolean AS $$
DECLARE
  v_task_id UUID;
  v_module_id UUID;
  v_project_id UUID;
BEGIN
  IF is_admin() THEN RETURN true; END IF;
  -- Own subtask (created_by)
  IF s.created_by = auth.uid() THEN RETURN true; END IF;
  -- Get parent context
  IF s.parent_id IS NOT NULL THEN
    v_task_id := s.parent_id;
    v_module_id := get_module_from_task(v_task_id);
    v_project_id := get_project_from_module(v_module_id);
    IF is_task_responsible(v_task_id) THEN RETURN true; END IF;
    IF is_module_lead(v_module_id) THEN RETURN true; END IF;
    IF is_project_manager(v_project_id) THEN RETURN true; END IF;
  ELSIF s.module_id IS NOT NULL THEN
    v_module_id := s.module_id;
    v_project_id := get_project_from_module(v_module_id);
    IF is_module_lead(v_module_id) THEN RETURN true; END IF;
    IF is_project_manager(v_project_id) THEN RETURN true; END IF;
  ELSIF s.project_id IS NOT NULL THEN
    v_project_id := s.project_id;
    IF is_project_manager(v_project_id) THEN RETURN true; END IF;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Can add subtask: must be assigned to parent (task_member, module_member, or project_member)
CREATE OR REPLACE FUNCTION user_can_add_subtask(
  p_parent_id UUID, p_module_id UUID, p_project_id UUID
)
RETURNS boolean AS $$
BEGIN
  IF is_admin() THEN RETURN true; END IF;
  IF p_parent_id IS NOT NULL AND is_project_manager(get_project_from_task(p_parent_id)) THEN RETURN true; END IF;
  IF p_module_id IS NOT NULL AND is_project_manager(get_project_from_module(p_module_id)) THEN RETURN true; END IF;
  IF p_project_id IS NOT NULL AND is_project_manager(p_project_id) THEN RETURN true; END IF;
  -- Task parent: task_member OR module_member OR project_member
  IF p_parent_id IS NOT NULL THEN
    IF is_task_member(p_parent_id) THEN RETURN true; END IF;
    IF is_module_lead(get_module_from_task(p_parent_id)) THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM module_members mm
      WHERE mm.module_id = get_module_from_task(p_parent_id) AND mm.user_id = auth.uid()
    ) THEN RETURN true; END IF;
    IF is_project_member(get_project_from_task(p_parent_id)) THEN RETURN true; END IF;
  END IF;
  -- Module parent
  IF p_module_id IS NOT NULL THEN
    IF is_module_lead(p_module_id) THEN RETURN true; END IF;
    IF EXISTS (SELECT 1 FROM module_members mm WHERE mm.module_id = p_module_id AND mm.user_id = auth.uid()) THEN RETURN true; END IF;
    IF is_project_member(get_project_from_module(p_module_id)) THEN RETURN true; END IF;
  END IF;
  -- Project parent
  IF p_project_id IS NOT NULL THEN
    IF is_project_member(p_project_id) THEN RETURN true; END IF;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Can add work log: task_member, module_member, task responsible, module lead, PM, or admin
CREATE OR REPLACE FUNCTION user_can_log_work_for_subtask(subtask_uuid UUID)
RETURNS boolean AS $$
DECLARE
  s RECORD;
  v_module_id UUID;
BEGIN
  SELECT parent_id, module_id, project_id INTO s FROM subtasks WHERE id = subtask_uuid;
  IF NOT FOUND THEN RETURN false; END IF;
  IF is_admin() THEN RETURN true; END IF;
  IF s.parent_id IS NOT NULL THEN
    v_module_id := get_module_from_task(s.parent_id);
    IF is_task_member(s.parent_id) THEN RETURN true; END IF;
    IF is_module_lead(v_module_id) THEN RETURN true; END IF;
    IF EXISTS (SELECT 1 FROM module_members mm WHERE mm.module_id = v_module_id AND mm.user_id = auth.uid()) THEN RETURN true; END IF;
    IF is_project_manager(get_project_from_module(v_module_id)) THEN RETURN true; END IF;
  ELSIF s.module_id IS NOT NULL THEN
    IF is_module_lead(s.module_id) THEN RETURN true; END IF;
    IF EXISTS (SELECT 1 FROM module_members mm WHERE mm.module_id = s.module_id AND mm.user_id = auth.uid()) THEN RETURN true; END IF;
    IF is_project_manager(get_project_from_module(s.module_id)) THEN RETURN true; END IF;
  ELSIF s.project_id IS NOT NULL THEN
    IF is_project_manager(s.project_id) THEN RETURN true; END IF;
    IF is_project_member(s.project_id) THEN RETURN true; END IF;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 3. AUTO-CASCADE TRIGGERS
-- ============================================

-- task_members -> module_members -> project_members
CREATE OR REPLACE FUNCTION auto_cascade_task_member()
RETURNS TRIGGER AS $$
DECLARE
  v_module_id UUID;
  v_project_id UUID;
BEGIN
  v_module_id := get_module_from_task(NEW.task_id);
  v_project_id := get_project_from_module(v_module_id);
  INSERT INTO module_members (module_id, user_id, role)
  VALUES (v_module_id, NEW.user_id, 'member')
  ON CONFLICT (module_id, user_id) DO NOTHING;
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, NEW.user_id, 'member')
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_cascade_task_member
AFTER INSERT ON task_members
FOR EACH ROW
EXECUTE FUNCTION auto_cascade_task_member();

-- module_members -> project_members (when not already from task)
CREATE OR REPLACE FUNCTION auto_cascade_module_member()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  v_project_id := get_project_from_module(NEW.module_id);
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, NEW.user_id, 'member')
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_cascade_module_member
AFTER INSERT ON module_members
FOR EACH ROW
EXECUTE FUNCTION auto_cascade_module_member();

-- Cascade removal: project_members DELETE -> remove from module_members and task_members
CREATE OR REPLACE FUNCTION cascade_remove_project_member()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM module_members
  WHERE user_id = OLD.user_id
    AND module_id IN (SELECT id FROM modules WHERE project_id = OLD.project_id);
  DELETE FROM task_members
  WHERE user_id = OLD.user_id
    AND task_id IN (
      SELECT t.id FROM tasks t
      INNER JOIN modules m ON m.id = t.module_id
      WHERE m.project_id = OLD.project_id
    );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_cascade_remove_project_member
BEFORE DELETE ON project_members
FOR EACH ROW
EXECUTE FUNCTION cascade_remove_project_member();

-- ============================================
-- 4. RLS: task_members
-- ============================================

CREATE POLICY "task_members_select"
ON task_members FOR SELECT TO authenticated
USING (
  task_id IN (
    SELECT t.id FROM tasks t
    INNER JOIN modules m ON m.id = t.module_id
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid()
  )
  OR is_admin()
);

-- INSERT member: PM, module lead, or admin
-- INSERT responsible: PM or admin ONLY (handled in WITH CHECK - we check the role in the inserted row)
CREATE POLICY "task_members_insert"
ON task_members FOR INSERT TO authenticated
WITH CHECK (
  (
    role = 'member' AND can_assign_task_member(task_id)
  )
  OR
  (
    role = 'responsible' AND can_assign_task_responsible(task_id)
  )
);

CREATE POLICY "task_members_delete"
ON task_members FOR DELETE TO authenticated
USING (can_assign_task_member(task_id) OR (user_id = auth.uid() AND role = 'member'));

CREATE POLICY "task_members_update"
ON task_members FOR UPDATE TO authenticated
USING (can_assign_task_responsible(task_id) OR is_admin())
WITH CHECK (can_assign_task_responsible(task_id) OR is_admin());

-- ============================================
-- 5. RLS: Update subtasks
-- ============================================

DROP POLICY IF EXISTS "PMs create subtasks" ON subtasks;
DROP POLICY IF EXISTS "Workers update own subtasks" ON subtasks;
DROP POLICY IF EXISTS "PMs delete subtasks" ON subtasks;

-- Any assigned person can create subtask
CREATE POLICY "Assigned users create subtasks"
ON subtasks FOR INSERT TO authenticated
WITH CHECK (
  user_can_add_subtask(parent_id, module_id, project_id)
);

-- Own subtask OR task responsible / module lead / PM / admin can update
CREATE POLICY "Users update own or managed subtasks"
ON subtasks FOR UPDATE TO authenticated
USING (can_edit_subtask(subtasks));

-- Same for delete
CREATE POLICY "Users delete own or managed subtasks"
ON subtasks FOR DELETE TO authenticated
USING (can_edit_subtask(subtasks));

-- ============================================
-- 6. RLS: Update work_logs (restrict INSERT)
-- ============================================

DROP POLICY IF EXISTS "Workers create work logs" ON work_logs;

CREATE POLICY "Assigned users create work logs"
ON work_logs FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND user_can_log_work_for_subtask(subtask_id)
);

-- ============================================
-- 7. Update user_has_subtask_access for task_members
-- ============================================
-- Viewing: project_members, module_members, task_members all grant access
-- Current user_has_subtask_access checks project_members - which is correct
-- because auto-cascade adds task_members to project_members. So no change needed.

-- ============================================
-- DONE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 41 completed: task_members table, auto-cascade, RLS for subtasks and work_logs';
END $$;
