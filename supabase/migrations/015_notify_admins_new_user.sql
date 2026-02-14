-- Notify all admins when a new user account is created

-- 1. Add 'user' to related_type (drop existing check and recreate)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_related_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_related_type_check
  CHECK (related_type IS NULL OR related_type IN ('task', 'subtask', 'module', 'project', 'request', 'user'));

-- 2. Function: create notifications for all admins
CREATE OR REPLACE FUNCTION notify_admins_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_rec RECORD;
BEGIN
  FOR admin_rec IN
    SELECT id FROM users
    WHERE role = 'admin'
      AND deleted_at IS NULL
      AND id != NEW.id  -- don't notify the new user themselves (if they're admin)
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_id,
      related_type,
      actor_id
    ) VALUES (
      admin_rec.id,
      'new_user',
      'New account created',
      NEW.full_name || ' (' || NEW.email || ') joined the platform.',
      NEW.id,
      'user',
      NULL  -- system action, no actor
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3. Trigger on users INSERT
DROP TRIGGER IF EXISTS trg_notify_admins_new_user ON users;
CREATE TRIGGER trg_notify_admins_new_user
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_user();
