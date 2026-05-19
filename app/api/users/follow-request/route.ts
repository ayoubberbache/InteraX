import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/backend/lib/db'

// POST /api/users/follow-request
// Body: { fromUserId: string, action: 'accept' | 'reject', toUserId: string }
export async function POST(req: NextRequest) {
  try {
    const { fromUserId, action, toUserId } = await req.json()
    if (!fromUserId || !action || !toUserId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    if (action === 'accept') {
      // 1. Update the follows table
      const res = await execute(
        `UPDATE follows 
         SET status = 'accepted' 
         WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'`,
        [fromUserId, toUserId]
      )
      
      // If no row was updated, the follow request didn't exist or was already accepted
      if (res.rowCount === 0) {
        return NextResponse.json({ error: 'Follow request not found or already accepted' }, { status: 404 })
      }

      // 2. Increment followers_count and following_count
      await execute('UPDATE users SET followers_count = followers_count + 1 WHERE id = $1', [toUserId])
      await execute('UPDATE users SET following_count = following_count + 1 WHERE id = $1', [fromUserId])

      // 3. Delete the pending notification
      await execute(
        `DELETE FROM notifications 
         WHERE user_id = $1 AND from_user_id = $2 AND type = 'follow_request'`,
        [toUserId, fromUserId]
      )

      // 4. Create an 'accept_follow' notification for the requester
      try {
        const approver = await queryOne('SELECT full_name FROM users WHERE id = $1', [toUserId])
        await execute(
          `INSERT INTO notifications (user_id, type, message, from_user_id, is_read, created_at)
           VALUES ($1, 'follow', $2, $3, false, NOW())`,
          [
            fromUserId,
            `${approver?.full_name || 'Someone'} accepted your follow request`,
            toUserId,
          ]
        )
      } catch { /* ignored */ }

      return NextResponse.json({ success: true, action: 'accepted' })
    } else if (action === 'reject') {
      // 1. Delete follow request
      await execute(
        `DELETE FROM follows 
         WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'`,
        [fromUserId, toUserId]
      )

      // 2. Delete notification
      await execute(
        `DELETE FROM notifications 
         WHERE user_id = $1 AND from_user_id = $2 AND type = 'follow_request'`,
        [toUserId, fromUserId]
      )

      return NextResponse.json({ success: true, action: 'rejected' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
