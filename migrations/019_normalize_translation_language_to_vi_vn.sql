-- Normalize Vietnamese translation language tags to a single canonical value: vi-VN.
-- This avoids mixed values like "vi" and "vi-VN" in content_translations.

-- Remove duplicate rows where a vi-VN row already exists for the same content.
DELETE FROM content_translations AS ct_vi
USING content_translations AS ct_vn
WHERE ct_vi."tmdbId" = ct_vn."tmdbId"
  AND ct_vi."contentType" = ct_vn."contentType"
  AND lower(replace(ct_vi.language, '_', '-')) = 'vi'
  AND lower(replace(ct_vn.language, '_', '-')) = 'vi-vn';

-- Normalize remaining Vietnamese language tags to vi-VN.
UPDATE content_translations
SET language = 'vi-VN'
WHERE lower(replace(language, '_', '-')) IN ('vi', 'vi-vn');

