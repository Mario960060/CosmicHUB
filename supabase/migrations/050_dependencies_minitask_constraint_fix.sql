-- Migration 50: Ensure minitask is allowed in dependencies (fix chk_dep_source_type / chk_dep_target_type)
-- Idempotent: safe to run even if 046 was applied

ALTER TABLE dependencies DROP CONSTRAINT IF EXISTS chk_dep_source_type;
ALTER TABLE dependencies DROP CONSTRAINT IF EXISTS chk_dep_target_type;

ALTER TABLE dependencies
  ADD CONSTRAINT chk_dep_source_type CHECK (source_type IN ('module', 'task', 'subtask', 'minitask')),
  ADD CONSTRAINT chk_dep_target_type CHECK (target_type IN ('module', 'task', 'subtask', 'minitask'));
