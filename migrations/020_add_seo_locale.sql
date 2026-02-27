-- Add locale support for SEO metadata and allow one entry per (page_type, page_slug, locale)

ALTER TABLE IF EXISTS seo_metadata
  ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'vi';

UPDATE seo_metadata
SET locale = 'vi'
WHERE locale IS NULL OR trim(locale) = '';

ALTER TABLE IF EXISTS seo_metadata
  ALTER COLUMN locale SET NOT NULL;

DO $$
DECLARE
  r RECORD;
  has_page_type BOOLEAN;
  has_page_slug BOOLEAN;
BEGIN
  -- Drop old unique constraints/indexes that only cover (pageType, pageSlug) or (page_type, page_slug)
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'seo_metadata'
      AND c.contype = 'u'
      AND (
        pg_get_constraintdef(c.oid) ILIKE '%"pageType"%'
        OR pg_get_constraintdef(c.oid) ILIKE '%page_type%'
      )
      AND (
        pg_get_constraintdef(c.oid) ILIKE '%"pageSlug"%'
        OR pg_get_constraintdef(c.oid) ILIKE '%page_slug%'
      )
  LOOP
    EXECUTE format('ALTER TABLE seo_metadata DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;

  FOR r IN
    SELECT i.indexname
    FROM pg_indexes i
    WHERE i.schemaname = 'public'
      AND i.tablename = 'seo_metadata'
      AND i.indexdef ILIKE '%UNIQUE%'
      AND (
        i.indexdef ILIKE '%"pageType"%'
        OR i.indexdef ILIKE '%page_type%'
      )
      AND (
        i.indexdef ILIKE '%"pageSlug"%'
        OR i.indexdef ILIKE '%page_slug%'
      )
      AND i.indexname <> 'uq_seo_metadata_type_slug_locale'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
  END LOOP;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seo_metadata'
      AND column_name = 'pageType'
  ) INTO has_page_type;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seo_metadata'
      AND column_name = 'pageSlug'
  ) INTO has_page_slug;

  IF has_page_type AND has_page_slug THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_seo_metadata_type_slug_locale ON seo_metadata ("pageType", "pageSlug", locale)';
  ELSE
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_seo_metadata_type_slug_locale ON seo_metadata (page_type, page_slug, locale)';
  END IF;
END $$;

