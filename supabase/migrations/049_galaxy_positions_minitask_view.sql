-- ============================================
-- COSMIC PROJECT HUB - Galaxy Positions
-- Migration 49: Add minitask view context for asteroid zoom (4th layer)
-- ============================================

-- Add minitask to view_context constraint
ALTER TABLE galaxy_positions DROP CONSTRAINT IF EXISTS galaxy_positions_view_context_check;
ALTER TABLE galaxy_positions ADD CONSTRAINT galaxy_positions_view_context_check
  CHECK (view_context IN ('solar_system', 'module', 'task', 'minitask'));

-- Add minitask_id column for minitask view context
ALTER TABLE galaxy_positions ADD COLUMN IF NOT EXISTS minitask_id UUID REFERENCES minitasks(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_galaxy_pos_minitask ON galaxy_positions(minitask_id) WHERE minitask_id IS NOT NULL;

-- Update save_galaxy_positions RPC to handle minitask_id
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
  IF NOT (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'manager')
  ) THEN
    RAISE EXCEPTION 'Permission denied: only admin or project manager can save galaxy positions';
  END IF;

  DELETE FROM galaxy_positions WHERE project_id = p_project_id;

  INSERT INTO galaxy_positions (project_id, entity_type, entity_id, x, y, view_context, module_id, task_id, minitask_id)
  SELECT
    p_project_id,
    (e->>'entity_type')::text,
    (e->>'entity_id')::uuid,
    (e->>'x')::float,
    (e->>'y')::float,
    COALESCE(NULLIF(e->>'view_context', ''), 'solar_system'),
    CASE WHEN (e->>'module_id') IS NULL OR (e->>'module_id') = '' THEN NULL ELSE (e->>'module_id')::uuid END,
    CASE WHEN (e->>'task_id') IS NULL OR (e->>'task_id') = '' THEN NULL ELSE (e->>'task_id')::uuid END,
    CASE WHEN (e->>'minitask_id') IS NULL OR (e->>'minitask_id') = '' THEN NULL ELSE (e->>'minitask_id')::uuid END
  FROM jsonb_array_elements(p_positions) AS e;
END;
$$;
