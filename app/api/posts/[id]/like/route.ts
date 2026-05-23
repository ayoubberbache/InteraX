import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params

  try {
    const list = await query(`
      SELECT u.id, u.full_name as name, u.username, u.avatar_url as avatar, u.is_verified, pl.emoji
      FROM post_likes pl
      JOIN users u ON pl.user_id = u.id
      WHERE pl.post_id = $1
      ORDER BY pl.id DESC
    `, [postId])

    return NextResponse.json(list)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params

  try {
    const { userId, emoji } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Unauthorized: userId required' }, { status: 401 })

    const ALLOWED_EMOJIS = ['❤️', '👍', '👎', '👏', '😂', '🤔']
    if (emoji && !ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 })
    }

    const existing = await queryOne('SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId])

    if (existing) {
      if (emoji && existing.emoji !== emoji) {
        await execute('UPDATE post_likes SET emoji = $1 WHERE id = $2', [emoji, existing.id])
        return NextResponse.json({ liked: true, emoji })
      }
      await execute('DELETE FROM post_likes WHERE id = $1', [existing.id])
      await execute('UPDATE posts SET likes_count = likes_count - 1 WHERE id = $1', [postId])
      return NextResponse.json({ liked: false })
    } else {
      await queryOne('INSERT INTO post_likes (post_id, user_id, emoji) VALUES ($1, $2, $3)', [postId, userId, emoji || null])
      await execute('UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1', [postId])

      // Add Notification
      try {
        const post = await queryOne('SELECT user_id FROM posts WHERE id = $1', [postId])
        if (post && post.user_id !== userId) {
          const viewer = await queryOne('SELECT full_name, avatar_url FROM users WHERE id = $1', [userId])
          await execute(
            `INSERT INTO notifications (user_id, type, target_id, target_type, message, from_user_id, is_read, created_at)
             VALUES ($1, 'like', $2, 'post', $3, $4, false, NOW())`,
            [
              post.user_id,
              postId,
              `${viewer?.full_name || 'Someone'} liked your post`,
              userId,
            ]
          )
        }
      } catch (err) {
        console.error('Failed to send like notification', err)
      }

      return NextResponse.json({ liked: true, emoji })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
