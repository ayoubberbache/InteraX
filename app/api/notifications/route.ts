import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const notifications = await query(`
      SELECT n.*, 
             u.full_name  as from_user_name,
             u.avatar_url as from_user_avatar
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      WHERE n.user_id = $1 AND n.created_at <= NOW()
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [userId])

    if (notifications.length === 0) {
      return NextResponse.json([])
    }

    return NextResponse.json(notifications)
  } catch (err: any) {
    console.error('[notifications GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()

    // Mark all as read for a user
    if (body.markAll && body.userId) {
      await execute('UPDATE notifications SET is_read = true WHERE user_id = $1', [body.userId])
      return NextResponse.json({ success: true })
    }

    // Mark single notification as read
    if (body.id) {
      const updated = await queryOne(
        'UPDATE notifications SET is_read = $1 WHERE id = $2 RETURNING *',
        [body.isRead ?? true, body.id]
      )
      return NextResponse.json(updated || { success: true })
    }

    return NextResponse.json({ error: 'id or markAll+userId required' }, { status: 400 })
  } catch (err: any) {
    console.error('[notifications PATCH]', err)
    return NextResponse.json({ success: true }) // fallback
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    await execute('DELETE FROM notifications WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
