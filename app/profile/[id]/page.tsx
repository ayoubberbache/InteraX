'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Grid3X3, Users, MessageCircle, UserCheck, UserPlus, Lock } from 'lucide-react'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { useAuth } from '@/backend/lib/auth-context'
import { formatNumber } from '@/backend/lib/utils'
import { Button } from '@/frontend/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs'
import { StarRating } from '@/frontend/components/rating/star-rating'
import { RatingDisplay } from '@/frontend/components/rating/rating-display'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/frontend/components/ui/dialog'
import { cn } from '@/backend/lib/utils'

export default function UserProfilePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const router = useRouter()
  const { currentUser, refreshUser } = useAuth()

  const [user, setUser] = useState<any>(null)
  const [userPosts, setUserPosts] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none')
  const [followLoading, setFollowLoading] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [showRating, setShowRating] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Relations Modal state
  const [relationsOpen, setRelationsOpen] = useState(false)
  const [relationsType, setRelationsType] = useState<'followers' | 'following'>('followers')
  const [relationsList, setRelationsList] = useState<any[]>([])
  const [relationsLoading, setRelationsLoading] = useState(false)

  const fetchRelations = async (type: 'followers' | 'following') => {
    if (user.is_private && !isOwnProfile && followStatus !== 'accepted') {
      return
    }
    
    setRelationsType(type)
    setRelationsOpen(true)
    setRelationsLoading(true)
    try {
      const res = await fetch(`/api/users/relations?userId=${params.id}&type=${type}`)
      if (res.ok) {
        const { data } = await res.json()
        setRelationsList(data || [])
      } else {
        setRelationsList([])
      }
    } catch {
      setRelationsList([])
    } finally {
      setRelationsLoading(false)
    }
  }

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/users?id=${params.id}&viewerId=${currentUser?.id || ''}`)
      if (!res.ok) { setNotFound(true); return }
      const { data } = await res.json()
      setUser(data)
    } catch {
      setNotFound(true)
    }
  }, [params.id, currentUser?.id])

  const handleBlock = async () => {
    if (!currentUser) return
    if (!confirm(`Are you sure you want to block ${user?.full_name || 'this user'}?`)) return
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockerId: currentUser.id, blockedId: params.id })
      })
      if (res.ok) {
        toast.success(`You blocked ${user?.full_name || 'this user'}`)
        router.push('/')
      } else {
        toast.error('Failed to block user')
      }
    } catch {
      toast.error('Error blocking user')
    }
  }

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts?userId=${params.id}`)
      if (res.ok) {
        const data = await res.json()
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
        setFollowStatus(data.status || (data.isFollowing ? 'accepted' : 'none'))
      }
    } catch {}
  }, [params.id, currentUser?.id])

  useEffect(() => {
    fetchUser()
    fetchPosts()
    checkFollowStatus()
  }, [fetchUser, fetchPosts, checkFollowStatus])

  const handleFollow = async () => {
    if (!currentUser || followLoading) return
    setFollowLoading(true)

    const prevStatus = followStatus
    const isUnfollowing = prevStatus === 'accepted' || prevStatus === 'pending'
    
    let nextStatus: 'none' | 'pending' | 'accepted' = 'none'
    if (!isUnfollowing) {
      nextStatus = user.is_private ? 'pending' : 'accepted'
    }

    setFollowStatus(nextStatus)
    setIsFollowing(nextStatus === 'accepted')

    if (isUnfollowing && prevStatus === 'accepted') {
      setUser((prev: any) => prev ? {
        ...prev,
        followers_count: Math.max((prev.followers_count || 0) - 1, 0)
      } : prev)
    } else if (nextStatus === 'accepted') {
      setUser((prev: any) => prev ? {
        ...prev,
        followers_count: (prev.followers_count || 0) + 1
      } : prev)
    }

    try {
      const res = await fetch(`/api/users/${params.id}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId: currentUser.id }),
      })
      if (!res.ok) {
        setFollowStatus(prevStatus)
        setIsFollowing(prevStatus === 'accepted')
        fetchUser()
        toast.error('Failed to update follow status')
      } else {
        const data = await res.json()
        setFollowStatus(data.status)
        setIsFollowing(data.isFollowing)
        
        if (data.status === 'pending') {
          toast.success(`Follow request sent to ${user?.full_name}`)
        } else if (data.status === 'accepted') {
          toast.success(`Following ${user?.full_name}`)
        } else {
          toast.success(`Unfollowed ${user?.full_name}`)
        }
        
        fetchUser()
        refreshUser()
      }
    } catch {
      setFollowStatus(prevStatus)
      setIsFollowing(prevStatus === 'accepted')
      toast.error('Network error')
    } finally {
      setFollowLoading(false)
    }
  }

  const handleMessage = () => {
    router.push(`/chat?userId=${user.id}`)
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
            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} className="object-cover" />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-[#4B0082] to-[#E6E6FA] text-white">
              {user.full_name?.[0]}
            </AvatarFallback>
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
                    variant={followStatus === 'accepted' ? 'outline' : followStatus === 'pending' ? 'secondary' : 'default'}
                    size="sm"
                    onClick={handleFollow}
                    disabled={followLoading}
                    className="gap-1.5 rounded-full"
                  >
                    {followStatus === 'accepted' ? (
                      <><UserCheck className="h-4 w-4" />Following</>
                    ) : followStatus === 'pending' ? (
                      <><UserCheck className="h-4 w-4 animate-pulse" />Requested</>
                    ) : (
                      <><UserPlus className="h-4 w-4" />Follow</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleMessage} className="gap-1.5 rounded-full">
                    <MessageCircle className="h-4 w-4" />Message
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleBlock} 
                    className="gap-1.5 rounded-full text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive transition-colors"
                  >
                    Block
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
              <button 
                className={cn(
                  "text-center cursor-pointer hover:opacity-80 transition-opacity outline-none", 
                  (user.is_private && !isOwnProfile && followStatus !== 'accepted') && "cursor-not-allowed opacity-50 pointer-events-none"
                )}
                onClick={() => fetchRelations('followers')}
                disabled={user.is_private && !isOwnProfile && followStatus !== 'accepted'}
              >
                <p className="font-semibold">{formatNumber(user.followers_count || 0)}</p>
                <p className="text-sm text-muted-foreground">followers</p>
              </button>
              <button 
                className={cn(
                  "text-center cursor-pointer hover:opacity-80 transition-opacity outline-none", 
                  (user.is_private && !isOwnProfile && followStatus !== 'accepted') && "cursor-not-allowed opacity-50 pointer-events-none"
                )}
                onClick={() => fetchRelations('following')}
                disabled={user.is_private && !isOwnProfile && followStatus !== 'accepted'}
              >
                <p className="font-semibold">{formatNumber(user.following_count || 0)}</p>
                <p className="text-sm text-muted-foreground">following</p>
              </button>
            </div>

            <div className="space-y-1">
              {user.bio && <p className="text-sm text-muted-foreground">{user.bio}</p>}
              <div className="relative inline-block mt-2">
                <button
                  onClick={() => !isOwnProfile && setShowRating(!showRating)}
                  className="flex items-center gap-1"
                  disabled={isOwnProfile || (user.is_private && !isOwnProfile && followStatus !== 'accepted')}
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

        {/* Private Account Block */}
        {user.is_private && !isOwnProfile && followStatus !== 'accepted' ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-secondary/10 border border-border backdrop-blur-md rounded-3xl mt-6 shadow-xl max-w-xl mx-auto">
            <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center mb-6">
              <Lock className="h-10 w-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">This Account is Private</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Follow this user to see their photos, videos, and stories.
            </p>
            {followStatus === 'pending' ? (
              <Button disabled variant="outline" className="rounded-full px-6">
                Request Pending
              </Button>
            ) : (
              <Button onClick={handleFollow} className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold px-6 shadow-md transition-all">
                Follow
              </Button>
            )}
          </div>
        ) : (
          /* Posts Grid */
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
                        <Image src={post.image} alt={post.caption || 'Post'} fill className="object-cover group-hover:scale-105 transition-transform duration-300 animate-fade-in" />
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
        )}
      </div>
      {/* Followers / Following Dialog */}
      <Dialog open={relationsOpen} onOpenChange={setRelationsOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold capitalize">
              {relationsType === 'followers' ? 'Followers' : 'Following'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {relationsLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : relationsList.length > 0 ? (
              <div className="space-y-4">
                {relationsList.map(rel => (
                  <div key={rel.id} className="flex items-center justify-between">
                    <Link 
                      href={`/profile/${rel.id}`}
                      onClick={() => setRelationsOpen(false)}
                      className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-10 w-10 ring-1 ring-border">
                        <AvatarImage src={rel.avatar_url || undefined} alt={rel.full_name} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {rel.full_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate flex items-center gap-1">
                          {rel.full_name}
                          {rel.is_verified && (
                            <span className="text-blue-500 text-xs">✓</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">@{rel.username}</p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No {relationsType} found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
