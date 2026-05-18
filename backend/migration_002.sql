-- Migration 002: Create uploads table for separate file tracking
-- Run once: psql -U postgres -d interax -f backend/migration_002.sql

CREATE TABLE IF NOT EXISTS uploads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploader_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  filename     TEXT NOT NULL,
  mime_type    TEXT,
  size_bytes   BIGINT,
  context_type TEXT DEFAULT 'other',   -- 'post' | 'message' | 'story' | 'avatar' | 'cover' | 'group' | 'page' | 'other'
  context_id   UUID,                   -- optional: ID of the related post/message/story
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uploads_uploader_id  ON uploads(uploader_id);
CREATE INDEX IF NOT EXISTS idx_uploads_context_type ON uploads(context_type);
CREATE INDEX IF NOT EXISTS idx_uploads_context_id   ON uploads(context_id);
