-- Add cache cleanup limits to sync settings
ALTER TABLE sync_settings
  ADD COLUMN IF NOT EXISTS "peopleCacheLimit" INTEGER NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS "recommendationCacheLimit" INTEGER NOT NULL DEFAULT 10000;

UPDATE sync_settings
SET
  "peopleCacheLimit" = COALESCE("peopleCacheLimit", 10000),
  "recommendationCacheLimit" = COALESCE("recommendationCacheLimit", 10000),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE id = 1;
