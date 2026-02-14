-- ============================================
-- COSMIC PROJECT HUB - Fix: view other channel members
-- Migration 22: Allow users to see all members of channels they're in
-- (needed for DM display name = other user's name)
-- ============================================

DROP POLICY IF EXISTS "Users view own channel memberships" ON channel_members;

-- Users can see all members of channels they belong to
CREATE POLICY "Users view channel members in their channels"
ON channel_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channel_members cm2
    WHERE cm2.channel_id = channel_members.channel_id
      AND cm2.user_id = auth.uid()
  )
);
