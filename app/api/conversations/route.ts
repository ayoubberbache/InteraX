import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  try {
    const conversations = await query(`
      SELECT * FROM conversations
      WHERE $1 = ANY(participant_ids)
      ORDER BY last_message_time DESC
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
