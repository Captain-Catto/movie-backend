-- Multi-language support: store translated title and overview per content item.
-- Default language (en-US) is stored in the main movies/tv_series tables.
-- This table holds translations for additional languages (e.g. vi).

CREATE TABLE IF NOT EXISTS content_translations (
  id SERIAL PRIMARY KEY,
  "tmdbId" INTEGER NOT NULL,
  "contentType" VARCHAR(10) NOT NULL CHECK ("contentType" IN ('movie', 'tv')),
  language VARCHAR(10) NOT NULL,
  title VARCHAR(500),
  overview TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE ("tmdbId", "contentType", language)
);

CREATE INDEX IF NOT EXISTS idx_translations_tmdb_lang
  ON content_translations ("tmdbId", "contentType", language);

CREATE INDEX IF NOT EXISTS idx_translations_language
  ON content_translations (language);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_content_translations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_content_translations_timestamp ON content_translations;

CREATE TRIGGER trigger_update_content_translations_timestamp
BEFORE UPDATE ON content_translations
FOR EACH ROW
EXECUTE FUNCTION update_content_translations_timestamp();
