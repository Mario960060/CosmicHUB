-- Migration: Add due_date, priority_stars, estimated_hours to projects (Sun Detail Card)

ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_date timestamptz NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority_stars NUMERIC(2, 1) DEFAULT 1.0
  CHECK (priority_stars >= 0.5 AND priority_stars <= 3.0);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10, 2) NULL;

COMMENT ON COLUMN projects.due_date IS 'Deadline for the project (sun) - displayed in Detail Card';
COMMENT ON COLUMN projects.priority_stars IS 'Priority 1-3 stars for galactic view';
COMMENT ON COLUMN projects.estimated_hours IS 'Estimated total hours for the project';
