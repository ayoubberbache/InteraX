import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'
import { isValidUuid } from '@/backend/lib/utils'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId || !isValidUuid(userId)) {
    return NextResponse.json([])
  }

  try {
    const conversations = await query(`
      SELECT c.* FROM conversations c
      WHERE $1 = ANY(c.participant_ids)
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id = $1 AND b.blocked_id = ANY(c.participant_ids))
             OR (b.blocked_id = $1 AND b.blocker_id = ANY(c.participant_ids))
        )
      ORDER BY c.last_message_time DESC
    `, [userId])

    return NextResponse.json(conversations)
  } catch (error: any) {
    console.error('[conversations GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { targetUserId, userId, participantIds, groupName, groupAvatar } = body

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Group chat creation ───────────────────────────────────────────────
    if (groupName && Array.isArray(participantIds) && participantIds.length >= 2) {
      const allIds = [...new Set([userId, ...participantIds])]
      const newGroup = await queryOne(`
        INSERT INTO conversations (participant_ids, is_group, group_name, group_avatar, last_message_time)
        VALUES ($1::uuid[], true, $2, $3, NOW()) RETURNING *
      `, [allIds, groupName, groupAvatar || null])
      return NextResponse.json(newGroup)
    }

    // ── 1-on-1 conversation ───────────────────────────────────────────────
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })

    const existing = await queryOne(`
      SELECT * FROM conversations
      WHERE participant_ids @> ARRAY[$1, $2]::uuid[] AND participant_ids <@ ARRAY[$1, $2]::uuid[]
        AND (is_group IS NULL OR is_group = false)
    `, [userId, targetUserId])

    if (existing) return NextResponse.json(existing)

    const newConv = await queryOne(`
      INSERT INTO conversations (participant_ids) VALUES (ARRAY[$1, $2]::uuid[]) RETURNING *
    `, [userId, targetUserId])

    return NextResponse.json(newConv)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const userId = req.headers.get('x-user-id')

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const conv = await queryOne('SELECT * FROM conversations WHERE id = $1', [id])

    if (!conv || !conv.participant_ids.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Delete reactions on all messages in this conversation (FK: message_reactions → messages)
    await execute(`
      DELETE FROM message_reactions
      WHERE message_id IN (
        SELECT id FROM messages WHERE conversation_id = $1
      )
    `, [id])

    // 2. Delete the messages themselves (FK: messages → conversations)
    await execute('DELETE FROM messages WHERE conversation_id = $1', [id])

    // 3. Finally delete the conversation
    await execute('DELETE FROM conversations WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[conversations DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, groupAvatar, groupName } = body

    if (!id || !isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (groupAvatar !== undefined) {
      updates.push(`group_avatar = $${paramIndex++}`)
      values.push(groupAvatar)
    }

    if (groupName !== undefined) {
      updates.push(`group_name = $${paramIndex++}`)
      values.push(groupName)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(id)
    const updated = await queryOne(`
      UPDATE conversations
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values)

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[conversations PATCH]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
