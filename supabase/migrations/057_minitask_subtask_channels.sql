-- ============================================
-- Migration 57: Minitask and Subtask channels
-- ============================================
-- Kanały dla minitasków i subtasków - każdy ma własną konwersację
-- ============================================

-- 1. ADD minitask_id, subtask_id TO channels
ALTER TABLE channels
ADD COLUMN IF NOT EXISTS minitask_id UUID REFERENCES minitasks(id) ON DELETE CASCADE;

ALTER TABLE channels
ADD COLUMN IF NOT EXISTS subtask_id UUID REFERENCES subtasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_channels_minitask ON channels(minitask_id) WHERE minitask_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channels_subtask ON channels(subtask_id) WHERE subtask_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_minitask_unique ON channels(minitask_id) WHERE minitask_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_subtask_unique ON channels(subtask_id) WHERE subtask_id IS NOT NULL;

-- 2. RLS: Extend channels SELECT for minitask/subtask channels
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
  -- Minitask channel: project member (task -> module -> project)
  (minitask_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM minitasks m
    JOIN tasks t ON t.id = m.task_id
    JOIN modules mo ON mo.id = t.module_id
    JOIN project_members pm ON pm.project_id = mo.project_id AND pm.user_id = auth.uid()
    WHERE m.id = channels.minitask_id
  ))
  OR
  -- Subtask channel: project member (via project_id, module, task or minitask)
  (subtask_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM subtasks s
    JOIN project_members pm ON pm.user_id = auth.uid()
      AND pm.project_id = (
        SELECT COALESCE(
          s.project_id,
          (SELECT project_id FROM modules WHERE id = s.module_id),
          (SELECT mo.project_id FROM tasks t JOIN modules mo ON mo.id = t.module_id WHERE t.id = s.parent_id),
          (SELECT mo.project_id FROM minitasks m JOIN tasks tk ON tk.id = m.task_id JOIN modules mo ON mo.id = tk.module_id WHERE m.id = s.minitask_id)
        )
      )
    WHERE s.id = channels.subtask_id
  ))
  OR
  -- Task channel: must be task_member
  (task_id IS NOT NULL AND minitask_id IS NULL AND subtask_id IS NULL AND EXISTS (
    SELECT 1 FROM task_members tm 
    WHERE tm.task_id = channels.task_id AND tm.user_id = auth.uid()
  ))
  OR
  -- Project/module channel: project member
  (project_id IS NOT NULL AND task_id IS NULL AND minitask_id IS NULL AND subtask_id IS NULL AND EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = channels.project_id AND pm.user_id = auth.uid()
  ))
);

-- 3. RPC: get_or_create_minitask_channel
CREATE OR REPLACE FUNCTION get_or_create_minitask_channel(p_minitask_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  ch_id UUID;
  m RECORD;
  t RECORD;
  pm_rec RECORD;
  slug TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT m_in.id, m_in.name, m_in.task_id, m_in.assigned_to
  INTO m
  FROM minitasks m_in
  WHERE m_in.id = p_minitask_id;

  IF m.id IS NULL THEN
    RAISE EXCEPTION 'Minitask not found';
  END IF;

  SELECT t_in.id, t_in.module_id, mo.project_id AS proj_id
  INTO t
  FROM tasks t_in
  JOIN modules mo ON mo.id = t_in.module_id
  WHERE t_in.id = m.task_id;

  IF NOT (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = t.proj_id AND user_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'No access to this minitask';
  END IF;

  SELECT id INTO ch_id FROM channels WHERE minitask_id = p_minitask_id LIMIT 1;
  IF ch_id IS NOT NULL THEN
    RETURN ch_id;
  END IF;

  slug := 'minitask-' || lower(regexp_replace(m.name, '[^a-zA-Z0-9]+', '-', 'g'));
  slug := regexp_replace(slug, '^-+|-+$', '', 'g');
  IF slug = '' OR length(slug) < 3 THEN
    slug := 'minitask-' || substr(p_minitask_id::text, 1, 8);
  END IF;

  IF EXISTS (SELECT 1 FROM channels WHERE project_id = t.proj_id AND name = slug) THEN
    slug := slug || '-' || substr(p_minitask_id::text, 1, 8);
  END IF;

  -- Nie ustawiamy task_id - idx_channels_task_unique zezwala tylko na jeden kanał per task.
  -- Kanał minitaska jest identyfikowany przez minitask_id.
  INSERT INTO channels (project_id, module_id, task_id, minitask_id, name, type)
  VALUES (t.proj_id, t.module_id, NULL, p_minitask_id, slug, 'channel')
  RETURNING id INTO ch_id;

  FOR pm_rec IN SELECT user_id FROM project_members WHERE project_id = t.proj_id
  LOOP
    INSERT INTO channel_members (channel_id, user_id)
    VALUES (ch_id, pm_rec.user_id)
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END LOOP;

  IF m.assigned_to IS NOT NULL THEN
    INSERT INTO channel_members (channel_id, user_id)
    VALUES (ch_id, m.assigned_to)
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;

  RETURN ch_id;
END;
$$;

-- 4. RPC: get_or_create_subtask_channel
CREATE OR REPLACE FUNCTION get_or_create_subtask_channel(p_subtask_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  ch_id UUID;
  s RECORD;
  proj_id UUID;
  mod_id UUID;
  t_id UUID := NULL;
  pm_rec RECORD;
  slug TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT s_in.id, s_in.name, s_in.parent_id, s_in.minitask_id, s_in.module_id, s_in.assigned_to
  INTO s
  FROM subtasks s_in
  WHERE s_in.id = p_subtask_id;

  IF s.id IS NULL THEN
    RAISE EXCEPTION 'Subtask not found';
  END IF;

  IF s.parent_id IS NOT NULL THEN
    SELECT m.project_id, t.module_id, t.id INTO proj_id, mod_id, t_id
    FROM tasks t
    JOIN modules m ON m.id = t.module_id
    WHERE t.id = s.parent_id;
  ELSIF s.minitask_id IS NOT NULL THEN
    SELECT mo.project_id, t.module_id, t.id INTO proj_id, mod_id, t_id
    FROM minitasks m
    JOIN tasks t ON t.id = m.task_id
    JOIN modules mo ON mo.id = t.module_id
    WHERE m.id = s.minitask_id;
  ELSIF s.module_id IS NOT NULL THEN
    SELECT project_id, id INTO proj_id, mod_id
    FROM modules WHERE id = s.module_id;
  ELSE
    RAISE EXCEPTION 'Subtask has no parent context';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = proj_id AND user_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'No access to this subtask';
  END IF;

  SELECT id INTO ch_id FROM channels WHERE subtask_id = p_subtask_id LIMIT 1;
  IF ch_id IS NOT NULL THEN
    RETURN ch_id;
  END IF;

  slug := 'subtask-' || lower(regexp_replace(s.name, '[^a-zA-Z0-9]+', '-', 'g'));
  slug := regexp_replace(slug, '^-+|-+$', '', 'g');
  IF slug = '' OR length(slug) < 3 THEN
    slug := 'subtask-' || substr(p_subtask_id::text, 1, 8);
  END IF;

  IF EXISTS (SELECT 1 FROM channels WHERE project_id = proj_id AND name = slug) THEN
    slug := slug || '-' || substr(p_subtask_id::text, 1, 8);
  END IF;

  -- Nie ustawiamy task_id - idx_channels_task_unique zezwala tylko na jeden kanał per task.
  -- Kanał subtaska jest identyfikowany przez subtask_id.
  INSERT INTO channels (project_id, module_id, task_id, subtask_id, name, type)
  VALUES (proj_id, mod_id, NULL, p_subtask_id, slug, 'channel')
  RETURNING id INTO ch_id;

  FOR pm_rec IN SELECT user_id FROM project_members WHERE project_id = proj_id
  LOOP
    INSERT INTO channel_members (channel_id, user_id)
    VALUES (ch_id, pm_rec.user_id)
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END LOOP;

  IF s.assigned_to IS NOT NULL THEN
    INSERT INTO channel_members (channel_id, user_id)
    VALUES (ch_id, s.assigned_to)
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;

  RETURN ch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_minitask_channel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_subtask_channel(UUID) TO authenticated;

DO $$ 
BEGIN 
  RAISE NOTICE 'Migration 057 completed: minitask_id, subtask_id on channels, get_or_create RPCs';
END $$;
