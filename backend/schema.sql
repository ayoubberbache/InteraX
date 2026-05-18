-- ============================================================
-- InteraX Database Schema for Local PostgreSQL
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name     TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  cover_url     TEXT,
  bio           TEXT DEFAULT '',
  role          TEXT DEFAULT 'user',
  is_verified   BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  points        INTEGER DEFAULT 0,
  ai_persona    TEXT,
  rating        NUMERIC(3,2) DEFAULT 5.0,
  rating_count  INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url      TEXT,
  caption        TEXT,
  content        TEXT,
  likes_count    INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  rating         NUMERIC(3,2) DEFAULT 0,
  rating_count   INTEGER DEFAULT 0,
  group_id       UUID,
  page_id        UUID,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- POST COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS post_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- POST LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS post_likes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  emoji      TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- ============================================================
-- POST RATINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS post_ratings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- ============================================================
-- STORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS stories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS follows (
  follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_id    UUID,
  target_type  TEXT,
  message      TEXT NOT NULL,
  is_read      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids    UUID[] NOT NULL,
  last_message       TEXT,
  last_message_time  TIMESTAMPTZ DEFAULT now(),
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT DEFAULT '',
  media_url       TEXT,
  type            TEXT DEFAULT 'text',
  is_read         BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MESSAGE REACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  UNIQUE(message_id, user_id)
);

-- ============================================================
-- GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE,
  description   TEXT,
  category      TEXT DEFAULT 'General',
  avatar_url    TEXT,
  cover_url     TEXT,
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  members_count INTEGER DEFAULT 1,
  posts_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS pages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  handle        TEXT NOT NULL UNIQUE,
  description   TEXT,
  category      TEXT DEFAULT 'Creator',
  avatar_url    TEXT,
  cover_url     TEXT,
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followers_count INTEGER DEFAULT 0,
  posts_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AI CHATBOT SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_chatbot_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_title   TEXT DEFAULT 'New Chat',
  model_used      TEXT DEFAULT 'qwen/qwen3.5-122b-a10b',
  total_messages  INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AI CHATBOT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_chatbot_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES ai_chatbot_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content    TEXT NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS group_members (
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- ============================================================
-- PAGE FOLLOWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS page_followers (
  page_id    UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (page_id, user_id)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_group_id ON posts(group_id);
CREATE INDEX IF NOT EXISTS idx_posts_page_id ON posts(page_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_ratings_post_id ON post_ratings(post_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_id ON ai_chatbot_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session_id ON ai_chatbot_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================================
-- STORY REACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS story_reactions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_reactions_story_id ON story_reactions(story_id);

-- ============================================================
-- UPLOADS  (separate record for every uploaded file)
-- context_type: 'post' | 'message' | 'story' | 'avatar' | 'cover' | 'group' | 'page' | 'other'
-- ============================================================
CREATE TABLE IF NOT EXISTS uploads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploader_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  filename     TEXT NOT NULL,
  mime_type    TEXT,
  size_bytes   BIGINT,
  context_type TEXT DEFAULT 'other',
  context_id   UUID,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uploads_uploader_id   ON uploads(uploader_id);
CREATE INDEX IF NOT EXISTS idx_uploads_context_type  ON uploads(context_type);
CREATE INDEX IF NOT EXISTS idx_uploads_context_id    ON uploads(context_id);
CREATE TABLE IF NOT EXISTS saved_posts (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, post_id)); CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);
