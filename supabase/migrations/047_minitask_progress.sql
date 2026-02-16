-- Manual progress % override for minitasks (asteroids)
-- When set, UI uses this instead of subtask-status-based calculation

ALTER TABLE minitasks ADD COLUMN IF NOT EXISTS progress_percent NUMERIC(5,2);

COMMENT ON COLUMN minitasks.progress_percent IS 'Manual progress 0-100. Overrides subtask-based calc when set.';
