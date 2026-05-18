import { NextResponse, NextRequest } from 'next/server'
import { query } from '@/backend/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params

  try {
    const members = await query(`
      SELECT u.id, u.full_name as name, u.username, u.avatar_url as avatar, u.is_verified, gm.joined_at
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY gm.joined_at DESC
    `, [groupId])

    return NextResponse.json(members)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
