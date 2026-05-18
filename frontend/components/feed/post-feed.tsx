'use client'

import { useEffect, useState, useCallback } from 'react'
import { PostCard } from './post-card'
import { useAuth } from '@/backend/lib/auth-context'
import { useLanguage } from '@/backend/lib/i18n/context'

interface PostFeedProps {
  userId?: string
  savedOnly?: boolean
}

export function PostFeed({ userId: filterUserId, savedOnly }: PostFeedProps) {
  const { currentUser } = useAuth()
  const { t } = useLanguage()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    try {
      const url = new URL('/api/posts', window.location.origin)
      if (currentUser?.id) url.searchParams.append('userId', currentUser.id)
      if (savedOnly) url.searchParams.append('savedOnly', 'true')

      const res = await fetch(url.toString())

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        setError(errData.error || `Server error ${res.status}`)
        return
      }

      const data = await res.json()
      if (Array.isArray(data)) {
        setPosts(data)
        setError(null)
      } else {
        setError(data?.error || 'Unexpected response')
      }
    } catch (err: any) {
      console.error('Failed to load posts', err)
      setError('Could not connect to server')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id, savedOnly])

  useEffect(() => {
    setLoading(true)
    loadPosts()
    const interval = setInterval(loadPosts, 30000)
    return () => clearInterval(interval)
  }, [loadPosts])

  const filteredPosts = filterUserId
    ? posts.filter(post => post.userId === filterUserId)
    : posts

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-muted rounded" />
                <div className="h-2 w-20 bg-muted rounded" />
              </div>
            </div>
            <div className="h-48 w-full bg-muted rounded-xl mb-4" />
            <div className="space-y-2">
              <div className="h-2 w-full bg-muted rounded" />
              <div className="h-2 w-2/3 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="font-semibold text-foreground mb-1">{t('feed_error')}</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => { setLoading(true); loadPosts() }}
          className="text-sm text-primary hover:underline"
        >
          {t('feed_try_again')}
        </button>
      </div>
    )
  }

  if (filteredPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <span className="text-2xl">📭</span>
        </div>
        <p className="font-semibold text-foreground mb-1">{t('feed_empty')}</p>
        <p className="text-sm text-muted-foreground">{t('feed_empty_desc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {filteredPosts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
        />
      ))}
    </div>
  )
}
