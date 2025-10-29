-- Migration 003: Create Comment System Tables
-- Created: 2024-12-19
-- Description: Creates comprehensive comment system with moderation features

-- Create banned_words table for content filtering
CREATE TABLE banned_words (
    id SERIAL PRIMARY KEY,
    word VARCHAR(255) NOT NULL UNIQUE,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high
    action VARCHAR(20) NOT NULL DEFAULT 'filter', -- filter, block, flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create comments table with comprehensive features
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id INTEGER NULL,
    tv_series_id INTEGER NULL,
    parent_id INTEGER NULL REFERENCES comments(id) ON DELETE CASCADE,
    is_hidden BOOLEAN DEFAULT FALSE,
    hide_reason VARCHAR(255) NULL,
    hidden_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    hidden_at TIMESTAMP NULL,
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_content_not_empty CHECK (LENGTH(TRIM(content)) > 0),
    CONSTRAINT check_movie_or_tv CHECK (
        (movie_id IS NOT NULL AND tv_series_id IS NULL) OR 
        (movie_id IS NULL AND tv_series_id IS NOT NULL)
    )
);

-- Create comment_likes table for user interactions
CREATE TABLE comment_likes (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_like BOOLEAN NOT NULL, -- true = like, false = dislike
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent multiple likes from same user on same comment
    UNIQUE(comment_id, user_id)
);

-- Create comment_reports table for moderation
CREATE TABLE comment_reports (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, dismissed
    reviewed_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate reports from same user on same comment
    UNIQUE(comment_id, reporter_id)
);

-- Create indexes for better performance
CREATE INDEX idx_comments_movie_id ON comments(movie_id) WHERE movie_id IS NOT NULL;
CREATE INDEX idx_comments_tv_series_id ON comments(tv_series_id) WHERE tv_series_id IS NOT NULL;
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_hidden ON comments(is_hidden);

CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);

CREATE INDEX idx_comment_reports_status ON comment_reports(status);
CREATE INDEX idx_comment_reports_comment_id ON comment_reports(comment_id);

CREATE INDEX idx_banned_words_word ON banned_words(word);

-- Create triggers to automatically update comment counts
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update replies count for parent comment
        IF NEW.parent_id IS NOT NULL THEN
            UPDATE comments 
            SET replies_count = replies_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.parent_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update replies count for parent comment
        IF OLD.parent_id IS NOT NULL THEN
            UPDATE comments 
            SET replies_count = replies_count - 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.parent_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_counts
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_counts();

-- Create trigger to update like/dislike counts
CREATE OR REPLACE FUNCTION update_like_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_like THEN
            UPDATE comments 
            SET likes_count = likes_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.comment_id;
        ELSE
            UPDATE comments 
            SET dislikes_count = dislikes_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_like THEN
            UPDATE comments 
            SET likes_count = likes_count - 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.comment_id;
        ELSE
            UPDATE comments 
            SET dislikes_count = dislikes_count - 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle like/dislike toggle
        IF OLD.is_like != NEW.is_like THEN
            IF OLD.is_like THEN
                UPDATE comments 
                SET likes_count = likes_count - 1,
                    dislikes_count = dislikes_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.comment_id;
            ELSE
                UPDATE comments 
                SET likes_count = likes_count + 1,
                    dislikes_count = dislikes_count - 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.comment_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_like_counts
    AFTER INSERT OR UPDATE OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_like_counts();

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_comment_likes_updated_at
    BEFORE UPDATE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_comment_reports_updated_at
    BEFORE UPDATE ON comment_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_banned_words_updated_at
    BEFORE UPDATE ON banned_words
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default banned words
INSERT INTO banned_words (word, severity, action) VALUES
('spam', 'medium', 'filter'),
('scam', 'high', 'block'),
('fake', 'low', 'flag'),
('bot', 'medium', 'filter'),
('virus', 'high', 'block');

-- Add comments for documentation
COMMENT ON TABLE comments IS 'Main comments table for movies and TV series';
COMMENT ON TABLE comment_likes IS 'User likes/dislikes for comments';
COMMENT ON TABLE comment_reports IS 'User reports for inappropriate comments';
COMMENT ON TABLE banned_words IS 'Banned words for content filtering';

COMMENT ON COLUMN comments.content IS 'The comment text content';
COMMENT ON COLUMN comments.parent_id IS 'Reference to parent comment for replies';
COMMENT ON COLUMN comments.is_hidden IS 'Whether comment is hidden by moderators';
COMMENT ON COLUMN comments.hide_reason IS 'Reason why comment was hidden';
COMMENT ON COLUMN comment_likes.is_like IS 'true for like, false for dislike';
COMMENT ON COLUMN comment_reports.status IS 'Report status: pending, reviewed, dismissed';
COMMENT ON COLUMN banned_words.severity IS 'Severity level: low, medium, high';
COMMENT ON COLUMN banned_words.action IS 'Action to take: filter, block, flag';