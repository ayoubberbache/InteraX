import { NextResponse, NextRequest } from 'next/server'
import { queryOne } from '@/backend/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.APP_SECRET || 'interax-secret-key-123'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await queryOne('SELECT * FROM users WHERE email = $1', [email])
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const followersCountRes = await queryOne(`SELECT COUNT(*)::int as count FROM follows WHERE following_id = $1 AND status = 'accepted'`, [user.id])
    const followingCountRes = await queryOne(`SELECT COUNT(*)::int as count FROM follows WHERE follower_id = $1 AND status = 'accepted'`, [user.id])
    const postsCountRes = await queryOne(`SELECT COUNT(*)::int as count FROM posts WHERE user_id = $1`, [user.id])
    user.followers_count = followersCountRes?.count || 0
    user.following_count = followingCountRes?.count || 0
    user.posts_count = postsCountRes?.count || 0

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    const { password_hash, ...safeUser } = user
    return NextResponse.json({ user: safeUser, token })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
