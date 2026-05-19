import { NextResponse, NextRequest } from 'next/server'
import { query } from '@/backend/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pageId } = await params

  try {
    const followers = await query(`
      SELECT u.id, u.full_name as name, u.username, u.avatar_url as avatar, u.is_verified, pf.created_at
      FROM page_followers pf
      JOIN users u ON pf.user_id = u.id
      WHERE pf.page_id = $1
      ORDER BY pf.created_at DESC
    `, [pageId])

    return NextResponse.json(followers)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
