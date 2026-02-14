-- ============================================
-- SATELLITE SYSTEM
-- Add satellite_type and satellite_data to subtasks
-- ============================================

ALTER TABLE subtasks
ADD COLUMN IF NOT EXISTS satellite_type text NOT NULL DEFAULT 'notes'
  CHECK (satellite_type IN (
    'notes', 'questions', 'checklist', 'issues',
    'metrics', 'documents', 'ideas', 'repo'
  ));

ALTER TABLE subtasks
ADD COLUMN IF NOT EXISTS satellite_data jsonb DEFAULT '{}';

COMMENT ON COLUMN subtasks.satellite_type IS 'Type of satellite: notes, questions, checklist, issues, metrics, documents, ideas, repo';
COMMENT ON COLUMN subtasks.satellite_data IS 'Type-specific structured data (questions list, checklist items, metrics config, etc.)';
