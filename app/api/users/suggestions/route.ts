import { NextResponse, NextRequest } from 'next/server'
import { query } from '@/backend/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const viewerId = searchParams.get('viewerId')

  try {
    let users;
    if (viewerId) {
      users = await query(`
        SELECT id, full_name, username, avatar_url, followers_count, is_verified 
        FROM users 
        WHERE id != $1
          AND NOT EXISTS (
            SELECT 1 FROM blocks 
            WHERE (blocker_id = users.id AND blocked_id = $1)
               OR (blocker_id = $1 AND blocked_id = users.id)
          )
        ORDER BY followers_count DESC 
        LIMIT 8
      `, [viewerId])
    } else {
      users = await query('SELECT id, full_name, username, avatar_url, followers_count, is_verified FROM users ORDER BY followers_count DESC LIMIT 8')
    }
    return NextResponse.json(users)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
