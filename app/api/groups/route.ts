import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne } from '@/backend/lib/db'

export async function GET() {
  try {
    const groups = await query(`
      SELECT g.*, 
             (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as real_members_count,
             u.full_name as user_name, u.username as user_username, u.avatar_url as user_avatar, u.is_verified as user_verified
      FROM groups g
      LEFT JOIN users u ON g.owner_id = u.id
      ORDER BY g.created_at DESC
    `)

    const formattedGroups = groups.map((g: any) => ({
      ...g,
      members_count: parseInt(g.real_members_count) || 0,
      owner: {
        id: g.owner_id,
        name: g.user_name,
        username: g.user_username,
        avatar: g.user_avatar,
        isVerified: g.user_verified
      }
    }))

    return NextResponse.json(formattedGroups)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description, avatar_url, cover_url, userId } = await req.json()
    
    if (!userId) return NextResponse.json({ error: 'Unauthorized: userId required' }, { status: 401 })
    if (!name) return NextResponse.json({ error: 'Group name is required' }, { status: 400 })

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()

    const group = await queryOne(
      `INSERT INTO groups (name, slug, description, avatar_url, cover_url, owner_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, slug, description, avatar_url, cover_url, userId]
    )

    await query(`INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)`, [group.id, userId])

    return NextResponse.json({ id: group.id, ...group })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get('id')
    const userId = req.headers.get('x-user-id') || searchParams.get('userId')

    if (!groupId) return NextResponse.json({ error: 'Group ID required' }, { status: 400 })
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const group = await queryOne('SELECT owner_id FROM groups WHERE id = $1', [groupId])
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    if (group.owner_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await queryOne('DELETE FROM groups WHERE id = $1', [groupId])
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
