import { NextResponse, NextRequest } from 'next/server'
import { queryOne } from '@/backend/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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

    const hash = await bcrypt.hash(password, 10)

    const user = await queryOne(
      `INSERT INTO users (full_name, username, email, password_hash) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [full_name, username, email, hash]
    )

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    const { password_hash, ...safeUser } = user
    return NextResponse.json({ user: safeUser, token }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
