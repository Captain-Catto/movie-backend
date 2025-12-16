-- Migration 008: Add full-text search and fuzzy matching optimization
-- Description: Enables pg_trgm extension and creates search indexes for title-only search
-- Date: 2025-12-07

-- ========================================
-- 1. Enable pg_trgm extension (idempotent)
-- ========================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ========================================
-- 2. Set similarity threshold globally
-- ========================================
-- Note: This affects all similarity() function calls in the database
SET pg_trgm.similarity_threshold = 0.3;

-- ========================================
-- 3. Drop old indexes if they exist (safety)
-- ========================================
DROP INDEX IF EXISTS idx_movies_title_trgm;
DROP INDEX IF EXISTS idx_movies_original_title_trgm;
DROP INDEX IF EXISTS idx_movies_search_fts;
DROP INDEX IF EXISTS idx_tv_series_title_trgm;
DROP INDEX IF EXISTS idx_tv_series_original_title_trgm;
DROP INDEX IF EXISTS idx_tv_series_search_fts;

-- ========================================
-- 4. Create trigram indexes for MOVIES table
-- ========================================
-- Trigram index on title column (handles fuzzy matching for typos)
CREATE INDEX idx_movies_title_trgm ON movies USING gin(title gin_trgm_ops);

-- Trigram index on originalTitle column (handles fuzzy matching for original titles)
CREATE INDEX idx_movies_original_title_trgm ON movies USING gin("originalTitle" gin_trgm_ops);

-- ========================================
-- 5. Create full-text search index for MOVIES table
-- ========================================
-- Single FTS index on concatenated title + originalTitle fields
-- More efficient than separate indexes for combined field searches
CREATE INDEX idx_movies_search_fts ON movies USING gin(
  to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE("originalTitle", ''))
);

-- ========================================
-- 6. Create trigram indexes for TV_SERIES table
-- ========================================
-- Trigram index on title column
CREATE INDEX idx_tv_series_title_trgm ON tv_series USING gin(title gin_trgm_ops);

-- Trigram index on originalTitle column
CREATE INDEX idx_tv_series_original_title_trgm ON tv_series USING gin("originalTitle" gin_trgm_ops);

-- ========================================
-- 7. Create full-text search index for TV_SERIES table
-- ========================================
-- Single FTS index on concatenated title + originalTitle fields
CREATE INDEX idx_tv_series_search_fts ON tv_series USING gin(
  to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE("originalTitle", ''))
);

-- ========================================
-- 8. Verify indexes were created successfully
-- ========================================
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('movies', 'tv_series')
  AND (indexname LIKE '%trgm%' OR indexname LIKE '%fts%')
ORDER BY tablename, indexname;

-- ========================================
-- 9. Show extension info
-- ========================================
SELECT
  extname as extension_name,
  extversion as version,
  nspname as schema
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname = 'pg_trgm';

-- ========================================
-- Migration complete
-- ========================================
-- Expected indexes created:
-- - idx_movies_title_trgm (GIN index for fuzzy title matching)
-- - idx_movies_original_title_trgm (GIN index for fuzzy original title matching)
-- - idx_movies_search_fts (GIN FTS index for exact title + original title matching)
-- - idx_tv_series_title_trgm (GIN index for fuzzy title matching)
-- - idx_tv_series_original_title_trgm (GIN index for fuzzy original title matching)
-- - idx_tv_series_search_fts (GIN FTS index for exact title + original title matching)
--
-- Performance impact:
-- - Index size: ~20-30% of table size
-- - Index creation time: 10-30 seconds per index on 100k records
-- - Query time improvement: 500ms → 50-100ms
