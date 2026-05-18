import { NextResponse, NextRequest } from 'next/server'
import { queryOne, execute } from '@/backend/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params

  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if already saved
    const existing = await queryOne('SELECT * FROM saved_posts WHERE user_id = $1 AND post_id = $2', [userId, postId])

    if (existing) {
      await execute('DELETE FROM saved_posts WHERE user_id = $1 AND post_id = $2', [userId, postId])
      return NextResponse.json({ saved: false })
    } else {
      await execute('INSERT INTO saved_posts (user_id, post_id) VALUES ($1, $2)', [userId, postId])
      return NextResponse.json({ saved: true })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
