import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'

export async function GET() {
  try {
    const stories = await query(`
      SELECT s.*, 
             u.full_name as user_name, u.username as user_username, u.avatar_url as user_avatar, u.is_verified as user_verified
      FROM stories s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.expires_at > NOW()
      ORDER BY s.created_at DESC
    `)

    const formattedStories = stories.map((story: any) => ({
      id: story.id,
      userId: story.user_id,
      imageUrl: story.image_url,
      timestamp: story.created_at,
      author: {
        id: story.user_id,
        name: story.user_name,
        username: story.user_username,
        avatar: story.user_avatar,
        isVerified: story.user_verified
      }
    }))

    return NextResponse.json(formattedStories)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { image_url, media_url, userId } = await req.json()
    
    if (!userId) return NextResponse.json({ error: 'Unauthorized: userId required' }, { status: 401 })
    
    const mediaToSave = image_url || media_url
    if (!mediaToSave) return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })

    const story = await queryOne(
      'INSERT INTO stories (user_id, image_url) VALUES ($1, $2) RETURNING *',
      [userId, mediaToSave]
    )

    return NextResponse.json({ id: story.id, ...story })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const userId = req.headers.get('x-user-id')

    if (!id || !userId) return NextResponse.json({ error: 'Story ID and User ID required' }, { status: 400 })

    const story = await queryOne('SELECT * FROM stories WHERE id = $1', [id])
    
    if (!story || story.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await execute('DELETE FROM stories WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
