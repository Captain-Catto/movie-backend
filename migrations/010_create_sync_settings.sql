-- Create sync_settings table to store adjustable catalog limits for movies, TV and trending
CREATE TABLE IF NOT EXISTS sync_settings (
    id INTEGER PRIMARY KEY
        CONSTRAINT sync_settings_single_row CHECK (id = 1),
    movie_catalog_limit INTEGER NOT NULL DEFAULT 500000,
    tv_catalog_limit INTEGER NOT NULL DEFAULT 200000,
    trending_catalog_limit INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure updated_at is refreshed on updates
CREATE OR REPLACE FUNCTION set_sync_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_settings_updated_at ON sync_settings;
CREATE TRIGGER trg_sync_settings_updated_at
BEFORE UPDATE ON sync_settings
FOR EACH ROW
EXECUTE FUNCTION set_sync_settings_updated_at();

-- Seed default row (aligns with existing hard-coded defaults)
INSERT INTO sync_settings (id, movie_catalog_limit, tv_catalog_limit, trending_catalog_limit)
VALUES (1, 500000, 200000, 100)
ON CONFLICT (id) DO NOTHING;
