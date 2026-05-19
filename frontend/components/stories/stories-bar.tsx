'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { StoryRing } from './story-ring'
import { StoryViewer } from './story-viewer'
import { useAuth } from '@/backend/lib/auth-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { cn } from '@/backend/lib/utils'
import { uploadMedia } from '@/backend/lib/upload'
import { useLanguage } from '@/backend/lib/i18n/context'

export function StoriesBar() {
  const { currentUser } = useAuth()
  const { t } = useLanguage()
  const [stories, setStories] = useState<any[]>([])
  const [selectedStory, setSelectedStory] = useState<any | null>(null)
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadStories = async () => {
    try {
      const res = await fetch(`/api/stories${currentUser?.id ? `?viewerId=${currentUser.id}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        // Sort to group by user, then by time
        data.sort((a: any, b: any) => {
          if (a.userId === b.userId) return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          return a.userId.localeCompare(b.userId)
        })
        setStories(data)
      }
    } catch (err) {
      console.error('Failed to load stories', err)
    }
  }

  useEffect(() => {
    if (!currentUser) return
    try {
      const stored = localStorage.getItem(`interax_viewed_stories_${currentUser.id}`)
      if (stored) {
        setViewedStories(new Set(JSON.parse(stored)))
      } else {
        setViewedStories(new Set())
      }
    } catch (e) {}
    loadStories()
  }, [currentUser?.id])

  const markViewed = (id: string) => {
    if (!currentUser) return
    setViewedStories(prev => {
      const next = new Set(prev).add(id)
      localStorage.setItem(`interax_viewed_stories_${currentUser.id}`, JSON.stringify(Array.from(next)))
      return next
    })
  }

  const handleStoryClick = (story: any) => {
    setSelectedStory(story)
  }

  const handleCloseViewer = () => {
    if (selectedStory) markViewed(selectedStory.id)
    setSelectedStory(null)
  }

  const handleNextStory = () => {
    if (!selectedStory) return
    markViewed(selectedStory.id)
    const currentIndex = stories.findIndex(s => s.id === selectedStory.id)
    if (currentIndex < stories.length - 1) {
      setSelectedStory(stories[currentIndex + 1])
    } else {
      setSelectedStory(null)
    }
  }

  const handlePreviousStory = () => {
    if (!selectedStory) return
    const currentIndex = stories.findIndex(s => s.id === selectedStory.id)
    if (currentIndex > 0) {
      setSelectedStory(stories[currentIndex - 1])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentUser) return
    const file = e.target.files[0]
    
    setIsUploading(true)
    try {
      const url = await uploadMedia(file, currentUser.id, 'story')
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          media_url: url,
          userId: currentUser?.id 
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to save story to database.")
      }

      await loadStories()
    } catch (err: any) {
      console.error(err)
      alert(`Story error: ${err.message || "Failed to upload story."}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 p-4">
          {/* Your story - add new */}
          {currentUser && (
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" hidden />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="relative h-16 w-16 flex items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors"
              >
                <Avatar className={cn("h-14 w-14", isUploading && "opacity-50")}>
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  {isUploading ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </div>
              </button>
              <span className="text-xs text-muted-foreground truncate w-16 text-center">
                {isUploading ? t('story_uploading') : t('story_your_story')}
              </span>
            </div>
          )}

          {/* Grouped stories */}
          {Array.from(stories.reduce((acc, story) => {
            if (!acc.has(story.userId)) acc.set(story.userId, { user: story.author, stories: [] })
            acc.get(story.userId)!.stories.push(story)
            return acc
          }, new Map<string, { user: any, stories: any[] }>()).values()).map(({ user, stories: userStories }) => {
            if (!user) return null

            // A group has unviewed if any story in the group is unviewed
            const hasUnviewed = userStories.some((s: any) => !viewedStories.has(s.id))
            
            // When clicked, start at the first unviewed story, or the first story overall
            const handleGroupClick = () => {
              const firstUnviewed = userStories.find((s: any) => !viewedStories.has(s.id))
              handleStoryClick(firstUnviewed || userStories[0])
            }

            return (
              <div key={user.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                <StoryRing
                  src={user.avatar || undefined}
                  alt={user.username}
                  fallback={user.username?.[0]?.toUpperCase() || 'U'}
                  hasUnviewed={hasUnviewed}
                  onClick={handleGroupClick}
                />
                <span className={cn(
                  'text-xs truncate w-16 text-center',
                  !hasUnviewed ? 'text-muted-foreground' : 'text-foreground'
                )}>
                  {user.username}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {selectedStory && (
        <StoryViewer
          story={selectedStory}
          onClose={handleCloseViewer}
          onNext={handleNextStory}
          onPrevious={handlePreviousStory}
          hasNext={stories.findIndex(s => s.id === selectedStory.id) < stories.length - 1}
          hasPrevious={stories.findIndex(s => s.id === selectedStory.id) > 0}
          onDelete={(id) => {
            setStories(prev => prev.filter(s => s.id !== id))
          }}
        />
      )}
    </>
  )
}
