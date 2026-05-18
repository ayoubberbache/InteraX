import { NextResponse, NextRequest } from 'next/server'
import { queryOne, execute } from '@/backend/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params

  try {
    const { score, userId } = await req.json()
    
    if (!userId) return NextResponse.json({ error: 'Unauthorized: userId required' }, { status: 401 })
    if (!score || score < 1 || score > 5) return NextResponse.json({ error: 'Invalid score (1-5 required)' }, { status: 400 })

    const existing = await queryOne('SELECT * FROM post_ratings WHERE post_id = $1 AND user_id = $2', [postId, userId])

    if (!existing) {
      await execute('INSERT INTO post_ratings (post_id, user_id, score) VALUES ($1, $2, $3)', [postId, userId, score])
    } else {
      await execute('UPDATE post_ratings SET score = $1 WHERE id = $2', [score, existing.id])
    }

    const stats = await queryOne(`
      SELECT COUNT(*) as count, AVG(score) as avg 
      FROM post_ratings WHERE post_id = $1
    `, [postId])

    const avgRating = parseFloat(Number(stats.avg).toFixed(1)) || 0
    const ratingCount = parseInt(stats.count) || 0

    await execute('UPDATE posts SET rating = $1, rating_count = $2 WHERE id = $3', [avgRating, ratingCount, postId])

    return NextResponse.json({ success: true, rating: avgRating, ratingCount: ratingCount })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
