-- ============================================
-- COSMIC PROJECT HUB - Task Channels (Lazy)
-- Migration 43: task_id on channels, get_or_create_task_channel RPC
-- ============================================
-- Kanały tasków tworzone są LAZY - dopiero przy pierwszej wiadomości.
-- Użytkownicy z task_members są dodawani do channel_members.

-- ============================================
-- 1. ADD task_id TO channels
-- ============================================

ALTER TABLE channels
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_channels_task ON channels(task_id) WHERE task_id IS NOT NULL;

-- Unikalny kanal per task
CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_task_unique ON channels(task_id) WHERE task_id IS NOT NULL;

-- ============================================
-- 2. RLS: Users see task channels where they are task_members
-- ============================================

DROP POLICY IF EXISTS "Users view accessible channels" ON channels;

CREATE POLICY "Users view accessible channels"
ON channels FOR SELECT
USING (
  -- DM: member of channel
  (type = 'dm' AND EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = channels.id AND cm.user_id = auth.uid()
  ))
  OR
  -- User-created group: member of channel
  (type = 'group' AND project_id IS NULL AND EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = channels.id AND cm.user_id = auth.uid()
  ))
  OR
  -- Task channel: must be task_member
  (task_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM task_members tm 
    WHERE tm.task_id = channels.task_id AND tm.user_id = auth.uid()
  ))
  OR
  -- Project/module channel: project member
  (project_id IS NOT NULL AND task_id IS NULL AND EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = channels.project_id AND pm.user_id = auth.uid()
  ))
);

-- ============================================
-- 3. RPC: get_or_create_task_channel
-- ============================================
-- Tworzy kanal czatu dla taska tylko jesli nie istnieje.
-- Dodaje wszystkich task_members jako channel_members.

CREATE OR REPLACE FUNCTION get_or_create_task_channel(p_task_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  ch_id UUID;
  t RECORD;
  tm_rec RECORD;
  slug TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Sprawdz czy user ma dostep do taska (task_member, module_member lub project_member)
  SELECT t_in.id, t_in.name, t_in.module_id, m.project_id
  INTO t
  FROM tasks t_in
  JOIN modules m ON m.id = t_in.module_id
  WHERE t_in.id = p_task_id;

  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM task_members WHERE task_id = p_task_id AND user_id = current_user_id)
    OR EXISTS (SELECT 1 FROM module_members WHERE module_id = t.module_id AND user_id = current_user_id)
    OR EXISTS (SELECT 1 FROM project_members WHERE project_id = t.project_id AND user_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'No access to this task';
  END IF;

  -- Szukaj istniejacego kanalu
  SELECT id INTO ch_id FROM channels WHERE task_id = p_task_id LIMIT 1;
  IF ch_id IS NOT NULL THEN
    RETURN ch_id;
  END IF;

  -- Utworz slug z nazwy taska
  slug := lower(regexp_replace(t.name, '[^a-zA-Z0-9]+', '-', 'g'));
  slug := regexp_replace(slug, '^-+|-+$', '', 'g');
  IF slug = '' THEN slug := 'task-' || substr(p_task_id::text, 1, 8); END IF;

  -- Unikalnosc nazwy w projekcie - dodaj suffix jesli potrzeba
  IF EXISTS (SELECT 1 FROM channels WHERE project_id = t.project_id AND name = slug) THEN
    slug := slug || '-' || substr(p_task_id::text, 1, 8);
  END IF;

  -- Utworz kanal
  INSERT INTO channels (project_id, module_id, task_id, name, type)
  VALUES (t.project_id, t.module_id, p_task_id, slug, 'channel')
  RETURNING id INTO ch_id;

  -- Dodaj task_members
  FOR tm_rec IN SELECT user_id FROM task_members WHERE task_id = p_task_id
  LOOP
    INSERT INTO channel_members (channel_id, user_id)
    VALUES (ch_id, tm_rec.user_id)
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END LOOP;

  -- Dodaj module_members (lead/member modulu)
  FOR tm_rec IN SELECT user_id FROM module_members WHERE module_id = t.module_id
  LOOP
    INSERT INTO channel_members (channel_id, user_id)
    VALUES (ch_id, tm_rec.user_id)
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END LOOP;

  -- Dodaj project_members
  FOR tm_rec IN SELECT user_id FROM project_members WHERE project_id = t.project_id
  LOOP
    INSERT INTO channel_members (channel_id, user_id)
    VALUES (ch_id, tm_rec.user_id)
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END LOOP;

  RETURN ch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_task_channel(UUID) TO authenticated;

-- ============================================
-- 4. Policy: Allow INSERT into channel_members for task channels
-- ============================================
-- get_or_create_task_channel uses SECURITY DEFINER so it bypasses RLS.
-- But we need to ensure the policy "Group members add members" doesn't block -
-- that policy only applies to type='group'. Task channels are type='channel'.
-- The "System inserts channel members" was dropped in 023. Let me check...

-- From 023: "Group members add members" - only for group type
-- So INSERT into channel_members for task channels - the RPC runs as SECURITY DEFINER
-- which typically bypasses RLS... Actually SECURITY DEFINER runs with the function
-- owner's privileges. The function owner is usually the migration runner (superuser).
-- So inserts from the RPC should work. Good.

-- ============================================
-- SUCCESS
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE 'Migration 043 completed: task_id on channels, get_or_create_task_channel RPC';
END $$;
