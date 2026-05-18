'use client'

import EmojiPicker from "emoji-picker-react"
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Send, X, Check, Copy, Link2, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/frontend/components/ui/dropdown-menu'
import { formatTimeAgo, formatNumber } from '@/backend/lib/utils'
import { useAuth } from '@/backend/lib/auth-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { Button } from '@/frontend/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/frontend/components/ui/card'
import { StarRating } from '@/frontend/components/rating/star-rating'
import { RatingDisplay } from '@/frontend/components/rating/rating-display'
import { Popover, PopoverContent, PopoverTrigger } from '@/frontend/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/frontend/components/ui/dialog'
import { cn } from '@/backend/lib/utils'
import { toast } from 'sonner'
import { useLanguage } from '@/backend/lib/i18n/context'

interface PostCardProps {
  post: any
  onDelete?: (id: string) => void
}

export function PostCard({ post, onDelete }: PostCardProps) {
  const { currentUser } = useAuth()
  const { t } = useLanguage()
  const [isLiked, setIsLiked] = useState(post.is_liked ?? false)
  const [selectedReact, setSelectedReact] = useState<string | null>(post.reaction || null)
  const [likesCount, setLikesCount] = useState(post.likes || 0)
  const [userRating, setUserRating] = useState(0)
  const [ratingData, setRatingData] = useState({
    rating: post.rating || 0,
    count: post.rating_count || 0
  })
  const [isSaved, setIsSaved] = useState(post.is_saved ?? false)
  const [showRating, setShowRating] = useState(false)

  // Comments
  const [comments, setComments] = useState<any[]>(post.comments || [])
  const [commentsFetched, setCommentsFetched] = useState(!!post.comments)
  const [showCommentsSection, setShowCommentsSection] = useState(false)
  const [showAllComments, setShowAllComments] = useState(false)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [commentText, setCommentText] = useState('')
  const commentInputRef = useRef<HTMLInputElement>(null)

  // Share
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false)
      }
    }
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShareMenu])

  // Internal Share
  const [internalShareOpen, setInternalShareOpen] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [loadingConvs, setLoadingConvs] = useState(false)

  // Like animation
  const [likeAnim, setLikeAnim] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

  const isOwner = currentUser?.id === (post.userId || post.user_id)
  // Safely build user object — never let it be undefined
  const rawUser = isOwner ? currentUser : (post.user || {})
  const user = {
    id: rawUser?.id || post.userId || post.user_id || '',
    name: rawUser?.name || rawUser?.full_name || 'InteraX User',
    username: rawUser?.username || 'user',
    avatar: rawUser?.avatar || rawUser?.avatar_url || '',
    is_verified: rawUser?.isVerified || rawUser?.is_verified || false,
  }

  if (!post.id) return null

  const handleDeletePost = async () => {
    if (!currentUser) return
    if (!confirm(t('post_delete_confirm'))) return
    try {
      const res = await fetch(`/api/posts?id=${post.id}&userId=${currentUser.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id },
      })
      if (res.ok) {
        setIsDeleted(true)
        onDelete?.(post.id)
        toast.success('Post deleted')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete post')
      }
    } catch {
      toast.error('Connection error')
    }
  }

  const handleReactClick = async (reaction: string) => {
    if (!currentUser) { toast.error('Please sign in to react'); return }
    
    const wasLiked = isLiked
    const prevReact = selectedReact
    
    if (selectedReact === reaction) {
      setSelectedReact(null)
      setIsLiked(false)
      setLikesCount(prev => prev - 1)
    } else {
      if (!isLiked) setLikesCount(prev => prev + 1)
      setIsLiked(true)
      setSelectedReact(reaction)
      setLikeAnim(true)
      setTimeout(() => setLikeAnim(false), 600)
    }

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, emoji: reaction })
      })
      if (!res.ok) throw new Error('API Error')
    } catch {
      setIsLiked(wasLiked)
      setSelectedReact(prevReact)
      setLikesCount(prev => wasLiked ? prev : prev - 1)
      toast.error('Connection error')
    }
  }

  const handleDoubleTapLike = () => {
    if (!isLiked) {
      handleReactClick('❤️')
    }
  }

  const handleRating = async (rating: number) => {
    if (!currentUser) { toast.error('Please sign in to rate'); return }
    try {
      const res = await fetch(`/api/posts/${post.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: rating, userId: currentUser.id })
      })
      if (res.ok) {
        const data = await res.json()
        setRatingData({ rating: data.rating, count: data.ratingCount })
        setUserRating(rating)
        setShowRating(false)
        toast.success('Rating submitted!')
      } else {
        toast.error('Failed to submit rating')
      }
    } catch (err) {
      toast.error('An error occurred')
    }
  }

  const handleSave = async () => {
    if (!currentUser) { toast.error('Please sign in to save posts'); return }
    const prev = isSaved
    setIsSaved(!isSaved)
    try {
      const res = await fetch(`/api/posts/${post.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.saved) toast.success('Post saved to your profile')
        else toast.info('Post removed from saved')
      } else {
        throw new Error('Failed to save')
      }
    } catch {
      setIsSaved(prev)
      toast.error('Connection error')
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || !currentUser) return
    
    const text = commentText.trim()
    setCommentText('')
    // Keep comment input open
    // setShowCommentInput(false)

    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, userId: currentUser.id })
      })
      
      if (res.ok) {
        const newComment = await res.json()
        setComments(prev => [...prev, newComment])
        toast.success('Comment added!')
      } else {
        toast.error('Failed to add comment')
      }
    } catch (err) {
      toast.error('Connection error')
    }
  }

  const toggleCommentsSection = async () => {
    setShowCommentsSection(prev => !prev)
    if (!showCommentsSection) {
      setShowCommentInput(true)
      setTimeout(() => commentInputRef.current?.focus(), 100)
      
      if (!commentsFetched) {
        try {
          const res = await fetch(`/api/posts/${post.id}/comments`)
          if (res.ok) {
            const data = await res.json()
            setComments(data)
            setCommentsFetched(true)
          }
        } catch (err) {
          console.error(err)
        }
      }
    }
  }

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddComment()
    }
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by @${user.username}`,
          text: post.content,
          url: shareUrl,
        })
      } catch {
        setShowShareMenu(true)
      }
    } else {
      setShowShareMenu(true)
    }
  }

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setShowShareMenu(false)
      }, 1500)
    } catch {
      setShowShareMenu(false)
    }
  }

  const openInternalShare = async () => {
    setShowShareMenu(false)
    setInternalShareOpen(true)
    if (!conversations.length && currentUser) {
      setLoadingConvs(true)
      try {
        const res = await fetch(`/api/conversations?userId=${currentUser.id}`)
        if (res.ok) setConversations(await res.json())
      } catch (err) {
        console.error(err)
      }
      setLoadingConvs(false)
    }
  }

  const sendSharedPost = async (conv: any) => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conv.id,
          senderId: currentUser.id,
          content: `Check out this post: ${window.location.origin}/post/${post.id}`
        })
      })
      if (res.ok) {
        toast.success('Shared to chat!')
        setInternalShareOpen(false)
      } else throw new Error()
    } catch {
      toast.error('Failed to share')
    }
  }

  const displayedComments = showAllComments ? comments : comments.slice(0, 2)
  const hasImage = !!post.image
  const hasContent = !!(post.content || post.caption)
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const captionText = post.content || post.caption || ''

  if (isDeleted) return null

  return (
    <Card className="overflow-hidden border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <Link href={`/profile/${user.id}`}>
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={user.avatar || user.avatar_url || undefined} alt={user.username} />
            <AvatarFallback>{user.username?.[0] || 'U'}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link 
            href={`/profile/${user.id}`}
            className="text-sm font-semibold hover:underline flex items-center gap-1"
          >
            {user.username}
            {user.is_verified && <Check className="h-3 w-3 text-primary fill-primary" />}
          </Link>
          <p className="text-xs text-muted-foreground">{formatTimeAgo(post.timestamp)}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {isOwner && (
              <DropdownMenuItem
                className="text-destructive font-medium cursor-pointer focus:bg-destructive/10 focus:text-destructive"
                onClick={handleDeletePost}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('post_delete_btn')}
              </DropdownMenuItem>
            )}
            {!isOwner && (
              <DropdownMenuItem className="text-muted-foreground cursor-not-allowed" disabled>
                {t('post_report_btn')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      {/* Content: text-only (Threads style) or image or image+caption */}
      {hasImage ? (
        <CardContent className="p-0">
          {/* Photo */}
          <div
            className="relative w-full cursor-pointer select-none bg-secondary/20"
            style={{ aspectRatio: '1 / 1' }}
            onDoubleClick={handleDoubleTapLike}
          >
            {post.image.toLowerCase().endsWith('.mp4') || post.image.toLowerCase().endsWith('.webm') ? (
              <video
                src={post.image}
                controls
                className="w-full h-full object-cover"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <Image
                src={post.image}
                alt={captionText || 'Post image'}
                fill
                className="object-cover"
              />
            )}
            {likeAnim && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="h-24 w-24 text-white fill-white drop-shadow-2xl animate-[likePopIn_0.6s_ease-out_forwards]" />
              </div>
            )}
          </div>
          {/* Caption below image */}
          {hasContent && (
            <div className="px-4 pt-3 pb-1">
              <p className={cn(
                'text-sm text-foreground leading-relaxed whitespace-pre-wrap',
                !captionExpanded && 'line-clamp-2'
              )}>
                {captionText}
              </p>
              {captionText.length > 100 && (
                <button
                  onClick={() => setCaptionExpanded(p => !p)}
                  className="text-xs font-semibold text-primary mt-1 hover:underline"
                >
                  {captionExpanded ? t('post_show_less') : t('post_show_more')}
                </button>
              )}
            </div>
          )}
        </CardContent>
      ) : hasContent ? (
        /* Text-only post — Threads style */
        <CardContent className="px-4 pb-2 pt-0">
          <div
            className="rounded-2xl bg-gradient-to-br from-secondary/40 to-secondary/20 p-5 cursor-pointer select-none min-h-[100px] flex flex-col justify-center"
            onDoubleClick={handleDoubleTapLike}
          >
            <p className={cn(
              'text-foreground leading-relaxed font-medium w-full whitespace-pre-wrap',
              !captionExpanded && captionText.length > 200 && 'line-clamp-4',
              captionText.length < 80 ? 'text-2xl' :
              captionText.length < 200 ? 'text-lg' : 'text-base'
            )}>
              {captionText}
            </p>
            {captionText.length > 200 && (
              <button
                onClick={(e) => { e.stopPropagation(); setCaptionExpanded(p => !p) }}
                className="text-xs font-semibold text-primary mt-2 self-start hover:underline"
              >
                {captionExpanded ? t('post_show_less') : t('post_show_more')}
              </button>
            )}
            {likeAnim && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="h-24 w-24 text-white fill-white drop-shadow-2xl animate-[likePopIn_0.6s_ease-out_forwards]" />
              </div>
            )}
          </div>
        </CardContent>
      ) : null}

      {/* Actions */}
      <CardFooter className="flex flex-col items-start gap-3 p-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-1 group relative">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-secondary"
                >
                  {selectedReact ? (
                    <span className="text-xl animate-in zoom-in spin-in-12 duration-300">{selectedReact}</span>
                  ) : (
                    <Heart className="h-6 w-6 text-muted-foreground transition-all duration-300 hover:text-red-500" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-auto p-2 flex gap-2 rounded-full shadow-xl border-border/50 animate-in fade-in slide-in-from-bottom-2">
                {['👏', '👍', '❤️', '🤗', '👎', '😂'].map(emoji => (
                  <button 
                    key={emoji}
                    onClick={(e) => { e.stopPropagation(); handleReactClick(emoji) }}
                    className="h-10 w-10 text-2xl hover:scale-125 hover:-translate-y-2 transition-transform duration-200 flex items-center justify-center rounded-full hover:bg-secondary cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-blue-50 hover:text-blue-500"
              onClick={toggleCommentsSection}
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
            <div className="relative" ref={shareMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-secondary"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5" />
              </Button>
              {showShareMenu && (
                <div className="absolute left-0 bottom-full mb-2 z-20 bg-popover border border-border rounded-xl p-2 shadow-xl min-w-[200px] animate-in fade-in slide-in-from-bottom-2">
                  <button
                    onClick={openInternalShare}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors mb-1"
                  >
                    <Send className="h-4 w-4" />
                    <span className="text-xs">{t('post_share_msg')}</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-500 font-medium text-xs">{t('post_link_copied')}</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4" />
                        <span className="text-xs">{t('post_copy_link')}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowShareMenu(false)}
                    className="flex items-center gap-2 w-full px-4 py-1 text-xs rounded-lg hover:bg-red-50 text-red-500 transition-colors mt-1"
                  >
                    <X className="h-3 w-3" />
                    <span>{t('post_cancel')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Rating Toggle */}
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                className="h-9 px-3 gap-1.5 rounded-full bg-secondary/50"
                onClick={() => setShowRating(!showRating)}
              >
                <RatingDisplay rating={ratingData.rating} count={ratingData.count} size="sm" />
              </Button>
              {showRating && (
                <div className="absolute right-0 bottom-full mb-3 z-30 bg-popover border border-border rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 min-w-[200px]">
                  <p className="text-xs font-semibold mb-3 text-center">{t('post_quality_rating')}</p>
                  <div className="flex justify-center">
                    <StarRating
                      rating={userRating}
                      interactive
                      onRatingChange={handleRating}
                    />
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-widest px-1">
                    <span>{t('post_authentic')}</span>
                    <span>{t('post_high_quality')}</span>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={handleSave}
            >
              <Bookmark
                className={cn(
                  'h-5 w-5 transition-all duration-300',
                  isSaved && 'fill-primary text-primary scale-110'
                )}
              />
            </Button>
          </div>
        </div>

        {/* Info — likes count only; caption shown above for photo posts */}
        <div className="space-y-1 w-full px-1">
          <p className="text-sm font-bold tracking-tight">{formatNumber(likesCount)} {t('post_positive_vibes')}</p>

          {/* For photo-only posts (no caption shown above), show username inline */}
          {!hasContent && (
            <p className="text-sm text-muted-foreground">
              <Link href={`/profile/${user.id}`} className="font-bold text-foreground mr-2 hover:text-primary transition-colors">
                {user.username}
              </Link>
            </p>
          )}

          {/* Comments section */}
          {showCommentsSection && (
            <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
              {comments.length > 2 && !showAllComments && (
                <button
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setShowAllComments(true)}
                >
                  {t('post_view_all_expr')} {comments.length} {t('post_expressions')}
                </button>
              )}
              {displayedComments.map(comment => (
                <div key={comment.id} className="text-sm flex gap-2">
                  <span className="font-bold flex-shrink-0">@{comment.user?.username || 'user'}</span>
                  <span className="text-muted-foreground">{comment.content}</span>
                </div>
              ))}
              {showAllComments && comments.length > 2 && (
                <button
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setShowAllComments(false)}
                >
                  {t('post_show_less')}
                </button>
              )}
            </div>
          )}

          {/* Comment input functionality */}
          {showCommentsSection && currentUser && (
            <div className={cn(
              "flex items-center gap-2 w-full pt-3 mt-1",
              !showCommentInput && "opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all"
            )}>
              <div className="h-8 w-8 rounded-full overflow-hidden border border-border flex-shrink-0">
                 <Avatar className="h-full w-full">
                    <AvatarImage src={currentUser?.avatar || undefined} />
                    <AvatarFallback>{currentUser?.username?.[0] || 'U'}</AvatarFallback>
                 </Avatar>
              </div>
              <div className="relative flex-1">
                <input
                  ref={commentInputRef}
                  type="text"
                  placeholder={t('post_share_thoughts')}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  className="w-full text-sm bg-transparent outline-none py-1.5 pr-8"
                  onFocus={() => setShowCommentInput(true)}
                />
                
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-0 top-1 text-lg hover:scale-110 transition-transform"
                >
                  😊
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50 shadow-xl border border-border/50 rounded-lg">
                    <EmojiPicker
                      onEmojiClick={(emojiData: any) => {
                        setCommentText(prev => prev + emojiData.emoji)
                        setShowEmojiPicker(false)
                      }}
                    />
                  </div>
                )}
              </div>
              {showCommentInput && commentText.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddComment}
                  className="text-primary font-bold hover:bg-primary/10"
                >
                  {t('post_btn_post')}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardFooter>

      {/* Internal Share Dialog */}
      <Dialog open={internalShareOpen} onOpenChange={setInternalShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('post_share_chat_title')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {loadingConvs ? (
              <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>
            ) : conversations.length > 0 ? (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => sendSharedPost(conv)}
                  className="w-full flex items-center justify-between p-3 hover:bg-secondary rounded-lg transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={conv.is_group ? conv.group_avatar : conv.other_user?.avatar_url} />
                      <AvatarFallback>{(conv.is_group ? conv.group_name : conv.other_user?.full_name)?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{conv.is_group ? conv.group_name : conv.other_user?.full_name}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" className="h-8 rounded-full ml-3 shrink-0">{t('post_share_send')}</Button>
                </button>
              ))
            ) : (
              <p className="text-center text-muted-foreground text-sm">{t('post_no_convos')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
