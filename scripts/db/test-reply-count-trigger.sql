-- Script: test-reply-count-trigger.sql
-- Test suite to verify reply_count trigger works correctly with soft delete

-- ✅ SETUP: Create test data
BEGIN;

-- Create test user (if not exists)
INSERT INTO users (name, email, password, role)
VALUES ('Test User', 'test@test.com', 'password', 'user')
ON CONFLICT (email) DO UPDATE SET name = 'Test User'
RETURNING id;

-- Store user_id for testing (replace 1 with actual user_id from above if needed)
DO $$
DECLARE
    test_user_id INTEGER := 1;
    test_parent_comment_id INTEGER;
    test_reply_id INTEGER;
BEGIN
    -- Clean up any existing test data
    DELETE FROM comments WHERE content LIKE '[TEST]%';

    -- ========================================
    -- TEST 1: INSERT - Creating new reply should increase count
    -- ========================================
    RAISE NOTICE '🧪 TEST 1: INSERT new reply';

    -- Create parent comment
    INSERT INTO comments (content, user_id, movie_id, reply_count)
    VALUES ('[TEST] Parent comment', test_user_id, 550, 0)
    RETURNING id INTO test_parent_comment_id;

    RAISE NOTICE 'Created parent comment ID: %', test_parent_comment_id;

    -- Create reply
    INSERT INTO comments (content, user_id, movie_id, parent_id)
    VALUES ('[TEST] Reply 1', test_user_id, 550, test_parent_comment_id)
    RETURNING id INTO test_reply_id;

    -- Verify count increased
    IF (SELECT reply_count FROM comments WHERE id = test_parent_comment_id) = 1 THEN
        RAISE NOTICE '✅ TEST 1 PASSED: reply_count = 1 after INSERT';
    ELSE
        RAISE EXCEPTION '❌ TEST 1 FAILED: Expected reply_count = 1, got %',
            (SELECT reply_count FROM comments WHERE id = test_parent_comment_id);
    END IF;

    -- ========================================
    -- TEST 2: SOFT DELETE - Soft deleting reply should decrease count
    -- ========================================
    RAISE NOTICE '🧪 TEST 2: SOFT DELETE reply';

    -- Soft delete the reply
    UPDATE comments
    SET is_deleted = TRUE
    WHERE id = test_reply_id;

    -- Verify count decreased
    IF (SELECT reply_count FROM comments WHERE id = test_parent_comment_id) = 0 THEN
        RAISE NOTICE '✅ TEST 2 PASSED: reply_count = 0 after SOFT DELETE';
    ELSE
        RAISE EXCEPTION '❌ TEST 2 FAILED: Expected reply_count = 0 after soft delete, got %',
            (SELECT reply_count FROM comments WHERE id = test_parent_comment_id);
    END IF;

    -- ========================================
    -- TEST 3: RESTORE - Restoring reply should increase count
    -- ========================================
    RAISE NOTICE '🧪 TEST 3: RESTORE deleted reply';

    -- Restore the reply
    UPDATE comments
    SET is_deleted = FALSE
    WHERE id = test_reply_id;

    -- Verify count increased
    IF (SELECT reply_count FROM comments WHERE id = test_parent_comment_id) = 1 THEN
        RAISE NOTICE '✅ TEST 3 PASSED: reply_count = 1 after RESTORE';
    ELSE
        RAISE EXCEPTION '❌ TEST 3 FAILED: Expected reply_count = 1 after restore, got %',
            (SELECT reply_count FROM comments WHERE id = test_parent_comment_id);
    END IF;

    -- ========================================
    -- TEST 4: HARD DELETE - Permanently deleting reply should decrease count
    -- ========================================
    RAISE NOTICE '🧪 TEST 4: HARD DELETE reply';

    -- Hard delete the reply
    DELETE FROM comments WHERE id = test_reply_id;

    -- Verify count decreased
    IF (SELECT reply_count FROM comments WHERE id = test_parent_comment_id) = 0 THEN
        RAISE NOTICE '✅ TEST 4 PASSED: reply_count = 0 after HARD DELETE';
    ELSE
        RAISE EXCEPTION '❌ TEST 4 FAILED: Expected reply_count = 0 after hard delete, got %',
            (SELECT reply_count FROM comments WHERE id = test_parent_comment_id);
    END IF;

    -- ========================================
    -- TEST 5: MULTIPLE REPLIES - Test with multiple replies
    -- ========================================
    RAISE NOTICE '🧪 TEST 5: Multiple replies scenario';

    -- Create 3 replies
    INSERT INTO comments (content, user_id, movie_id, parent_id)
    VALUES
        ('[TEST] Reply 2', test_user_id, 550, test_parent_comment_id),
        ('[TEST] Reply 3', test_user_id, 550, test_parent_comment_id),
        ('[TEST] Reply 4', test_user_id, 550, test_parent_comment_id);

    -- Verify count = 3
    IF (SELECT reply_count FROM comments WHERE id = test_parent_comment_id) = 3 THEN
        RAISE NOTICE '✅ TEST 5.1 PASSED: reply_count = 3 after adding 3 replies';
    ELSE
        RAISE EXCEPTION '❌ TEST 5.1 FAILED: Expected reply_count = 3, got %',
            (SELECT reply_count FROM comments WHERE id = test_parent_comment_id);
    END IF;

    -- Soft delete one reply
    UPDATE comments
    SET is_deleted = TRUE
    WHERE content = '[TEST] Reply 2';

    -- Verify count = 2
    IF (SELECT reply_count FROM comments WHERE id = test_parent_comment_id) = 2 THEN
        RAISE NOTICE '✅ TEST 5.2 PASSED: reply_count = 2 after soft deleting 1 reply';
    ELSE
        RAISE EXCEPTION '❌ TEST 5.2 FAILED: Expected reply_count = 2, got %',
            (SELECT reply_count FROM comments WHERE id = test_parent_comment_id);
    END IF;

    -- ========================================
    -- TEST 6: INSERT ALREADY DELETED - Creating reply with is_deleted = true
    -- ========================================
    RAISE NOTICE '🧪 TEST 6: INSERT reply with is_deleted = TRUE';

    DECLARE
        current_count INTEGER;
    BEGIN
        current_count := (SELECT reply_count FROM comments WHERE id = test_parent_comment_id);

        -- Create reply that's already deleted
        INSERT INTO comments (content, user_id, movie_id, parent_id, is_deleted)
        VALUES ('[TEST] Deleted Reply', test_user_id, 550, test_parent_comment_id, TRUE);

        -- Verify count did NOT increase
        IF (SELECT reply_count FROM comments WHERE id = test_parent_comment_id) = current_count THEN
            RAISE NOTICE '✅ TEST 6 PASSED: reply_count unchanged when inserting deleted reply';
        ELSE
            RAISE EXCEPTION '❌ TEST 6 FAILED: reply_count should not increase for deleted reply';
        END IF;
    END;

    -- ========================================
    -- CLEANUP
    -- ========================================
    RAISE NOTICE '🧹 Cleaning up test data...';
    DELETE FROM comments WHERE content LIKE '[TEST]%';

    RAISE NOTICE '✅ ALL TESTS PASSED! Trigger is working correctly.';
END $$;

COMMIT;

-- Final message
SELECT '✅ Reply count trigger test suite completed successfully!' AS message;
