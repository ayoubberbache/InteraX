import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params

  try {
    const { content, userId } = await req.json()
    
    if (!userId) return NextResponse.json({ error: 'Unauthorized: userId required' }, { status: 401 })
    if (!content) return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })

    const comment = await queryOne(
      'INSERT INTO post_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, userId, content]
    )
    
    await execute('UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1', [postId])

    const user = await queryOne('SELECT id, full_name as name, username, avatar_url as avatar, is_verified as "isVerified" FROM users WHERE id = $1', [userId])

    // Add Notification
    try {
      const post = await queryOne('SELECT user_id FROM posts WHERE id = $1', [postId])
      if (post && post.user_id !== userId) {
        await execute(
          `INSERT INTO notifications (user_id, type, target_id, target_type, message, from_user_id, is_read, created_at)
           VALUES ($1, 'comment', $2, 'post', $3, $4, false, NOW())`,
          [
            post.user_id,
            postId,
            `${user?.name || 'Someone'} commented on your post`,
            userId,
          ]
        )
      }
    } catch (err) {
      console.error('Failed to send comment notification', err)
    }

    return NextResponse.json({ id: comment.id, ...comment, user })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params

  try {
    const comments = await query(`
      SELECT c.*, 
             u.full_name as user_name, u.username as user_username, u.avatar_url as user_avatar, u.is_verified as user_verified
      FROM post_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `, [postId])

    const formattedComments = comments.map((c: any) => ({
      ...c,
      user: {
        id: c.user_id,
        name: c.user_name,
        username: c.user_username,
        avatar: c.user_avatar,
        isVerified: c.user_verified
      }
    }))

    return NextResponse.json(formattedComments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
