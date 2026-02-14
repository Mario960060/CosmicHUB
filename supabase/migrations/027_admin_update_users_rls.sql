-- ============================================
-- COSMIC PROJECT HUB - Admin can update any user
-- Migration 27: Allow admins to change user roles (client → PM, worker, etc.)
-- ============================================
-- Problem: "update_own_profile" only allows users to update themselves.
-- Admin changing another user's role was blocked by RLS.
-- ============================================

-- Allow admins to update any user (role, full_name, email, bio, etc.)
CREATE POLICY "admin_update_users"
ON users FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
