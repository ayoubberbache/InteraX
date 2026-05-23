'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ImagePlus, X, ArrowLeft, UploadCloud, Music, Check, Sparkles } from 'lucide-react'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { useAuth } from '@/backend/lib/auth-context'
import { Button } from '@/frontend/components/ui/button'
import { Textarea } from '@/frontend/components/ui/textarea'
import { Input } from '@/frontend/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { uploadMedia } from '@/backend/lib/upload'
import { cn } from '@/backend/lib/utils'
import { toast } from 'sonner'
import { useLanguage } from '@/backend/lib/i18n/context'

export default function CreatePage() {
  const router = useRouter()
  const { currentUser, isLoggedIn } = useAuth()
  const { t } = useLanguage()

  const [postType, setPostType] = useState<'standard' | 'poll' | 'event'>('standard')
  const [caption, setCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Poll States
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])

  // Event States
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isLoggedIn || !currentUser) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
          <div className="h-20 w-20 bg-secondary/50 rounded-full flex items-center justify-center mb-6">
             <UploadCloud className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t('create_sign_in')}</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">{t('create_sign_in_desc')}</p>
          <Button asChild className="rounded-full px-8 bg-brand-gradient text-primary-foreground hover:opacity-90">
            <Link href="/login">{t('create_sign_in_btn')}</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions(prev => [...prev, ''])
    }
  }

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(prev => prev.filter((_, idx) => idx !== index))
    }
  }

  const handlePollOptionChange = (index: number, value: string) => {
    setPollOptions(prev => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const handlePost = async () => {
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
      toast.error(t('create_empty_err'))
      return
    }

    if (!currentUser?.id) {
      toast.error(t('create_login_err'))
      return
    }

    setIsPosting(true)
    setUploadProgress(10)
    try {
      let publicUrl: string | null = null

      // 1. Upload media if a file was selected and type is standard
      if (selectedFile && postType === 'standard') {
        publicUrl = await uploadMedia(selectedFile, currentUser.id, 'post')
      }
      setUploadProgress(70)

      // 2. Prepare payload
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

      // 3. Insert post record
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        let serverMsg = 'Failed to create post'
        try {
          const errBody = await response.json()
          if (errBody?.error) serverMsg = errBody.error
        } catch (_) {}
        throw new Error(serverMsg)
      }

      setUploadProgress(100)
      toast.success(t('create_success'))
      router.push('/')
    } catch (err: any) {
      toast.error(err.message || t('create_fail'))
    } finally {
      setIsPosting(false)
      setUploadProgress(0)
    }
  }

  const isVideo = selectedFile?.type.startsWith('video/')
  const isAudio = selectedFile?.type.startsWith('audio/')

  const isSubmitDisabled = 
    isPosting ||
    (postType === 'standard' && !selectedFile && !caption.trim()) ||
    (postType === 'poll' && !pollQuestion.trim() && !caption.trim()) ||
    (postType === 'event' && (!eventTitle.trim() || !eventDate))

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="sm" asChild className="rounded-full">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('create_discard')}
            </Link>
          </Button>
          <div className="flex items-center gap-2">
             <Sparkles className="h-5 w-5 text-primary animate-pulse" />
             <h1 className="text-xl font-bold tracking-tight">{t('create_post_title')}</h1>
          </div>
          <Button
            size="sm"
            onClick={handlePost}
            disabled={isSubmitDisabled}
            className={cn(
               "rounded-full px-6 transition-all duration-300 shadow-lg cursor-pointer",
               !isSubmitDisabled
                 ? "bg-brand-gradient text-primary-foreground hover:shadow-primary/25 font-bold" 
                 : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {isPosting ? (selectedFile ? t('create_uploading') : t('create_posting')) : t('post_btn_post')}
          </Button>
        </div>

        <div className="bg-card rounded-3xl shadow-sm border border-border p-6 mt-4">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10 border border-background flex-shrink-0">
              <AvatarImage src={currentUser.avatar || undefined} />
              <AvatarFallback>{currentUser.username?.[0] || 'U'}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-1">
                <p className="font-bold">@{currentUser.username}</p>
                {currentUser.isVerified && <Check className="h-3 w-3 bg-primary text-white rounded-full p-0.5" />}
              </div>

              {/* Post Type Selector Tabs */}
              <div className="flex gap-1.5 p-1 bg-secondary/15 rounded-2xl text-xs font-semibold text-muted-foreground mb-4">
                {(['standard', 'poll', 'event'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostType(t)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl text-center transition-all cursor-pointer capitalize font-bold",
                      postType === t ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Standard Post Render */}
              {postType === 'standard' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <Textarea
                    placeholder={t('post_share_thoughts')}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="min-h-[120px] border-none focus-visible:ring-0 p-0 text-base leading-relaxed resize-none shadow-none bg-transparent placeholder:text-muted-foreground outline-none text-foreground"
                  />

                  {/* Media Preview Stage */}
                  {selectedFile && previewUrl && (
                    <div className="relative group w-full max-w-lg rounded-2xl overflow-hidden border border-border/50 bg-secondary/10">
                      {isVideo ? (
                        <video src={previewUrl} controls className="w-full max-h-[500px] object-contain bg-black/5" />
                      ) : isAudio ? (
                        <div className="p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-secondary/50 to-background">
                          <div className="relative h-20 w-20 rounded-full bg-brand-gradient flex items-center justify-center shadow-xl mb-4 text-primary-foreground">
                            <Music className="h-8 w-8" />
                          </div>
                          <p className="font-medium text-sm mb-4 truncate w-full px-4">{selectedFile.name}</p>
                          <audio src={previewUrl} controls className="w-full max-w-[250px] accent-primary" />
                        </div>
                      ) : (
                        <img src={previewUrl} alt="Selected preview" className="w-full max-h-[500px] object-cover" />
                      )}
                      
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setSelectedFile(null)
                          setPreviewUrl(null)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Toolbar */}
                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect} 
                      accept="image/*,video/*,audio/*" 
                      hidden 
                    />
                    {!selectedFile && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-muted-foreground rounded-full hover:text-primary hover:bg-primary/10 cursor-pointer"
                        title="Add media"
                      >
                        <ImagePlus className="h-5 w-5" />
                      </Button>
                    )}
                    
                    <span className="text-xs text-muted-foreground ml-auto font-mono">
                      {caption.length} / 2200
                    </span>
                  </div>
                </div>
              )}

              {/* Poll Render */}
              {postType === 'poll' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <Input
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="h-11 text-sm font-semibold rounded-2xl bg-secondary/10 border-border/50 text-foreground px-4 focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                  <div className="space-y-3">
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                          className="h-10 text-xs rounded-2xl bg-secondary/5 border-border/30 text-foreground px-3 focus-visible:ring-1 focus-visible:ring-primary/20"
                        />
                        {pollOptions.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => handleRemovePollOption(idx)}
                            className="h-10 w-10 rounded-2xl hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer shrink-0"
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
                      className="text-xs font-semibold rounded-2xl px-4 h-9 hover:bg-secondary/40 border-dashed border-border transition-colors cursor-pointer"
                    >
                      + Add Option
                    </Button>
                  )}
                  <Textarea
                    placeholder="Add a caption to your poll (optional)..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="min-h-[100px] border-none focus-visible:ring-0 p-0 text-xs leading-relaxed resize-none shadow-none bg-transparent placeholder:text-muted-foreground outline-none text-foreground mt-2"
                  />
                </div>
              )}

              {/* Event Render */}
              {postType === 'event' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <Input
                    placeholder="Event Title"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="h-11 text-sm font-semibold rounded-2xl bg-secondary/10 border-border/50 text-foreground px-4 focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="h-10 text-xs rounded-2xl bg-secondary/5 border-border/30 text-foreground px-3 focus-visible:ring-1 focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Location</label>
                      <Input
                        placeholder="Event Location"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        className="h-10 text-xs rounded-2xl bg-secondary/5 border-border/30 text-foreground px-3 focus-visible:ring-1 focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  <Textarea
                    placeholder="Event description (optional)..."
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="min-h-[100px] border-none focus-visible:ring-0 p-0 text-xs leading-relaxed resize-none shadow-none bg-transparent placeholder:text-muted-foreground outline-none text-foreground"
                  />
                </div>
              )}
            </div>
          </div>
          
          {isPosting && (
            <div className="mt-4 pt-4 border-t border-border/50">
               <div className="flex justify-between text-muted-foreground text-xs mb-2 px-1">
                  <span>{selectedFile ? t('create_uploading') : t('create_posting')}</span>
                  <span>{uploadProgress}%</span>
               </div>
               <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
               </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
