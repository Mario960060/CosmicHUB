-- ============================================
-- COSMIC PROJECT HUB - Galaxy Positions
-- Migration 29: Store custom layout positions for galaxy editor
-- ============================================
-- Enables admins/PMs to drag & drop cosmic objects and persist layout.
-- ============================================

-- ============================================
-- 1. GALAXY_POSITIONS TABLE
-- ============================================

CREATE TABLE galaxy_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'module', 'task', 'subtask')),
  entity_id uuid NOT NULL,
  x float NOT NULL DEFAULT 0,
  y float NOT NULL DEFAULT 0,
  view_context text NOT NULL DEFAULT 'solar_system' 
    CHECK (view_context IN ('solar_system', 'module')),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_galaxy_pos_project ON galaxy_positions(project_id);
CREATE INDEX idx_galaxy_pos_module ON galaxy_positions(module_id) WHERE module_id IS NOT NULL;

-- Partial unique indexes (NULL handling in module_id)
-- Solar system: one position per entity per project
CREATE UNIQUE INDEX idx_galaxy_pos_solar_unique 
  ON galaxy_positions(project_id, entity_type, entity_id) 
  WHERE view_context = 'solar_system';

-- Module zoom: one position per entity per module view
CREATE UNIQUE INDEX idx_galaxy_pos_module_unique 
  ON galaxy_positions(project_id, entity_type, entity_id, module_id) 
  WHERE view_context = 'module';

COMMENT ON TABLE galaxy_positions IS 'Custom layout positions for galaxy editor. view_context = solar_system for main view, module for module zoom (module_id required).';

-- ============================================
-- 2. RLS POLICIES
-- ============================================

ALTER TABLE galaxy_positions ENABLE ROW LEVEL SECURITY;

-- Users can view positions for projects they're members of
CREATE POLICY "view_galaxy_positions"
ON galaxy_positions FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

-- Project manager or admin can insert/update/delete (layout editing)
CREATE POLICY "manager_admin_manage_galaxy_positions"
ON galaxy_positions FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'manager'
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'manager'
  )
);

-- ============================================
-- 3. RPC FOR BATCH SAVE
-- ============================================

CREATE OR REPLACE FUNCTION save_galaxy_positions(
  p_project_id uuid,
  p_positions jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate caller has permission (admin or project manager)
  IF NOT (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'manager')
  ) THEN
    RAISE EXCEPTION 'Permission denied: only admin or project manager can save galaxy positions';
  END IF;

  -- Delete existing positions for this project
  DELETE FROM galaxy_positions WHERE project_id = p_project_id;
  
  -- Insert new positions
  INSERT INTO galaxy_positions (project_id, entity_type, entity_id, x, y, view_context, module_id)
  SELECT 
    p_project_id,
    (e->>'entity_type')::text,
    (e->>'entity_id')::uuid,
    (e->>'x')::float,
    (e->>'y')::float,
    COALESCE(NULLIF(e->>'view_context', ''), 'solar_system'),
    CASE 
      WHEN (e->>'module_id') IS NULL OR (e->>'module_id') = '' THEN NULL 
      ELSE (e->>'module_id')::uuid 
    END
  FROM jsonb_array_elements(p_positions) AS e;
END;
$$;

-- Grant execute to authenticated users (RLS on function will use SECURITY DEFINER + caller's auth)
GRANT EXECUTE ON FUNCTION save_galaxy_positions(uuid, jsonb) TO authenticated;

-- ============================================
-- SUCCESS
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration 029: galaxy_positions table and RPC created successfully!';
END $$;
