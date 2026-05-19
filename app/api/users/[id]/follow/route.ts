import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/backend/lib/db'

// POST /api/users/[id]/follow — toggle follow/unfollow
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params
  try {
    const { viewerId } = await req.json()
    if (!viewerId) return NextResponse.json({ error: 'viewerId required' }, { status: 400 })
    if (viewerId === targetId) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

    const existing = await queryOne(
      'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
      [viewerId, targetId]
    )

    if (existing) {
      // Unfollow
      await execute('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [viewerId, targetId])
      if (existing.status === 'accepted') {
        await execute('UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = $1', [targetId])
        await execute('UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = $1', [viewerId])
      }
      return NextResponse.json({ isFollowing: false, status: 'none' })
    } else {
      // Follow
      const targetUser = await queryOne('SELECT is_private FROM users WHERE id = $1', [targetId])
      const isPrivate = targetUser?.is_private || false
      const status = isPrivate ? 'pending' : 'accepted'

      await execute(
        'INSERT INTO follows (follower_id, following_id, status) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [viewerId, targetId, status]
      )

      if (status === 'accepted') {
        await execute('UPDATE users SET followers_count = followers_count + 1 WHERE id = $1', [targetId])
        await execute('UPDATE users SET following_count = following_count + 1 WHERE id = $1', [viewerId])
      }

      // Create a notification for the target user
      try {
        const viewer = await queryOne('SELECT full_name, avatar_url FROM users WHERE id = $1', [viewerId])
        const notifType = status === 'pending' ? 'follow_request' : 'follow'
        const notifMsg = status === 'pending'
          ? `${viewer?.full_name || 'Someone'} requested to follow you`
          : `${viewer?.full_name || 'Someone'} started following you`

        await execute(
          `INSERT INTO notifications (user_id, type, message, from_user_id, is_read, created_at)
           VALUES ($1, $2, $3, $4, false, NOW())
           ON CONFLICT DO NOTHING`,
          [
            targetId,
            notifType,
            notifMsg,
            viewerId,
          ]
        )
      } catch { /* notification is non-critical */ }

      return NextResponse.json({ isFollowing: status === 'accepted', status })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/users/[id]/follow?viewerId=xxx — check follow status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params
  const viewerId = req.nextUrl.searchParams.get('viewerId')

  if (!viewerId) return NextResponse.json({ isFollowing: false, status: 'none' })

  try {
    const existing = await queryOne(
      'SELECT status FROM follows WHERE follower_id = $1 AND following_id = $2',
      [viewerId, targetId]
    )
    return NextResponse.json({ 
      isFollowing: existing ? existing.status === 'accepted' : false, 
      status: existing ? existing.status : 'none' 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
