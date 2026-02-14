-- ============================================
-- COSMIC PROJECT HUB - Comms Beacon Chat
-- Migration 18: channels, channel_members, messages, message_mentions
-- ============================================

-- ============================================
-- CHANNELS TABLE
-- ============================================
-- type: 'channel' (project group), 'tasks' (read-only feed), 'dm' (direct message)
-- For DM: project_id and module_id are null
-- For tasks: type='tasks', one per project, read-only

CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'channel'
    CHECK (type IN ('channel', 'tasks', 'dm')),
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_channels_project ON channels(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_channels_type ON channels(type);
CREATE UNIQUE INDEX idx_channels_project_tasks ON channels(project_id) 
  WHERE type = 'tasks' AND project_id IS NOT NULL;

-- ============================================
-- CHANNEL MEMBERS TABLE
-- ============================================
-- last_read_at used for unread count calculation

CREATE TABLE channel_members (
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX idx_channel_members_user ON channel_members(user_id);
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================
-- user_id null = system message

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'user'
    CHECK (type IN ('user', 'system')),
  task_ref_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id) WHERE user_id IS NOT NULL;

-- ============================================
-- MESSAGE MENTIONS TABLE
-- ============================================

CREATE TABLE message_mentions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX idx_message_mentions_user ON message_mentions(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;

-- Channels: users see channels for projects they're in, or DM channels they're a member of
CREATE POLICY "Users view accessible channels"
ON channels FOR SELECT
USING (
  (type = 'dm' AND EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = channels.id AND cm.user_id = auth.uid()
  ))
  OR
  (project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = channels.project_id AND pm.user_id = auth.uid()
  ))
);

-- Users can create DM channels; project/task channels are created by triggers (SECURITY DEFINER)
CREATE POLICY "Users create DM channels"
ON channels FOR INSERT
WITH CHECK (type = 'dm' AND project_id IS NULL);

-- Channel members: users see their own memberships
CREATE POLICY "Users view own channel memberships"
ON channel_members FOR SELECT
USING (user_id = auth.uid());

-- Users can insert themselves into group channels (when joining project) - handled by trigger
-- Users can update last_read_at for their own rows
CREATE POLICY "Users update own last_read"
ON channel_members FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- System/triggers insert channel members
CREATE POLICY "System inserts channel members"
ON channel_members FOR INSERT
WITH CHECK (true);

-- Messages: users see messages in channels they're members of
CREATE POLICY "Users view messages in their channels"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = messages.channel_id AND cm.user_id = auth.uid()
  )
);

-- Users can insert messages in non-tasks channels they're members of
CREATE POLICY "Users insert messages in chat channels"
ON messages FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = messages.channel_id AND cm.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM channels c 
    WHERE c.id = messages.channel_id AND c.type != 'tasks'
  )
);

-- Users can update their own messages (for edit)
CREATE POLICY "Users update own messages"
ON messages FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Message mentions: users see mentions in messages they can see
CREATE POLICY "Users view message mentions"
ON message_mentions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m 
    JOIN channel_members cm ON cm.channel_id = m.channel_id AND cm.user_id = auth.uid()
    WHERE m.id = message_mentions.message_id
  )
);

CREATE POLICY "Users insert mentions"
ON message_mentions FOR INSERT
WITH CHECK (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channels_updated_at
BEFORE UPDATE ON channels
FOR EACH ROW
EXECUTE FUNCTION update_channels_updated_at();

-- ============================================
-- SUCCESS
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE 'Migration 018 completed: channels, channel_members, messages, message_mentions created';
END $$;
