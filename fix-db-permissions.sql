-- Fix database permissions for movie_user
-- Run this with: sudo -u postgres psql

\c movie_db

-- Grant all privileges on schema public
GRANT ALL ON SCHEMA public TO movie_user;
GRANT CREATE ON SCHEMA public TO movie_user;
ALTER SCHEMA public OWNER TO movie_user;

-- Grant privileges on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO movie_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO movie_user;

-- Grant default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO movie_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO movie_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO movie_user;

-- Show current permissions
\dp
