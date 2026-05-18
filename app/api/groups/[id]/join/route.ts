import { NextResponse, NextRequest } from 'next/server'
import { queryOne, execute } from '@/backend/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params

  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Unauthorized: userId required' }, { status: 401 })

    const existing = await queryOne('SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId])

    if (existing) {
      // Leave group
      await execute('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId])
      await execute('UPDATE groups SET members_count = GREATEST(members_count - 1, 0) WHERE id = $1', [groupId])
      return NextResponse.json({ joined: false })
    } else {
      // Join group
      await queryOne('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [groupId, userId])
      await execute('UPDATE groups SET members_count = members_count + 1 WHERE id = $1', [groupId])

      try {
        const group = await queryOne('SELECT owner_id, name FROM groups WHERE id = $1', [groupId])
        const viewer = await queryOne('SELECT full_name, avatar_url FROM users WHERE id = $1', [userId])
        
        if (group && group.owner_id !== userId) {
          await execute(
            `INSERT INTO notifications (user_id, type, message, from_user_id, from_user_name, from_user_avatar, is_read, created_at)
             VALUES ($1, 'join_group', $2, $3, $4, $5, false, NOW())`,
            [
              group.owner_id,
              `${viewer?.full_name || 'Someone'} joined your group "${group.name}"`,
              userId,
              viewer?.full_name || null,
              viewer?.avatar_url || null,
            ]
          )
        }
      } catch (e) { console.error('Notification error', e) }

      return NextResponse.json({ joined: true })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  try {
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const existing = await queryOne('SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId])
    return NextResponse.json({ isJoined: !!existing })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
