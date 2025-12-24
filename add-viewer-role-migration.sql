-- Add VIEWER to users_role_enum
ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'viewer';
