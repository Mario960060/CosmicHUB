-- ============================================
-- COSMIC PROJECT HUB - Fix infinite recursion in channel_members RLS
-- Migration 25: Use SECURITY DEFINER function to break recursive policy check
-- ============================================
-- The policy "Users view channel members in their channels" caused recursion
-- because it checked channel_members within itself. This function bypasses RLS.

CREATE OR REPLACE FUNCTION public.is_channel_member(p_channel_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS "Users view channel members in their channels" ON channel_members;

CREATE POLICY "Users view channel members in their channels"
ON channel_members FOR SELECT
USING (
  user_id = auth.uid()
  OR is_channel_member(channel_id, auth.uid())
);
