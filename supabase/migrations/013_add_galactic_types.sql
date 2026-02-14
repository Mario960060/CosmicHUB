-- Migration: Add galactic visualization types
-- Adds sun_type, planet_type, spacecraft_type to projects, modules, and tasks

-- =====================================================
-- 1. ALTER PROJECTS TABLE - Add sun_type
-- =====================================================

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS sun_type TEXT DEFAULT 'yellow-star' 
CHECK (sun_type IN ('yellow-star', 'blue-giant', 'red-dwarf'));

COMMENT ON COLUMN projects.sun_type IS 'Visual type for galactic view: yellow-star (active), blue-giant (large/important), red-dwarf (side project)';

-- =====================================================
-- 2. ALTER MODULES TABLE - Add planet_type
-- =====================================================

ALTER TABLE modules 
ADD COLUMN IF NOT EXISTS planet_type TEXT DEFAULT 'ocean' 
CHECK (planet_type IN ('ocean', 'indigo', 'rose', 'amber'));

COMMENT ON COLUMN modules.planet_type IS 'Visual type for galactic view: ocean (cyan), indigo (purple), rose (red), amber (yellow)';

-- =====================================================
-- 3. ALTER TASKS TABLE - Add spacecraft_type
-- =====================================================

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS spacecraft_type TEXT DEFAULT 'sphere-drone' 
CHECK (spacecraft_type IN ('sphere-drone', 'hex-drone', 'voyager-probe', 'space-station', 'rocky-moon', 'europa-moon', 'dusty-moon'));

COMMENT ON COLUMN tasks.spacecraft_type IS 'Visual type for galactic view: 4 satellites (sphere-drone, hex-drone, voyager-probe, space-station) or 3 moons (rocky-moon, europa-moon, dusty-moon)';

-- =====================================================
-- 4. UPDATE EXISTING RECORDS (optional defaults)
-- =====================================================

-- Set all existing projects to yellow-star (can be changed later)
UPDATE projects 
SET sun_type = 'yellow-star' 
WHERE sun_type IS NULL;

-- Set existing modules based on current color
UPDATE modules 
SET planet_type = CASE 
  WHEN color SIMILAR TO '#(14b8a6|5eead4|0d9488)%' THEN 'ocean'
  WHEN color SIMILAR TO '#(818cf8|6366f1|c7d2fe)%' THEN 'indigo'
  WHEN color SIMILAR TO '#(fb7185|f43f5e|fecdd3)%' THEN 'rose'
  WHEN color SIMILAR TO '#(fbbf24|f59e0b|fef3c7)%' THEN 'amber'
  ELSE 'ocean'
END
WHERE planet_type IS NULL;

-- Distribute existing tasks among spacecraft types based on ID hash
UPDATE tasks 
SET spacecraft_type = (
  ARRAY['sphere-drone', 'hex-drone', 'voyager-probe', 'space-station', 'rocky-moon', 'europa-moon', 'dusty-moon']
)[1 + (abs(hashtext(id::text)) % 7)]
WHERE spacecraft_type IS NULL;

-- =====================================================
-- 5. INDEXES for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_projects_sun_type ON projects(sun_type);
CREATE INDEX IF NOT EXISTS idx_modules_planet_type ON modules(planet_type);
CREATE INDEX IF NOT EXISTS idx_tasks_spacecraft_type ON tasks(spacecraft_type);

-- =====================================================
-- SUCCESS
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Galactic visualization types added successfully!';
  RAISE NOTICE 'Projects: % have sun_type', (SELECT count(*) FROM projects WHERE sun_type IS NOT NULL);
  RAISE NOTICE 'Modules: % have planet_type', (SELECT count(*) FROM modules WHERE planet_type IS NOT NULL);
  RAISE NOTICE 'Tasks: % have spacecraft_type', (SELECT count(*) FROM tasks WHERE spacecraft_type IS NOT NULL);
END $$;
