-- Store TMDB TV metadata in local DB so API responses remain stable
-- even when TMDB enrichment fails temporarily.

ALTER TABLE tv_series
  ADD COLUMN IF NOT EXISTS "numberOfSeasons" INTEGER,
  ADD COLUMN IF NOT EXISTS "numberOfEpisodes" INTEGER;
