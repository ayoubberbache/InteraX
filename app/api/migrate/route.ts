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

    return NextResponse.json({ success: true, message: 'saved_posts and uploads tables created successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
