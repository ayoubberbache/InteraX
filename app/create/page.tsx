'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ImagePlus, X, ArrowLeft, UploadCloud, Film, Music, Check, Sparkles, AlignLeft } from 'lucide-react'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { useAuth } from '@/backend/lib/auth-context'
import { Button } from '@/frontend/components/ui/button'
import { Textarea } from '@/frontend/components/ui/textarea'
import { Label } from '@/frontend/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { uploadMedia } from '@/backend/lib/upload'
import { cn } from '@/backend/lib/utils'
import { toast } from 'sonner'

export default function CreatePage() {
  const router = useRouter()
  const { currentUser, isLoggedIn } = useAuth()
  const [caption, setCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isLoggedIn || !currentUser) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
          <div className="h-20 w-20 bg-secondary/50 rounded-full flex items-center justify-center mb-6">
             <UploadCloud className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Sign in to share</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">Join the InteraX community to share your moments, music, and stories.</p>
          <Button asChild className="rounded-full px-8 bg-gradient-to-r from-[#4B0082] to-[#9370DB]">
            <Link href="/login">Sign In to Continue</Link>
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

  const handlePost = async () => {
    if (!selectedFile && !caption.trim()) {
      toast.error('Please add a caption or select a media file')
      return
    }

    if (!currentUser?.id) {
      toast.error('You must be logged in to post')
      return
    }

    setIsPosting(true)
    setUploadProgress(10)
    try {
      let publicUrl: string | null = null

      // 1. Upload media if a file was selected
      if (selectedFile) {
        publicUrl = await uploadMedia(selectedFile, currentUser.id, 'post')
      }
      setUploadProgress(70)

      // 2. Insert post record
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: publicUrl,
          caption: caption.trim(),
          userId: currentUser.id
        })
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
      toast.success('Expression shared! ✨')
      router.push('/')
    } catch (err: any) {
      toast.error(err.message || 'Failed to post. Check your connection.')
    } finally {
      setIsPosting(false)
      setUploadProgress(0)
    }
  }

  const isVideo = selectedFile?.type.startsWith('video/')
  const isAudio = selectedFile?.type.startsWith('audio/')

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="sm" asChild className="rounded-full">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Discard
            </Link>
          </Button>
          <div className="flex items-center gap-2">
             <Sparkles className="h-5 w-5 text-primary animate-pulse" />
             <h1 className="text-xl font-bold tracking-tight">Create Post</h1>
          </div>
          <Button
            size="sm"
            onClick={handlePost}
            disabled={(!selectedFile && !caption.trim()) || isPosting}
            className={cn(
               "rounded-full px-6 transition-all duration-300 shadow-lg",
               (selectedFile || caption.trim())
                 ? "bg-gradient-to-r from-[#4B0082] to-[#6366f1] text-white hover:shadow-primary/25" 
                 : "bg-secondary text-muted-foreground"
            )}
          >
            {isPosting ? (selectedFile ? 'Uploading...' : 'Posting...') : 'Post'}
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
                <p className="font-bold">{currentUser.username}</p>
                <Check className="h-3 w-3 bg-primary text-white rounded-full p-0.5" />
              </div>

              <Textarea
                placeholder="Share your thoughts..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[60px] border-none focus-visible:ring-0 p-0 text-base leading-relaxed resize-none shadow-none bg-transparent"
              />

              {/* Media Preview Stage */}
              {selectedFile && previewUrl && (
                <div className="relative group w-full max-w-lg rounded-2xl overflow-hidden border border-border/50 bg-secondary/10">
                  {isVideo ? (
                    <video src={previewUrl} controls className="w-full max-h-[500px] object-contain bg-black/5" />
                  ) : isAudio ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-secondary/50 to-background">
                      <div className="relative h-20 w-20 rounded-full bg-gradient-to-tr from-[#4B0082] to-[#9370DB] flex items-center justify-center shadow-xl mb-4">
                        <Music className="h-8 w-8 text-white" />
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
                    className="text-muted-foreground rounded-full hover:text-primary hover:bg-primary/10"
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
          </div>
          
          {isPosting && (
            <div className="mt-4 pt-4 border-t border-border/50">
               <div className="flex justify-between text-muted-foreground text-xs mb-2 px-1">
                  <span>{selectedFile ? 'Uploading media...' : 'Posting...'}</span>
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
