-- Create audit table for viewer read-only attempts
CREATE TABLE IF NOT EXISTS viewer_audit_logs (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(500) NOT NULL,
  "httpMethod" VARCHAR(10) NOT NULL,
  payload JSONB,
  "queryParams" JSONB,
  "ipAddress" VARCHAR(100),
  "userAgent" TEXT,
  "attemptedAction" VARCHAR(200),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viewer_audit_logs_user_id ON viewer_audit_logs("userId");
CREATE INDEX IF NOT EXISTS idx_viewer_audit_logs_created_at ON viewer_audit_logs("createdAt");
