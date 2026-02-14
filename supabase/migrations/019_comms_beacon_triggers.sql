-- ============================================
-- COSMIC PROJECT HUB - Comms Beacon Triggers
-- Migration 19: Auto-create channels, add members
-- ============================================

-- ============================================
-- 1. CREATE #general + #tasks ON PROJECT CREATE
-- ============================================

CREATE OR REPLACE FUNCTION create_project_channels()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  general_id UUID;
  tasks_id UUID;
  creator_id UUID;
BEGIN
  -- Create # general channel
  INSERT INTO channels (project_id, name, type)
  VALUES (NEW.id, 'general', 'channel')
  RETURNING id INTO general_id;

  -- Create # tasks channel (read-only activity feed)
  INSERT INTO channels (project_id, name, type)
  VALUES (NEW.id, 'tasks', 'tasks')
  RETURNING id INTO tasks_id;

  -- Add project creator to both channels
  creator_id := NEW.created_by;
  IF creator_id IS NOT NULL THEN
    INSERT INTO channel_members (channel_id, user_id)
    VALUES (general_id, creator_id);
    INSERT INTO channel_members (channel_id, user_id)
    VALUES (tasks_id, creator_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_project_channels ON projects;
CREATE TRIGGER trg_create_project_channels
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_project_channels();

-- ============================================
-- 2. CREATE #module-name ON MODULE CREATE
-- ============================================

CREATE OR REPLACE FUNCTION create_module_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ch_id UUID;
  pm_rec RECORD;
  slug TEXT;
BEGIN
  -- Create URL-safe slug from module name (replace spaces/special chars)
  slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  slug := regexp_replace(slug, '^-+|-+$', '', 'g');
  IF slug = '' THEN slug := 'module-' || substr(NEW.id::text, 1, 8); END IF;

  INSERT INTO channels (project_id, name, type, module_id)
  VALUES (NEW.project_id, slug, 'channel', NEW.id)
  RETURNING id INTO ch_id;

  -- Add all current project members to this channel
  FOR pm_rec IN 
    SELECT user_id FROM project_members WHERE project_id = NEW.project_id
  LOOP
    INSERT INTO channel_members (channel_id, user_id)
    VALUES (ch_id, pm_rec.user_id)
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_module_channel ON modules;
CREATE TRIGGER trg_create_module_channel
  AFTER INSERT ON modules
  FOR EACH ROW
  EXECUTE FUNCTION create_module_channel();

-- ============================================
-- 3. ADD CHANNEL MEMBER WHEN PROJECT MEMBER ADDED
-- ============================================

CREATE OR REPLACE FUNCTION add_member_to_project_channels()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add to all channels in this project (#general, #tasks, #module channels)
  INSERT INTO channel_members (channel_id, user_id)
  SELECT c.id, NEW.user_id
  FROM channels c
  WHERE c.project_id = NEW.project_id
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_member_to_project_channels ON project_members;
CREATE TRIGGER trg_add_member_to_project_channels
  AFTER INSERT ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION add_member_to_project_channels();

-- ============================================
-- 4. BACKFILL: Create channels for existing projects
-- ============================================
-- Run once for projects created before this migration

DO $$
DECLARE
  proj RECORD;
  general_id UUID;
  tasks_id UUID;
  pm_rec RECORD;
  mod_rec RECORD;
  ch_id UUID;
BEGIN
  FOR proj IN 
    SELECT p.id, p.created_by 
    FROM projects p 
    WHERE NOT EXISTS (SELECT 1 FROM channels c WHERE c.project_id = p.id AND c.type = 'channel' AND c.name = 'general')
  LOOP
    INSERT INTO channels (project_id, name, type)
    VALUES (proj.id, 'general', 'channel')
    RETURNING id INTO general_id;

    INSERT INTO channels (project_id, name, type)
    VALUES (proj.id, 'tasks', 'tasks')
    RETURNING id INTO tasks_id;

    FOR pm_rec IN SELECT user_id FROM project_members WHERE project_id = proj.id
    LOOP
      INSERT INTO channel_members (channel_id, user_id) VALUES (general_id, pm_rec.user_id) ON CONFLICT DO NOTHING;
      INSERT INTO channel_members (channel_id, user_id) VALUES (tasks_id, pm_rec.user_id) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- Backfill module channels for existing modules
  FOR mod_rec IN 
      SELECT m.id, m.project_id, m.name
      FROM modules m
      WHERE NOT EXISTS (SELECT 1 FROM channels c WHERE c.module_id = m.id)
    LOOP
      INSERT INTO channels (project_id, name, type, module_id)
      VALUES (
        mod_rec.project_id,
        COALESCE(NULLIF(lower(regexp_replace(regexp_replace(mod_rec.name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g')), ''),
               'module-' || substr(mod_rec.id::text, 1, 8)),
        'channel',
        mod_rec.id
      )
      RETURNING id INTO ch_id;

      INSERT INTO channel_members (channel_id, user_id)
      SELECT ch_id, pm.user_id
      FROM project_members pm
      WHERE pm.project_id = mod_rec.project_id
      ON CONFLICT (channel_id, user_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Backfill: project and module channels created for existing data';
END;
$$;

-- Fix empty slug for module channels
UPDATE channels 
SET name = 'module-' || substr(module_id::text, 1, 8)
WHERE module_id IS NOT NULL AND (name = '' OR name IS NULL);

-- ============================================
-- SUCCESS
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE 'Migration 019 completed: Comms Beacon triggers for project/module channels';
END $$;
