'use client'

import { useState, useEffect, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Users, MessageSquare, Share2, Plus } from 'lucide-react'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { formatNumber } from '@/backend/lib/utils'
import { Button } from '@/frontend/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { Badge } from '@/frontend/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs'
import { PostCard } from '@/frontend/components/feed/post-card'
import { useAuth } from '@/backend/lib/auth-context'
import { uploadMedia } from '@/backend/lib/upload'
import { toast } from 'sonner'
import { Image as ImageIcon } from 'lucide-react'

export default function GroupPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const { currentUser } = useAuth()
  
  const [group, setGroup] = useState<any>(null)
  const [groupPosts, setGroupPosts] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [isJoined, setIsJoined] = useState(false)

  // New Post State
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostImage, setNewPostImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    const fetchGroupData = async () => {
      setLoading(true)
      try {
        // Fetch groups and filter for now (ideally should have a GET /api/groups/:id)
        const gRes = await fetch('/api/groups')
        if (gRes.ok) {
          const allGroups = await gRes.json()
          const found = allGroups.find((g: any) => g.id === params.id)
          setGroup(found || null)
        }

        // Fetch all posts and filter (ideally GET /api/posts?groupId=xxx)
        const pUrl = new URL('/api/posts', window.location.origin)
        pUrl.searchParams.append('group_id', params.id)
        if (currentUser?.id) pUrl.searchParams.append('userId', currentUser.id)

        const pRes = await fetch(pUrl.toString())
        if (pRes.ok) {
          const allPosts = await pRes.json()
          setGroupPosts(allPosts)
        }

        // Fetch membership status
        if (currentUser?.id) {
          const mRes = await fetch(`/api/groups/${params.id}/join?userId=${currentUser.id}`)
          if (mRes.ok) {
            const mData = await mRes.json()
            setIsJoined(mData.isJoined)
          }
        }

        // Fetch members list
        const membersRes = await fetch(`/api/groups/${params.id}/members`)
        if (membersRes.ok) {
          const mList = await membersRes.json()
          setGroupMembers(mList)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchGroupData()
  }, [params.id, currentUser?.id])

  const handleCreatePost = async () => {
    if ((!newPostContent.trim() && !newPostImage) || !currentUser || !group) return

    const postData = {
      userId: currentUser.id,
      group_id: group.id,
      caption: newPostContent,
      image_url: newPostImage
    }
    
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      })
      if (res.ok) {
        const data = await res.json()
        setNewPostContent('')
        setNewPostImage(null)
        setGroupPosts(prev => [{
          ...data,
          user: { name: currentUser.name, username: currentUser.username, avatar: currentUser.avatar }
        }, ...prev])
      }
    } catch(e) { console.error(e) }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return
    setIsUploading(true)
    try {
      const url = await uploadMedia(file, currentUser.id, 'post')
      setNewPostImage(url)
    } catch (err) {
      toast.error('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const toggleJoin = async () => {
    if (!currentUser || !group) return
    try {
      const res = await fetch(`/api/groups/${group.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      })
      if (res.ok) {
        const data = await res.json()
        setIsJoined(data.joined)
        setGroup(prev => prev ? { ...prev, members_count: prev.members_count + (data.joined ? 1 : -1) } : prev)
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    )
  }

  if (!group) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Group not found</p>
          <Button asChild className="mt-4">
            <Link href="/groups">Back to Groups</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto pb-20">
        <div className="relative h-48 md:h-64 w-full bg-secondary">
          {group.cover_url && (
            <Image
              src={group.cover_url}
              alt={group.name}
              fill
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <Button variant="ghost" size="icon" className="absolute top-4 left-4 h-10 w-10 text-white bg-black/20 hover:bg-black/40" asChild>
            <Link href="/groups"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <Badge className="absolute top-4 right-4 bg-background/80">{group.category}</Badge>
        </div>

        <div className="p-4 md:p-6 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{group.name}</h1>
              <p className="text-muted-foreground mb-4">{group.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-4 w-4" /><span>{formatNumber(group.members_count)} members</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MessageSquare className="h-4 w-4" /><span>{formatNumber(groupPosts.length)} posts</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant={isJoined ? 'outline' : 'default'} onClick={toggleJoin}>
                {isJoined ? 'Leave Group' : 'Join Group'}
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="posts" className="p-4 md:p-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            <div className="max-w-xl mx-auto space-y-6">
              {/* Create Post Field */}
              <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarImage src={currentUser?.avatar || undefined} />
                    <AvatarFallback>?</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <textarea 
                      placeholder="Write something in this group..."
                      className="w-full bg-secondary/50 rounded-lg p-3 outline-none resize-none"
                      rows={3}
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                    />
                    {newPostImage && (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                        <Image src={newPostImage} alt="Upload" fill className="object-cover" />
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="absolute top-2 right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => setNewPostImage(null)}
                        >
                          ×
                        </Button>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                        <Button variant="outline" size="sm" type="button" className="pointer-events-none" disabled={isUploading}>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          {isUploading ? 'Uploading...' : 'Add Image'}
                        </Button>
                      </label>
                      <Button onClick={handleCreatePost} disabled={(!newPostContent.trim() && !newPostImage) || isUploading}>
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {groupPosts.length > 0 ? (
                groupPosts.map(post => <PostCard key={post.id} post={post} />)
              ) : (
                <div className="text-center py-12 text-muted-foreground">No posts yet in this group</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <div className="max-w-xl mx-auto space-y-4">
              {groupMembers.length > 0 ? (
                groupMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar || undefined} />
                        <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={`/profile/${member.id}`} className="font-semibold hover:underline">
                          {member.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">@{member.username}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">No members found</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <div className="max-w-2xl space-y-4">
              <div><h3 className="font-semibold mb-2">About this group</h3><p className="text-muted-foreground">{group.description}</p></div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
