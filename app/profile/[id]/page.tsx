'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Grid3X3, Users, MessageCircle, UserCheck, UserPlus } from 'lucide-react'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { useAuth } from '@/backend/lib/auth-context'
import { formatNumber } from '@/backend/lib/utils'
import { Button } from '@/frontend/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs'
import { StarRating } from '@/frontend/components/rating/star-rating'
import { RatingDisplay } from '@/frontend/components/rating/rating-display'
import { toast } from 'sonner'

export default function UserProfilePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const { currentUser } = useAuth()

  const [user, setUser] = useState<any>(null)
  const [userPosts, setUserPosts] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [showRating, setShowRating] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/users?id=${params.id}`)
      if (!res.ok) { setNotFound(true); return }
      const { data } = await res.json()
      setUser(data)
    } catch {
      setNotFound(true)
    }
  }, [params.id])

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts?userId=${params.id}`)
      if (res.ok) {
        const data = await res.json()
        // Filter to only this user's posts
        setUserPosts(Array.isArray(data) ? data.filter((p: any) => p.userId === params.id) : [])
      }
    } catch {}
  }, [params.id])

  const checkFollowStatus = useCallback(async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`/api/users/${params.id}/follow?viewerId=${currentUser.id}`)
      if (res.ok) {
        const data = await res.json()
        setIsFollowing(data.isFollowing)
      }
    } catch {}
  }, [params.id, currentUser])

  useEffect(() => {
    fetchUser()
    fetchPosts()
    checkFollowStatus()
  }, [fetchUser, fetchPosts, checkFollowStatus])

  const handleFollow = async () => {
    if (!currentUser || followLoading) return
    setFollowLoading(true)
    // Optimistic update
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    setUser((prev: any) => prev ? {
      ...prev,
      followers_count: prev.followers_count + (wasFollowing ? -1 : 1)
    } : prev)

    try {
      const res = await fetch(`/api/users/${params.id}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId: currentUser.id }),
      })
      if (!res.ok) {
        // Rollback
        setIsFollowing(wasFollowing)
        setUser((prev: any) => prev ? {
          ...prev,
          followers_count: prev.followers_count + (wasFollowing ? 1 : -1)
        } : prev)
        toast.error('Failed to update follow status')
      } else {
        const data = await res.json()
        setIsFollowing(data.isFollowing)
        toast.success(data.isFollowing ? `Following ${user?.full_name}` : `Unfollowed ${user?.full_name}`)
      }
    } catch {
      setIsFollowing(wasFollowing)
      toast.error('Network error')
    } finally {
      setFollowLoading(false)
    }
  }

  const handleMessage = () => {
    window.location.href = '/chat'
  }

  if (notFound) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">User not found</p>
          <Button asChild className="mt-4"><Link href="/">Go Home</Link></Button>
        </div>
      </MainLayout>
    )
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    )
  }

  const isOwnProfile = currentUser?.id === user.id

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link href="/"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
        </Button>

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
          <Avatar className="h-24 w-24 md:h-36 md:w-36 ring-4 ring-primary/10">
            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
            <AvatarFallback className="text-2xl">{user.full_name?.[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div>
                <h1 className="text-xl font-bold">{user.full_name}</h1>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
              {!isOwnProfile && (
                <div className="flex gap-2">
                  <Button
                    variant={isFollowing ? 'outline' : 'default'}
                    size="sm"
                    onClick={handleFollow}
                    disabled={followLoading}
                    className="gap-1.5"
                  >
                    {isFollowing ? (
                      <><UserCheck className="h-4 w-4" />Following</>
                    ) : (
                      <><UserPlus className="h-4 w-4" />Follow</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleMessage} className="gap-1.5">
                    <MessageCircle className="h-4 w-4" />Message
                  </Button>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mb-4">
              <div className="text-center">
                <p className="font-semibold">{userPosts.length}</p>
                <p className="text-sm text-muted-foreground">posts</p>
              </div>
              <div className="text-center">
                <p className="font-semibold">{formatNumber(user.followers_count || 0)}</p>
                <p className="text-sm text-muted-foreground">followers</p>
              </div>
              <div className="text-center">
                <p className="font-semibold">{formatNumber(user.following_count || 0)}</p>
                <p className="text-sm text-muted-foreground">following</p>
              </div>
            </div>

            <div className="space-y-1">
              {user.bio && <p className="text-sm text-muted-foreground">{user.bio}</p>}
              <div className="relative inline-block mt-2">
                <button
                  onClick={() => !isOwnProfile && setShowRating(!showRating)}
                  className="flex items-center gap-1"
                  disabled={isOwnProfile}
                >
                  <RatingDisplay rating={user.rating || 0} count={user.rating_count} size="md" />
                </button>
                {showRating && !isOwnProfile && (
                  <div className="absolute left-0 top-full mt-2 z-10 bg-popover border border-border rounded-lg p-3 shadow-lg">
                    <p className="text-xs text-muted-foreground mb-2">Rate this user</p>
                    <StarRating
                      rating={userRating}
                      interactive
                      onRatingChange={(r) => { setUserRating(r); setShowRating(false) }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <Tabs defaultValue="posts">
          <TabsList className="w-full justify-center border-t border-border rounded-none bg-transparent">
            <TabsTrigger value="posts" className="flex items-center gap-2 data-[state=active]:border-t-2 data-[state=active]:border-foreground rounded-none">
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2 data-[state=active]:border-t-2 data-[state=active]:border-foreground rounded-none">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Groups</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            {userPosts.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {userPosts.map(post => (
                  <div key={post.id} className="relative aspect-square bg-secondary/20 group overflow-hidden rounded-sm">
                    {post.image ? (
                      <Image src={post.image} alt={post.caption || 'Post'} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <p className="text-xs text-muted-foreground text-center line-clamp-3">{post.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No posts yet</div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">No groups joined yet</div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
