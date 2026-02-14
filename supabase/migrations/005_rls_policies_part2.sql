-- ============================================
-- COSMIC PROJECT HUB - DATABASE MIGRATION
-- Migration 5 Part 2: Row Level Security Policies (Continued)
-- ============================================
-- Run this AFTER Migration 5 Part 1
-- Creates: RLS policies for remaining tables
-- ============================================

-- ============================================
-- SUBTASKS TABLE RLS
-- ============================================

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- Users can view subtasks in their projects
CREATE POLICY "Users view project subtasks"
ON subtasks FOR SELECT
TO authenticated
USING (
  parent_id IN (
    SELECT t.id 
    FROM tasks t
    INNER JOIN modules m ON m.id = t.module_id
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid()
  )
);

-- PMs can create subtasks
CREATE POLICY "PMs create subtasks"
ON subtasks FOR INSERT
TO authenticated
WITH CHECK (
  parent_id IN (
    SELECT t.id 
    FROM tasks t
    INNER JOIN modules m ON m.id = t.module_id
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() 
    AND pm.role = 'manager'
  )
);

-- Workers can update their own subtasks, PMs can update all
CREATE POLICY "Workers update own subtasks"
ON subtasks FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid()
  OR
  parent_id IN (
    SELECT t.id 
    FROM tasks t
    INNER JOIN modules m ON m.id = t.module_id
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() 
    AND pm.role = 'manager'
  )
);

-- PMs can delete subtasks
CREATE POLICY "PMs delete subtasks"
ON subtasks FOR DELETE
TO authenticated
USING (
  parent_id IN (
    SELECT t.id 
    FROM tasks t
    INNER JOIN modules m ON m.id = t.module_id
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() 
    AND pm.role = 'manager'
  )
);

-- ============================================
-- DEPENDENCIES TABLE RLS
-- ============================================

ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;

-- Users can view dependencies in their projects
CREATE POLICY "Users view project dependencies"
ON dependencies FOR SELECT
TO authenticated
USING (
  dependent_task_id IN (
    SELECT s.id 
    FROM subtasks s
    INNER JOIN tasks t ON t.id = s.parent_id
    INNER JOIN modules m ON m.id = t.module_id
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid()
  )
);

-- PMs can create dependencies
CREATE POLICY "PMs create dependencies"
ON dependencies FOR INSERT
TO authenticated
WITH CHECK (
  dependent_task_id IN (
    SELECT s.id 
    FROM subtasks s
    INNER JOIN tasks t ON t.id = s.parent_id
    INNER JOIN modules m ON m.id = t.module_id
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() 
    AND pm.role = 'manager'
  )
);

-- PMs can delete dependencies
CREATE POLICY "PMs delete dependencies"
ON dependencies FOR DELETE
TO authenticated
USING (
  dependent_task_id IN (
    SELECT s.id 
    FROM subtasks s
    INNER JOIN tasks t ON t.id = s.parent_id
    INNER JOIN modules m ON m.id = t.module_id
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() 
    AND pm.role = 'manager'
  )
);

-- ============================================
-- WORK LOGS TABLE RLS
-- ============================================

ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;

-- Users can view work logs in their projects
CREATE POLICY "Users view project work logs"
ON work_logs FOR SELECT
TO authenticated
USING (
  subtask_id IN (
    SELECT s.id 
    FROM subtasks s
    INNER JOIN tasks t ON t.id = s.parent_id
    INNER JOIN modules m ON m.id = t.module_id
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid()
  )
);

-- Workers can create their own work logs
CREATE POLICY "Workers create work logs"
ON work_logs FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND
  subtask_id IN (
    SELECT s.id 
    FROM subtasks s
    INNER JOIN tasks t ON t.id = s.parent_id
    INNER JOIN modules m ON m.id = t.module_id
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid()
  )
);

-- Workers can update their own work logs
CREATE POLICY "Workers update own work logs"
ON work_logs FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Workers can delete their own work logs
CREATE POLICY "Workers delete own work logs"
ON work_logs FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- TASK REQUESTS TABLE RLS
-- ============================================

ALTER TABLE task_requests ENABLE ROW LEVEL SECURITY;

-- Users can view requests in their projects
CREATE POLICY "Users view project requests"
ON task_requests FOR SELECT
TO authenticated
USING (
  module_id IN (
    SELECT m.id 
    FROM modules m
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid()
  )
);

-- Workers can create requests in their projects
CREATE POLICY "Workers create requests"
ON task_requests FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND
  module_id IN (
    SELECT m.id 
    FROM modules m
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid()
  )
);

-- PMs can update requests (approve/reject)
CREATE POLICY "PMs update requests"
ON task_requests FOR UPDATE
TO authenticated
USING (
  module_id IN (
    SELECT m.id 
    FROM modules m
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() 
    AND pm.role = 'manager'
  )
);

-- ============================================
-- INVITES TABLE RLS
-- ============================================

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Admins can view all invites
CREATE POLICY "Admins view invites"
ON invites FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Admins can create invites
CREATE POLICY "Admins create invites"
ON invites FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Admins can update invites
CREATE POLICY "Admins update invites"
ON invites FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- NOTIFICATIONS TABLE RLS
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "Users update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Only system/backend can create notifications (using service_role)
CREATE POLICY "System creates notifications"
ON notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- NOTIFICATION PREFERENCES TABLE RLS
-- ============================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users view own preferences"
ON notification_preferences FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users update own preferences"
ON notification_preferences FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users insert own preferences"
ON notification_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================
-- PRIVACY SETTINGS TABLE RLS
-- ============================================

ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users view own privacy"
ON privacy_settings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own settings
CREATE POLICY "Users update own privacy"
ON privacy_settings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can insert their own settings
CREATE POLICY "Users insert own privacy"
ON privacy_settings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================
-- ACTIVITY LOG TABLE RLS
-- ============================================

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Admin can view all activity
CREATE POLICY "Admin views all activity"
ON activity_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- PM can view activity in their projects
CREATE POLICY "PM views project activity"
ON activity_log FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id 
    FROM project_members 
    WHERE user_id = auth.uid() 
    AND role = 'manager'
  )
);

-- Only system/backend can insert logs
CREATE POLICY "System creates logs"
ON activity_log FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- RECENT SEARCHES TABLE RLS
-- ============================================

ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;

-- Users can view their own searches
CREATE POLICY "Users view own searches"
ON recent_searches FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own searches
CREATE POLICY "Users insert own searches"
ON recent_searches FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can delete their own searches
CREATE POLICY "Users delete own searches"
ON recent_searches FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- SUCCESS MESSAGE (Part 2)
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE 'Migration 5 (Part 2/2) completed: RLS policies for all remaining tables';
  RAISE NOTICE 'ALL RLS POLICIES ENABLED - Database is now secure!';
END $$;
