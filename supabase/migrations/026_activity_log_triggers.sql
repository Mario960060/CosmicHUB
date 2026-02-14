-- ============================================
-- COSMIC PROJECT HUB - Activity Log Triggers
-- Migration 26: Triggers to populate activity_log on entity changes
-- ============================================
-- SECURITY DEFINER ensures the function runs as owner (postgres)
-- and can bypass RLS when inserting into activity_log.
-- ============================================

-- ============================================
-- HELPER: log_activity function
-- ============================================

CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_project_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_log (
    user_id,
    action,
    entity_type,
    entity_id,
    entity_name,
    project_id,
    details
  ) VALUES (
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_project_id,
    p_details
  );
END;
$$;

-- ============================================
-- 1. PROJECTS triggers
-- ============================================

CREATE OR REPLACE FUNCTION public.log_project_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
BEGIN
  v_user_id := COALESCE(auth.uid(), NEW.created_by, OLD.created_by);

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    PERFORM log_activity(
      v_user_id,
      v_action,
      'project',
      NEW.id,
      NEW.name,
      NEW.id,
      jsonb_build_object('status', NEW.status)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    PERFORM log_activity(
      v_user_id,
      v_action,
      'project',
      NEW.id,
      NEW.name,
      NEW.id,
      jsonb_build_object('status', NEW.status, 'old_status', OLD.status)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    PERFORM log_activity(
      v_user_id,
      v_action,
      'project',
      OLD.id,
      OLD.name,
      OLD.id,
      jsonb_build_object('status', OLD.status)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS activity_log_projects ON projects;
CREATE TRIGGER activity_log_projects
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION log_project_activity();

-- ============================================
-- 2. MODULES triggers
-- ============================================

CREATE OR REPLACE FUNCTION public.log_module_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      v_user_id,
      'created',
      'module',
      NEW.id,
      NEW.name,
      NEW.project_id,
      jsonb_build_object('color', NEW.color)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      v_user_id,
      'updated',
      'module',
      NEW.id,
      NEW.name,
      NEW.project_id,
      jsonb_build_object('color', NEW.color)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      v_user_id,
      'deleted',
      'module',
      OLD.id,
      OLD.name,
      OLD.project_id,
      NULL
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS activity_log_modules ON modules;
CREATE TRIGGER activity_log_modules
AFTER INSERT OR UPDATE OR DELETE ON modules
FOR EACH ROW EXECUTE FUNCTION log_module_activity();

-- ============================================
-- 3. TASKS triggers (project_id from module)
-- ============================================

CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
BEGIN
  v_user_id := COALESCE(auth.uid(), NEW.created_by, OLD.created_by);

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT project_id INTO v_project_id FROM modules WHERE id = NEW.module_id;
  ELSE
    SELECT project_id INTO v_project_id FROM modules WHERE id = OLD.module_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      v_user_id,
      'created',
      'task',
      NEW.id,
      NEW.name,
      v_project_id,
      jsonb_build_object('status', NEW.status)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      v_user_id,
      'updated',
      'task',
      NEW.id,
      NEW.name,
      v_project_id,
      jsonb_build_object('status', NEW.status, 'old_status', OLD.status)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      v_user_id,
      'deleted',
      'task',
      OLD.id,
      OLD.name,
      v_project_id,
      jsonb_build_object('status', OLD.status)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS activity_log_tasks ON tasks;
CREATE TRIGGER activity_log_tasks
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION log_task_activity();

-- ============================================
-- 4. SUBTASKS triggers (project_id from task->module)
-- ============================================

CREATE OR REPLACE FUNCTION public.log_subtask_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
BEGIN
  v_user_id := COALESCE(auth.uid(), NEW.created_by, OLD.created_by);

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT m.project_id INTO v_project_id
    FROM tasks t
    JOIN modules m ON t.module_id = m.id
    WHERE t.id = NEW.parent_id;
  ELSE
    SELECT m.project_id INTO v_project_id
    FROM tasks t
    JOIN modules m ON t.module_id = m.id
    WHERE t.id = OLD.parent_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      v_user_id,
      'created',
      'subtask',
      NEW.id,
      NEW.name,
      v_project_id,
      jsonb_build_object('status', NEW.status)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      v_user_id,
      'updated',
      'subtask',
      NEW.id,
      NEW.name,
      v_project_id,
      jsonb_build_object('status', NEW.status, 'old_status', OLD.status)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      v_user_id,
      'deleted',
      'subtask',
      OLD.id,
      OLD.name,
      v_project_id,
      jsonb_build_object('status', OLD.status)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS activity_log_subtasks ON subtasks;
CREATE TRIGGER activity_log_subtasks
AFTER INSERT OR UPDATE OR DELETE ON subtasks
FOR EACH ROW EXECUTE FUNCTION log_subtask_activity();

-- ============================================
-- 5. PROJECT_MEMBERS triggers (joined / left)
-- ============================================

CREATE OR REPLACE FUNCTION public.log_project_member_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_project_name FROM projects WHERE id = NEW.project_id;
    PERFORM log_activity(
      NEW.user_id,
      'joined',
      'project',
      NEW.project_id,
      COALESCE(v_project_name, 'Project'),
      NEW.project_id,
      jsonb_build_object('role', NEW.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO v_project_name FROM projects WHERE id = OLD.project_id;
    PERFORM log_activity(
      OLD.user_id,
      'left',
      'project',
      OLD.project_id,
      COALESCE(v_project_name, 'Project'),
      OLD.project_id,
      jsonb_build_object('role', OLD.role)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS activity_log_project_members ON project_members;
CREATE TRIGGER activity_log_project_members
AFTER INSERT OR DELETE ON project_members
FOR EACH ROW EXECUTE FUNCTION log_project_member_activity();

-- ============================================
-- 6. INVITES triggers (created / accepted)
-- ============================================

CREATE OR REPLACE FUNCTION public.log_invite_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      NEW.created_by,
      'created',
      'invite',
      NEW.id,
      NEW.email,
      NULL,
      jsonb_build_object('role', NEW.role, 'status', NEW.status)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    PERFORM log_activity(
      NEW.accepted_by,
      'accepted',
      'invite',
      NEW.id,
      NEW.email,
      NULL,
      jsonb_build_object('role', NEW.role)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activity_log_invites ON invites;
CREATE TRIGGER activity_log_invites
AFTER INSERT OR UPDATE ON invites
FOR EACH ROW EXECUTE FUNCTION log_invite_activity();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 26 completed: Activity log triggers for projects, modules, tasks, subtasks, project_members, invites';
END;
$$;
