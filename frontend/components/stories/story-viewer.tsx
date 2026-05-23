'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Pause, Play, MoreVertical, Trash2, Heart } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { Button } from '@/frontend/components/ui/button'
import { formatTimeAgo, cn } from '@/backend/lib/utils'
import { useAuth } from '@/backend/lib/auth-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu'
import { useLanguage } from '@/backend/lib/i18n/context'
import { toast } from 'sonner'

interface ApiStory {
  id: string
  userId: string
  imageUrl: string
  timestamp: string
  author: {
    id: string
    username: string
    avatar?: string
    avatar_url?: string
    name?: string
  }
}

interface StoryViewerProps {
  story: ApiStory
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
  hasNext: boolean
  hasPrevious: boolean
  onDelete?: (id: string) => void
}

const STORY_DURATION = 5000 // 5 seconds per story item

export function StoryViewer({
  story,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  onDelete
}: StoryViewerProps) {
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hasLiked, setHasLiked] = useState(false)
  const [replyText, setReplyText] = useState('')
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null)
  const { currentUser } = useAuth()
  const { t } = useLanguage()

  // Owner views & reactions list state
  const [viewers, setViewers] = useState<any[]>([])
  const [allReactions, setAllReactions] = useState<any[]>([])
  const [loadingViewers, setLoadingViewers] = useState(false)
  const [loadingReactions, setLoadingReactions] = useState(false)
  const [showViewersPanel, setShowViewersPanel] = useState(false)
  const [activeTab, setActiveTab] = useState<'views' | 'reactions'>('views')

  useEffect(() => {
    setMounted(true)
  }, [])

  const user = story.author
  const currentItem = story // API currently treats each post as 1 story item
  
  const goToNextItem = useCallback(() => {
    if (hasNext) {
      onNext()
      setProgress(0)
    } else {
      onClose()
    }
  }, [hasNext, onNext, onClose])

  const goToPreviousItem = useCallback(() => {
    if (hasPrevious) {
      onPrevious()
      setProgress(0)
    }
  }, [hasPrevious, onPrevious])

  // Progress timer
  useEffect(() => {
    if (isPaused || isDeleting) return

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goToNextItem()
          return 0
        }
        return prev + (100 / (STORY_DURATION / 100))
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPaused, isDeleting, goToNextItem])

  // Sync media playback with isPaused state
  useEffect(() => {
    if (mediaRef.current) {
      if (isPaused) {
        mediaRef.current.pause()
      } else {
        mediaRef.current.play().catch(e => console.error('Playback failed', e))
      }
    }
  }, [isPaused])

  // Reset on story change
  useEffect(() => {
    setProgress(0)
    setHasLiked(false)
    setShowViewersPanel(false)

    // Load existing reactions
    fetch(`/api/stories/reactions?storyId=${story.id}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          if (currentUser && data.some((d: any) => d.userId === currentUser.id && d.emoji === '❤️')) {
            setHasLiked(true)
          }
        }
      })
      .catch(console.error)

    // Load viewers list if owner
    if (currentUser && currentUser.id === story.userId) {
      setLoadingViewers(true)
      fetch(`/api/stories/view?storyId=${story.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setViewers(data)
        })
        .catch(console.error)
        .finally(() => setLoadingViewers(false))

      setLoadingReactions(true)
      fetch(`/api/stories/reactions?storyId=${story.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllReactions(data)
        })
        .catch(console.error)
        .finally(() => setLoadingReactions(false))
    }
  }, [story.id, currentUser])

  const addReaction = (emoji: string) => {
    if (emoji === '❤️') {
      if (hasLiked) return // Prevent multiple likes
      setHasLiked(true)
    }
    
    if (currentUser) {
      fetch('/api/stories/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id, userId: currentUser.id, emoji })
      }).catch(console.error)
    }
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goToNextItem()
      if (e.key === 'ArrowLeft') goToPreviousItem()
      if (e.key === ' ') {
        e.preventDefault()
        setIsPaused(prev => !prev)
      }
    }

    if (!isDeleting) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, goToNextItem, goToPreviousItem, isDeleting])

  const handleDelete = async () => {
    setIsDeleting(true)
    setIsPaused(true)
    try {
      const res = await fetch(`/api/stories?id=${story.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser?.id || ''
        }
      })
      if (res.ok) {
        if (onDelete) onDelete(story.id)
        goToNextItem()
      } else {
        alert("Failed to delete story")
        setIsDeleting(false)
        setIsPaused(false)
      }
    } catch (e) {
      alert("Error deleting story")
      setIsDeleting(false)
      setIsPaused(false)
    }
  }

  const handleReply = async (e?: React.FormEvent, isLike = false, directEmoji?: string) => {
    e?.preventDefault()
    const textToSend = directEmoji || (isLike ? '❤️' : replyText.trim())
    if (!textToSend || !currentUser) return
    
    setReplyText('')
    setIsPaused(false) // Resume if they were paused while typing
    try {
      const convRes = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: story.userId, userId: currentUser.id })
      })
      if (!convRes.ok) throw new Error('Failed to create conversation')
      const conv = await convRes.json()

      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conv.id,
          text: `[Reply to story]: ${textToSend}`,
          userId: currentUser.id,
          media_url: currentItem.imageUrl,
          type: 'text'
        })
      })
      
      toast.success('Reply sent successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to send reply')
    }
  }

  if (!user || !currentItem) return null

  const isVideo = currentItem.imageUrl?.match(/\.(mp4|webm|mov)$/i)
  const isAudio = currentItem.imageUrl?.match(/\.(mp3|wav|ogg|m4a)$/i)

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm">
      <div className="relative w-full h-full md:max-w-[420px] md:h-[90vh] md:rounded-2xl overflow-hidden bg-black shadow-2xl">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 pt-safe">
          <div className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 pt-safe">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={user.avatar || user.avatar_url || undefined} alt={user.username} />
            <AvatarFallback>{user.username[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-white">{user.username}</p>
            <p className="text-xs text-white/70">{formatTimeAgo(currentItem.timestamp)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentUser && currentUser.id === story.userId && (
            <DropdownMenu onOpenChange={(open) => setIsPaused(open)}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 z-[110]">
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('story_delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Story Media */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {isVideo ? (
          <video
            ref={mediaRef as any}
            src={currentItem.imageUrl}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            muted={false}
            onEnded={goToNextItem}
            onError={(e) => console.error('Video playback error', e)}
          />
        ) : isAudio ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#4B0082]/40 to-black">
            <div className="h-32 w-32 rounded-full bg-gradient-to-tr from-[#4B0082] to-[#C084FC] flex items-center justify-center shadow-[0_0_40px_rgba(192,132,252,0.4)] mb-8 animate-pulse">
               <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            </div>
            <audio
              ref={mediaRef as any}
              src={currentItem.imageUrl}
              autoPlay
              onEnded={goToNextItem}
              onError={(e) => console.error('Audio playback error', e)}
              className="hidden"
            />
          </div>
        ) : (
          <Image
            src={currentItem.imageUrl}
            alt="Story"
            fill
            className="object-contain"
            priority
          />
        )}
      </div>

      {/* Tap zones for navigation */}
      <div className="absolute inset-0 z-10 flex">
        {/* Left tap zone - previous */}
        <button
          className="flex-1 h-full flex items-center justify-start pl-2 focus:outline-none"
          onClick={goToPreviousItem}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {hasPrevious && (
            <ChevronLeft className="h-8 w-8 text-white/50 opacity-0 hover:opacity-100 transition-opacity" />
          )}
        </button>
        
        {/* Right tap zone - next */}
        <button
          className="flex-1 h-full flex items-center justify-end pr-2 focus:outline-none"
          onClick={goToNextItem}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {hasNext && (
            <ChevronRight className="h-8 w-8 text-white/50 opacity-0 hover:opacity-100 transition-opacity" />
          )}
        </button>
      </div>

      {/* Reply input and Like Button for other users */}
      {currentUser && currentUser.id !== story.userId && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-6 flex items-center gap-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          <form onSubmit={handleReply} className="flex-1 flex items-center gap-2 bg-white/10 hover:bg-white/20 focus-within:bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10 transition-all">
            <input
              type="text"
              placeholder="Reply to story..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              className="flex-1 bg-transparent text-white placeholder-white/60 text-sm focus:outline-none py-1"
            />
            {replyText.trim() && (
              <Button type="submit" variant="ghost" size="sm" className="text-white hover:bg-white/20 text-xs font-semibold px-3 py-1 h-auto rounded-full">
                Send
              </Button>
            )}
          </form>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("rounded-full h-10 w-10 hover:bg-white/20 transition-transform hover:scale-110 shrink-0", hasLiked ? "text-red-500" : "text-white")}
            onClick={() => {
              if (!hasLiked) {
                addReaction('❤️')
                handleReply(undefined, true)
              }
            }}
          >
            <Heart className={cn("h-5 w-5", hasLiked && "fill-current")} />
          </Button>
        </div>
      )}

      {/* Views & Reactions button for owner */}
      {currentUser && currentUser.id === story.userId && (
        <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center bg-gradient-to-t from-black/80 to-transparent p-4 pb-6">
          <Button
            onClick={() => {
              setIsPaused(true)
              setShowViewersPanel(true)
            }}
            variant="secondary"
            className="rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-md gap-2 px-6 py-2 h-auto text-sm font-semibold cursor-pointer border border-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>{viewers.length} Views</span>
            {allReactions.length > 0 && (
              <span className="ml-1 border-l border-white/30 pl-2 flex items-center gap-1">
                <span>{allReactions[0]?.emoji}</span>
                <span>{allReactions.length}</span>
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Viewers & Reactions slide-up panel for owner */}
      {currentUser && currentUser.id === story.userId && showViewersPanel && (
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-card border-t border-border rounded-t-2xl z-40 p-4 text-foreground flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-border/50">
            <h3 className="font-bold text-sm">Story Activity</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full cursor-pointer"
              onClick={() => {
                setShowViewersPanel(false)
                setIsPaused(false)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-border/50 mb-3 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('views')}
              className={cn(
                "pb-2 border-b-2 px-1 cursor-pointer",
                activeTab === 'views' ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              )}
            >
              Views ({viewers.length})
            </button>
            <button
              onClick={() => setActiveTab('reactions')}
              className={cn(
                "pb-2 border-b-2 px-1 cursor-pointer",
                activeTab === 'reactions' ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              )}
            >
              Reactions ({allReactions.length})
            </button>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {activeTab === 'views' ? (
              loadingViewers ? (
                <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>
              ) : viewers.length > 0 ? (
                viewers.map((viewer) => (
                  <div key={viewer.user_id} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={viewer.avatar || undefined} />
                      <AvatarFallback>{viewer.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold truncate">{viewer.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">@{viewer.username}</p>
                    </div>
                    {viewer.created_at && (
                      <span className="text-[9px] text-muted-foreground">{formatTimeAgo(viewer.created_at)}</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No views yet</p>
              )
            ) : (
              loadingReactions ? (
                <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>
              ) : allReactions.length > 0 ? (
                allReactions.map((react, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={react.avatar || undefined} />
                      <AvatarFallback>{react.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold truncate">{react.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">@{react.username}</p>
                    </div>
                    <span className="text-lg p-1 bg-secondary/50 rounded-full leading-none flex items-center justify-center h-7 w-7 select-none">
                      {react.emoji}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No reactions yet</p>
              )
            )}
          </div>
        </div>
      )}



      </div>

      {/* Navigation arrows for desktop (moved outside the constrained container) */}
      <div className="hidden md:flex absolute inset-0 pointer-events-none items-center justify-between px-12 z-[110]">
        <div className="pointer-events-auto">
          {hasPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-transform hover:scale-110"
              onClick={goToPreviousItem}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
        </div>
        <div className="pointer-events-auto">
          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-transform hover:scale-110"
              onClick={goToNextItem}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
