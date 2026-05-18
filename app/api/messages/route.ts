import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get('conversationId')
  if (!conversationId) return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })

  try {
    const messages = await query(`
      SELECT * FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `, [conversationId])

    const msgIds = messages.map(m => m.id)
    let reactions: any[] = []
    
    if (msgIds.length > 0) {
      reactions = await query(`
        SELECT * FROM message_reactions
        WHERE message_id = ANY($1::uuid[])
      `, [msgIds])
    }

    const formattedMessages = messages.map(msg => ({
      ...msg,
      message_reactions: reactions.filter(r => r.message_id === msg.id)
    }))

    return NextResponse.json(formattedMessages)
  } catch (error: any) {
    console.error('[messages GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { conversationId, text, userId, media_url, type = 'text' } = body

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const msg = await queryOne(`
      INSERT INTO messages (conversation_id, sender_id, content, media_url, type)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [conversationId, userId, text?.trim() || '', media_url || null, type])

    try {
      const lastMsgText = text?.trim() || (type === 'image' ? 'Sent a photo' : type === 'audio' ? 'Sent a voice message' : 'Sent a file')
      await execute(`
        UPDATE conversations SET last_message = $1, last_message_time = $2 WHERE id = $3
      `, [lastMsgText, msg.created_at, conversationId])
    } catch (updateError) {
      console.error('[messages POST] conversation update error:', updateError)
    }

    return NextResponse.json(msg)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, text, userId } = await req.json()
    if (!id || !userId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

    const msg = await queryOne('SELECT * FROM messages WHERE id = $1', [id])
    if (!msg || msg.sender_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const updated = await queryOne(`
      UPDATE messages SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *
    `, [text.trim(), id])
    
    return NextResponse.json(updated)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const userId = req.headers.get('x-user-id')
    
    if (!id || !userId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

    const msg = await queryOne('SELECT * FROM messages WHERE id = $1', [id])
    if (!msg || msg.sender_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await execute('DELETE FROM messages WHERE id = $1', [id])
    
    const lastMsg = await queryOne('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1', [msg.conversation_id])
    if (lastMsg) {
      const text = lastMsg.content?.trim() || (lastMsg.type === 'image' ? 'Sent a photo' : lastMsg.type === 'audio' ? 'Sent a voice message' : 'Sent a file')
      await execute('UPDATE conversations SET last_message = $1, last_message_time = $2 WHERE id = $3', [text, lastMsg.created_at, msg.conversation_id])
    } else {
      await execute('UPDATE conversations SET last_message = null, last_message_time = null WHERE id = $1', [msg.conversation_id])
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
