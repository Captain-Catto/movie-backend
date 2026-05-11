-- Add actionUrl field to notification_templates for click-through navigation
ALTER TABLE notification_templates
  ADD COLUMN IF NOT EXISTS "actionUrl" VARCHAR(500);
