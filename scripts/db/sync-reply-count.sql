-- Script: sync-reply-count.sql
-- Synchronize reply_count for all comments to match actual active replies
-- Run this script if reply counts become out of sync

BEGIN;

-- ✅ STEP 1: Display current mismatches (for verification)
SELECT
    'BEFORE SYNC' AS status,
    COUNT(*) AS total_mismatches
FROM comments c
WHERE c.reply_count != (
    SELECT COUNT(*)
    FROM comments r
    WHERE r.parent_id = c.id
    AND r.is_deleted = FALSE
    AND r.is_hidden = FALSE
);

-- Show detailed mismatches
SELECT
    c.id AS comment_id,
    c.content AS comment_preview,
    c.reply_count AS stored_count,
    (SELECT COUNT(*)
     FROM comments r
     WHERE r.parent_id = c.id
     AND r.is_deleted = FALSE
     AND r.is_hidden = FALSE
    ) AS actual_count,
    c.reply_count - (
        SELECT COUNT(*)
        FROM comments r
        WHERE r.parent_id = c.id
        AND r.is_deleted = FALSE
        AND r.is_hidden = FALSE
    ) AS difference
FROM comments c
WHERE c.reply_count != (
    SELECT COUNT(*)
    FROM comments r
    WHERE r.parent_id = c.id
    AND r.is_deleted = FALSE
    AND r.is_hidden = FALSE
)
ORDER BY ABS(c.reply_count - (
    SELECT COUNT(*)
    FROM comments r
    WHERE r.parent_id = c.id
    AND r.is_deleted = FALSE
    AND r.is_hidden = FALSE
)) DESC
LIMIT 20;

-- ✅ STEP 2: Update all reply counts to match actual active replies
UPDATE comments AS parent
SET reply_count = (
    SELECT COUNT(*)
    FROM comments AS reply
    WHERE reply.parent_id = parent.id
    AND reply.is_deleted = FALSE
    AND reply.is_hidden = FALSE
);

-- ✅ STEP 3: Verify after sync
SELECT
    'AFTER SYNC' AS status,
    COUNT(*) AS total_mismatches
FROM comments c
WHERE c.reply_count != (
    SELECT COUNT(*)
    FROM comments r
    WHERE r.parent_id = c.id
    AND r.is_deleted = FALSE
    AND r.is_hidden = FALSE
);

-- ✅ STEP 4: Show statistics
SELECT
    'STATISTICS' AS status,
    COUNT(*) AS total_comments,
    COUNT(CASE WHEN parent_id IS NULL THEN 1 END) AS top_level_comments,
    COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) AS total_replies,
    COUNT(CASE WHEN is_deleted = TRUE THEN 1 END) AS deleted_comments,
    SUM(reply_count) AS total_reply_count
FROM comments;

COMMIT;

-- ✅ SUCCESS MESSAGE
SELECT '✅ Reply count sync completed successfully!' AS message;
