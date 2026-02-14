-- Migration: Add due_date to tasks and modules for Detail Cards

-- Add due_date to tasks (moons)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date timestamptz NULL;

-- Add due_date to modules (planets)
ALTER TABLE modules ADD COLUMN IF NOT EXISTS due_date timestamptz NULL;

COMMENT ON COLUMN tasks.due_date IS 'Deadline for the task (moon) - displayed in Detail Card';
COMMENT ON COLUMN modules.due_date IS 'Deadline for the module (planet) - displayed in Detail Card';
