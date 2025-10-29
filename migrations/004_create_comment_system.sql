-- Migration: 004_create_comment_system.sql
-- Create comprehensive comment system with moderation features

-- 🎬 COMMENTS TABLE
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id INTEGER NULL, -- tmdbId of movie
    tv_id INTEGER NULL,    -- tmdbId of TV show
    parent_id INTEGER NULL REFERENCES comments(id) ON DELETE CASCADE,
    is_hidden BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    hidden_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    hidden_reason TEXT NULL,
    like_count INTEGER DEFAULT 0,
    dislike_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT comments_content_check CHECK (LENGTH(content) > 0),
    CONSTRAINT comments_movie_or_tv_check CHECK (
        (movie_id IS NOT NULL AND tv_id IS NULL) OR 
        (movie_id IS NULL AND tv_id IS NOT NULL)
    )
);

-- 👍 COMMENT LIKES TABLE
CREATE TABLE comment_likes (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_like BOOLEAN NOT NULL, -- true = like, false = dislike
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(comment_id, user_id)
);

-- 🚫 BANNED WORDS TABLE
CREATE TABLE banned_words (
    id SERIAL PRIMARY KEY,
    word VARCHAR(100) NOT NULL UNIQUE,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    action VARCHAR(20) NOT NULL DEFAULT 'filter' CHECK (action IN ('filter', 'block', 'flag')),
    created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🚩 COMMENT REPORTS TABLE
CREATE TABLE comment_reports (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(20) NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
    description TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    reviewed_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ CREATE PERFORMANCE INDEXES
-- Comments indexes
CREATE INDEX idx_comments_movie_created ON comments(movie_id, created_at DESC) WHERE movie_id IS NOT NULL;
CREATE INDEX idx_comments_tv_created ON comments(tv_id, created_at DESC) WHERE tv_id IS NOT NULL;
CREATE INDEX idx_comments_parent_created ON comments(parent_id, created_at ASC) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_user_created ON comments(user_id, created_at DESC);
CREATE INDEX idx_comments_is_hidden ON comments(is_hidden) WHERE is_hidden = FALSE;

-- Comment likes indexes
CREATE INDEX idx_comment_likes_user ON comment_likes(user_id, comment_id);
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);

-- Reports indexes
CREATE INDEX idx_comment_reports_status ON comment_reports(status) WHERE status = 'pending';
CREATE INDEX idx_comment_reports_comment ON comment_reports(comment_id);

-- Banned words indexes
CREATE INDEX idx_banned_words_word ON banned_words(word);
CREATE INDEX idx_banned_words_action ON banned_words(action);

-- ✅ CREATE TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_updated_at();

-- ✅ CREATE TRIGGERS FOR REPLY COUNT UPDATES
CREATE OR REPLACE FUNCTION update_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
        UPDATE comments 
        SET reply_count = reply_count + 1
        WHERE id = NEW.parent_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
        UPDATE comments 
        SET reply_count = reply_count - 1
        WHERE id = OLD.parent_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reply_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_reply_count();

-- ✅ CREATE TRIGGERS FOR LIKE COUNT UPDATES
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_like = TRUE THEN
            UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
        ELSE
            UPDATE comments SET dislike_count = dislike_count + 1 WHERE id = NEW.comment_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_like = TRUE THEN
            UPDATE comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
        ELSE
            UPDATE comments SET dislike_count = dislike_count - 1 WHERE id = OLD.comment_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle like/dislike toggle
        IF OLD.is_like != NEW.is_like THEN
            IF OLD.is_like = TRUE THEN
                UPDATE comments SET 
                    like_count = like_count - 1,
                    dislike_count = dislike_count + 1
                WHERE id = NEW.comment_id;
            ELSE
                UPDATE comments SET 
                    like_count = like_count + 1,
                    dislike_count = dislike_count - 1
                WHERE id = NEW.comment_id;
            END IF;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_like_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_like_count();

-- ✅ INSERT SAMPLE BANNED WORDS
INSERT INTO banned_words (word, severity, action) VALUES
('spam', 'high', 'block'),
('idiot', 'medium', 'filter'),
('stupid', 'low', 'filter'),
('hate', 'medium', 'flag'),
('kill', 'high', 'block'),
('die', 'high', 'block'),
('moron', 'medium', 'filter'),
('dumb', 'low', 'filter');

-- ✅ PERFORMANCE NOTES:
-- 1. Comments are indexed by movie/tv + created_at for fast pagination
-- 2. Parent-child relationships are optimized for nested replies
-- 3. Like counts are automatically updated via triggers
-- 4. Reply counts are maintained automatically
-- 5. Hidden comments can be filtered efficiently
-- 6. Reports can be queried by status for admin moderation
-- 7. Banned words support different severity levels and actions

-- Sample queries for testing:
-- SELECT * FROM comments WHERE movie_id = 550 ORDER BY created_at DESC LIMIT 20;
-- SELECT * FROM comments WHERE parent_id = 1 ORDER BY created_at ASC;
-- SELECT c.*, u.name as user_name FROM comments c JOIN users u ON c.user_id = u.id WHERE c.movie_id = 550;