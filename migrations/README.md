# Database Migrations

## Overview

This directory contains SQL migration files for the movie streaming application database.

## Migration Files

- `003_create_comment_system.sql` - Initial comment system (deprecated)
- `004_create_comment_system.sql` - Enhanced comment system with moderation
- `005_fix_reply_count_trigger.sql` - **Fix for reply count with soft delete** ⚡

## Running Migrations

### Option 1: Using npm script (Recommended)

```bash
# From movie-backend directory
npm run migrate
```

### Option 2: Using psql directly

```bash
# Run specific migration
PGPASSWORD="your_password" psql -h your_host -p 5432 -U your_username -d your_database -f migrations/005_fix_reply_count_trigger.sql
```

### Option 3: Using PgAdmin

1. Open PgAdmin and connect to your database
2. Right-click on your database → Query Tool
3. Open the migration file (005_fix_reply_count_trigger.sql)
4. Execute the script (F5)

## Migration 005: Fix Reply Count Trigger

### Problem Solved

The original trigger only monitored `INSERT` and `DELETE` operations, but the application uses **soft delete** (setting `is_deleted = TRUE`), causing reply counts to become inaccurate.

### What This Migration Does

1. **Drops old trigger** that doesn't handle soft delete
2. **Creates new trigger** that monitors:
   - ✅ INSERT: New reply added
   - ✅ DELETE: Hard delete (permanent)
   - ✅ **UPDATE: Soft delete/restore** (NEW!)
3. **Recalculates all existing reply counts** to fix historical data

### Trigger Behavior

| Action | Event | Reply Count Change |
|--------|-------|-------------------|
| Create new reply | INSERT | +1 |
| Soft delete reply | UPDATE is_deleted: false → true | -1 |
| Restore reply | UPDATE is_deleted: true → false | +1 |
| Hard delete reply | DELETE | -1 |

### Verification

After running the migration, verify with:

```sql
-- Check for mismatches between stored and actual counts
SELECT
    c.id,
    c.reply_count AS stored,
    (SELECT COUNT(*) FROM comments r
     WHERE r.parent_id = c.id
     AND r.is_deleted = FALSE) AS actual
FROM comments c
WHERE c.reply_count != (
    SELECT COUNT(*) FROM comments r
    WHERE r.parent_id = c.id
    AND r.is_deleted = FALSE
)
LIMIT 10;
```

Should return **0 rows** if everything is synchronized.

## Testing

### Run Automated Tests

```bash
# From movie-backend directory
psql -U your_username -d your_database -f scripts/db/test-reply-count-trigger.sql
```

This will run 6 comprehensive tests:
1. ✅ INSERT new reply increases count
2. ✅ SOFT DELETE decreases count
3. ✅ RESTORE increases count
4. ✅ HARD DELETE decreases count
5. ✅ Multiple replies scenario
6. ✅ Insert already-deleted reply doesn't affect count

### Manual Testing

```sql
-- Create test comment
INSERT INTO comments (content, user_id, movie_id)
VALUES ('Test parent', 1, 550)
RETURNING id; -- Note this ID

-- Create reply (replace 123 with parent ID)
INSERT INTO comments (content, user_id, movie_id, parent_id)
VALUES ('Test reply', 1, 550, 123);

-- Check count (should be 1)
SELECT id, reply_count FROM comments WHERE id = 123;

-- Soft delete the reply
UPDATE comments SET is_deleted = TRUE WHERE content = 'Test reply';

-- Check count (should be 0)
SELECT id, reply_count FROM comments WHERE id = 123;

-- Restore the reply
UPDATE comments SET is_deleted = FALSE WHERE content = 'Test reply';

-- Check count (should be 1 again)
SELECT id, reply_count FROM comments WHERE id = 123;
```

## Maintenance Scripts

### Sync Reply Counts

If reply counts become out of sync, run:

```bash
psql -U your_username -d your_database -f scripts/db/sync-reply-count.sql
```

This will:
1. Show current mismatches
2. Recalculate all reply counts
3. Verify the fix
4. Display statistics

## Rollback

To rollback migration 005:

```sql
-- Drop the new trigger
DROP TRIGGER IF EXISTS update_reply_count_trigger ON comments;
DROP FUNCTION IF EXISTS update_reply_count();

-- Recreate the old trigger (from migration 004)
CREATE OR REPLACE FUNCTION update_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
        UPDATE comments
        SET reply_count = reply_count + 1
        WHERE id = NEW.parent_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
        UPDATE comments
        SET reply_count = reply_count - 1
        WHERE id = OLD.parent_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reply_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_reply_count();
```

⚠️ **Warning**: Rolling back will re-introduce the soft delete bug!

## Environment Setup

### Database Connection

Update your `.env` file:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=your_database
```

### Prerequisites

- PostgreSQL 12+
- Node.js 18+ (for NestJS backend)
- psql CLI or PgAdmin

## Troubleshooting

### Issue: "relation 'comments' does not exist"

**Solution**: Run earlier migrations first (003 or 004)

### Issue: Reply counts still incorrect after migration

**Solution**: Run the sync script:
```bash
psql -U your_username -d your_database -f scripts/db/sync-reply-count.sql
```

### Issue: Permission denied

**Solution**: Ensure your database user has trigger creation privileges:
```sql
GRANT ALL PRIVILEGES ON DATABASE your_database TO your_username;
```

## Best Practices

1. **Always backup** before running migrations
2. **Test in development** before production
3. **Run verification queries** after migration
4. **Monitor logs** for trigger errors
5. **Keep migrations sequential** (don't skip numbers)

## Support

For issues or questions:
- Check the test scripts in `scripts/` directory
- Review the trigger code in `005_fix_reply_count_trigger.sql`
- See the project documentation in `docs/`
