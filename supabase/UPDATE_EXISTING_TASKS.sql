-- Quick fix: Update existing tasks to have different spacecraft types
-- Run this ONCE in Supabase SQL Editor

-- Update tasks to have variety based on their name/id
UPDATE tasks 
SET spacecraft_type = (
  ARRAY['sphere-drone', 'hex-drone', 'voyager-probe', 'space-station', 'rocky-moon', 'europa-moon', 'dusty-moon']
)[1 + (abs(hashtext(id::text)) % 7)]
WHERE spacecraft_type = 'sphere-drone' OR spacecraft_type IS NULL;

-- Show results
SELECT 
  name, 
  spacecraft_type,
  module_id
FROM tasks
ORDER BY created_at DESC
LIMIT 20;
