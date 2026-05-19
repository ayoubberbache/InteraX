import { NextResponse } from 'next/server'
import { execute } from '@/backend/lib/db'

export async function GET() {
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS saved_posts (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, post_id)
      )
    `)
    await execute(`CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id)`)
    await execute(`CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON saved_posts(post_id)`)

    await execute(`
      CREATE TABLE IF NOT EXISTS uploads (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        uploader_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url          TEXT NOT NULL,
        filename     TEXT NOT NULL,
        mime_type    TEXT,
        size_bytes   BIGINT,
        context_type TEXT DEFAULT 'other',
        context_id   UUID,
        created_at   TIMESTAMPTZ DEFAULT now()
      )
    `)
    await execute(`CREATE INDEX IF NOT EXISTS idx_uploads_uploader_id ON uploads(uploader_id)`)
    await execute(`CREATE INDEX IF NOT EXISTS idx_uploads_context_type ON uploads(context_type)`)
    await execute(`CREATE INDEX IF NOT EXISTS idx_uploads_context_id ON uploads(context_id)`)

    await execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        entity_id   UUID NOT NULL,
        reason      TEXT NOT NULL,
        details     TEXT,
        status      TEXT DEFAULT 'pending',
        created_at  TIMESTAMPTZ DEFAULT now()
      )
    `)
    await execute(`CREATE INDEX IF NOT EXISTS idx_reports_entity_id ON reports(entity_id)`)

    await execute(`
      CREATE TABLE IF NOT EXISTS story_views (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(story_id, user_id)
      )
    `)
    await execute(`CREATE INDEX IF NOT EXISTS idx_story_views_user_id ON story_views(user_id)`)

    await execute(`
      CREATE TABLE IF NOT EXISTS blocks (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(blocker_id, blocked_id)
      )
    `)
    await execute(`CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id)`)
    await execute(`CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id)`)

    try {
      await execute(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL`)
      await execute(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false`)
    } catch (e) { /* column may exist */ }

    return NextResponse.json({ success: true, message: 'All tables and columns migrated successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
