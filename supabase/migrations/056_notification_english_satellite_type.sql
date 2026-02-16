-- ============================================
-- Notifications: English + satellite-type-specific messages
-- ============================================
-- Subtask: "You were assigned to a note" not "subtask"
-- All notifications in English
-- ============================================

-- Helper: get assignment message for subtask based on satellite_type
-- English messages per satellite: note, questions, document, canvas, etc. (not "subtask")
CREATE OR REPLACE FUNCTION get_subtask_assignment_message(p_name TEXT, p_satellite_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'You were assigned to ' || COALESCE(
    CASE p_satellite_type
      WHEN 'notes' THEN 'a note'
      WHEN 'questions' THEN 'questions'
      WHEN 'checklist' THEN 'a checklist'
      WHEN 'issues' THEN 'issues'
      WHEN 'metrics' THEN 'metrics'
      WHEN 'documents' THEN 'a document'
      WHEN 'ideas' THEN 'ideas'
      WHEN 'canvas' THEN 'a canvas'
      WHEN 'repo' THEN 'a repo'
      ELSE 'a subtask'
    END,
    'a subtask'
  ) || ': ' || COALESCE(NULLIF(TRIM(p_name), ''), 'Untitled');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper: get assignment title for subtask
CREATE OR REPLACE FUNCTION get_subtask_assignment_title(p_satellite_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'Assigned to ' || COALESCE(
    CASE p_satellite_type
      WHEN 'notes' THEN 'note'
      WHEN 'questions' THEN 'questions'
      WHEN 'checklist' THEN 'checklist'
      WHEN 'issues' THEN 'issues'
      WHEN 'metrics' THEN 'metrics'
      WHEN 'documents' THEN 'document'
      WHEN 'ideas' THEN 'ideas'
      WHEN 'canvas' THEN 'canvas'
      WHEN 'repo' THEN 'repo'
      ELSE 'subtask'
    END,
    'subtask'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1. Subtask UPDATE trigger (recreate to ensure new function is used)
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
      get_subtask_assignment_title(COALESCE(NEW.satellite_type, 'notes')),
      get_subtask_assignment_message(NEW.name, COALESCE(NEW.satellite_type, 'notes')),
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

-- 2. Subtask INSERT trigger
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
      get_subtask_assignment_title(COALESCE(NEW.satellite_type, 'notes')),
      get_subtask_assignment_message(NEW.name, COALESCE(NEW.satellite_type, 'notes')),
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

-- 3. Minitask UPDATE - English
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
      'Assigned to minitask',
      'You were assigned to a minitask: ' || COALESCE(NEW.name, 'Untitled'),
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

-- 4. Minitask INSERT - English
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
      'Assigned to minitask',
      'You were assigned to a minitask: ' || COALESCE(NEW.name, 'Untitled'),
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

-- 5. Task members - English
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
      'Assigned to task',
      'You were assigned as responsible for: ' || COALESCE(v_task_name, 'Task'),
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

-- 6. Module members - English
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
    'Added to module',
    'You were added to module: ' || COALESCE(v_module_name, 'Module'),
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

-- 7. Project members - English
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
    'Added to project',
    'You were added to project: ' || COALESCE(v_project_name, 'Project'),
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
