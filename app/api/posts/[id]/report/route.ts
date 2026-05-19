import { NextResponse, NextRequest } from 'next/server'
import { execute } from '@/backend/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params

  try {
    const { userId, reason, details } = await req.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: userId is required' }, { status: 401 })
    }
    if (!reason) {
      return NextResponse.json({ error: 'Bad Request: reason is required' }, { status: 400 })
    }

    await execute(
      `INSERT INTO reports (reporter_id, entity_type, entity_id, reason, details, status, created_at)
       VALUES ($1, 'post', $2, $3, $4, 'pending', NOW())`,
      [userId, postId, reason, details || null]
    )

    return NextResponse.json({ success: true, message: 'Post reported successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
