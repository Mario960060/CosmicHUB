-- ============================================
-- COSMIC PROJECT HUB - DATABASE MIGRATION
-- Migration 3: System Tables
-- ============================================
-- Run this AFTER Migration 2
-- Tables: invites, notifications, notification_preferences, privacy_settings, activity_log, recent_searches
-- ============================================

-- ============================================
-- INVITES TABLE
-- ============================================

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL 
    CHECK (role IN ('admin', 'project_manager', 'worker', 'client')),
  expires_at TIMESTAMP,
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_by UUID REFERENCES users(id),
  accepted_by UUID REFERENCES users(id),
  accepted_at TIMESTAMP,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_status ON invites(status);
CREATE INDEX idx_invites_expires 
ON invites(expires_at) 
WHERE expires_at IS NOT NULL;

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  -- Related entity
  related_id UUID,
  related_type TEXT 
    CHECK (related_type IN ('task', 'subtask', 'module', 'project', 'request')),
  
  -- Actor (who triggered this)
  actor_id UUID REFERENCES users(id),
  
  -- Additional context
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user 
ON notifications(user_id, created_at DESC);

CREATE INDEX idx_notifications_unread 
ON notifications(user_id, read) 
WHERE read = false;

CREATE INDEX idx_notifications_type ON notifications(type);

CREATE INDEX idx_notifications_related 
ON notifications(related_id, related_type);

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================

CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Email notifications
  email_task_assigned BOOLEAN DEFAULT true,
  email_deadline_approaching BOOLEAN DEFAULT true,
  email_request_response BOOLEAN DEFAULT true,
  email_task_commented BOOLEAN DEFAULT false,
  email_task_blocked BOOLEAN DEFAULT true,
  email_daily_summary BOOLEAN DEFAULT false,
  email_weekly_report BOOLEAN DEFAULT false,
  
  -- In-app notifications
  inapp_task_assigned BOOLEAN DEFAULT true,
  inapp_status_changed BOOLEAN DEFAULT true,
  inapp_available_tasks BOOLEAN DEFAULT true,
  inapp_mentions BOOLEAN DEFAULT true,
  inapp_user_online BOOLEAN DEFAULT false,
  
  -- PM/Admin only
  inapp_task_requests BOOLEAN DEFAULT true,
  inapp_blockers BOOLEAN DEFAULT true,
  inapp_work_logs BOOLEAN DEFAULT false,
  email_project_deadline BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PRIVACY SETTINGS TABLE
-- ============================================

CREATE TABLE privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_visibility TEXT DEFAULT 'team' 
    CHECK (profile_visibility IN ('team', 'organization', 'managers')),
  show_online_status BOOLEAN DEFAULT true,
  show_activity BOOLEAN DEFAULT true,
  in_team_directory BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ACTIVITY LOG TABLE
-- ============================================

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  
  -- Entity info
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  project_id UUID REFERENCES projects(id),
  
  -- Details
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  location TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_log_user 
ON activity_log(user_id, created_at DESC);

CREATE INDEX idx_activity_log_action 
ON activity_log(action);

CREATE INDEX idx_activity_log_entity 
ON activity_log(entity_type, entity_id);

CREATE INDEX idx_activity_log_project 
ON activity_log(project_id) 
WHERE project_id IS NOT NULL;

CREATE INDEX idx_activity_log_created 
ON activity_log(created_at DESC);

-- ============================================
-- RECENT SEARCHES TABLE
-- ============================================

CREATE TABLE recent_searches (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  searched_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (user_id, query)
);

-- Indexes
CREATE INDEX idx_recent_searches_user 
ON recent_searches(user_id, searched_at DESC);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE 'Migration 3 completed successfully: invites, notifications, notification_preferences, privacy_settings, activity_log, recent_searches created';
END $$;
