-- ============================================
-- COSMIC PROJECT HUB - Module Members (Team/Spacecraft per Module)
-- Migration 31: module_members table for module-level team assignment
-- ============================================
-- 1 spacecraft per project (project_members)
-- 1 spacecraft per module (module_members)
-- ============================================

CREATE TABLE module_members (
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' 
    CHECK (role IN ('lead', 'member')),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (module_id, user_id)
);

CREATE INDEX idx_module_members_user ON module_members(user_id);
CREATE INDEX idx_module_members_module ON module_members(module_id);
CREATE INDEX idx_module_members_role ON module_members(module_id, role);

ALTER TABLE module_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Project members can view module members of their project's modules
CREATE POLICY "module_members_select"
ON module_members FOR SELECT
TO authenticated
USING (
  module_id IN (
    SELECT m.id FROM modules m
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- INSERT: Project manager or admin can add module members
CREATE POLICY "module_members_insert"
ON module_members FOR INSERT
TO authenticated
WITH CHECK (
  module_id IN (
    SELECT m.id FROM modules m
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() AND pm.role = 'manager'
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- DELETE: Project manager or admin can remove module members
CREATE POLICY "module_members_delete"
ON module_members FOR DELETE
TO authenticated
USING (
  module_id IN (
    SELECT m.id FROM modules m
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() AND pm.role = 'manager'
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- UPDATE: Project manager or admin can update; users can update own membership (e.g. leave)
CREATE POLICY "module_members_update"
ON module_members FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR module_id IN (
    SELECT m.id FROM modules m
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() AND pm.role = 'manager'
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  user_id = auth.uid()
  OR module_id IN (
    SELECT m.id FROM modules m
    INNER JOIN project_members pm ON pm.project_id = m.project_id
    WHERE pm.user_id = auth.uid() AND pm.role = 'manager'
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DO $$ 
BEGIN 
  RAISE NOTICE 'Migration 31 completed: module_members table created';
END $$;
