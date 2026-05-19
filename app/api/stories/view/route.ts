import { NextResponse, NextRequest } from 'next/server'
import { execute } from '@/backend/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { userId, storyId } = await req.json()
    if (!userId || !storyId) {
      return NextResponse.json({ error: 'userId and storyId are required' }, { status: 400 })
    }

    await execute(`
      INSERT INTO story_views (story_id, user_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (story_id, user_id) DO NOTHING
    `, [storyId, userId])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
