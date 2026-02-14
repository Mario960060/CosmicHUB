-- CURSOR: Auto-cleanup for read notifications older than 24 hours
-- This migration creates automatic cleanup for old notifications

-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete read notifications older than 24 hours
  DELETE FROM notifications
  WHERE read = true
  AND read_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Optional: Also delete very old unread notifications (30 days)
  -- to prevent database bloat
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO authenticated;

-- Trigger function that sets read_at timestamp and triggers cleanup
CREATE OR REPLACE FUNCTION trigger_cleanup_on_read()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a notification is marked as read, set read_at timestamp
  IF NEW.read = true AND (OLD.read = false OR OLD.read IS NULL) THEN
    NEW.read_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires before notification is marked as read
DROP TRIGGER IF EXISTS trigger_set_read_at ON notifications;

CREATE TRIGGER trigger_set_read_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  WHEN (NEW.read = true AND (OLD.read = false OR OLD.read IS NULL))
  EXECUTE FUNCTION trigger_cleanup_on_read();

-- Trigger to cleanup old notifications periodically (on any notification insert)
CREATE OR REPLACE FUNCTION trigger_periodic_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run cleanup 5% of the time to avoid overhead
  IF random() < 0.05 THEN
    PERFORM cleanup_old_notifications();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for periodic cleanup
DROP TRIGGER IF EXISTS trigger_notification_periodic_cleanup ON notifications;

CREATE TRIGGER trigger_notification_periodic_cleanup
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_periodic_cleanup();

-- Add comments
COMMENT ON FUNCTION cleanup_old_notifications() IS 
  'Automatically deletes read notifications older than 24 hours and unread notifications older than 30 days';

COMMENT ON FUNCTION trigger_cleanup_on_read() IS 
  'Trigger function that sets read_at timestamp when notification is marked as read';

COMMENT ON FUNCTION trigger_periodic_cleanup() IS 
  'Periodically triggers cleanup on notification insert (5% probability)';
