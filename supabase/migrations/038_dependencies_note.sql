-- Add optional note to dependencies
ALTER TABLE dependencies
  ADD COLUMN IF NOT EXISTS note TEXT;
