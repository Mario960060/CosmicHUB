-- Manual progress % override for tasks and modules
-- When set, UI uses this instead of subtask-status-based calculation

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress_percent INTEGER NULL
  CHECK (progress_percent IS NULL OR (progress_percent >= 0 AND progress_percent <= 100));

ALTER TABLE modules ADD COLUMN IF NOT EXISTS progress_percent INTEGER NULL
  CHECK (progress_percent IS NULL OR (progress_percent >= 0 AND progress_percent <= 100));

COMMENT ON COLUMN tasks.progress_percent IS 'Manual progress 0-100. Overrides subtask-based calc when set.';
COMMENT ON COLUMN modules.progress_percent IS 'Manual progress 0-100. Overrides task-based calc when set.';
