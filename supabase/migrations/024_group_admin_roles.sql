-- ============================================
-- COSMIC PROJECT HUB - Group admin roles
-- Migration 24: role in channel_members, promote/demote/remove for admins
-- ============================================

-- 1. Add role to channel_members (member | admin)
ALTER TABLE channel_members
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin'));

-- 2. Backfill: group founders = admin (first member by created_at)
UPDATE channel_members cm
SET role = 'admin'
WHERE cm.channel_id IN (SELECT id FROM channels WHERE type = 'group')
  AND cm.user_id = (
    SELECT user_id FROM channel_members cm2
    WHERE cm2.channel_id = cm.channel_id
    ORDER BY created_at ASC
    LIMIT 1
  );

-- 3. Update create_group_channel: creator gets role='admin'
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

  -- Add creator as admin
  INSERT INTO channel_members (channel_id, user_id, role)
  VALUES (ch_id, current_user_id, 'admin');

  -- Add invited members as regular members
  IF p_member_ids IS NOT NULL THEN
    FOREACH mid IN ARRAY p_member_ids
    LOOP
      IF mid != current_user_id THEN
        INSERT INTO channel_members (channel_id, user_id, role)
        VALUES (ch_id, mid, 'member')
        ON CONFLICT (channel_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN ch_id;
END;
$$;

-- 4. RPC: promote member to admin (caller must be admin)
CREATE OR REPLACE FUNCTION promote_group_member(p_channel_id uuid, p_user_id uuid)
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

  IF NOT EXISTS (SELECT 1 FROM channels c WHERE c.id = p_channel_id AND c.type = 'group') THEN
    RAISE EXCEPTION 'Channel is not a group';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = p_channel_id AND cm.user_id = current_user_id AND cm.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can promote members';
  END IF;

  UPDATE channel_members
  SET role = 'admin'
  WHERE channel_id = p_channel_id AND user_id = p_user_id AND role = 'member';
END;
$$;

GRANT EXECUTE ON FUNCTION promote_group_member(uuid, uuid) TO authenticated;

-- 5. RPC: demote admin to member (caller must be admin)
CREATE OR REPLACE FUNCTION demote_group_member(p_channel_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  admin_count int;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM channels c WHERE c.id = p_channel_id AND c.type = 'group') THEN
    RAISE EXCEPTION 'Channel is not a group';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = p_channel_id AND cm.user_id = current_user_id AND cm.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can demote members';
  END IF;

  SELECT count(*) INTO admin_count
  FROM channel_members
  WHERE channel_id = p_channel_id AND role = 'admin';

  IF admin_count <= 1 AND EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Cannot demote the last admin';
  END IF;

  UPDATE channel_members
  SET role = 'member'
  WHERE channel_id = p_channel_id AND user_id = p_user_id AND role = 'admin';
END;
$$;

GRANT EXECUTE ON FUNCTION demote_group_member(uuid, uuid) TO authenticated;

-- 6. RPC: remove member from group (caller must be admin, or removing self)
CREATE OR REPLACE FUNCTION remove_group_member(p_channel_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  admin_count int;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM channels c WHERE c.id = p_channel_id AND c.type = 'group') THEN
    RAISE EXCEPTION 'Channel is not a group';
  END IF;

  -- Self-remove: use leave_group_channel
  IF p_user_id = current_user_id THEN
    DELETE FROM channel_members WHERE channel_id = p_channel_id AND user_id = current_user_id;
    RETURN;
  END IF;

  -- Removing others: must be admin
  IF NOT EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = p_channel_id AND cm.user_id = current_user_id AND cm.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can remove members';
  END IF;

  -- Cannot remove last admin (unless it's self)
  SELECT count(*) INTO admin_count
  FROM channel_members
  WHERE channel_id = p_channel_id AND role = 'admin';

  IF admin_count <= 1 AND EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Cannot remove the last admin';
  END IF;

  DELETE FROM channel_members
  WHERE channel_id = p_channel_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION remove_group_member(uuid, uuid) TO authenticated;
