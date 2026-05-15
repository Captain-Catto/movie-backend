DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_sessions_status_enum') THEN
    CREATE TYPE chat_sessions_status_enum AS ENUM ('active', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_messages_role_enum') THEN
    CREATE TYPE chat_messages_role_enum AS ENUM ('user', 'assistant', 'system');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_moderation_flags_severity_enum') THEN
    CREATE TYPE chat_moderation_flags_severity_enum AS ENUM ('low', 'medium', 'high');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_moderation_flags_status_enum') THEN
    CREATE TYPE chat_moderation_flags_status_enum AS ENUM ('open', 'resolved', 'ignored');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(255),
  status chat_sessions_status_enum NOT NULL DEFAULT 'active',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  "sessionId" integer NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role chat_messages_role_enum NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_moderation_flags (
  id SERIAL PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sessionId" integer NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  "messageId" integer REFERENCES chat_messages(id) ON DELETE SET NULL,
  reason text NOT NULL,
  severity chat_moderation_flags_severity_enum NOT NULL DEFAULT 'low',
  status chat_moderation_flags_status_enum NOT NULL DEFAULT 'open',
  "reviewedBy" integer REFERENCES users(id) ON DELETE SET NULL,
  "reviewedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated ON chat_sessions ("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages ("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON chat_messages ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_chat_flags_status_created ON chat_moderation_flags (status, "createdAt");
CREATE INDEX IF NOT EXISTS idx_chat_flags_user_created ON chat_moderation_flags ("userId", "createdAt");
