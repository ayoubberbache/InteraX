import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'
import { isValidUuid } from '@/backend/lib/utils'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId || !isValidUuid(userId)) {
    return NextResponse.json({ success: true, data: [] })
  }

  try {
    const list = await query(`
      SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified
      FROM blocks b
      JOIN users u ON b.blocked_id = u.id
      WHERE b.blocker_id = $1
      ORDER BY b.created_at DESC
    `, [userId])

    return NextResponse.json({ success: true, data: list })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { blockerId, blockedId } = await req.json()
    if (!blockerId || !blockedId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    if (blockerId === blockedId) return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })

    // Insert block
    await execute(`
      INSERT INTO blocks (blocker_id, blocked_id)
      VALUES ($1, $2)
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING
    `, [blockerId, blockedId])

    // Clean up follow relations
    await execute(`
      DELETE FROM follows
      WHERE (follower_id = $1 AND following_id = $2)
         OR (follower_id = $2 AND following_id = $1)
    `, [blockerId, blockedId])

    return NextResponse.json({ success: true, message: 'User blocked successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const blockerId = req.nextUrl.searchParams.get('blockerId')
  const blockedId = req.nextUrl.searchParams.get('blockedId')

  if (!blockerId || !blockedId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

  try {
    await execute(`
      DELETE FROM blocks
      WHERE blocker_id = $1 AND blocked_id = $2
    `, [blockerId, blockedId])

    return NextResponse.json({ success: true, message: 'User unblocked successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
