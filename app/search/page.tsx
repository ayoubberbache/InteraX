'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, Heart, MessageCircle, UserPlus, UserCheck } from 'lucide-react'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs'
import { Button } from '@/frontend/components/ui/button'
import { RatingDisplay } from '@/frontend/components/rating/rating-display'
import { GroupCard } from '@/frontend/components/groups/group-card'
import { useAuth } from '@/backend/lib/auth-context'
import { toast } from 'sonner'
import { useLanguage } from '@/backend/lib/i18n/context'

export default function SearchPage() {
  const { currentUser } = useAuth()
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [filteredPosts, setFilteredPosts] = useState<any[]>([])
  const [filteredGroups, setFilteredGroups] = useState<any[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([])
  const [explorePosts, setExplorePosts] = useState<any[]>([])
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({})
  const [loadingFollow, setLoadingFollow] = useState<string | null>(null)

  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Initial explore data
    const viewerId = currentUser?.id || ''
    fetch(`/api/users/suggestions?viewerId=${viewerId}`)
      .then(r => r.json())
      .then(d => setSuggestedUsers(Array.isArray(d) ? d : []))
      .catch(console.error)

    fetch(`/api/posts?userId=${viewerId}`)
      .then(r => r.json())
      .then(d => setExplorePosts(Array.isArray(d) ? d : []))
      .catch(console.error)
  }, [currentUser])

  const doSearch = useCallback(async (q: string) => {
    try {
      const [uRes, pRes, gRes] = await Promise.all([
        fetch(`/api/users?q=${encodeURIComponent(q)}&viewerId=${currentUser?.id || ''}`),
        fetch(`/api/posts?userId=${currentUser?.id || ''}`),
        fetch(`/api/groups`),
      ])

      if (uRes.ok) {
        const { data } = await uRes.json()
        setFilteredUsers(data || [])
      }
      if (pRes.ok) {
        const posts = await pRes.json()
        const lower = q.toLowerCase()
        setFilteredPosts(
          (posts || []).filter((p: any) =>
            p.caption?.toLowerCase().includes(lower) ||
            p.user?.name?.toLowerCase().includes(lower) ||
            p.user?.username?.toLowerCase().includes(lower)
          )
        )
      }
      if (gRes.ok) {
        const groups = await gRes.json()
        const lower = q.toLowerCase()
        setFilteredGroups(
          (groups || []).filter((g: any) =>
            g.name?.toLowerCase().includes(lower) ||
            g.description?.toLowerCase().includes(lower)
          )
        )
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setFilteredUsers([])
      setFilteredPosts([])
      setFilteredGroups([])
      return
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => doSearch(query.trim()), 350)
  }, [query, doSearch])

  const handleFollow = async (userId: string, userName: string) => {
    if (!currentUser || loadingFollow) return
    setLoadingFollow(userId)
    const wasFollowing = followingMap[userId] ?? false
    setFollowingMap(prev => ({ ...prev, [userId]: !wasFollowing }))
    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId: currentUser.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setFollowingMap(prev => ({ ...prev, [userId]: data.isFollowing }))
        toast.success(data.isFollowing ? `${t('search_following')} ${userName}` : userName)
      } else {
        setFollowingMap(prev => ({ ...prev, [userId]: wasFollowing }))
        toast.error(t('search_failed_update'))
      }
    } catch {
      setFollowingMap(prev => ({ ...prev, [userId]: wasFollowing }))
    } finally {
      setLoadingFollow(null)
    }
  }

  const UserRow = ({ user }: { user: any }) => {
    const isFollowing = followingMap[user.id] ?? false
    const isOwn = currentUser?.id === user.id
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
        <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-11 w-11 flex-shrink-0">
            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
            <AvatarFallback>{user.full_name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{user.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RatingDisplay rating={user.rating || 0} size="sm" showCount={false} />
          {!isOwn && currentUser && (
            <Button
              size="sm"
              variant={isFollowing ? 'outline' : 'default'}
              className="h-8 px-3 text-xs"
              onClick={() => handleFollow(user.id, user.full_name)}
              disabled={loadingFollow === user.id}
            >
              {isFollowing ? <><UserCheck className="h-3 w-3 mr-1" />{t('search_following')}</> : <><UserPlus className="h-3 w-3 mr-1" />{t('search_follow')}</>}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const PostCard = ({ post }: { post: any }) => (
    <div className="relative aspect-square bg-secondary/20 group overflow-hidden rounded-sm cursor-pointer">
      {post.image ? (
        <>
          <Image
            src={post.image}
            alt={post.caption || 'Post'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-sm font-semibold">
            <span className="flex items-center gap-1"><Heart className="h-4 w-4" />{post.likes ?? 0}</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />{post.commentsCount ?? 0}</span>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-2">
          {post.user?.avatar && (
            <img src={post.user.avatar} alt={post.user.name} className="h-8 w-8 rounded-full object-cover" />
          )}
          <p className="text-xs text-muted-foreground text-center line-clamp-4">{post.caption}</p>
        </div>
      )}
    </div>
  )

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="search"
            placeholder={t('search_placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-12 rounded-xl border border-border bg-background px-4 pl-11 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            autoFocus
          />
        </div>

        {query ? (
          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all">{t('search_tab_all')}</TabsTrigger>
              <TabsTrigger value="users">{t('search_tab_users')} ({filteredUsers.length})</TabsTrigger>
              <TabsTrigger value="posts">{t('search_tab_posts')} ({filteredPosts.length})</TabsTrigger>
              <TabsTrigger value="groups">{t('search_tab_groups')} ({filteredGroups.length})</TabsTrigger>
            </TabsList>

            {/* All tab */}
            <TabsContent value="all" className="space-y-6">
              {filteredUsers.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">{t('search_tab_users')}</h3>
                  <div className="space-y-1">
                    {filteredUsers.slice(0, 3).map(user => <UserRow key={user.id} user={user} />)}
                  </div>
                </div>
              )}
              {filteredPosts.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">{t('search_tab_posts')}</h3>
                  <div className="grid grid-cols-3 gap-1">
                    {filteredPosts.slice(0, 6).map(post => <PostCard key={post.id} post={post} />)}
                  </div>
                </div>
              )}
              {filteredGroups.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">{t('search_tab_groups')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredGroups.slice(0, 2).map(group => <GroupCard key={group.id} group={group} />)}
                  </div>
                </div>
              )}
              {filteredUsers.length === 0 && filteredPosts.length === 0 && filteredGroups.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  {t('search_no_results')} &quot;{query}&quot;
                </div>
              )}
            </TabsContent>

            {/* Users tab */}
            <TabsContent value="users">
              {filteredUsers.length > 0 ? (
                <div className="space-y-1">
                  {filteredUsers.map(user => <UserRow key={user.id} user={user} />)}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">{t('search_no_users')}</div>
              )}
            </TabsContent>

            {/* Posts tab */}
            <TabsContent value="posts">
              {filteredPosts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {filteredPosts.map(post => <PostCard key={post.id} post={post} />)}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">{t('search_no_posts')}</div>
              )}
            </TabsContent>

            {/* Groups tab */}
            <TabsContent value="groups">
              {filteredGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredGroups.map(group => <GroupCard key={group.id} group={group} />)}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">{t('search_no_groups')}</div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Explore — no query */
          <div className="space-y-8">
            {/* Suggested users */}
            <div>
              <h3 className="font-semibold mb-4">{t('search_suggested_people')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {suggestedUsers.map(user => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.id}`}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-secondary transition-colors border border-border/50"
                  >
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                      <AvatarFallback>{user.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-sm text-center leading-tight">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                    <RatingDisplay rating={user.rating || 0} size="sm" showCount={false} />
                  </Link>
                ))}
              </div>
            </div>

            {/* All public posts */}
            <div>
              <h3 className="font-semibold mb-4">{t('search_explore_posts')}</h3>
              {explorePosts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {explorePosts.map(post => <PostCard key={post.id} post={post} />)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">{t('search_no_posts')}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
