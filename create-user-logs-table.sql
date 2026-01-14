-- Create user_logs table
CREATE TABLE IF NOT EXISTS user_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_user_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_logs_user_created ON user_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_logs_action ON user_logs(action);

-- Grant permissions (adjust username if needed)
GRANT ALL PRIVILEGES ON TABLE user_logs TO postgres;
GRANT USAGE, SELECT ON SEQUENCE user_logs_id_seq TO postgres;
