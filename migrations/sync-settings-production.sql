-- Production Migration: Create sync_settings table
-- Run this SQL on your production PostgreSQL database

-- Create sync_settings table
CREATE TABLE IF NOT EXISTS sync_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    "movieCatalogLimit" INTEGER NOT NULL DEFAULT 500000,
    "tvCatalogLimit" INTEGER NOT NULL DEFAULT 200000,
    "trendingCatalogLimit" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sync_settings_single_row CHECK (id = 1)
);

-- Insert default settings (only if table is empty)
INSERT INTO sync_settings (
    id,
    "movieCatalogLimit",
    "tvCatalogLimit",
    "trendingCatalogLimit",
    "createdAt",
    "updatedAt"
)
SELECT
    1,
    500000,
    200000,
    100,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM sync_settings WHERE id = 1
);

-- Verify the table was created successfully
SELECT * FROM sync_settings;
