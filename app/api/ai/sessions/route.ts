import { NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const sessionId = searchParams.get('session_id')

  if (!userId) return Response.json({ error: 'user_id is required' }, { status: 400 })

  try {
    if (sessionId) {
      const session = await queryOne('SELECT * FROM ai_chatbot_sessions WHERE id = $1', [sessionId])
      if (!session || session.user_id !== userId) return Response.json({ error: 'Session not found' }, { status: 404 })

      const messages = await query('SELECT * FROM ai_chatbot_messages WHERE session_id = $1 ORDER BY created_at ASC', [sessionId])
      return Response.json({ data: { ...session, messages } })
    }

    const sessions = await query('SELECT * FROM ai_chatbot_sessions WHERE user_id = $1 AND is_active = true ORDER BY updated_at DESC', [userId])
    return Response.json({ data: sessions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, session_title, model_used } = body

    if (!user_id) return Response.json({ error: 'user_id is required' }, { status: 400 })

    const session = await queryOne(`
      INSERT INTO ai_chatbot_sessions (user_id, session_title, model_used)
      VALUES ($1, $2, $3) RETURNING *
    `, [user_id, session_title || null, model_used || 'qwen/qwen3.5-122b-a10b'])

    return Response.json({ data: session }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, session_title, is_active } = body

    if (!session_id) return Response.json({ error: 'session_id is required' }, { status: 400 })

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (session_title !== undefined) { updates.push(`session_title = $${paramIndex++}`); values.push(session_title) }
    if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(is_active) }

    updates.push(`updated_at = NOW()`)
    values.push(session_id)

    const setClause = updates.join(', ')
    const updated = await queryOne(`UPDATE ai_chatbot_sessions SET ${setClause} WHERE id = $${paramIndex} RETURNING *`, values)

    return Response.json({ data: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) return Response.json({ error: 'session_id is required' }, { status: 400 })

  try {
    await execute('UPDATE ai_chatbot_sessions SET is_active = false, updated_at = NOW() WHERE id = $1', [sessionId])
    return Response.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
