import { NextResponse, NextRequest } from 'next/server'
import { queryOne } from '@/backend/lib/db'
import jwt from 'jsonwebtoken'
import { supabase } from '@/backend/lib/supabase'

const JWT_SECRET = process.env.APP_SECRET || 'interax-secret-key-123'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError || !authData.session) {
      return NextResponse.json({ error: authError?.message || 'Invalid credentials' }, { status: 401 })
    }

    // Now find or sync the user in our postgres DB
    let user = await queryOne('SELECT * FROM users WHERE email = $1', [email.trim()])
    if (!user) {
      // If user exists in Supabase but not in our custom postgres users table, we sync them
      const full_name = authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || email.split('@')[0]
      const username = authData.user.user_metadata?.preferred_username || authData.user.user_metadata?.user_name || email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
      const avatar_url = authData.user.user_metadata?.avatar_url || ''
      user = await queryOne(
        `INSERT INTO users (full_name, username, email, password_hash, avatar_url, is_verified) 
         VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
        [full_name, username, email.trim(), 'supabase_auth', avatar_url]
      )
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

