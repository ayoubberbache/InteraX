import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'
import { isValidUuid } from '@/backend/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rawViewerId = searchParams.get('viewerId')
    const viewerId = isValidUuid(rawViewerId) ? rawViewerId : null

    let stories;
    if (viewerId) {
      stories = await query(`
        SELECT s.*, 
               u.full_name as user_name, u.username as user_username, u.avatar_url as user_avatar, u.is_verified as user_verified,
               EXISTS (
                 SELECT 1 FROM story_views WHERE story_id = s.id AND user_id = $1
               ) as is_viewed
        FROM stories s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.expires_at > NOW()
          AND NOT EXISTS (
            SELECT 1 FROM blocks
            WHERE (blocker_id = s.user_id AND blocked_id = $1)
               OR (blocker_id = $1 AND blocked_id = s.user_id)
          )
          AND (u.is_private = false OR s.user_id = $1 OR EXISTS (
            SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = s.user_id AND status = 'accepted'
          ))
        ORDER BY s.created_at DESC
      `, [viewerId])
    } else {
      stories = await query(`
        SELECT s.*, 
               u.full_name as user_name, u.username as user_username, u.avatar_url as user_avatar, u.is_verified as user_verified,
               false as is_viewed
        FROM stories s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.expires_at > NOW()
          AND u.is_private = false
        ORDER BY s.created_at DESC
      `)
    }

    const formattedStories = stories.map((story: any) => ({
      id: story.id,
      userId: story.user_id,
      imageUrl: story.image_url,
      timestamp: story.created_at,
      isViewed: story.is_viewed || false,
      author: {
        id: story.user_id,
        name: story.user_name,
        username: story.user_username,
        avatar: story.user_avatar,
        isVerified: story.user_verified
      }
    }))

    return NextResponse.json(formattedStories)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { image_url, media_url, userId } = await req.json()
    
    if (!userId) return NextResponse.json({ error: 'Unauthorized: userId required' }, { status: 401 })
    
    const mediaToSave = image_url || media_url
    if (!mediaToSave) return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })

    const story = await queryOne(
      'INSERT INTO stories (user_id, image_url) VALUES ($1, $2) RETURNING *',
      [userId, mediaToSave]
    )

    // Notify followers
    try {
      const followers = await query('SELECT follower_id FROM follows WHERE following_id = $1', [userId])
      if (followers && followers.length > 0) {
        const creator = await queryOne('SELECT full_name, avatar_url FROM users WHERE id = $1', [userId])
        for (const f of followers) {
          await execute(
            `INSERT INTO notifications (user_id, type, target_id, target_type, message, from_user_id, is_read, created_at)
             VALUES ($1, 'story', $2, 'story', $3, $4, false, NOW())`,
            [
              f.follower_id,
              story.id,
              `${creator?.full_name || 'Someone'} posted a new story`,
              userId,
            ]
          )
        }
      }
    } catch (err) {
      console.error('Failed to send story notifications', err)
    }

    return NextResponse.json({ id: story.id, ...story })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const userId = req.headers.get('x-user-id')

    if (!id || !userId) return NextResponse.json({ error: 'Story ID and User ID required' }, { status: 400 })

    const story = await queryOne('SELECT * FROM stories WHERE id = $1', [id])
    
    if (!story || story.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await execute('DELETE FROM stories WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
