-- ============================================
-- Assignment notification triggers
-- Notify user when assigned to project, module, task, minitask, or subtask
-- ============================================

-- 1. Add 'minitask' to related_type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_related_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_related_type_check
  CHECK (related_type IS NULL OR related_type IN ('task', 'subtask', 'module', 'project', 'request', 'user', 'minitask'));

-- 2. Trigger: subtasks - when assigned_to changes
CREATE OR REPLACE FUNCTION notify_subtask_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    PERFORM create_notification(
      NEW.assigned_to,
      'assignment',
      'Przypisano do subtaska',
      'Zostałeś przypisany do: ' || COALESCE(NEW.name, 'Subtask'),
      NEW.id,
      'subtask',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_subtask_assignment ON subtasks;
CREATE TRIGGER trigger_notify_subtask_assignment
  AFTER UPDATE ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_subtask_assignment();

-- 3. Trigger: minitasks - when assigned_to changes
CREATE OR REPLACE FUNCTION notify_minitask_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    PERFORM create_notification(
      NEW.assigned_to,
      'assignment',
      'Przypisano do minitaska',
      'Zostałeś przypisany do: ' || COALESCE(NEW.name, 'Minitask'),
      NEW.id,
      'minitask',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_minitask_assignment ON minitasks;
CREATE TRIGGER trigger_notify_minitask_assignment
  AFTER UPDATE ON minitasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_minitask_assignment();

-- 4. Trigger: minitasks - when created with assigned_to
CREATE OR REPLACE FUNCTION notify_minitask_assignment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    PERFORM create_notification(
      NEW.assigned_to,
      'assignment',
      'Przypisano do minitaska',
      'Zostałeś przypisany do: ' || COALESCE(NEW.name, 'Minitask'),
      NEW.id,
      'minitask',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_minitask_assignment_insert ON minitasks;
CREATE TRIGGER trigger_notify_minitask_assignment_insert
  AFTER INSERT ON minitasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_minitask_assignment_insert();

-- 5. Trigger: subtasks - when created with assigned_to
CREATE OR REPLACE FUNCTION notify_subtask_assignment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    PERFORM create_notification(
      NEW.assigned_to,
      'assignment',
      'Przypisano do subtaska',
      'Zostałeś przypisany do: ' || COALESCE(NEW.name, 'Subtask'),
      NEW.id,
      'subtask',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_subtask_assignment_insert ON subtasks;
CREATE TRIGGER trigger_notify_subtask_assignment_insert
  AFTER INSERT ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_subtask_assignment_insert();

-- 6. Trigger: task_members - when added as responsible
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_name TEXT;
BEGIN
  IF NEW.role = 'responsible' THEN
    SELECT name INTO v_task_name FROM tasks WHERE id = NEW.task_id;
    PERFORM create_notification(
      NEW.user_id,
      'assignment',
      'Przypisano do taska',
      'Zostałeś przypisany jako odpowiedzialny za: ' || COALESCE(v_task_name, 'Task'),
      NEW.task_id,
      'task',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_task_assignment ON task_members;
CREATE TRIGGER trigger_notify_task_assignment
  AFTER INSERT ON task_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assignment();

-- 7. Trigger: module_members - when added
CREATE OR REPLACE FUNCTION notify_module_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_name TEXT;
BEGIN
  SELECT name INTO v_module_name FROM modules WHERE id = NEW.module_id;
  PERFORM create_notification(
    NEW.user_id,
    'assignment',
    'Dodano do modułu',
    'Zostałeś dodany do modułu: ' || COALESCE(v_module_name, 'Moduł'),
    NEW.module_id,
    'module',
    auth.uid()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_module_assignment ON module_members;
CREATE TRIGGER trigger_notify_module_assignment
  AFTER INSERT ON module_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_module_assignment();

-- 8. Trigger: project_members - when added
CREATE OR REPLACE FUNCTION notify_project_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_name TEXT;
BEGIN
  SELECT name INTO v_project_name FROM projects WHERE id = NEW.project_id;
  PERFORM create_notification(
    NEW.user_id,
    'assignment',
    'Dodano do projektu',
    'Zostałeś dodany do projektu: ' || COALESCE(v_project_name, 'Projekt'),
    NEW.project_id,
    'project',
    auth.uid()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_project_assignment ON project_members;
CREATE TRIGGER trigger_notify_project_assignment
  AFTER INSERT ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_project_assignment();
