-- Debug script to check why modules/tasks are not showing

-- 1. Check if there are any modules at all
SELECT 
  'Total modules' as check_type,
  COUNT(*) as count
FROM modules;

-- 2. Check if there are any tasks
SELECT 
  'Total tasks' as check_type,
  COUNT(*) as count
FROM tasks;

-- 3. Check project members
SELECT 
  'Project members' as check_type,
  p.name as project_name,
  u.full_name as member_name,
  pm.role as member_role
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
JOIN users u ON u.id = pm.user_id;

-- 4. Check modules with project info
SELECT 
  m.id,
  m.name as module_name,
  p.name as project_name,
  m.order_index
FROM modules m
JOIN projects p ON p.id = m.project_id
ORDER BY p.name, m.order_index;

-- 5. Check tasks with module info
SELECT 
  t.id,
  t.name as task_name,
  m.name as module_name,
  p.name as project_name
FROM tasks t
JOIN modules m ON m.id = t.module_id
JOIN projects p ON p.id = m.project_id
ORDER BY p.name, m.name;

-- 6. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('modules', 'tasks', 'project_members')
AND schemaname = 'public';
