-- Migration 007: Create refresh_tokens table for JWT refresh flow
-- Description: Stores rotating refresh tokens with expiration and revocation flags
-- Run with: psql "$DATABASE_URL" -f migrations/007_create_refresh_tokens.sql

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT NULL,
    user_agent TEXT NULL
);

-- Quick lookup by token
CREATE INDEX IF NOT EXISTS idx_refresh_token ON refresh_tokens(token);
-- User + token lookup
CREATE INDEX IF NOT EXISTS idx_user_token ON refresh_tokens(user_id, token);
