import { NextResponse, NextRequest } from 'next/server'
import { queryOne, execute } from '@/backend/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pageId } = await params

  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Unauthorized: userId required' }, { status: 401 })

    const existing = await queryOne('SELECT * FROM page_followers WHERE page_id = $1 AND user_id = $2', [pageId, userId])

    if (existing) {
      // Unfollow
      await execute('DELETE FROM page_followers WHERE page_id = $1 AND user_id = $2', [pageId, userId])
      await execute('UPDATE pages SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = $1', [pageId])
      return NextResponse.json({ followed: false })
    } else {
      // Follow
      await queryOne('INSERT INTO page_followers (page_id, user_id) VALUES ($1, $2)', [pageId, userId])
      await execute('UPDATE pages SET followers_count = followers_count + 1 WHERE id = $1', [pageId])

      try {
        const page = await queryOne('SELECT owner_id, name FROM pages WHERE id = $1', [pageId])
        const viewer = await queryOne('SELECT full_name, avatar_url FROM users WHERE id = $1', [userId])
        
        if (page && page.owner_id !== userId) {
          await execute(
            `INSERT INTO notifications (user_id, type, message, from_user_id, is_read, created_at)
             VALUES ($1, 'follow_page', $2, $3, false, NOW())`,
            [
              page.owner_id,
              `${viewer?.full_name || 'Someone'} followed your page "${page.name}"`,
              userId,
            ]
          )
        }
      } catch (e) { console.error('Notification error', e) }

      return NextResponse.json({ followed: true })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pageId } = await params
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  try {
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const existing = await queryOne('SELECT * FROM page_followers WHERE page_id = $1 AND user_id = $2', [pageId, userId])
    return NextResponse.json({ isFollowed: !!existing })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
