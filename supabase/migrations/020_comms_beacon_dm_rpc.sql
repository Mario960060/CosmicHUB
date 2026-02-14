-- ============================================
-- COSMIC PROJECT HUB - Fix DM channel creation (403)
-- Migration 20: RPC to create DM channels (bypasses RLS)
-- ============================================

CREATE OR REPLACE FUNCTION create_dm_channel(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  ch_id uuid;
  existing_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF other_user_id = current_user_id THEN
    RAISE EXCEPTION 'Cannot create DM with yourself';
  END IF;

  -- Check if DM already exists
  SELECT c.id INTO existing_id
  FROM channels c
  WHERE c.type = 'dm'
    AND EXISTS (SELECT 1 FROM channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = current_user_id)
    AND EXISTS (SELECT 1 FROM channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = other_user_id);

  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  -- Create new DM channel (sorted IDs for consistent naming)
  INSERT INTO channels (name, type, project_id)
  VALUES (
    'dm-' || LEAST(current_user_id::text, other_user_id::text) || '-' || GREATEST(current_user_id::text, other_user_id::text),
    'dm',
    NULL
  )
  RETURNING id INTO ch_id;

  -- Add both members
  INSERT INTO channel_members (channel_id, user_id)
  VALUES (ch_id, current_user_id), (ch_id, other_user_id);

  RETURN ch_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_dm_channel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_dm_channel(uuid) TO service_role;
