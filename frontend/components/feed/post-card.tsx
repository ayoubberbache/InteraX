'use client'

import EmojiPicker from "emoji-picker-react"
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Send, X, Check, Copy, Link2, Trash2, AlertTriangle, ThumbsUp, Calendar } from 'lucide-react'
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
  const [isLiked, setIsLiked] = useState<boolean>(post.is_liked ?? false)
  const [selectedReact, setSelectedReact] = useState<string | null>(post.reaction || null)
  const [likesCount, setLikesCount] = useState<number>(post.likes || 0)
  const [uniqueEmojis, setUniqueEmojis] = useState<string[]>(post.uniqueEmojis || [])
  const [userRating, setUserRating] = useState(0)
  const [ratingData, setRatingData] = useState({
    rating: post.rating || 0,
    count: post.rating_count || 0
  })
  const [isSaved, setIsSaved] = useState(post.is_saved ?? false)
  const [showRating, setShowRating] = useState(false)

  // Reactors Dialog State
  const [showReactorsModal, setShowReactorsModal] = useState(false)
  const [reactors, setReactors] = useState<any[]>([])
  const [loadingReactors, setLoadingReactors] = useState(false)

  // Comments
  const [comments, setComments] = useState<any[]>(post.comments || [])
  const [commentsFetched, setCommentsFetched] = useState(!!post.comments)
  const [showCommentsSection, setShowCommentsSection] = useState(false)
  const [showAllComments, setShowAllComments] = useState(false)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [commentText, setCommentText] = useState('')
  const commentInputRef = useRef<HTMLInputElement>(null)

  // Poll States
  const [pollOptions, setPollOptionsState] = useState<any[]>(post.poll?.options || [])
  const [pollTotalVotes, setPollTotalVotes] = useState<number>(post.poll?.total_votes || 0)
  const [userVotedOptionId, setUserVotedOptionId] = useState<string | null>(post.poll?.user_voted_option_id || null)

  const handleVote = async (optionId: string) => {
    if (!currentUser) {
      toast.error('You must be logged in to vote')
      return
    }
    try {
      const res = await fetch(`/api/polls/${post.poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId, userId: currentUser.id })
      })
      if (res.ok) {
        const data = await res.json()
        setPollOptionsState(data.options)
        setPollTotalVotes(data.total_votes)
        setUserVotedOptionId(data.user_voted_option_id)
        toast.success('Vote submitted!')
      } else {
        toast.error('Failed to submit vote')
      }
    } catch (err) {
      console.error(err)
      toast.error('Connection error')
    }
  }

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
  const [shareableUsers, setShareableUsers] = useState<any[]>([])
  const [loadingShareable, setLoadingShareable] = useState(false)

  // Like animation
  const [likeAnim, setLikeAnim] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

  // Report post state
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('spam')
  const [reportDetails, setReportDetails] = useState('')
  const [isReporting, setIsReporting] = useState(false)

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

  const handleReportPost = async () => {
    if (!currentUser) return
    setIsReporting(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          reason: reportReason,
          details: reportDetails
        })
      })
      if (res.ok) {
        toast.success('Thank you for your report. The content is under review.')
        setReportOpen(false)
        setReportDetails('')
      } else {
        throw new Error('Failed to submit report')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit report. Please try again.')
    } finally {
      setIsReporting(false)
    }
  }

  const handleSelectReaction = async (emoji: string) => {
    if (!currentUser) { toast.error('Please sign in to react'); return }
    
    const prevReact = selectedReact
    const prevLiked = isLiked
    
    setIsLiked(true)
    setSelectedReact(emoji)
    
    if (!prevLiked) {
      setLikesCount(prev => prev + 1)
    }

    if (emoji && !uniqueEmojis.includes(emoji)) {
      setUniqueEmojis(prev => [...prev.slice(0, 2), emoji])
    }

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, emoji })
      })
      if (!res.ok) throw new Error('API Error')
    } catch {
      setIsLiked(prevLiked)
      setSelectedReact(prevReact)
      if (!prevLiked) {
        setLikesCount(prev => prev - 1)
      }
      toast.error('Connection error')
    }
  }

  const handleLikeToggle = async () => {
    if (!currentUser) { toast.error('Please sign in to react'); return }
    
    const wasLiked = isLiked
    const prevReact = selectedReact
    
    if (wasLiked) {
      setIsLiked(false)
      setSelectedReact(null)
      setLikesCount(prev => prev - 1)
      try {
        const res = await fetch(`/api/posts/${post.id}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, emoji: null })
        })
        if (!res.ok) throw new Error('API Error')
      } catch {
        setIsLiked(wasLiked)
        setSelectedReact(prevReact)
        setLikesCount(prev => prev + 1)
        toast.error('Connection error')
      }
    } else {
      handleSelectReaction('👍')
    }
  }

  const handleDoubleTapLike = () => {
    if (!isLiked) {
      handleLikeToggle()
    }
  }

  const openReactorsModal = async () => {
    setShowReactorsModal(true)
    setLoadingReactors(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/like`)
      if (res.ok) {
        setReactors(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingReactors(false)
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
    if (!shareableUsers.length && currentUser) {
      setLoadingShareable(true)
      try {
        const res = await fetch(`/api/users/relations?userId=${currentUser.id}&type=following`)
        if (res.ok) {
          const body = await res.json()
          setShareableUsers(body.data || [])
        }
      } catch (err) {
        console.error(err)
      }
      setLoadingShareable(false)
    }
  }

  const sendSharedPost = async (targetUser: any) => {
    if (!currentUser) return
    try {
      // 1. Get or create conversation with the user
      const convRes = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          targetUserId: targetUser.id
        })
      })
      if (!convRes.ok) throw new Error('Failed to create/get conversation')
      const conv = await convRes.json()

      // 2. Send the message containing the post URL
      const msgRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conv.id,
          userId: currentUser.id,
          text: `Check out this post: ${window.location.origin}/post/${post.id}`
        })
      })
      if (msgRes.ok) {
        toast.success('Shared to chat!')
        setInternalShareOpen(false)
      } else throw new Error('Failed to send message')
    } catch (err) {
      console.error(err)
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
            <AvatarImage src={user.avatar || undefined} alt={user.username} />
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
              <DropdownMenuItem 
                className="text-amber-600 font-semibold cursor-pointer focus:bg-amber-50 focus:text-amber-700 dark:focus:bg-amber-950/20"
                onClick={() => setReportOpen(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {t('post_report_btn')}
              </DropdownMenuItem>
             )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      {/* Content: text-only (Threads style) or image or image+caption */}
      {hasImage ? (
        <CardContent className="px-4 pb-3 pt-0">
          {/* Photo */}
          <div
            className="relative w-full cursor-pointer select-none bg-secondary/20 overflow-hidden rounded-2xl border border-border/30"
            style={{ aspectRatio: '1.5 / 1' }}
            onDoubleClick={handleDoubleTapLike}
          >
            {post.image.toLowerCase().endsWith('.mp4') || post.image.toLowerCase().endsWith('.webm') ? (
              <video
                src={post.image}
                controls
                className="w-full h-full object-cover rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <Image
                src={post.image}
                alt={captionText || 'Post image'}
                fill
                className="object-cover rounded-2xl"
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

      {/* Render Poll (if exists) */}
      {post.poll && (
        <div className="px-4 pb-3 pt-2 space-y-3">
          <h3 className="font-semibold text-sm text-foreground">{post.poll.question}</h3>
          <div className="space-y-2">
            {pollOptions.map((opt: any) => {
              const totalVotes = pollTotalVotes;
              const percent = totalVotes > 0 ? Math.round((opt.votes_count / totalVotes) * 100) : 0;
              const hasVoted = !!userVotedOptionId;
              
              return (
                <div key={opt.id} className="relative w-full">
                  {hasVoted ? (
                    // Voted view: show percentage progress bar
                    <div className="relative w-full h-10 border border-border/60 bg-secondary/10 rounded-xl overflow-hidden flex items-center justify-between px-4 text-xs font-medium">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-primary/10 transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                      <span className="relative z-10 text-foreground truncate max-w-[70%] flex items-center gap-1.5">
                        {opt.option_text}
                        {userVotedOptionId === opt.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                      </span>
                      <span className="relative z-10 text-muted-foreground font-bold shrink-0">{percent}% ({opt.votes_count})</span>
                    </div>
                  ) : (
                    // Actionable view: click to vote
                    <button
                      onClick={() => handleVote(opt.id)}
                      className="w-full h-10 border border-border/80 hover:border-primary/50 hover:bg-primary/5 rounded-xl flex items-center px-4 text-xs font-semibold text-foreground transition-all text-left cursor-pointer active:scale-[0.99]"
                    >
                      {opt.option_text}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">
            {pollTotalVotes} {pollTotalVotes === 1 ? 'vote' : 'votes'}
          </p>
        </div>
      )}

      {/* Render Event (if exists) */}
      {post.event && (
        <div className="px-4 pb-4 pt-2">
          <div className="border border-border/80 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-block bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Upcoming Event
                </span>
                <h3 className="font-bold text-base text-foreground leading-tight">{post.event.title}</h3>
              </div>
              <Calendar className="h-5 w-5 text-primary shrink-0 mt-1" />
            </div>

            {post.event.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{post.event.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-border/30">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                <span className="truncate">
                  {new Date(post.event.event_date).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </span>
              </div>
              {post.event.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-muted-foreground/80 font-bold shrink-0">📍</span>
                  <span className="truncate">{post.event.location}</span>
                </div>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success("Reminder set! You'll be notified when the event arrives.");
              }}
              className="w-full text-xs font-semibold rounded-xl h-9 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
            >
              Set Reminder
            </Button>
          </div>
        </div>
      )}

       {/* Reactions Summary & Comments Count */}
      <div className="w-full flex items-center justify-between px-4 pb-2 text-xs text-muted-foreground border-b border-border/50">
        <div className="flex items-center gap-1.5">
          {uniqueEmojis.length > 0 ? (
            <div className="flex -space-x-1 items-center">
              {uniqueEmojis.map((emoji, idx) => (
                <span key={idx} className="text-sm select-none animate-in zoom-in-50 duration-200" style={{ zIndex: 3 - idx }}>
                  {emoji}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm select-none">👍</span>
          )}
          <button onClick={openReactorsModal} className="hover:underline font-medium">
            {likesCount}
          </button>
        </div>
        <button onClick={toggleCommentsSection} className="hover:underline font-medium">
          {comments.length || post.commentsCount || 0} {t('post_comments_count') || 'Comments'}
        </button>
      </div>

      {/* Actions */}
      <CardFooter className="p-2 flex items-center justify-around w-full relative">
        {/* Like Button with Reactions Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold select-none cursor-pointer",
                isLiked ? "text-primary font-bold" : "text-muted-foreground"
              )}
            >
              {isLiked && selectedReact ? (
                <span className="text-base leading-none">{selectedReact}</span>
              ) : (
                <ThumbsUp className="h-4 w-4" />
              )}
              <span>
                {isLiked && selectedReact
                  ? selectedReact === '❤️'
                    ? 'Love'
                    : selectedReact === '👍'
                    ? 'Like'
                    : selectedReact === '👎'
                    ? 'Dislike'
                    : selectedReact === '👏'
                    ? 'Clap'
                    : selectedReact === '😂'
                    ? 'Laugh'
                    : 'Wondering'
                  : 'React'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1.5 rounded-full flex gap-1.5 bg-background border border-border shadow-xl animate-in fade-in slide-in-from-bottom-2 z-50">
            {['👍', '❤️', '👎', '👏', '😂', '🤔'].map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectReaction(emoji)
                }}
                className={cn(
                  "text-2xl hover:scale-125 transition-transform p-1 select-none active:scale-95 cursor-pointer rounded-full",
                  isLiked && selectedReact === emoji ? "bg-primary/20 scale-110" : "hover:bg-secondary/50"
                )}
              >
                {emoji}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Comments Button */}
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={toggleCommentsSection}
        >
          <MessageCircle className="h-4 w-4" />
          <span>Comments</span>
        </Button>

        {/* Share Button */}
        <div className="relative" ref={shareMenuRef}>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
          {showShareMenu && (
            <div className="absolute right-0 bottom-full mb-2 z-20 bg-popover border border-border rounded-xl p-2 shadow-xl min-w-[200px] animate-in fade-in slide-in-from-bottom-2">
              <button
                onClick={openInternalShare}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors mb-1 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span className="text-xs">{t('post_share_msg')}</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors cursor-pointer"
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
                className="flex items-center gap-2 w-full px-4 py-1 text-xs rounded-lg hover:bg-red-50 text-red-500 transition-colors mt-1 cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>{t('post_cancel')}</span>
              </button>
            </div>
          )}
        </div>
      </CardFooter>

      {/* Comments section */}
      {showCommentsSection && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          {comments.length > 2 && !showAllComments && (
            <button
              className="text-xs font-semibold text-primary hover:underline transition-colors block text-left"
              onClick={() => setShowAllComments(true)}
            >
              View all {comments.length} comments
            </button>
          )}
          
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {displayedComments.map((comment) => (
              <div key={comment.id} className="text-sm flex gap-2 items-start">
                <Avatar className="h-6 w-6 border border-border shrink-0">
                  <AvatarImage src={comment.user?.avatar || undefined} />
                  <AvatarFallback className="bg-primary/5 text-primary text-[10px] uppercase font-bold">{comment.user?.username?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-secondary/20 rounded-2xl px-3 py-1.5 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs truncate">@{comment.user?.username || 'user'}</span>
                    {comment.user?.isVerified && <span className="inline-block bg-blue-500 text-white rounded-full p-0.5 text-[6px] leading-none">✓</span>}
                  </div>
                  <p className="text-foreground text-xs leading-relaxed mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>

          {showAllComments && comments.length > 2 && (
            <button
              className="text-xs font-semibold text-primary hover:underline transition-colors block text-left"
              onClick={() => setShowAllComments(false)}
            >
              Show less
            </button>
          )}

          {/* Comment input functionality */}
          {currentUser && (
            <div className={cn(
              "flex items-center gap-2 w-full pt-2 border-t border-border/30 mt-2",
              !showCommentInput && "opacity-80 transition-all"
            )}>
              <Avatar className="h-7 w-7 border border-border flex-shrink-0">
                <AvatarImage src={currentUser?.avatar || undefined} />
                <AvatarFallback className="bg-primary/5 text-primary text-[10px] uppercase font-bold">{currentUser?.username?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="relative flex-1 bg-secondary/10 hover:bg-secondary/20 focus-within:bg-secondary/20 focus-within:ring-1 focus-within:ring-primary/20 rounded-2xl px-3 py-1.5 flex items-center transition-all">
                <input
                  ref={commentInputRef}
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  className="w-full text-xs bg-transparent outline-none pr-8 text-foreground placeholder:text-muted-foreground"
                  onFocus={() => setShowCommentInput(true)}
                />
                
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-3 text-sm hover:scale-110 transition-transform cursor-pointer"
                >
                  😊
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50 shadow-2xl border border-border/50 rounded-2xl overflow-hidden bg-background">
                    <EmojiPicker
                      onEmojiClick={(emojiData: any) => {
                        setCommentText(prev => prev + emojiData.emoji)
                        setShowEmojiPicker(false)
                      }}
                      width={300}
                      height={350}
                    />
                  </div>
                )}
              </div>
              {commentText.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddComment}
                  className="text-primary font-bold hover:bg-primary/10 rounded-full h-8 px-3 text-xs"
                >
                  Post
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Internal Share Dialog */}
      <Dialog open={internalShareOpen} onOpenChange={setInternalShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('post_share_chat_title')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {loadingShareable ? (
              <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>
            ) : shareableUsers.length > 0 ? (
              shareableUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => sendSharedPost(u)}
                  className="w-full flex items-center justify-between p-3 hover:bg-secondary rounded-lg transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback>{u.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
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
      {/* Report Post Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Report Post
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Please select a reason why you are reporting this post.
            </p>
            <div className="space-y-2">
              {[
                { value: 'spam', label: 'Spam' },
                { value: 'harassment', label: 'Harassment or Bullying' },
                { value: 'inappropriate', label: 'Inappropriate Content' },
                { value: 'misinformation', label: 'False Information' },
                { value: 'other', label: 'Other Reason' }
              ].map(reason => (
                <label 
                  key={reason.value} 
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-secondary/40 cursor-pointer transition-colors",
                    reportReason === reason.value && "border-primary bg-primary/5"
                  )}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={reason.value}
                    checked={reportReason === reason.value}
                    onChange={() => setReportReason(reason.value)}
                    className="accent-primary h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-foreground">{reason.label}</span>
                </label>
              ))}
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Additional Details</label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Help us understand the issue (optional)..."
                rows={3}
                className="w-full text-sm p-3 rounded-xl border border-border/50 bg-secondary/20 outline-none focus:ring-1 focus:ring-primary/50 resize-none transition-all text-foreground"
              />
            </div>
            
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => setReportOpen(false)} className="rounded-xl font-semibold">
                Cancel
              </Button>
              <Button
                onClick={handleReportPost}
                disabled={isReporting}
                className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-xl px-5 font-semibold border-0 shadow-md transition-all"
              >
                {isReporting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Reactors Dialog */}
      <Dialog open={showReactorsModal} onOpenChange={setShowReactorsModal}>
        <DialogContent className="max-w-md w-[90vw] p-6 rounded-2xl max-h-[70vh] flex flex-col bg-background border border-border">
          <DialogHeader className="border-b border-border pb-3 mb-2">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 fill-red-500 text-red-500" />
              <span>{t('post_reacted_users_title') || 'Reactions'}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {loadingReactors ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2 text-muted-foreground text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                <span>Loading reactions...</span>
              </div>
            ) : reactors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No reactions yet.
              </div>
            ) : (
              reactors.map((reactor: any) => (
                <div key={reactor.id} className="flex items-center justify-between">
                  <Link
                    href={`/profile/${reactor.id}`}
                    onClick={() => setShowReactorsModal(false)}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reactor.avatar || undefined} />
                      <AvatarFallback>{reactor.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-sm flex items-center gap-1">
                        {reactor.name}
                        {reactor.is_verified && (
                          <span className="inline-block bg-blue-500 text-white rounded-full p-0.5 text-[8px] leading-none">✓</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">@{reactor.username}</span>
                    </div>
                  </Link>
                  <span className="text-xl">{reactor.emoji || '❤️'}</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
