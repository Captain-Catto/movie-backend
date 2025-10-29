-- Setup script for movie database
-- Run this as postgres user

-- Create database
CREATE DATABASE movie_db;

-- Create user with password
CREATE USER movie_user WITH ENCRYPTED PASSWORD 'movie';

-- Grant privileges on database
GRANT ALL PRIVILEGES ON DATABASE movie_db TO movie_user;

-- Connect to movie_db
\c movie_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO movie_user;
GRANT CREATE ON SCHEMA public TO movie_user;
ALTER SCHEMA public OWNER TO movie_user;

-- Grant default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO movie_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO movie_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO movie_user;
