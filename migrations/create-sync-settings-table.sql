-- Migration: Create sync_settings table
-- Description: Stores catalog size limits for movies, TV series, and trending content

-- Create sync_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS sync_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    "movieCatalogLimit" INTEGER NOT NULL DEFAULT 500000,
    "tvCatalogLimit" INTEGER NOT NULL DEFAULT 200000,
    "trendingCatalogLimit" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sync_settings_single_row CHECK (id = 1)
);

-- Insert default settings if table is empty
INSERT INTO sync_settings (id, "movieCatalogLimit", "tvCatalogLimit", "trendingCatalogLimit", "createdAt", "updatedAt")
SELECT 1, 500000, 200000, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM sync_settings WHERE id = 1);

-- Create index on id for faster lookups (though there's only one row)
CREATE INDEX IF NOT EXISTS idx_sync_settings_id ON sync_settings(id);

-- Add comment to table
COMMENT ON TABLE sync_settings IS 'Stores configuration for catalog size limits and cleanup thresholds';
