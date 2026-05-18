import { NextResponse, NextRequest } from 'next/server'
import { queryOne, execute, query } from '@/backend/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { storyId, userId, emoji } = await req.json()
    
    if (!userId) return NextResponse.json({ error: 'Unauthorized: userId required' }, { status: 401 })
    if (!storyId || !emoji) return NextResponse.json({ error: 'storyId and emoji required' }, { status: 400 })

    const reaction = await queryOne(
      'INSERT INTO story_reactions (story_id, user_id, emoji) VALUES ($1, $2, $3) RETURNING *',
      [storyId, userId, emoji]
    )

    // Add Notification
    try {
      const story = await queryOne('SELECT user_id FROM stories WHERE id = $1', [storyId])
      if (story && story.user_id !== userId) {
        const viewer = await queryOne('SELECT full_name, avatar_url FROM users WHERE id = $1', [userId])
        await execute(
          `INSERT INTO notifications (user_id, type, target_id, target_type, message, from_user_id, from_user_name, from_user_avatar, is_read, created_at)
           VALUES ($1, 'story_reaction', $2, 'story', $3, $4, $5, $6, false, NOW())`,
          [
            story.user_id,
            storyId,
            `${viewer?.full_name || 'Someone'} reacted to your story with ${emoji}`,
            userId,
            viewer?.full_name || null,
            viewer?.avatar_url || null,
          ]
        )
      }
    } catch (err) {
      console.error('Failed to send story reaction notification', err)
    }

    return NextResponse.json({ success: true, reaction })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const storyId = req.nextUrl.searchParams.get('storyId')
    if (!storyId) return NextResponse.json({ error: 'storyId required' }, { status: 400 })

    const reactions = await query(
      'SELECT emoji, user_id FROM story_reactions WHERE story_id = $1 ORDER BY created_at ASC',
      [storyId]
    )
    return NextResponse.json(reactions.map((r: any) => ({ emoji: r.emoji, userId: r.user_id })))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
