-- Fix missing project members for existing projects
-- Add project creators as managers if they're not already members

INSERT INTO project_members (project_id, user_id, role)
SELECT 
  p.id as project_id,
  p.created_by as user_id,
  'manager' as role
FROM projects p
WHERE p.created_by IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = p.id
  AND pm.user_id = p.created_by
)
ON CONFLICT DO NOTHING;

-- Log what we fixed
DO $$
DECLARE
  fixed_count int;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM projects p
  WHERE p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = p.id
    AND pm.user_id = p.created_by
  );
  
  RAISE NOTICE 'Fixed % projects with missing creator memberships', fixed_count;
END $$;
