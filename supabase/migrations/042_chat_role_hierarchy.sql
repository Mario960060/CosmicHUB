-- ============================================
-- COSMIC PROJECT HUB - Chat role hierarchy
-- Migration 42: owner (założyciel), moderator, member
-- Owner = założyciel grupy, nieusuwalny.
-- Moderator = promowany członek. Owner i app admin mają pełne uprawnienia. users.role='admin' = nie da się usunąć z czatu.
-- Uprawnienia "admin" z profilu użytkownika (users.role) - nie z channel_members.
-- ============================================

-- 1. Backfill PRZED constraint: founder -> owner, ex-admin -> moderator
UPDATE channel_members cm
SET role = 'owner'
WHERE cm.channel_id IN (SELECT id FROM channels WHERE type = 'group')
  AND cm.user_id = (
    SELECT user_id FROM channel_members cm2
    WHERE cm2.channel_id = cm.channel_id
    ORDER BY created_at ASC
    LIMIT 1
  );

-- Ex-admini (promotowani) -> moderator
UPDATE channel_members cm
SET role = 'moderator'
WHERE cm.channel_id IN (SELECT id FROM channels WHERE type = 'group')
  AND cm.role = 'admin'
  AND cm.user_id != (
    SELECT user_id FROM channel_members cm2
    WHERE cm2.channel_id = cm.channel_id
    ORDER BY created_at ASC
    LIMIT 1
  );

-- 2. Role w czatach: member | owner | moderator (bez admin - admin to profil users.role)
ALTER TABLE channel_members DROP CONSTRAINT IF EXISTS channel_members_role_check;
ALTER TABLE channel_members ADD CONSTRAINT channel_members_role_check
  CHECK (role IN ('member', 'owner', 'moderator'));

-- 3. Update create_group_channel: creator gets role='owner'
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

  -- Add creator as owner (założyciel)
  INSERT INTO channel_members (channel_id, user_id, role)
  VALUES (ch_id, current_user_id, 'owner');

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

-- 4. RPC: promote member to moderator (caller: owner lub users.role='admin')
CREATE OR REPLACE FUNCTION promote_group_member(p_channel_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  caller_role text;
  caller_is_app_admin boolean;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM channels c WHERE c.id = p_channel_id AND c.type = 'group') THEN
    RAISE EXCEPTION 'Channel is not a group';
  END IF;

  SELECT cm.role INTO caller_role
  FROM channel_members cm
  WHERE cm.channel_id = p_channel_id AND cm.user_id = current_user_id;

  SELECT (u.role = 'admin') INTO caller_is_app_admin FROM users u WHERE u.id = current_user_id;

  IF NOT (caller_role = 'owner' OR COALESCE(caller_is_app_admin, false)) THEN
    RAISE EXCEPTION 'Only owner or app admin can promote members';
  END IF;

  -- Promote to moderator (not admin - moderator can be removed)
  UPDATE channel_members
  SET role = 'moderator'
  WHERE channel_id = p_channel_id AND user_id = p_user_id AND role = 'member';
END;
$$;

-- 5. RPC: demote moderator to member (caller: owner lub users.role='admin')
CREATE OR REPLACE FUNCTION demote_group_member(p_channel_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  caller_role text;
  target_role text;
  caller_is_app_admin boolean;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM channels c WHERE c.id = p_channel_id AND c.type = 'group') THEN
    RAISE EXCEPTION 'Channel is not a group';
  END IF;

  SELECT cm.role INTO caller_role
  FROM channel_members cm
  WHERE cm.channel_id = p_channel_id AND cm.user_id = current_user_id;

  SELECT (u.role = 'admin') INTO caller_is_app_admin FROM users u WHERE u.id = current_user_id;

  IF NOT (caller_role = 'owner' OR COALESCE(caller_is_app_admin, false)) THEN
    RAISE EXCEPTION 'Only owner or app admin can demote members';
  END IF;

  SELECT cm.role INTO target_role
  FROM channel_members cm
  WHERE cm.channel_id = p_channel_id AND cm.user_id = p_user_id;

  IF target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot demote owner';
  END IF;

  UPDATE channel_members
  SET role = 'member'
  WHERE channel_id = p_channel_id AND user_id = p_user_id AND role = 'moderator';
END;
$$;

-- 6. RPC: remove member from group
-- Nie można usunąć: owner (założyciela), ani użytkownika z users.role='admin'
-- Owner i app admin mogą usunąć moderator i member. Moderator może usunąć tylko member.
CREATE OR REPLACE FUNCTION remove_group_member(p_channel_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  caller_role text;
  target_role text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM channels c WHERE c.id = p_channel_id AND c.type = 'group') THEN
    RAISE EXCEPTION 'Channel is not a group';
  END IF;

  -- Self-remove: zawsze dozwolone
  IF p_user_id = current_user_id THEN
    DELETE FROM channel_members WHERE channel_id = p_channel_id AND user_id = current_user_id;
    RETURN;
  END IF;

  SELECT cm.role INTO target_role
  FROM channel_members cm
  WHERE cm.channel_id = p_channel_id AND cm.user_id = p_user_id;

  -- Nigdy nie można usunąć owner (założyciela)
  IF target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove owner';
  END IF;

  -- Osoba z profilu users.role='admin' (admin aplikacji) - nie da się usunąć
  IF EXISTS (SELECT 1 FROM users u WHERE u.id = p_user_id AND u.role = 'admin') THEN
    RAISE EXCEPTION 'Cannot remove app admin';
  END IF;

  SELECT cm.role INTO caller_role
  FROM channel_members cm
  WHERE cm.channel_id = p_channel_id AND cm.user_id = current_user_id;

  -- Owner lub app admin (users.role='admin') może usunąć moderator i member
  IF caller_role = 'owner' THEN
    DELETE FROM channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM users u WHERE u.id = current_user_id AND u.role = 'admin') THEN
    DELETE FROM channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id;
    RETURN;
  END IF;

  -- Moderator: może usunąć tylko member (NIE moderator!)
  IF caller_role = 'moderator' AND target_role = 'member' THEN
    DELETE FROM channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Insufficient permissions to remove this member';
END;
$$;

GRANT EXECUTE ON FUNCTION promote_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION demote_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_group_member(uuid, uuid) TO authenticated;
