-- ============================================
-- PHASE 2 - TEST DATA (SIMPLE VERSION)
-- ============================================
-- Alternative simpler script if main one has issues
-- Run this AFTER creating admin user
-- ============================================

-- Step 1: Create project (replace YOUR_USER_ID with your actual user id)
INSERT INTO projects (id, name, description, status, created_by)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'E-commerce Automation',
  'Automate product listings',
  'active',
  (SELECT id FROM users LIMIT 1)
);

-- Step 2: Add yourself as member
INSERT INTO project_members (project_id, user_id, role)
SELECT 
  'a1111111-1111-1111-1111-111111111111',
  id,
  'manager'
FROM users 
LIMIT 1;

-- Step 3: Create module
INSERT INTO modules (id, project_id, name, color)
VALUES (
  'b2222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111',
  'Payment Processing',
  '#a855f7'
);

-- Step 4: Create task
INSERT INTO tasks (id, module_id, name, estimated_hours, priority_stars)
VALUES (
  'c3333333-3333-3333-3333-333333333333',
  'b2222222-2222-2222-2222-222222222222',
  'Backend Infrastructure',
  40,
  2.5
);

-- Step 5: Create subtasks
INSERT INTO subtasks (parent_id, name, description, estimated_hours, status, priority_stars)
VALUES 
(
  'c3333333-3333-3333-3333-333333333333',
  'Create webhook endpoint',
  'Implement Stripe webhook handler',
  4,
  'todo',
  3.0
),
(
  'c3333333-3333-3333-3333-333333333333',
  'Database schema for payments',
  'Design payment records table',
  3,
  'todo',
  2.5
),
(
  'c3333333-3333-3333-3333-333333333333',
  'Test payment flows',
  'End-to-end testing',
  5,
  'todo',
  2.0
);

-- Verify
SELECT COUNT(*) as subtask_count FROM subtasks;
-- Should return 3

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Simple test data created!';
  RAISE NOTICE 'Created 1 project, 1 module, 1 task, 3 subtasks';
END $$;
