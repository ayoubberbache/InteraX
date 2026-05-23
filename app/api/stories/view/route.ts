import { NextResponse, NextRequest } from 'next/server'
import { execute, query } from '@/backend/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const storyId = searchParams.get('storyId')
    if (!storyId) {
      return NextResponse.json({ error: 'storyId is required' }, { status: 400 })
    }

    const viewers = await query(`
      SELECT sv.user_id, u.full_name as name, u.username, u.avatar_url as avatar, sv.created_at
      FROM story_views sv
      JOIN users u ON sv.user_id = u.id
      WHERE sv.story_id = $1
      ORDER BY sv.created_at DESC
    `, [storyId])

    return NextResponse.json(viewers)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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
