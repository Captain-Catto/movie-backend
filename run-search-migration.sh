#!/bin/bash

echo "========================================"
echo "Running Search Optimization Migration"
echo "========================================"
echo ""

# Load .env file to get database credentials
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "ERROR: .env file not found!"
    exit 1
fi

echo "Database: $DB_DATABASE"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USERNAME"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "ERROR: psql command not found!"
    echo "Please install PostgreSQL client: sudo apt-get install postgresql-client"
    echo ""
    echo "Or run migration manually:"
    echo "PGPASSWORD='$DB_PASSWORD' psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE -f migrations/008_add_search_optimization.sql"
    exit 1
fi

echo "Running migration..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -f migrations/008_add_search_optimization.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Migration completed successfully!"
    echo "========================================"
    echo ""
    echo "Verifying installation..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -f check-search-ready.sql
else
    echo ""
    echo "========================================"
    echo "Migration failed!"
    echo "========================================"
    echo "Please check error messages above."
    exit 1
fi

echo ""
echo "Done! Please restart backend: pm2 restart movie-backend"
