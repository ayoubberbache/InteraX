'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Image, Film, BarChart2, Calendar, X, UploadCloud, Check, Sparkles } from 'lucide-react'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { StoriesBar } from '@/frontend/components/stories/stories-bar'
import { PostFeed } from '@/frontend/components/feed/post-feed'
import { useAuth } from '@/backend/lib/auth-context'
import { useLanguage } from '@/backend/lib/i18n/context'
import { Button } from '@/frontend/components/ui/button'
import { Input } from '@/frontend/components/ui/input'
import { Textarea } from '@/frontend/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/frontend/components/ui/dialog'
import { uploadMedia } from '@/backend/lib/upload'
import { cn } from '@/backend/lib/utils'
import { toast } from 'sonner'

export default function HomePage() {
  const router = useRouter()
  const { currentUser, isLoggedIn } = useAuth()
  const { t } = useLanguage()

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Create Post state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [postType, setPostType] = useState<'standard' | 'poll' | 'event'>('standard')
  const [caption, setCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Poll states
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])

  // Event states
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const triggerFileSelect = (type: 'image' | 'video') => {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }
    setPostType('standard')
    setIsCreateOpen(true)
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*'
        fileInputRef.current.click()
      }
    }, 100)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleCreatePostClick = () => {
    if (!isLoggedIn) { router.push('/login'); return }
    setPostType('standard')
    setIsCreateOpen(true)
  }

  const handleCreatePollClick = () => {
    if (!isLoggedIn) { router.push('/login'); return }
    setPostType('poll')
    setPollOptions(['', ''])
    setPollQuestion('')
    setIsCreateOpen(true)
  }

  const handleCreateEventClick = () => {
    if (!isLoggedIn) { router.push('/login'); return }
    setPostType('event')
    setEventTitle('')
    setEventDescription('')
    setEventDate('')
    setEventLocation('')
    setIsCreateOpen(true)
  }

  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions(prev => [...prev, ''])
    }
  }

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handlePollOptionChange = (index: number, value: string) => {
    setPollOptions(prev => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const handlePostSubmit = async () => {
    if (postType === 'event' && (!eventTitle.trim() || !eventDate)) {
      toast.error('Event title and date are required')
      return
    }
    if (postType === 'poll' && (!pollQuestion.trim() && !caption.trim())) {
      toast.error('Poll question is required')
      return
    }
    if (postType === 'poll' && pollOptions.filter(o => o.trim() !== '').length < 2) {
      toast.error('At least 2 options are required for a poll')
      return
    }
    if (postType === 'standard' && !selectedFile && !caption.trim()) {
      toast.error('Post content cannot be empty')
      return
    }

    if (!currentUser) return

    setIsPosting(true)
    setUploadProgress(15)
    try {
      let publicUrl: string | null = null

      if (selectedFile) {
        publicUrl = await uploadMedia(selectedFile, currentUser.id, 'post')
      }
      setUploadProgress(75)

      let payload: any = {
        userId: currentUser.id,
        image_url: publicUrl,
        caption: caption.trim()
      }

      if (postType === 'poll') {
        payload.poll = {
          question: pollQuestion.trim() || caption.trim(),
          options: pollOptions.filter(o => o.trim() !== '')
        }
        if (!payload.caption) {
          payload.caption = pollQuestion.trim()
        }
      } else if (postType === 'event') {
        payload.event = {
          title: eventTitle.trim(),
          description: eventDescription.trim() || caption.trim() || null,
          eventDate: eventDate,
          location: eventLocation.trim() || null
        }
        if (!payload.caption) {
          payload.caption = eventTitle.trim()
        }
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Failed to create post')

      setUploadProgress(100)
      toast.success('Post created successfully!')
      setIsCreateOpen(false)
      setCaption('')
      setPollQuestion('')
      setPollOptions(['', ''])
      setEventTitle('')
      setEventDescription('')
      setEventDate('')
      setEventLocation('')
      setSelectedFile(null)
      setPreviewUrl(null)
      
      // Refresh page to load new feed items
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create post')
    } finally {
      setIsPosting(false)
      setUploadProgress(0)
    }
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6">
        
        {/* Stories */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <StoriesBar />
        </div>

        {/* Mockup "What's on your mind?" Card */}
        {isLoggedIn && currentUser && (
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-background">
                <AvatarImage src={currentUser.avatar || undefined} alt={currentUser.name} />
                <AvatarFallback className="bg-primary/10 text-primary uppercase">{currentUser.name?.[0]}</AvatarFallback>
              </Avatar>
              <button
                onClick={handleCreatePostClick}
                className="flex-1 text-left h-10 px-4 rounded-xl bg-secondary/30 text-muted-foreground text-sm hover:bg-secondary/50 transition-colors flex items-center cursor-pointer"
              >
                What's on your mind?
              </button>
            </div>
            
            <div className="border-t border-border/50 pt-3 flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
              <button
                onClick={() => triggerFileSelect('image')}
                className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <Image className="h-4 w-4 text-emerald-500" />
                <span>Photo</span>
              </button>

              <button
                onClick={() => triggerFileSelect('video')}
                className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <Film className="h-4 w-4 text-blue-500" />
                <span>Video</span>
              </button>

              <button
                onClick={handleCreatePollClick}
                className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <BarChart2 className="h-4 w-4 text-amber-500 rotate-90" />
                <span>Poll</span>
              </button>

              <button
                onClick={handleCreateEventClick}
                className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <Calendar className="h-4 w-4 text-purple-500" />
                <span>Event</span>
              </button>
            </div>
          </div>
        )}

        {/* Feed */}
        <PostFeed />
      </div>

      {/* Post Creation Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Post
            </DialogTitle>
          </DialogHeader>
          {currentUser && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentUser.avatar || undefined} />
                  <AvatarFallback>{currentUser.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1 font-bold text-sm">
                    <span>{currentUser.name}</span>
                    {((currentUser as any).isVerified || (currentUser as any).is_verified) && <Check className="h-3.5 w-3.5 text-primary fill-primary" />}
                  </div>
                  <span className="text-xs text-muted-foreground">@{currentUser.username}</span>
                </div>
              </div>

              {/* Post Type Selector Tabs */}
              <div className="flex gap-1.5 p-1 bg-secondary/15 rounded-xl text-xs font-semibold text-muted-foreground mb-1">
                {(['standard', 'poll', 'event'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostType(t)}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-lg text-center transition-all cursor-pointer capitalize",
                      postType === t ? "bg-background text-foreground shadow-sm font-bold" : "hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {postType === 'standard' && (
                <Textarea
                  placeholder="What's on your mind?"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="min-h-[100px] border-none focus-visible:ring-0 p-0 text-sm leading-relaxed resize-none shadow-none bg-transparent placeholder:text-muted-foreground outline-none text-foreground animate-in fade-in duration-200"
                />
              )}

              {postType === 'poll' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <Input
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="h-10 text-sm font-semibold rounded-xl bg-secondary/10 border-border/50 text-foreground"
                  />
                  <div className="space-y-2">
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                          className="h-9 text-xs rounded-xl bg-secondary/5 border-border/30 text-foreground"
                        />
                        {pollOptions.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => handleRemovePollOption(idx)}
                            className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {pollOptions.length < 6 && (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={handleAddPollOption}
                      className="text-xs font-semibold rounded-xl px-3 h-8 hover:bg-secondary/40 border-dashed border-border transition-colors cursor-pointer"
                    >
                      + Add Option
                    </Button>
                  )}
                  <Textarea
                    placeholder="Add a caption to your poll (optional)..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="min-h-[80px] border-none focus-visible:ring-0 p-0 text-xs leading-relaxed resize-none shadow-none bg-transparent placeholder:text-muted-foreground outline-none text-foreground mt-2"
                  />
                </div>
              )}

              {postType === 'event' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <Input
                    placeholder="Event Title"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="h-10 text-sm font-semibold rounded-xl bg-secondary/10 border-border/50 text-foreground"
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="h-9 text-xs rounded-xl bg-secondary/5 border-border/30 text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Location</label>
                      <Input
                        placeholder="Event Location"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        className="h-9 text-xs rounded-xl bg-secondary/5 border-border/30 text-foreground"
                      />
                    </div>
                  </div>

                  <Textarea
                    placeholder="Event description (optional)..."
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="min-h-[80px] border-none focus-visible:ring-0 p-0 text-xs leading-relaxed resize-none shadow-none bg-transparent placeholder:text-muted-foreground outline-none text-foreground"
                  />
                </div>
              )}

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                hidden
              />

              {previewUrl && (
                <div className="relative group w-full rounded-xl overflow-hidden border border-border/50 max-h-60 bg-secondary/15">
                  {selectedFile?.type.startsWith('video/') ? (
                    <video src={previewUrl} className="w-full max-h-60 object-contain" controls />
                  ) : (
                    <img src={previewUrl} alt="Selected preview" className="w-full max-h-60 object-cover" />
                  )}
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewUrl(null)
                    }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {isPosting && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4 text-xs font-semibold cursor-pointer"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/*,video/*'
                      fileInputRef.current.click()
                    }
                  }}
                  disabled={isPosting}
                >
                  Change Media
                </Button>
                <Button
                  size="sm"
                  onClick={handlePostSubmit}
                  disabled={
                    isPosting ||
                    (postType === 'standard' && !selectedFile && !caption.trim()) ||
                    (postType === 'poll' && !pollQuestion.trim() && !caption.trim()) ||
                    (postType === 'event' && (!eventTitle.trim() || !eventDate))
                  }
                  className="rounded-full px-6 font-semibold bg-gradient-to-r from-[#4B0082] to-[#9370DB] text-white cursor-pointer"
                >
                  Post
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
