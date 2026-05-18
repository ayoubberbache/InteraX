-- Migration: add from_user_name and from_user_avatar columns to notifications (optional cache cols)
-- Run this once if they don't already exist

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS from_user_name TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS from_user_avatar TEXT;

-- Update existing rows from the users join (one-time backfill)
UPDATE notifications n
SET from_user_name = u.full_name,
    from_user_avatar = u.avatar_url
FROM users u
WHERE n.from_user_id = u.id
  AND n.from_user_name IS NULL;

-- Ensure group conversations support (optional is_group flag on conversations)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_avatar TEXT;
