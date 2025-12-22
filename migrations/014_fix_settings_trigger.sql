-- Migration 014: Fix settings trigger column casing
DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
DROP FUNCTION IF EXISTS update_settings_updated_at();

CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION update_settings_updated_at();
