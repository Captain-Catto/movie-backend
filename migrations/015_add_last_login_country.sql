-- Add lastLoginCountry column to users to track login country
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "lastLoginCountry" VARCHAR(10);

