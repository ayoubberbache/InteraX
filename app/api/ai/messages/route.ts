import { NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) return Response.json({ error: 'session_id is required' }, { status: 400 })

  try {
    const messages = await query('SELECT * FROM ai_chatbot_messages WHERE session_id = $1 ORDER BY created_at ASC', [sessionId])
    return Response.json({ data: messages })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, role, content, token_count } = body

    if (!session_id || !role || !content) {
      return Response.json({ error: 'session_id, role, and content are required' }, { status: 400 })
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return Response.json({ error: 'role must be user, assistant, or system' }, { status: 400 })
    }

    const msg = await queryOne(`
      INSERT INTO ai_chatbot_messages (session_id, role, content, token_count)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [session_id, role, content, token_count || null])

    try {
      await execute('UPDATE ai_chatbot_sessions SET total_messages = total_messages + 1, updated_at = NOW() WHERE id = $1', [session_id])
    } catch (e: any) {
      console.warn('Failed to update session counter', e.message)
    }

    return Response.json({ data: msg }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
