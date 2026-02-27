-- ============================================
-- Migration 58: Fix minitask/subtask channel - don't set task_id
-- ============================================
-- idx_channels_task_unique pozwala tylko na jeden kanał per task_id.
-- Kanały minitaska i subtaska NIE powinny ustawiać task_id (są identyfikowane przez minitask_id/subtask_id).
-- ============================================

-- Fix get_or_create_minitask_channel: task_id = NULL
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

-- Fix get_or_create_subtask_channel: task_id = NULL
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
    SELECT m.project_id, t.module_id INTO proj_id, mod_id
    FROM tasks t
    JOIN modules m ON m.id = t.module_id
    WHERE t.id = s.parent_id;
  ELSIF s.minitask_id IS NOT NULL THEN
    SELECT mo.project_id, t.module_id INTO proj_id, mod_id
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

DO $$ 
BEGIN 
  RAISE NOTICE 'Migration 058 completed: minitask/subtask channels use task_id=NULL to avoid idx_channels_task_unique conflict';
END $$;
