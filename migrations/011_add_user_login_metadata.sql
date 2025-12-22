-- Migration 011: Add login metadata fields to users
-- Tracks last login IP, device type, and user agent for auditability

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "lastLoginIp" VARCHAR(100);

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "lastLoginDevice" VARCHAR(50);

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "lastLoginUserAgent" VARCHAR(255);
