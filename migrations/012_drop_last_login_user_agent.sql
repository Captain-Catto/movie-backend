-- Migration 012: Remove lastLoginUserAgent column from users table
ALTER TABLE "users"
DROP COLUMN IF EXISTS "lastLoginUserAgent";
