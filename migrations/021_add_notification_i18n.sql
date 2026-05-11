-- Add Vietnamese language fields to notification_templates
ALTER TABLE notification_templates
  ADD COLUMN IF NOT EXISTS title_vi VARCHAR(255),
  ADD COLUMN IF NOT EXISTS message_vi TEXT;
