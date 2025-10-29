-- Add moderation columns to trending table
ALTER TABLE trending
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hidden_reason TEXT,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP;

-- Ensure existing rows default to visible
UPDATE trending
SET is_hidden = COALESCE(is_hidden, FALSE),
    hidden_reason = NULL,
    hidden_at = NULL;
