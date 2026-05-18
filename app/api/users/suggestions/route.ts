import { NextResponse } from 'next/server'
import { query } from '@/backend/lib/db'

export async function GET() {
  try {
    const users = await query('SELECT id, full_name, username, avatar_url, followers_count, is_verified FROM users ORDER BY followers_count DESC LIMIT 8')
    return NextResponse.json(users)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
