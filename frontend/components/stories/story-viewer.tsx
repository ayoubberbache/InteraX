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
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null)
  const { currentUser } = useAuth()

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

    // Load existing reactions
    fetch(`/api/stories/reactions?storyId=${story.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          if (currentUser && data.some((d: any) => d.userId === currentUser.id && d.emoji === '❤️')) {
            setHasLiked(true)
          }
        }
      })
      .catch(console.error)
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
      
      // Flash a little feedback or just let it succeed silently
    } catch (err) {
      console.error(err)
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
                  Delete Story
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

      {/* Only Like Button for other users */}
      {currentUser && currentUser.id !== story.userId && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-6 pt-safe flex items-center justify-end bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
          <div className="pointer-events-auto">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("rounded-full h-14 w-14 hover:bg-white/20 transition-transform hover:scale-110", hasLiked ? "text-red-500" : "text-white")}
              onClick={() => {
                if (!hasLiked) addReaction('❤️')
              }}
            >
              <Heart className={cn("h-8 w-8", hasLiked && "fill-current")} />
            </Button>
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
