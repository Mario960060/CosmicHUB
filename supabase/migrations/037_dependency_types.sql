-- ============================================
-- COSMIC PROJECT HUB - DATABASE MIGRATION
-- Migration 37: Dependency types (blocks, depends_on, related_to)
-- ============================================
-- blocks: A blokuje B - twardy stop, B nie moze ruszyc dopoki A nie jest done
-- depends_on: A zalezy od B - miekka zaleznosc, B powinno byc zrobione wczesniej
-- related_to: A i B sa powiazane - czysto informacyjne
-- ============================================

ALTER TABLE dependencies
  ADD COLUMN IF NOT EXISTS dependency_type TEXT NOT NULL DEFAULT 'depends_on'
  CHECK (dependency_type IN ('blocks', 'depends_on', 'related_to'));

COMMENT ON COLUMN dependencies.dependency_type IS 'blocks = hard block, depends_on = soft ordering, related_to = informational';
