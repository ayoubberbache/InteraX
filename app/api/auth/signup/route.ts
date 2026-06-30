import { NextResponse, NextRequest } from 'next/server'
import { queryOne } from '@/backend/lib/db'
import jwt from 'jsonwebtoken'
import { supabase } from '@/backend/lib/supabase'

const JWT_SECRET = process.env.APP_SECRET || 'interax-secret-key-123'

export async function POST(req: NextRequest) {
  try {
    const { full_name, username, email, password } = await req.json()

    if (!full_name || !username || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (!email.toLowerCase().endsWith('@hns-re2sd.dz')) {
      return NextResponse.json({ error: 'Only @hns-re2sd.dz school emails are allowed.' }, { status: 400 })
    }

    // Check if user exists
    const existing = await queryOne('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username])
    if (existing) {
      return NextResponse.json({ error: 'Email or username already in use' }, { status: 409 })
    }

    // Register user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name,
          username: username.toLowerCase()
        }
      }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const user = await queryOne(
      `INSERT INTO users (full_name, username, email, password_hash, is_verified) 
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [full_name, username, email, 'supabase_auth']
    )

    user.followers_count = 0
    user.following_count = 0
    user.posts_count = 0

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    const { password_hash, ...safeUser } = user
    return NextResponse.json({ user: safeUser, token }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

