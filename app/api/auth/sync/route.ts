import { NextResponse, NextRequest } from 'next/server'
import { queryOne } from '@/backend/lib/db'
import jwt from 'jsonwebtoken'
import { supabase } from '@/backend/lib/supabase'

const JWT_SECRET = process.env.APP_SECRET || 'interax-secret-key-123'

export async function POST(req: NextRequest) {
  try {
    const { access_token } = await req.json()

    if (!access_token) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(access_token)
    
    if (error || !user || !user.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const email = user.email

    // Verify the email domain
    if (!email.toLowerCase().endsWith('@hns-re2sd.dz')) {
      return NextResponse.json({ error: 'Only @hns-re2sd.dz school emails are allowed.' }, { status: 403 })
    }

    const full_name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0]
    let username = user.user_metadata?.preferred_username || user.user_metadata?.user_name || email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
    const avatar_url = user.user_metadata?.avatar_url || ''

    // Check if user exists in our DB
    let existing = await queryOne('SELECT * FROM users WHERE email = $1', [email])

    if (!existing) {
      // Ensure username uniqueness
      let usernameCheck = await queryOne('SELECT id FROM users WHERE username = $1', [username])
      let suffix = 1
      let finalUsername = username
      while (usernameCheck) {
        finalUsername = `${username}${suffix}`
        usernameCheck = await queryOne('SELECT id FROM users WHERE username = $1', [finalUsername])
        suffix++
      }

      // Create new user, bypass password hash as it's OAuth
      existing = await queryOne(
        `INSERT INTO users (full_name, username, email, password_hash, avatar_url, is_verified) 
         VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
        [full_name, finalUsername, email, 'oauth', avatar_url]
      )
    }

    const followersCountRes = await queryOne(`SELECT COUNT(*)::int as count FROM follows WHERE following_id = $1 AND status = 'accepted'`, [existing.id])
    const followingCountRes = await queryOne(`SELECT COUNT(*)::int as count FROM follows WHERE follower_id = $1 AND status = 'accepted'`, [existing.id])
    const postsCountRes = await queryOne(`SELECT COUNT(*)::int as count FROM posts WHERE user_id = $1`, [existing.id])
    existing.followers_count = followersCountRes?.count || 0
    existing.following_count = followingCountRes?.count || 0
    existing.posts_count = postsCountRes?.count || 0

    const token = jwt.sign({ userId: existing.id }, JWT_SECRET, { expiresIn: '7d' })

    const { password_hash, ...safeUser } = existing
    return NextResponse.json({ user: safeUser, token }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
