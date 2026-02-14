-- Invite signup: allow reading invite by token + RPC to complete signup

-- 1. Allow anyone to read valid pending invites (by token - client always filters)
DROP POLICY IF EXISTS "Anyone can read valid pending invite" ON invites;
CREATE POLICY "Anyone can read valid pending invite"
ON invites FOR SELECT
TO anon
USING (
  status = 'pending'
  AND (expires_at IS NULL OR expires_at > NOW())
);

-- 2. RPC: complete signup after auth.signUp - inserts into users, updates invite
DROP FUNCTION IF EXISTS public.complete_invite_signup(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.complete_invite_signup(
  p_token TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_full_name TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get invite
  SELECT id, email, role INTO v_invite
  FROM invites
  WHERE token = p_token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;

  -- Full name: param, or from user_metadata (set during signUp)
  v_full_name := COALESCE(
    NULLIF(trim(p_full_name), ''),
    (auth.jwt() -> 'user_metadata' ->> 'full_name'),
    split_part(v_invite.email, '@', 1)
  );

  -- CRITICAL: Verify auth.uid() email matches invite email (prevent overwriting existing users)
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = v_user_id 
    AND email = v_invite.email
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auth email does not match invite email');
  END IF;

  -- CRITICAL: Check if user already exists in public.users - if so, this is invalid use
  IF EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already exists - logout first');
  END IF;

  -- Insert into users (no ON CONFLICT - must be a new user)
  INSERT INTO users (id, email, full_name, role)
  VALUES (v_user_id, v_invite.email, v_full_name, v_invite.role);

  -- Update invite
  UPDATE invites
  SET status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = NOW()
  WHERE id = v_invite.id;

  -- Notify all admins (runs in same transaction, SECURITY DEFINER bypasses RLS)
  INSERT INTO notifications (user_id, type, title, message, related_id, related_type, actor_id)
  SELECT u.id, 'new_user', 'New account created',
    v_full_name || ' (' || v_invite.email || ') joined the platform.',
    v_user_id, 'user', NULL
  FROM users u
  WHERE u.role = 'admin'
    AND u.deleted_at IS NULL
    AND u.id != v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_invite_signup(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.complete_invite_signup(TEXT, TEXT) TO authenticated;
