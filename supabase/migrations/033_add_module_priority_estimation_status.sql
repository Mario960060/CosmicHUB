-- Migration: Add priority_stars, estimated_hours, status to modules (planets)

ALTER TABLE modules ADD COLUMN IF NOT EXISTS priority_stars NUMERIC(2, 1) DEFAULT 1.0
  CHECK (priority_stars >= 0.5 AND priority_stars <= 3.0);

ALTER TABLE modules ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10, 2) NULL;

ALTER TABLE modules ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo'
  CHECK (status IN ('todo', 'in_progress', 'done'));

COMMENT ON COLUMN modules.priority_stars IS 'Priority 1-3 stars for galactic view';
COMMENT ON COLUMN modules.estimated_hours IS 'Estimated total hours for the module';
COMMENT ON COLUMN modules.status IS 'Module status: todo, in_progress, done';
