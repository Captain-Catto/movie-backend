ALTER TABLE recent_searches
ADD COLUMN IF NOT EXISTS "dismissedAt" timestamp NULL;

CREATE INDEX IF NOT EXISTS idx_recent_searches_user_visible_updated
ON recent_searches ("userId", "dismissedAt", "updatedAt");
