import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne } from '@/backend/lib/db'

export async function GET() {
  try {
    const pages = await query(`
      SELECT p.*, 
             (SELECT COUNT(*) FROM page_followers pf WHERE pf.page_id = p.id) as real_followers_count,
             u.full_name as user_name, u.username as user_username, u.avatar_url as user_avatar, u.is_verified as user_verified
      FROM pages p
      LEFT JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `)

    const formattedPages = pages.map((p: any) => ({
      ...p,
      followers_count: parseInt(p.real_followers_count) || 0,
      owner: {
        id: p.owner_id,
        name: p.user_name,
        username: p.user_username,
        avatar: p.user_avatar,
        isVerified: p.user_verified
      }
    }))

    return NextResponse.json(formattedPages)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, handle, description, avatar_url, cover_url, category, userId } = await req.json()
    
    if (!userId) return NextResponse.json({ error: 'Unauthorized: userId required' }, { status: 401 })
    if (!name || !handle) return NextResponse.json({ error: 'Name and handle are required' }, { status: 400 })

    const page = await queryOne(
      `INSERT INTO pages (name, handle, description, category, avatar_url, cover_url, owner_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, handle.toLowerCase(), description, category || null, avatar_url, cover_url, userId]
    )

    return NextResponse.json({ id: page.id, followers_count: 0, ...page })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pageId = searchParams.get('id')
    const userId = req.headers.get('x-user-id') || searchParams.get('userId')

    if (!pageId) return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const page = await queryOne('SELECT owner_id FROM pages WHERE id = $1', [pageId])
    if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    if (page.owner_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await queryOne('DELETE FROM pages WHERE id = $1', [pageId])
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
