-- Migration: add comment_mentions table for @mentions feature

BEGIN;

CREATE TABLE IF NOT EXISTS comment_mentions (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    mentioned_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_comment_mention UNIQUE (comment_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_user
    ON comment_mentions (mentioned_user_id);

COMMIT;
