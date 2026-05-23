import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'
import { isValidUuid } from '@/backend/lib/utils'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pollId } = await params

  try {
    const { optionId, userId } = await req.json()

    if (!userId || !isValidUuid(userId)) {
      return NextResponse.json({ error: 'Unauthorized: User ID required' }, { status: 401 })
    }
    if (!optionId || !isValidUuid(optionId)) {
      return NextResponse.json({ error: 'Option ID is required' }, { status: 400 })
    }

    // 1. Insert or update vote
    await execute(`
      INSERT INTO poll_votes (poll_id, option_id, user_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (poll_id, user_id)
      DO UPDATE SET option_id = EXCLUDED.option_id
    `, [pollId, optionId, userId])

    // 2. Recalculate votes counts
    await execute(`
      UPDATE poll_options
      SET votes_count = (SELECT COUNT(*)::int FROM poll_votes WHERE option_id = poll_options.id)
      WHERE poll_id = $1
    `, [pollId])

    // 3. Fetch all updated options
    const options = await query(`
      SELECT * FROM poll_options WHERE poll_id = $1 ORDER BY id ASC
    `, [pollId])

    // 4. Get total votes
    const totalVotesRes = await queryOne(`
      SELECT COUNT(*)::int as count FROM poll_votes WHERE poll_id = $1
    `, [pollId])

    return NextResponse.json({
      success: true,
      options,
      total_votes: totalVotesRes?.count || 0,
      user_voted_option_id: optionId
    })
  } catch (error: any) {
    console.error('[poll vote error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
