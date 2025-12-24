#!/bin/bash

# Script to add VIEWER role to PostgreSQL enum as superuser

echo "🔐 Connecting to PostgreSQL as postgres superuser..."
echo ""

# Run as postgres superuser
PGPASSWORD=Tridat@123 psql -h localhost -p 5432 -U postgres -d movie_db << 'EOF'

-- Show current enum values
\echo '📋 Current enum values:'
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')
ORDER BY enumsortorder;

-- Add VIEWER if not exists
\echo ''
\echo '➕ Adding VIEWER to enum...'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'viewer'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')
    ) THEN
        ALTER TYPE users_role_enum ADD VALUE 'viewer';
        RAISE NOTICE '✅ VIEWER added successfully';
    ELSE
        RAISE NOTICE '✅ VIEWER already exists';
    END IF;
END $$;

-- Verify
\echo ''
\echo '✅ Final enum values:'
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')
ORDER BY enumsortorder;

-- Test if enum accepts viewer
\echo ''
\echo '🧪 Testing enum:'
SELECT 'viewer'::users_role_enum as test;

EOF

echo ""
echo "✅ Done! Now restart backend:"
echo "   pm2 restart movie-backend"
