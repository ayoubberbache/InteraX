'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Settings, Grid3X3, Users, Bookmark, Camera, ImagePlus, FileText } from 'lucide-react'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { useAuth } from '@/backend/lib/auth-context'
import { formatNumber } from '@/backend/lib/utils'
import { Button } from '@/frontend/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs'
import { RatingDisplay } from '@/frontend/components/rating/rating-display'
import { PostCard } from '@/frontend/components/feed/post-card'
import { toast } from 'sonner'

export default function ProfilePage() {
  const { currentUser, isLoggedIn, refreshUser } = useAuth()
  const [posts, setPosts] = useState<any[]>([])
  const [pages, setPages] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [savedPosts, setSavedPosts] = useState<any[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)

  const [activeTab, setActiveTab] = useState('posts')

  useEffect(() => {
    if (activeTab === 'saved' && currentUser) {
      fetch(`/api/posts?userId=${currentUser.id}&savedOnly=true`)
        .then(res => res.json())
        .then(data => setSavedPosts(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
  }, [activeTab, currentUser])

  const loadPosts = useCallback(async () => {
    if (!currentUser) return
    setLoadingPosts(true)
    try {
      const [postsRes, pagesRes, allGroupsRes, savedRes] = await Promise.all([
        fetch(`/api/posts?userId=${currentUser.id}`),
        fetch('/api/pages'),
        fetch('/api/groups'),
        fetch(`/api/posts?userId=${currentUser.id}&savedOnly=true`)
      ])

      if (postsRes.ok) {
        const data = await postsRes.json()
        // Filter to only this user's posts
        setPosts(Array.isArray(data) ? data.filter((p: any) => p.userId === currentUser.id) : [])
      }
      if (pagesRes.ok) {
        const data = await pagesRes.json()
        setPages(Array.isArray(data) ? data.filter((p: any) => p.owner_id === currentUser.id) : [])
      }
      if (allGroupsRes.ok) {
        const data = await allGroupsRes.json()
        // Show groups the user owns OR is a member of
        const myGroups = Array.isArray(data) ? data.filter((g: any) =>
          g.owner_id === currentUser.id
        ) : []
        setGroups(myGroups)
      }
      if (savedRes.ok) {
        const data = await savedRes.json()
        setSavedPosts(Array.isArray(data) ? data : [])
      }
    } catch {
      toast.error('Failed to load profile data')
    } finally {
      setLoadingPosts(false)
    }
  }, [currentUser])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  if (!isLoggedIn || !currentUser) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
          <p className="text-muted-foreground mb-4">Please sign in to view your profile</p>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Cover Image Wrapper */}
        <div className="relative mb-16 md:mb-20">
          {/* Cover Background (Hidden Overflow) */}
          <div className="h-36 md:h-48 w-full rounded-2xl overflow-hidden bg-gradient-to-r from-[#4B0082]/20 via-[#E6E6FA]/20 to-[#6366f1]/20">
            {currentUser.coverUrl && (
              <img src={currentUser.coverUrl} alt="Cover" className="w-full h-full object-cover" />
            )}
          </div>
          {/* Avatar overlapping the cover container */}
          <div className="absolute -bottom-12 left-6 z-10">
            <div className="relative rounded-full shadow-2xl before:absolute before:-inset-1 before:rounded-full before:bg-background/30 before:backdrop-blur-md before:-z-10">
              <Avatar className="h-24 w-24 border-4 border-background bg-background/80 backdrop-blur-sm">
                <AvatarImage src={currentUser.avatar || undefined} alt={currentUser.name} className="object-cover" />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-[#4B0082] to-[#E6E6FA] text-white">
                  {currentUser.name[0]}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold">{currentUser.name}</h1>
              {currentUser.isVerified && (
                <span className="h-5 w-5 bg-primary rounded-full flex items-center justify-center text-white text-[10px]">?</span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">@{currentUser.username}</p>
            {currentUser.bio && <p className="text-sm mt-2 max-w-sm">{currentUser.bio}</p>}
            <div className="mt-3">
              <RatingDisplay rating={currentUser.rating} count={currentUser.ratingCount} size="sm" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-secondary/20 rounded-2xl">
          <div className="text-center">
            <p className="text-xl font-bold">{formatNumber(currentUser.postsCount)}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-xl font-bold">{formatNumber(currentUser.followers)}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{formatNumber(currentUser.following)}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-center border-t border-border rounded-none bg-transparent mb-6">
            <TabsTrigger value="posts" className="flex items-center gap-2 data-[state=active]:border-t-2 data-[state=active]:border-primary rounded-none">
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center gap-2 data-[state=active]:border-t-2 data-[state=active]:border-primary rounded-none">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Pages</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2 data-[state=active]:border-t-2 data-[state=active]:border-primary rounded-none">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Groups</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2 data-[state=active]:border-t-2 data-[state=active]:border-primary rounded-none">
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Saved</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {loadingPosts ? (
              <div className="grid grid-cols-3 gap-1">
                {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-secondary animate-pulse rounded" />)}
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-6 max-w-xl mx-auto">
                {posts.map(post => <PostCard key={post.id} post={post} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">Share your first post</h3>
                <p className="text-muted-foreground text-sm mb-4">When you share photos and videos, they'll appear here.</p>
                <Button asChild className="bg-gradient-to-r from-[#4B0082] to-[#9370DB] text-white rounded-full">
                  <Link href="/create">Create Post</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pages">
            {pages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {pages.map(page => (
                  <Link key={page.id} href={`/pages/${page.id}`} className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-secondary/20 transition-colors">
                    <Avatar className="h-12 w-12 rounded-lg">
                      <AvatarImage src={page.avatar_url} />
                      <AvatarFallback className="rounded-lg">{page.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{page.name}</h4>
                      <p className="text-sm text-muted-foreground">@{page.handle}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>You haven't created any pages yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups">
            {groups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {groups.map(group => (
                  <Link key={group.id} href={`/groups/${group.id}`} className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-secondary/20 transition-colors">
                    <Avatar className="h-12 w-12 rounded-lg">
                      <AvatarImage src={group.avatar_url} />
                      <AvatarFallback className="rounded-lg">{group.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{group.name}</h4>
                      <p className="text-sm text-muted-foreground">{formatNumber(group.members_count)} members</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>You haven't created or joined any groups</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved">
            {savedPosts.length > 0 ? (
              <div className="space-y-6 max-w-xl mx-auto">
                {savedPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDelete={(id) => setSavedPosts(prev => prev.filter(p => p.id !== id))}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Your saved posts will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
