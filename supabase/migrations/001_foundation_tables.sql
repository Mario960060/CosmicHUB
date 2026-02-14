-- ============================================
-- COSMIC PROJECT HUB - DATABASE MIGRATION
-- Migration 1: Foundation Tables
-- ============================================
-- Run this in Supabase SQL Editor
-- Tables: users, projects, project_members
-- ============================================

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL CHECK (length(full_name) >= 2 AND length(full_name) <= 100),
  role TEXT NOT NULL DEFAULT 'worker' 
    CHECK (role IN ('admin', 'project_manager', 'worker', 'client')),
  avatar_url TEXT,
  bio TEXT CHECK (length(bio) <= 500),
  last_seen TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_last_seen ON users(last_seen) WHERE last_seen IS NOT NULL;
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- Full-text search
CREATE INDEX idx_users_search 
ON users USING GIN(to_tsvector('english', full_name || ' ' || email || ' ' || COALESCE(bio, '')));

-- Pattern matching for ILIKE
CREATE INDEX idx_users_name_ilike 
ON users(full_name text_pattern_ops);

-- ============================================
-- PROJECTS TABLE
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
  description TEXT,
  client_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' 
    CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);

-- Full-text search
CREATE INDEX idx_projects_search 
ON projects USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX idx_projects_name_ilike 
ON projects(name text_pattern_ops);

-- ============================================
-- PROJECT MEMBERS TABLE
-- ============================================

CREATE TABLE project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' 
    CHECK (role IN ('manager', 'member')),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Indexes
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(project_id, role);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE 'Migration 1 completed successfully: users, projects, project_members created';
END $$;
