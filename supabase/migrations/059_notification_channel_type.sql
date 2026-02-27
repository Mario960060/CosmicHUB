-- Add 'channel' to related_type for chat @mention notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_related_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_related_type_check
  CHECK (related_type IS NULL OR related_type IN ('task', 'subtask', 'module', 'project', 'request', 'user', 'minitask', 'channel'));
