-- ============================================
-- COSMIC PROJECT HUB - Galaxy Positions
-- Migration 40: Add portal entity type for portal positions
-- ============================================
-- Portals use entity_type='portal', entity_id=target_module_id (UUID of module the portal leads to)
-- ============================================

ALTER TABLE galaxy_positions
  DROP CONSTRAINT IF EXISTS galaxy_positions_entity_type_check;

ALTER TABLE galaxy_positions
  ADD CONSTRAINT galaxy_positions_entity_type_check 
  CHECK (entity_type IN ('project', 'module', 'task', 'subtask', 'portal'));
