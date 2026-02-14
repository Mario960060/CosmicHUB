-- ============================================
-- COSMIC PROJECT HUB - User-created group chats
-- Migration 23: type 'group', RLS, RPC create_group_channel, add/leave members
-- ============================================

-- 1. Add 'group' to channels type constraint
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_type_check;
ALTER TABLE channels ADD CONSTRAINT channels_type_check
  CHECK (type IN ('channel', 'tasks', 'dm', 'group'));

-- 2. Extend RLS: users can view group channels they're members of
DROP POLICY IF EXISTS "Users view accessible channels" ON channels;
CREATE POLICY "Users view accessible channels"
ON channels FOR SELECT
USING (
  (type = 'dm' AND EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = channels.id AND cm.user_id = auth.uid()
  ))
  OR
  (type = 'group' AND project_id IS NULL AND EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = channels.id AND cm.user_id = auth.uid()
  ))
  OR
  (project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = channels.project_id AND pm.user_id = auth.uid()
  ))
);

-- 3. Users can create group channels (project_id null, type group)
DROP POLICY IF EXISTS "Users create DM channels" ON channels;
CREATE POLICY "Users create DM channels"
ON channels FOR INSERT
WITH CHECK (
  (type = 'dm' AND project_id IS NULL)
  OR (type = 'group' AND project_id IS NULL AND name IS NOT NULL)
);

-- 4. Channel members: allow group members to add other members
DROP POLICY IF EXISTS "System inserts channel members" ON channel_members;

-- Fix: the above policy references channel_members in the subquery - the INSERT row uses channel_id.
-- The subquery checks if current user is in the channel. But we're inserting into channel_members...
-- In PostgreSQL, in an INSERT policy, we reference the NEW row's values. So channel_id and user_id refer to the row being inserted.
-- The check: "existing cm where cm.channel_id = channel_id" - channel_id here is the one being inserted. Good.
-- Wait - "cm.channel_id = channel_members.channel_id" - in INSERT context, channel_members might refer to the table. Let me just use channel_id which in INSERT WITH CHECK refers to the value being inserted.
CREATE POLICY "Group members add members"
ON channel_members FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.type = 'group')
  AND EXISTS (SELECT 1 FROM channel_members cm WHERE cm.channel_id = channel_id AND cm.user_id = auth.uid())
);

-- 5. Users can leave (delete own membership)
CREATE POLICY "Users leave channels"
ON channel_members FOR DELETE
USING (user_id = auth.uid());

-- 6. RPC: create group channel
CREATE OR REPLACE FUNCTION create_group_channel(p_name text, p_member_ids uuid[] DEFAULT '{}')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  ch_id uuid;
  mid uuid;
  safe_name text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  safe_name := trim(coalesce(p_name, ''));
  IF safe_name = '' THEN
    safe_name := 'Group ' || to_char(now(), 'YYYY-MM-DD HH24:MI');
  END IF;

  INSERT INTO channels (name, type, project_id)
  VALUES (safe_name, 'group', NULL)
  RETURNING id INTO ch_id;

  -- Add creator
  INSERT INTO channel_members (channel_id, user_id)
  VALUES (ch_id, current_user_id);

  -- Add invited members (skip self)
  IF p_member_ids IS NOT NULL THEN
    FOREACH mid IN ARRAY p_member_ids
    LOOP
      IF mid != current_user_id THEN
        INSERT INTO channel_members (channel_id, user_id)
        VALUES (ch_id, mid)
        ON CONFLICT (channel_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN ch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_group_channel(text, uuid[]) TO authenticated;

-- 7. RPC: add member to group (caller must be member)
CREATE OR REPLACE FUNCTION add_group_member(p_channel_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM channels c 
    WHERE c.id = p_channel_id AND c.type = 'group'
  ) THEN
    RAISE EXCEPTION 'Channel is not a group';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = p_channel_id AND cm.user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'You must be a member to add others';
  END IF;

  INSERT INTO channel_members (channel_id, user_id)
  VALUES (p_channel_id, p_user_id)
  ON CONFLICT (channel_id, user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION add_group_member(uuid, uuid) TO authenticated;

-- 8. RPC: leave group (optional, DELETE policy also allows direct delete)
CREATE OR REPLACE FUNCTION leave_group_channel(p_channel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM channel_members
  WHERE channel_id = p_channel_id AND user_id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION leave_group_channel(uuid) TO authenticated;
