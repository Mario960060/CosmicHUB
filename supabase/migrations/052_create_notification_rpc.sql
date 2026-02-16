-- RPC for creating notifications (bypasses RLS INSERT policy)
-- Used when assigning users to questions, etc.

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_id, related_type, actor_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_related_id, p_related_type, p_actor_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION create_notification IS 'Creates a notification for a user. Used when assigning questions, etc.';
