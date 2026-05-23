-- Migration 003: Create Polls and Events tables

-- Drop existing tables to ensure a clean schema
DROP TABLE IF EXISTS poll_votes CASCADE;
DROP TABLE IF EXISTS poll_options CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- 1. Polls Table
CREATE TABLE IF NOT EXISTS polls (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Poll Options Table
CREATE TABLE IF NOT EXISTS poll_options (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id     UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  votes_count INTEGER DEFAULT 0
);

-- 3. Poll Votes Table (to prevent double voting)
CREATE TABLE IF NOT EXISTS poll_votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id     UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id   UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- 4. Events Table
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  event_date  TIMESTAMPTZ NOT NULL,
  location    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_polls_post_id ON polls(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_events_post_id ON events(post_id);
