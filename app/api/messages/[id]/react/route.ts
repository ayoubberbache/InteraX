import { NextResponse, NextRequest } from 'next/server'
import { queryOne, execute } from '@/backend/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params
    const { emoji, userId } = await req.json()
    
    if (!emoji || !userId) return NextResponse.json({ error: 'Missing args' }, { status: 400 })

    const existing = await queryOne('SELECT * FROM message_reactions WHERE message_id = $1 AND user_id = $2', [messageId, userId])

    if (existing) {
      if (existing.emoji === emoji) {
        await execute('DELETE FROM message_reactions WHERE id = $1', [existing.id])
        return NextResponse.json({ success: true, action: 'removed' })
      } else {
        await execute('UPDATE message_reactions SET emoji = $1 WHERE id = $2', [emoji, existing.id])
        return NextResponse.json({ success: true, action: 'updated', emoji })
      }
    } else {
      await execute('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)', [messageId, userId, emoji])
      return NextResponse.json({ success: true, action: 'added', emoji })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
