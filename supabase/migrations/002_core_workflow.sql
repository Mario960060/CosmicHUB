-- ============================================
-- COSMIC PROJECT HUB - DATABASE MIGRATION
-- Migration 2: Core Workflow Tables
-- ============================================
-- Run this AFTER Migration 1
-- Tables: modules, tasks, subtasks, dependencies, work_logs, task_requests
-- ============================================

-- ============================================
-- MODULES TABLE
-- ============================================

CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
  description TEXT,
  color TEXT DEFAULT '#a855f7',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_modules_project ON modules(project_id);
CREATE INDEX idx_modules_order ON modules(project_id, order_index);

-- Full-text search
CREATE INDEX idx_modules_search 
ON modules USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX idx_modules_name_ilike 
ON modules(name text_pattern_ops);

-- ============================================
-- TASKS TABLE
-- ============================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 200),
  description TEXT,
  estimated_hours NUMERIC(10, 2),
  status TEXT DEFAULT 'todo' 
    CHECK (status IN ('todo', 'in_progress', 'done')),
  priority_stars NUMERIC(2, 1) DEFAULT 1.0 
    CHECK (priority_stars >= 0.5 AND priority_stars <= 3.0),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_module ON tasks(module_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority_stars DESC);

-- Full-text search
CREATE INDEX idx_tasks_search 
ON tasks USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX idx_tasks_name_ilike 
ON tasks(name text_pattern_ops);

-- ============================================
-- SUBTASKS TABLE
-- ============================================

CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 200),
  description TEXT,
  estimated_hours NUMERIC(10, 2),
  status TEXT DEFAULT 'todo' 
    CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  priority_stars NUMERIC(2, 1) DEFAULT 1.0 
    CHECK (priority_stars >= 0.5 AND priority_stars <= 3.0),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMP,
  
  -- Task claiming system
  claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subtasks_parent ON subtasks(parent_id);
CREATE INDEX idx_subtasks_assigned ON subtasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_subtasks_status ON subtasks(status);
CREATE INDEX idx_subtasks_priority ON subtasks(priority_stars DESC);
CREATE INDEX idx_subtasks_due_date ON subtasks(due_date) WHERE due_date IS NOT NULL;

-- Task claiming indexes
CREATE INDEX idx_subtasks_claimed 
ON subtasks(claimed_by, claimed_at) 
WHERE claimed_by IS NOT NULL;

-- Index for available tasks (unassigned)
-- Note: Cannot use NOW() in index predicate (not IMMUTABLE)
-- Will filter expired claims in application logic
CREATE INDEX idx_subtasks_available 
ON subtasks(id, assigned_to, claimed_by, claimed_at) 
WHERE assigned_to IS NULL;

-- Full-text search
CREATE INDEX idx_subtasks_search 
ON subtasks USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX idx_subtasks_name_ilike 
ON subtasks(name text_pattern_ops);

-- ============================================
-- DEPENDENCIES TABLE
-- ============================================

CREATE TABLE dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dependent_task_id UUID NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent self-dependencies
  CHECK (dependent_task_id != depends_on_task_id),
  
  -- Prevent duplicate dependencies
  UNIQUE (dependent_task_id, depends_on_task_id)
);

-- Indexes
CREATE INDEX idx_dependencies_dependent ON dependencies(dependent_task_id);
CREATE INDEX idx_dependencies_depends_on ON dependencies(depends_on_task_id);

-- ============================================
-- WORK LOGS TABLE
-- ============================================

CREATE TABLE work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id UUID NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hours_spent NUMERIC(10, 2) NOT NULL CHECK (hours_spent > 0 AND hours_spent <= 24),
  work_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_work_logs_subtask ON work_logs(subtask_id);
CREATE INDEX idx_work_logs_user ON work_logs(user_id);
CREATE INDEX idx_work_logs_date ON work_logs(work_date DESC);
CREATE INDEX idx_work_logs_user_date ON work_logs(user_id, work_date DESC);

-- ============================================
-- TASK REQUESTS TABLE
-- ============================================

CREATE TABLE task_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL CHECK (length(task_name) >= 2 AND length(task_name) <= 200),
  description TEXT,
  estimated_hours NUMERIC(10, 2),
  priority TEXT DEFAULT 'medium' 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_task_requests_module ON task_requests(module_id);
CREATE INDEX idx_task_requests_requester ON task_requests(requested_by);
CREATE INDEX idx_task_requests_status ON task_requests(status);
CREATE INDEX idx_task_requests_reviewer ON task_requests(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE 'Migration 2 completed successfully: modules, tasks, subtasks, dependencies, work_logs, task_requests created';
END $$;
