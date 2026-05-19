import { NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'
import { isValidUuid } from '@/backend/lib/utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawUserId = searchParams.get('id')
  const username = searchParams.get('username')
  const queryStr = searchParams.get('q')
  const rawViewerId = searchParams.get('viewerId')

  const userId = isValidUuid(rawUserId) ? rawUserId : null
  const viewerId = isValidUuid(rawViewerId) ? rawViewerId : null

  try {
    if (userId) {
      if (viewerId) {
        const blocked = await queryOne(`
          SELECT 1 FROM blocks 
          WHERE (blocker_id = $1 AND blocked_id = $2)
             OR (blocker_id = $2 AND blocked_id = $1)
        `, [userId, viewerId])
        if (blocked) return Response.json({ error: 'User not found' }, { status: 404 })
      }

      const user = await queryOne('SELECT * FROM users WHERE id = $1', [userId])
      if (!user) return Response.json({ error: 'User not found' }, { status: 404 })
      const { password_hash, ...safe } = user
      return Response.json({ data: safe })
    }

    if (username) {
      const user = await queryOne('SELECT * FROM users WHERE username = $1', [username.toLowerCase()])
      if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

      if (viewerId) {
        const blocked = await queryOne(`
          SELECT 1 FROM blocks 
          WHERE (blocker_id = $1 AND blocked_id = $2)
             OR (blocker_id = $2 AND blocked_id = $1)
        `, [user.id, viewerId])
        if (blocked) return Response.json({ error: 'User not found' }, { status: 404 })
      }

      const { password_hash, ...safe } = user
      return Response.json({ data: safe })
    }

    if (queryStr) {
      let users;
      if (viewerId) {
        users = await query(
          `SELECT u.* FROM users u
           WHERE (u.username ILIKE $1 OR u.full_name ILIKE $1 OR u.email ILIKE $1)
             AND NOT EXISTS (
               SELECT 1 FROM blocks 
               WHERE (blocker_id = u.id AND blocked_id = $2)
                  OR (blocker_id = $2 AND blocked_id = u.id)
             )
           ORDER BY u.followers_count DESC
           LIMIT 20`,
          [`%${queryStr}%`, viewerId]
        )
      } else {
        users = await query(
          `SELECT * FROM users 
           WHERE username ILIKE $1 OR full_name ILIKE $1 OR email ILIKE $1
           ORDER BY followers_count DESC
           LIMIT 20`,
          [`%${queryStr}%`]
        )
      }
      const safeUsers = users.map(u => {
        const { password_hash, ...safe } = u
        return safe
      })
      return Response.json({ data: safeUsers })
    }

    return Response.json({ error: 'Provide id, username, or q parameter' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, full_name, bio, avatar_url, cover_url, ai_persona, username, is_private } = body

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    if (username !== undefined) {
      const existing = await queryOne('SELECT id FROM users WHERE username = $1 AND id != $2', [username.toLowerCase(), id])
      if (existing) {
        return Response.json({ error: 'Username is already taken' }, { status: 409 })
      }
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (full_name !== undefined) { updates.push(`full_name = $${paramIndex++}`); values.push(full_name) }
    if (username !== undefined) { updates.push(`username = $${paramIndex++}`); values.push(username.toLowerCase()) }
    if (bio !== undefined) { updates.push(`bio = $${paramIndex++}`); values.push(bio) }
    if (avatar_url !== undefined) { updates.push(`avatar_url = $${paramIndex++}`); values.push(avatar_url) }
    if (cover_url !== undefined) { updates.push(`cover_url = $${paramIndex++}`); values.push(cover_url) }
    if (ai_persona !== undefined) { updates.push(`ai_persona = $${paramIndex++}`); values.push(ai_persona) }
    if (is_private !== undefined) { updates.push(`is_private = $${paramIndex++}`); values.push(is_private) }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const setClause = updates.join(', ')
    const updated = await queryOne(`UPDATE users SET ${setClause} WHERE id = $${paramIndex} RETURNING *`, values)

    const { password_hash, ...safe } = updated
    return Response.json({ data: safe })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
