-- ============================================
-- CANVAS SATELLITE TYPE
-- Add 'canvas' to satellite_type enum
-- ============================================

ALTER TABLE subtasks DROP CONSTRAINT IF EXISTS subtasks_satellite_type_check;
ALTER TABLE subtasks ADD CONSTRAINT subtasks_satellite_type_check
  CHECK (satellite_type IN (
    'notes', 'questions', 'checklist', 'issues',
    'metrics', 'documents', 'ideas', 'repo', 'canvas'
  ));

COMMENT ON COLUMN subtasks.satellite_type IS 'Type of satellite: notes, questions, checklist, issues, metrics, documents, ideas, repo, canvas';
