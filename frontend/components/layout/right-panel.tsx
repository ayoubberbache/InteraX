'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Users, Star, Flame, Hash } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { Button } from '@/frontend/components/ui/button'
import { Badge } from '@/frontend/components/ui/badge'
import { useAuth } from '@/backend/lib/auth-context'

const trendingTopics = [
  { tag: 'Tech', posts: '12.4K', hot: true },
  { tag: 'Photography', posts: '8.2K', hot: false },
  { tag: 'Design', posts: '6.1K', hot: true },
  { tag: 'AI', posts: '24.8K', hot: true },
  { tag: 'Gaming', posts: '5.3K', hot: false },
  { tag: 'Science', posts: '4.9K', hot: false },
]

export function RightPanel() {
  const { currentUser } = useAuth()
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([])

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch('/api/users/suggestions')
        if (res.ok) setSuggestedUsers(await res.json())
      } catch { /* silent */ }
    }
    loadUsers()
  }, [])

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-80 flex flex-col p-4 space-y-4 border-l border-border bg-background overflow-y-auto z-30">
      
      {/* Trending */}
      <div className="rounded-2xl bg-secondary/20 border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Trending Now</h3>
        </div>
        <div className="divide-y divide-border/50">
          {trendingTopics.map((topic, i) => (
            <Link
              key={topic.tag}
              href={`/search?q=${topic.tag}`}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/40 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3 text-primary" />
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">{topic.tag}</p>
                    {topic.hot && <Flame className="h-3 w-3 text-orange-500" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{topic.posts} posts</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Who to Follow */}
      {currentUser && (
        <div className="rounded-2xl bg-secondary/20 border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Suggested for You</h3>
          </div>
          <div className="p-3 space-y-2">
            {suggestedUsers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">Follow people to grow your network</p>
                <Button className="mt-2 w-full h-8 text-xs rounded-lg bg-gradient-to-r from-[#4B0082] to-[#E6E6FA] text-white border-0" asChild>
                  <Link href="/search">Find People</Link>
                </Button>
              </div>
            ) : (
              suggestedUsers.slice(0, 5).map(user => (
                <div key={user.id} className="flex items-center gap-2.5 py-1">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-[#4B0082] to-[#E6E6FA] text-white text-xs">
                      {user.full_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate leading-none">{user.full_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>
                  </div>
                  <Button size="sm" className="h-7 px-3 text-[11px] rounded-lg bg-gradient-to-r from-[#4B0082] to-[#9370DB] text-white border-0 flex-shrink-0">
                    Follow
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Stats Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#4B0082]/5 to-[#E6E6FA]/10 border border-primary/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-primary">Your Stats</h3>
        </div>
        {currentUser ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/60 rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{currentUser.followers || 0}</p>
              <p className="text-[10px] text-muted-foreground">Followers</p>
            </div>
            <div className="bg-background/60 rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{currentUser.following || 0}</p>
              <p className="text-[10px] text-muted-foreground">Following</p>
            </div>
            <div className="bg-background/60 rounded-xl p-3 text-center col-span-2">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <p className="text-lg font-bold">{Number(currentUser.rating || 0).toFixed(1)}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Avg Rating</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">Sign in to see your stats</p>
        )}
      </div>

      {/* Footer */}
      <div className="text-[10px] text-muted-foreground text-center pb-2 space-y-1">
        <p>© 2026 InteraX · All rights reserved</p>
        <div className="flex items-center justify-center gap-2">
          <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          <span>·</span>
          <Link href="/about" className="hover:text-primary transition-colors">About</Link>
        </div>
      </div>
    </aside>
  )
}

