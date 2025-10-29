-- Migration 005: Adjust trending unique constraint for media type variants
-- Created: 2025-02-15
-- Description: Allows the same TMDB id to exist for both movie and TV entries by
--              replacing the single-column unique constraint with a composite one.

BEGIN;

ALTER TABLE trending
    DROP CONSTRAINT IF EXISTS "UQ_b0a4bef7b78c22a011ccff28588";

ALTER TABLE trending
    ADD CONSTRAINT uq_trending_tmdb_media UNIQUE ("tmdbId", "mediaType");

COMMIT;
