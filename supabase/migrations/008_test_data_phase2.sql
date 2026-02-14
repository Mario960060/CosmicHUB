-- ============================================
-- PHASE 2 - TEST DATA
-- ============================================
-- Run this in Supabase SQL Editor to create test data
-- This creates a sample project with tasks for testing workstation
-- ============================================

-- First, verify admin user exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@cosmic.app') THEN
    RAISE EXCEPTION 'Admin user not found! Please run migration 007_create_admin_user.sql first';
  END IF;
END $$;

-- Create test project
INSERT INTO projects (name, description, status, created_by)
SELECT 
  'E-commerce Automation',
  'Automate product listings and inventory management',
  'active',
  id
FROM users 
WHERE email = 'admin@cosmic.app'
ON CONFLICT DO NOTHING;

-- Add admin as project manager
INSERT INTO project_members (project_id, user_id, role)
SELECT 
  p.id,
  u.id,
  'manager'
FROM projects p
CROSS JOIN users u
WHERE p.name = 'E-commerce Automation'
  AND u.email = 'admin@cosmic.app'
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Create module
INSERT INTO modules (project_id, name, description, color)
SELECT 
  id,
  'Payment Processing',
  'Stripe integration and payment flows',
  '#a855f7'
FROM projects 
WHERE name = 'E-commerce Automation';

-- Create parent task
INSERT INTO tasks (module_id, name, description, estimated_hours, priority_stars, created_by)
SELECT 
  m.id,
  'Backend Infrastructure',
  'Set up payment processing backend with Stripe',
  40,
  2.5,
  u.id
FROM modules m
CROSS JOIN users u
WHERE m.name = 'Payment Processing'
  AND u.email = 'admin@cosmic.app';

-- Create subtasks
INSERT INTO subtasks (parent_id, name, description, estimated_hours, status, priority_stars, created_by)
SELECT 
  t.id,
  'Create webhook endpoint',
  'Implement Stripe webhook handler for payment confirmations and refunds',
  4,
  'todo',
  3.0,
  u.id
FROM tasks t
CROSS JOIN users u
WHERE t.name = 'Backend Infrastructure'
  AND u.email = 'admin@cosmic.app'

UNION ALL

SELECT 
  t.id,
  'Database schema for payments',
  'Design and implement payment records table with proper indexes',
  3,
  'todo',
  2.5,
  u.id
FROM tasks t
CROSS JOIN users u
WHERE t.name = 'Backend Infrastructure'
  AND u.email = 'admin@cosmic.app'

UNION ALL

SELECT 
  t.id,
  'Test payment flows',
  'End-to-end testing of payment processing including edge cases',
  5,
  'todo',
  2.0,
  u.id
FROM tasks t
CROSS JOIN users u
WHERE t.name = 'Backend Infrastructure'
  AND u.email = 'admin@cosmic.app';

-- ============================================
-- Create second module with more tasks
-- ============================================

INSERT INTO modules (project_id, name, description, color)
SELECT 
  id,
  'Product Catalog',
  'Product listing and inventory management',
  '#00d9ff'
FROM projects 
WHERE name = 'E-commerce Automation';

INSERT INTO tasks (module_id, name, description, estimated_hours, priority_stars, created_by)
SELECT 
  m.id,
  'Frontend Components',
  'Build React components for product display',
  30,
  2.0,
  u.id
FROM modules m
CROSS JOIN users u
WHERE m.name = 'Product Catalog'
  AND u.email = 'admin@cosmic.app';

INSERT INTO subtasks (parent_id, name, description, estimated_hours, status, priority_stars, created_by)
SELECT 
  t.id,
  'Product card component',
  'Reusable product card with image, title, price, add to cart',
  2.5,
  'todo',
  2.5,
  u.id
FROM tasks t
CROSS JOIN users u
WHERE t.name = 'Frontend Components'
  AND u.email = 'admin@cosmic.app'

UNION ALL

SELECT 
  t.id,
  'Product grid layout',
  'Responsive grid with infinite scroll and filters',
  3,
  'todo',
  2.0,
  u.id
FROM tasks t
CROSS JOIN users u
WHERE t.name = 'Frontend Components'
  AND u.email = 'admin@cosmic.app'

UNION ALL

SELECT 
  t.id,
  'Product detail page',
  'Full product page with gallery, specs, reviews',
  4,
  'todo',
  1.5,
  u.id
FROM tasks t
CROSS JOIN users u
WHERE t.name = 'Frontend Components'
  AND u.email = 'admin@cosmic.app';

-- ============================================
-- VERIFICATION
-- ============================================

-- Check what was created
SELECT 
  p.name as project,
  m.name as module,
  t.name as task,
  s.name as subtask,
  s.status,
  s.priority_stars
FROM subtasks s
INNER JOIN tasks t ON t.id = s.parent_id
INNER JOIN modules m ON m.id = t.module_id
INNER JOIN projects p ON p.id = m.project_id
ORDER BY p.name, m.name, t.name, s.priority_stars DESC;

-- Should show 6 subtasks across 2 modules

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Test data created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - 1 project: E-commerce Automation';
  RAISE NOTICE '  - 2 modules: Payment Processing, Product Catalog';
  RAISE NOTICE '  - 2 tasks: Backend Infrastructure, Frontend Components';
  RAISE NOTICE '  - 6 subtasks (3 in each task)';
  RAISE NOTICE '';
  RAISE NOTICE 'Now you can test workstation at /workstation';
END $$;
