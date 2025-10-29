-- Migration: 005_fix_reply_count_trigger.sql
-- Fix reply count trigger to handle soft delete (is_deleted) updates

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS update_reply_count_trigger ON comments;
DROP FUNCTION IF EXISTS update_reply_count();

-- Create improved trigger function that handles soft delete
CREATE OR REPLACE FUNCTION update_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT: New reply added
    IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
        -- Only count if not deleted
        IF NEW.is_deleted = FALSE THEN
            UPDATE comments
            SET reply_count = reply_count + 1
            WHERE id = NEW.parent_id;
        END IF;

    -- Handle DELETE: Reply permanently deleted (hard delete)
    ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
        -- Decrease count regardless of is_deleted status
        UPDATE comments
        SET reply_count = reply_count - 1
        WHERE id = OLD.parent_id AND reply_count > 0;

    -- Handle UPDATE: Check if is_deleted status changed (soft delete/restore)
    ELSIF TG_OP = 'UPDATE' AND NEW.parent_id IS NOT NULL THEN
        -- Soft delete: was active, now deleted
        IF OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
            UPDATE comments
            SET reply_count = reply_count - 1
            WHERE id = NEW.parent_id AND reply_count > 0;

        -- Restore: was deleted, now active
        ELSIF OLD.is_deleted = TRUE AND NEW.is_deleted = FALSE THEN
            UPDATE comments
            SET reply_count = reply_count + 1
            WHERE id = NEW.parent_id;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create new trigger that monitors INSERT, UPDATE, and DELETE
CREATE TRIGGER update_reply_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_reply_count();

-- ✅ RECALCULATE REPLY COUNT FOR ALL EXISTING COMMENTS
-- This ensures all existing data has correct reply counts
UPDATE comments AS parent
SET reply_count = (
    SELECT COUNT(*)
    FROM comments AS reply
    WHERE reply.parent_id = parent.id
    AND reply.is_deleted = FALSE
    AND reply.is_hidden = FALSE
)
WHERE parent.id IN (
    SELECT DISTINCT parent_id
    FROM comments
    WHERE parent_id IS NOT NULL
);

-- ✅ VERIFICATION QUERY (for manual checking)
-- Uncomment to verify the fix:
-- SELECT
--     c.id,
--     c.content,
--     c.reply_count AS stored_count,
--     (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id AND r.is_deleted = FALSE) AS actual_count,
--     CASE
--         WHEN c.reply_count = (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id AND r.is_deleted = FALSE)
--         THEN 'OK'
--         ELSE 'MISMATCH'
--     END AS status
-- FROM comments c
-- WHERE c.reply_count > 0 OR EXISTS(SELECT 1 FROM comments WHERE parent_id = c.id)
-- ORDER BY c.id;
