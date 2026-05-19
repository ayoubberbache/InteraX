import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/backend/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const type = searchParams.get('type') // 'followers' | 'following'

  if (!userId || !type) {
    return NextResponse.json({ error: 'Missing userId or type parameter' }, { status: 400 })
  }

  try {
    let users = []
    if (type === 'followers') {
      users = await query(
        `SELECT u.id, u.full_name, u.username, u.avatar_url, u.is_verified, u.bio
         FROM follows f
         JOIN users u ON f.follower_id = u.id
         WHERE f.following_id = $1 AND f.status = 'accepted'
           AND NOT EXISTS (
             SELECT 1 FROM blocks b
             WHERE (b.blocker_id = f.follower_id AND b.blocked_id = f.following_id)
                OR (b.blocker_id = f.following_id AND b.blocked_id = f.follower_id)
           )
         ORDER BY f.created_at DESC`,
        [userId]
      )
    } else if (type === 'following') {
      users = await query(
        `SELECT u.id, u.full_name, u.username, u.avatar_url, u.is_verified, u.bio
         FROM follows f
         JOIN users u ON f.following_id = u.id
         WHERE f.follower_id = $1 AND f.status = 'accepted'
           AND NOT EXISTS (
             SELECT 1 FROM blocks b
             WHERE (b.blocker_id = f.follower_id AND b.blocked_id = f.following_id)
                OR (b.blocker_id = f.following_id AND b.blocked_id = f.follower_id)
           )
         ORDER BY f.created_at DESC`,
        [userId]
      )
    } else {
      return NextResponse.json({ error: 'Invalid relation type' }, { status: 400 })
    }

    return NextResponse.json({ data: users })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
