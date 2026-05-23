import { NextResponse, NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/backend/lib/db'
import { isValidUuid } from '@/backend/lib/utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawUserId = searchParams.get('userId')
  const rawGroupId = searchParams.get('group_id')
  const rawPageId = searchParams.get('page_id')
  
  const userId = isValidUuid(rawUserId) ? rawUserId : null
  const groupId = isValidUuid(rawGroupId) ? rawGroupId : null
  const pageId = isValidUuid(rawPageId) ? rawPageId : null
  const savedOnly = searchParams.get('savedOnly') === 'true'

  try {
    const params: any[] = []
    let paramCount = 1

    // Build FROM + optional saved JOIN
    let fromClause = `
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
    `
    if (savedOnly && userId) {
      fromClause += ` JOIN saved_posts sp ON p.id = sp.post_id`
    }

    // Build WHERE
    const conditions: string[] = []
    
    // Privacy filter
    if (userId) {
      const viewerParamIndex = paramCount++
      params.push(userId)
      conditions.push(`(u.is_private = false OR p.user_id = $${viewerParamIndex} OR EXISTS (
        SELECT 1 FROM follows WHERE follower_id = $${viewerParamIndex} AND following_id = p.user_id AND status = 'accepted'
      ))`)

      // Exclude posts where either party blocks the other
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM blocks
        WHERE (blocker_id = p.user_id AND blocked_id = $${viewerParamIndex})
           OR (blocker_id = $${viewerParamIndex} AND blocked_id = p.user_id)
      )`)
    } else {
      conditions.push(`u.is_private = false`)
    }

    if (savedOnly && userId) {
      conditions.push(`sp.user_id = $${paramCount++}`)
      params.push(userId)
    }
    if (groupId) {
      conditions.push(`p.group_id = $${paramCount++}`)
      params.push(groupId)
    } else if (pageId) {
      conditions.push(`p.page_id = $${paramCount++}`)
      params.push(pageId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const queryStr = `
      SELECT p.*,
             u.full_name as user_name, u.username as user_username, u.avatar_url as user_avatar, u.is_verified as user_verified,
             (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as likes_count_real,
             (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comments_count_real,
             (SELECT array_to_string(array(SELECT DISTINCT emoji FROM post_likes WHERE post_id = p.id AND emoji IS NOT NULL LIMIT 3), ',')) as unique_emojis
      ${fromClause}
      ${whereClause}
      ORDER BY p.created_at DESC
    `

    const posts = await query(queryStr, params)

    let likeMap: Record<string, any> = {}
    let saveMap: Record<string, any> = {}
    if (userId) {
      const userLikes = await query('SELECT * FROM post_likes WHERE user_id = $1', [userId])
      likeMap = Object.fromEntries(userLikes.map((l: any) => [l.post_id, l]))

      const userSaves = await query('SELECT * FROM saved_posts WHERE user_id = $1', [userId])
      saveMap = Object.fromEntries(userSaves.map((s: any) => [s.post_id, s]))
    }

    const postIds = posts.map((p: any) => p.id)
    let pollsMap: Record<string, any> = {}
    let eventsMap: Record<string, any> = {}

    if (postIds.length > 0) {
      // Fetch polls
      const polls = await query(`
        SELECT p.*,
               (SELECT JSON_AGG(o.*) FROM poll_options o WHERE o.poll_id = p.id) as options,
               (SELECT COUNT(*)::int FROM poll_votes v WHERE v.poll_id = p.id) as total_votes
        FROM polls p
        WHERE p.post_id = ANY($1)
      `, [postIds])

      // Fetch user votes if userId is present
      let userVotesMap: Record<string, string> = {} // poll_id -> option_id
      if (userId && polls.length > 0) {
        const pollIds = polls.map((pl: any) => pl.id)
        const userVotes = await query(`
          SELECT poll_id, option_id FROM poll_votes WHERE user_id = $1 AND poll_id = ANY($2)
        `, [userId, pollIds])
        userVotesMap = Object.fromEntries(userVotes.map((v: any) => [v.poll_id, v.option_id]))
      }

      for (const pl of polls) {
        pollsMap[pl.post_id] = {
          id: pl.id,
          question: pl.question,
          options: pl.options || [],
          total_votes: pl.total_votes || 0,
          user_voted_option_id: userVotesMap[pl.id] || null
        }
      }

      // Fetch events
      const events = await query(`SELECT * FROM events WHERE post_id = ANY($1)`, [postIds])
      eventsMap = Object.fromEntries(events.map((e: any) => [e.post_id, e]))
    }

    const formattedPosts = posts.map((post: any) => ({
      id: post.id,
      userId: post.user_id,
      image: post.image_url,
      caption: post.caption,
      content: post.caption,
      likes: parseInt(post.likes_count_real) || 0,
      commentsCount: parseInt(post.comments_count_real) || 0,
      rating: parseFloat(post.rating) || 0,
      rating_count: parseInt(post.rating_count) || 0,
      timestamp: post.created_at,
      user: {
        id: post.user_id,
        name: post.user_name,
        username: post.user_username || 'user',
        avatar: post.user_avatar,
        isVerified: post.user_verified
      },
      is_liked: !!likeMap[post.id],
      is_saved: !!saveMap[post.id],
      reaction: likeMap[post.id]?.emoji || null,
      uniqueEmojis: post.unique_emojis ? post.unique_emojis.split(',') : [],
      poll: pollsMap[post.id] || null,
      event: eventsMap[post.id] ? {
        id: eventsMap[post.id].id,
        title: eventsMap[post.id].title,
        description: eventsMap[post.id].description,
        event_date: eventsMap[post.id].event_date,
        location: eventsMap[post.id].location
      } : null
    }))

    return NextResponse.json(formattedPosts)
  } catch (error: any) {
    console.error('Posts GET error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { image_url, caption, userId, group_id, page_id, poll, event } = await req.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: User ID required' }, { status: 401 })
    }
    if (!image_url && !caption && !poll && !event) {
      return NextResponse.json({ error: 'Post content is required' }, { status: 400 })
    }

    const post = await queryOne(
      `INSERT INTO posts (user_id, image_url, caption, group_id, page_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, image_url || null, caption || '', group_id || null, page_id || null]
    )

    let createdPoll = null
    let createdEvent = null

    if (poll) {
      const { question, options } = poll
      if (!question || !Array.isArray(options) || options.length < 2) {
        return NextResponse.json({ error: 'Poll question and at least 2 options are required' }, { status: 400 })
      }
      
      const pollRow = await queryOne(
        `INSERT INTO polls (post_id, question) VALUES ($1, $2) RETURNING *`,
        [post.id, question]
      )

      const createdOptions = []
      for (const opt of options) {
        if (opt.trim()) {
          const optRow = await queryOne(
            `INSERT INTO poll_options (poll_id, option_text) VALUES ($1, $2) RETURNING *`,
            [pollRow.id, opt.trim()]
          )
          createdOptions.push(optRow)
        }
      }

      createdPoll = {
        id: pollRow.id,
        question: pollRow.question,
        options: createdOptions,
        total_votes: 0,
        user_voted_option_id: null
      }
    }

    if (event) {
      const { title, description, eventDate, location } = event
      if (!title || !eventDate) {
        return NextResponse.json({ error: 'Event title and event date are required' }, { status: 400 })
      }

      const eventRow = await queryOne(
        `INSERT INTO events (post_id, title, description, event_date, location)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [post.id, title, description || null, eventDate, location || null]
      )

      createdEvent = {
        id: eventRow.id,
        title: eventRow.title,
        description: eventRow.description,
        event_date: eventRow.event_date,
        location: eventRow.location
      }
    }
    
    // Notifications
    try {
      const viewer = await queryOne('SELECT full_name, avatar_url FROM users WHERE id = $1', [userId])
      
      if (group_id) {
        const group = await queryOne('SELECT owner_id, name FROM groups WHERE id = $1', [group_id])
        if (group && group.owner_id !== userId) {
          await execute(
            `INSERT INTO notifications (user_id, type, target_id, target_type, message, from_user_id, is_read, created_at)
             VALUES ($1, 'post_group', $2, 'post', $3, $4, false, NOW())`,
            [group.owner_id, post.id, `${viewer?.full_name || 'Someone'} posted in your group "${group.name}"`, userId]
          )
        }
      } else if (page_id) {
        const page = await queryOne('SELECT owner_id, name FROM pages WHERE id = $1', [page_id])
        if (page && page.owner_id !== userId) {
          await execute(
            `INSERT INTO notifications (user_id, type, target_id, target_type, message, from_user_id, is_read, created_at)
             VALUES ($1, 'post_page', $2, 'post', $3, $4, false, NOW())`,
            [page.owner_id, post.id, `${viewer?.full_name || 'Someone'} posted on your page "${page.name}"`, userId]
          )
        }
      } else if (event) {
        // Event post - schedule notification to all followers at eventDate
        const followers = await query('SELECT follower_id FROM follows WHERE following_id = $1', [userId])
        if (followers && followers.length > 0) {
          for (const f of followers) {
            await execute(
              `INSERT INTO notifications (user_id, type, target_id, target_type, message, from_user_id, is_read, created_at)
               VALUES ($1, 'event_arrival', $2, 'post', $3, $4, false, $5)`,
              [
                f.follower_id,
                post.id,
                `${viewer?.full_name || 'Someone'}'s scheduled event "${event.title}" is happening now!`,
                userId,
                event.eventDate
              ]
            )
          }
        }
      } else {
        // Standard post - notify all followers
        const followers = await query('SELECT follower_id FROM follows WHERE following_id = $1', [userId])
        if (followers && followers.length > 0) {
          for (const f of followers) {
            await execute(
              `INSERT INTO notifications (user_id, type, target_id, target_type, message, from_user_id, is_read, created_at)
               VALUES ($1, 'post', $2, 'post', $3, $4, false, NOW())`,
              [
                f.follower_id,
                post.id,
                `${viewer?.full_name || 'Someone'} created a new post`,
                userId,
              ]
            )
          }
        }
      }
    } catch (e) { console.error('Notification error', e) }

    return NextResponse.json({ id: post.id, ...post, poll: createdPoll, event: createdEvent })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get('id')
    const userId = req.headers.get('x-user-id') || searchParams.get('userId')

    if (!postId) return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify ownership
    const post = await queryOne('SELECT user_id FROM posts WHERE id = $1', [postId])
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    if (post.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await queryOne('DELETE FROM posts WHERE id = $1', [postId])
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
