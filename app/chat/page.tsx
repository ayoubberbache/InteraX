'use client'

import EmojiPicker from "emoji-picker-react"
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Send,
  ArrowLeft,
  Search,
  MoreVertical,
  Phone,
  Video,
  Image as ImageIcon,
  Bot,
  Sparkles,
  ChevronLeft,
  Plus,
} from 'lucide-react'
import { InteraXLogo } from '@/frontend/components/ui/logo'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { useAuth } from '@/backend/lib/auth-context'
import { useLanguage } from '@/backend/lib/i18n/context'
import { Button } from '@/frontend/components/ui/button'
import { Input } from '@/frontend/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { ScrollArea } from '@/frontend/components/ui/scroll-area'
import { cn, formatNumber, formatTimeAgo } from '@/backend/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/frontend/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/frontend/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/frontend/components/ui/popover'
import { formatDistanceToNow } from 'date-fns'
import { VoiceRecorder } from '@/frontend/components/chat/voice-recorder'
import { uploadMedia } from '@/backend/lib/upload'
import { toast } from 'sonner'

/* ─── Types ─── */
interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
}

interface DbMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
  message_reactions?: MessageReaction[]
  type?: string
  media_url?: string | null
  updated_at?: string
}

interface DbConversation {
  id: string
  participant_ids: string[]
  last_message: string | null
  last_message_time: string | null
  created_at: string
  // Virtual expanded fields
  other_user?: {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
  }
}

interface BotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const BOT_STORAGE_KEY = 'interax_cb_v3'

function isSingleEmoji(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (!trimmed) return false;
  
  const onlyEmojis = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Component}\u200d\ufe0f\s]+$/u.test(trimmed);
  if (!onlyEmojis) return false;

  try {
    const segments = Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(trimmed));
    const nonWhitespace = segments.filter(s => s.segment.trim().length > 0);
    return nonWhitespace.length === 1;
  } catch (e) {
    return trimmed.length <= 10; 
  }
}

// Bot storage no longer uses local storage, relies on DB endpoints

export default function ChatPage() {
  const router = useRouter()
  const { currentUser, isLoggedIn } = useAuth()
  const { t } = useLanguage()

  /* ─── State ─── */
  const [conversations, setConversations] = useState<DbConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<DbConversation | null>(null)
  const [messages, setMessages] = useState<DbMessage[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('')
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [userSearchResults, setUserSearchResults] = useState<any[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  /* ─── AI Chatbot State ─── */
  const [isBotSelected, setIsBotSelected] = useState(false)
  const [botMessages, setBotMessages] = useState<BotMessage[]>([])
  const [botSessionId, setBotSessionId] = useState<string | null>(null)
  const botMessagesRef = useRef(botMessages)
  const [isStreaming, setIsStreaming] = useState(false)
  const [botError, setBotError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [editingMsg, setEditingMsg] = useState<string | null>(null)
  
  // Group Chat State
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<any[]>([])
  const [groupName, setGroupName] = useState('')
  const [groupAvatar, setGroupAvatar] = useState('')
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) router.push('/login')
  }, [isLoggedIn, router])

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`/api/conversations?userId=${currentUser.id}`)
      if (res.ok) {
        const data = await res.json()
        
        // Expand conversation data with user details
        const expanded = await Promise.all(data.map(async (conv: DbConversation) => {
          const otherId = conv.participant_ids.find(id => id !== currentUser.id)
          if (!otherId) return conv
          try {
            const uRes = await fetch(`/api/users?id=${otherId}`)
            if (uRes.ok) {
              const { data: uData } = await uRes.json()
              return { ...conv, other_user: uData }
            }
          } catch {}
          return conv
        }))

        // Sort newest first by last_message_time, then by created_at
        expanded.sort((a: DbConversation, b: DbConversation) => {
          const timeA = a.last_message_time || a.created_at
          const timeB = b.last_message_time || b.created_at
          return new Date(timeB).getTime() - new Date(timeA).getTime()
        })

        setConversations(expanded)
      }
    } catch (err) {
      console.error('Failed to load conversations', err)
    }
  }, [currentUser])

  const loadBotSession = useCallback(async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`/api/ai/sessions?user_id=${currentUser.id}`)
      if (res.ok) {
        const { data } = await res.json()
        if (data && data.length > 0) {
          const session = data[0]
          setBotSessionId(session.id)
          const mRes = await fetch(`/api/ai/messages?session_id=${session.id}`)
          if (mRes.ok) {
            const { data: messages } = await mRes.json()
            setBotMessages(messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.created_at
            })))
          }
        }
      }
    } catch (err) {
      console.error('Failed to load bot session', err)
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      loadBotSession()
      loadConversations()
    }
    
    // Load suggestions
    fetch('/api/users/suggestions')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setSuggestedUsers(d)
      }).catch(console.error)
  }, [currentUser, loadConversations])

  useEffect(() => {
    botMessagesRef.current = botMessages
  }, [botMessages])

  // Poll conversation list every 4 seconds for real-time updates
  useEffect(() => {
    if (!currentUser) return
    const interval = setInterval(() => {
      loadConversations()
    }, 4000)
    return () => clearInterval(interval)
  }, [currentUser, loadConversations])

  // Load messages when conversation selected
  const loadMessages = useCallback(async () => {
    if (!selectedConversation) return
    try {
      const res = await fetch(`/api/messages?conversationId=${selectedConversation.id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (err) {
      console.error('Failed to load messages', err)
    }
  }, [selectedConversation])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages()
    } else {
      setMessages([])
    }
  }, [selectedConversation, loadMessages])

  // Poll messages every 3 seconds for real-time chat
  useEffect(() => {
    if (!selectedConversation) return
    const interval = setInterval(() => {
      loadMessages()
    }, 3000)
    return () => clearInterval(interval)
  }, [selectedConversation, loadMessages])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, botMessages, isBotSelected])

  if (!isLoggedIn || !currentUser) return null

  /* ─── Handlers ─── */

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return

    if (isBotSelected) {
      sendBotMessage()
      return
    }

    if (!selectedConversation) return

    const text = messageInput.trim()
    setMessageInput('')

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          text,
          userId: currentUser.id
        })
      })

      if (res.ok) {
        const newMsg = await res.json()
        setMessages(prev => [...prev, newMsg])
        loadConversations() // update last message in list
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendMedia = async (url: string, type: 'image' | 'audio') => {
    if (!selectedConversation || !currentUser) return

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          userId: currentUser.id,
          media_url: url,
          type: type,
          text: type === 'image' ? 'Sent a photo' : 'Sent a voice message'
        })
      })

      if (res.ok) {
        const newMsg = await res.json()
        setMessages(prev => [...prev, newMsg])
        loadConversations()
      }
    } catch (err) {
      console.error(err)
      toast.error(t('chat_media_failed'))
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const url = await uploadMedia(file, currentUser?.id, 'message')
      await handleSendMedia(url, 'image')
    } catch (err) {
      console.error(err)
      toast.error(t('chat_upload_failed'))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleVoiceRecord = async (blob: Blob) => {
    setIsUploading(true)
    try {
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
      const url = await uploadMedia(file)
      await handleSendMedia(url, 'audio')
    } catch (err) {
      console.error(err)
      toast.error(t('chat_voice_failed'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleEditMsg = async (id: string, newText: string) => {
    if (!newText.trim() || !currentUser) return
    try {
      const res = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, text: newText.trim(), userId: currentUser.id })
      })
      if (res.ok) {
        const updated = await res.json()
        setMessages(prev => prev.map(m => m.id === id ? { ...m, content: updated.content } : m))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setEditingMsg(null)
    }
  }

  const handleDeleteMsg = async (id: string) => {
    if (!currentUser) return
    if (!confirm(t('chat_delete_msg_confirm'))) return
    try {
      const res = await fetch(`/api/messages?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id }
      })
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== id))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleReact = async (msg: DbMessage, reaction: string) => {
    if (!currentUser) return
    const hasReacted = msg.message_reactions?.find(r => r.user_id === currentUser.id && r.emoji === reaction)
    if (hasReacted) return

    setMessages(prev => prev.map(m => {
      if (m.id !== msg.id) return m
      const filteredReactions = m.message_reactions?.filter(r => r.user_id !== currentUser.id) || []
      return {
        ...m,
        message_reactions: [...filteredReactions, { id: Date.now().toString(), message_id: msg.id, user_id: currentUser.id, emoji: reaction }]
      }
    }))

    try {
      const res = await fetch(`/api/messages/${msg.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: reaction, userId: currentUser.id })
      })
      if (!res.ok) {
        toast.error(t('chat_react_failed'))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteChat = async () => {
    if (!selectedConversation) return
    if (!confirm(t('chat_delete_confirm'))) return
    try {
      const res = await fetch(`/api/conversations?id=${selectedConversation.id}`, { 
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id }
      })
      if (!res.ok) throw new Error('Failed to delete')
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id))
      setSelectedConversation(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSearchUsers = async (q: string) => {
    setNewChatSearchQuery(q)
    if (q.trim().length < 1) {
      setUserSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q.trim())}`)
      if (res.ok) {
        const { data } = await res.json()
        setUserSearchResults(data.filter((u: any) => u.id !== currentUser.id))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  const toggleGroupUser = (user: any) => {
    if (selectedGroupUsers.find(u => u.id === user.id)) {
      setSelectedGroupUsers(prev => prev.filter(u => u.id !== user.id))
    } else {
      setSelectedGroupUsers(prev => [...prev, user])
    }
  }

  const startNewConversation = async (targetUser?: any) => {
    setIsNewChatOpen(false)
    try {
      let payload;
      if (targetUser) {
        payload = { targetUserId: targetUser.id, userId: currentUser.id }
      } else if (selectedGroupUsers.length === 1 && !groupName.trim()) {
        // Start a 1-on-1 chat if only 1 user is selected and no group name is provided
        targetUser = selectedGroupUsers[0];
        payload = { targetUserId: targetUser.id, userId: currentUser.id }
      } else {
        payload = { 
          participantIds: [...selectedGroupUsers.map(u => u.id), currentUser.id], 
          groupName: groupName.trim() || t('chat_title'), 
          groupAvatar: groupAvatar || null,
          userId: currentUser.id 
        }
      }

      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const conv = await res.json()
        const expanded = (selectedGroupUsers.length > 1 || groupName.trim()) ? conv : { ...conv, other_user: targetUser }
        setConversations(prev => {
          const filtered = prev.filter(p => p.id !== expanded.id)
          return [expanded, ...filtered]
        })
        setSelectedConversation(expanded)
        setIsBotSelected(false)
        setSelectedGroupUsers([])
        setGroupName('')
        setGroupAvatar('')
      }
    } catch (err) {
      console.error(err)
    }
  }

  /* ─── AI Bot Streaming Logic ─── */
  const sendBotMessage = async () => {
    const text = messageInput.trim()
    if (!text || isStreaming || !currentUser) return

    let currentSessionId = botSessionId
    if (!currentSessionId) {
      const res = await fetch('/api/ai/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, session_title: 'Chat with InteraX CB' })
      })
      if (res.ok) {
        const { data } = await res.json()
        currentSessionId = data.id
        setBotSessionId(data.id)
      } else {
        setBotError('Failed to start AI session.')
        return
      }
    }

    const newUserMsg: BotMessage = {
      id: `bot_u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    const newBotMsgs = [...botMessages, newUserMsg]
    setBotMessages(newBotMsgs)

    setMessageInput('')
    setIsStreaming(true)
    setBotError(null)

    // Save user message to DB
    await fetch('/api/ai/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: currentSessionId, role: 'user', content: text })
    })

    const history = newBotMsgs.map((m) => ({ role: m.role, content: m.content }))
    const assistantId = `bot_a_${Date.now()}`
    
    setBotMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() }])

    let finalContent = ''

    try {
      const controller = new AbortController()
      abortRef.current = controller

      const systemPrompt = `You are InteraX CB, a friendly AI assistant for the InteraX social platform. 
Keep responses concise (2-4 sentences). System info: Platform has Users, Groups, Posts, Stories, and Ratings. 
Tell users you can help them navigate the platform.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...history],
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error('Bot error')

      let fullContent = ''
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await res.json()
        fullContent = data.content || ''
        setBotMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m))
      } else {
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
  
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payload = line.slice(6).trim()
              if (!payload || payload === '[DONE]') continue
              try {
                const parsed = JSON.parse(payload)
                if (parsed.content) {
                  finalContent += parsed.content
                  setBotMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: finalContent } : m))
                }
              } catch (e) {
                // Ignore incomplete JSON parsing errors
              }
            }
          }
        }
      }
    } catch (err) {
      setBotError(t('chat_bot_error'))
      // Remove the empty assistant bubble that was just added
      setBotMessages(prev => prev.filter(m => m.id !== assistantId))
    } finally {
      setIsStreaming(false)
      if (finalContent) {
        // Save assistant message to DB
        await fetch('/api/ai/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: currentSessionId, role: 'assistant', content: finalContent })
        })
      }
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!conv.other_user) return true
    return (
      conv.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.other_user.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const goBackToList = () => {
    setSelectedConversation(null)
    setIsBotSelected(false)
  }

  const isAnyChatOpen = selectedConversation !== null || isBotSelected

  return (
    <MainLayout hideRightPanel>
      <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col">
        <div className="grid md:grid-cols-[320px_1fr] flex-1 min-h-0 border border-border rounded-none md:rounded-lg overflow-hidden bg-background">
          
          {/* ═══ Conversations List ═══ */}
          <div className={cn('border-r border-border flex flex-col h-full min-h-0', isAnyChatOpen ? 'hidden md:flex' : 'flex')}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h1 className="text-xl font-bold">{t('chat_title')}</h1>
              <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('chat_new_chat')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('chat_search_users')}
                        className="pl-10"
                        value={newChatSearchQuery}
                        onChange={(e) => handleSearchUsers(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-[300px]">
                      {isSearching ? (
                        <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>
                      ) : userSearchResults.length > 0 ? (
                        userSearchResults.map(user => (
                          <button
                            key={user.id}
                            onClick={() => toggleGroupUser(user)}
                            className={cn("w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-lg transition-colors text-left", selectedGroupUsers.find(u => u.id === user.id) && "bg-secondary")}
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>{user.full_name?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground">@{user.username}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="pt-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">{t('chat_suggested')}</p>
                          {suggestedUsers.filter(u => u.id !== currentUser?.id).map(user => (
                            <button
                              key={user.id}
                              onClick={() => toggleGroupUser(user)}
                              className={cn("w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-lg transition-colors text-left", selectedGroupUsers.find(u => u.id === user.id) && "bg-secondary")}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback>{user.full_name?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    {selectedGroupUsers.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer shrink-0">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const reader = new FileReader()
                                  reader.onload = (ev) => setGroupAvatar(ev.target?.result as string)
                                  reader.readAsDataURL(file)
                                }
                              }}
                            />
                            <Avatar className="h-12 w-12 border border-border bg-secondary/50 hover:bg-secondary transition-colors">
                              <AvatarImage src={groupAvatar || undefined} />
                              <AvatarFallback><ImageIcon className="h-5 w-5 text-muted-foreground" /></AvatarFallback>
                            </Avatar>
                          </label>
                          <Input className="flex-1" placeholder={t('chat_group_name')} value={groupName} onChange={e => setGroupName(e.target.value)} />
                        </div>
                        <Button className="w-full" onClick={() => startNewConversation()}>
                          {(selectedGroupUsers.length > 1 || groupName.trim()) ? `${t('chat_create_group')} (${selectedGroupUsers.length})` : t('chat_start_chat')}
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('chat_search_chats')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto">
              {/* InteraX CB AI */}
              <button
                onClick={() => { setIsBotSelected(true); setSelectedConversation(null); }}
                className={cn('w-full flex items-center gap-3 p-4 hover:bg-secondary/50 border-b border-border/50 text-left', isBotSelected && 'bg-secondary')}
              >
                <div className="relative">
                  <div className="h-14 w-14 rounded-full flex items-center justify-center overflow-hidden">
                    <InteraXLogo className="w-full h-full object-contain" color="#000000" />
                  </div>
                  <div className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t('chat_bot_name')}</p>
                  <p className="text-xs text-muted-foreground truncate">{t('chat_bot_desc')}</p>
                </div>
              </button>

              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => { setSelectedConversation(conv); setIsBotSelected(false); }}
                  className={cn('w-full flex items-center gap-3 p-4 hover:bg-secondary/50 border-b border-border/50 text-left transition-colors', selectedConversation?.id === conv.id && 'bg-secondary')}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conv.other_user?.avatar_url || undefined} />
                    <AvatarFallback>{conv.other_user?.full_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-semibold text-sm truncate">{conv.other_user?.full_name}</p>
                      {conv.last_message_time && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.last_message_time))}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.last_message || t('chat_no_messages')}</p>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>

          {/* ═══ Chat Window ═══ */}
          <div className={cn('flex flex-col h-full min-h-0 bg-secondary/5', !isAnyChatOpen && 'hidden md:flex justify-center items-center text-center')}>
            {isAnyChatOpen ? (
              <>
                {/* Header */}
                <div className="h-14 border-b border-border flex items-center px-4 bg-background justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={goBackToList}><ChevronLeft /></Button>
                    {isBotSelected ? (
                      <>
                        <div className="h-10 w-10 flex items-center justify-center">
                          <InteraXLogo className="h-full w-full object-contain" color="#000000" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{t('chat_bot_name')}</p>
                          <p className="text-[10px] text-emerald-500 font-medium">{t('chat_online')}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={selectedConversation?.other_user?.avatar_url || undefined} />
                          <AvatarFallback>{selectedConversation?.other_user?.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{selectedConversation?.other_user?.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">@{selectedConversation?.other_user?.username}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isStreaming && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          abortRef.current?.abort()
                          setIsStreaming(false)
                        }}
                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground hidden sm:flex"
                      >
                        <div className="h-3.5 w-3.5 rounded-sm bg-current mr-2" />
                        {t('chat_stop_bot')}
                      </Button>
                    )}
                    {!isBotSelected && selectedConversation && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="text-destructive font-medium cursor-pointer focus:bg-destructive/10 focus:text-destructive" onClick={handleDeleteChat}>
                            {t('chat_delete_conv')}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-muted-foreground cursor-not-allowed">
                            {t('chat_block_user')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Messages Area — independently scrollable */}
                <div className="flex-1 p-4 overflow-y-auto min-h-0 relative" style={{overscrollBehavior:'contain'}}>
                  <div className="space-y-4 pb-4">
                    {isBotSelected ? (
                      botMessages.map((m) => (
                        <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                          <div className={cn(
                            'max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm transition-all',
                            m.role === 'user' 
                              ? 'bg-gradient-to-r from-[#4B0082] to-[#E6E6FA] text-white rounded-tr-none' 
                              : 'bg-background border border-border rounded-tl-none'
                          )}>
                            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                            <p className={cn('text-[10px] mt-1 opacity-70', m.role === 'user' ? 'text-right' : 'text-left')}>
                              {formatTimeAgo(m.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      messages.map((m) => {
                        const isOwn = m.sender_id === currentUser.id
                        const isEmojiOnly = isSingleEmoji(m.content || '')
                        
                        return (
                          <div key={m.id} className={cn('flex message-bubble', isOwn ? 'justify-end' : 'justify-start')}>
                            <div className={cn(
                              'group relative max-w-[75%] transition-all',
                              isEmojiOnly 
                                ? 'text-[80px] leading-none drop-shadow-xl animate-in zoom-in spin-in-2' 
                                : cn('px-4 py-2 text-sm shadow-sm', isOwn 
                                  ? 'bg-gradient-to-r from-[#4B0082] to-[#6366f1] text-white rounded-2xl rounded-tr-none' 
                                  : 'bg-background border border-border rounded-2xl rounded-tl-none text-foreground'
                                )
                            )}>
                              {isOwn && (
                                <div className="absolute top-1/2 -translate-y-1/2 -left-16 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-background border border-border shadow-md rounded-md p-1 transition-opacity z-10 text-foreground">
                                  <button onClick={() => setEditingMsg(m.id)} className="px-1.5 py-0.5 hover:bg-secondary rounded text-xs font-semibold">{t('chat_edit_msg')}</button>
                                  <button onClick={() => handleDeleteMsg(m.id)} className="px-1.5 py-0.5 hover:bg-secondary rounded text-xs font-semibold text-destructive">{t('chat_delete_msg')}</button>
                                </div>
                              )}
                              
                              {editingMsg === m.id ? (
                                <input
                                  type="text"
                                  defaultValue={m.content || ''}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleEditMsg(m.id, e.currentTarget.value)
                                    if (e.key === 'Escape') setEditingMsg(null)
                                  }}
                                  onBlur={() => setEditingMsg(null)}
                                  autoFocus
                                  className="w-full bg-transparent border-b border-white/50 outline-none"
                                />
                              ) : (
                                <div className="space-y-2">
                                  {m.type === 'image' && m.media_url && (
                                    <div className="relative aspect-auto max-w-sm overflow-hidden rounded-lg border border-border/50 shadow-inner bg-secondary/10">
                                      <img src={m.media_url} alt="Shared photo" className="max-h-80 w-full object-contain" />
                                    </div>
                                  )}
                                  {m.type === 'audio' && m.media_url && (
                                    <div className="flex items-center gap-2 py-1">
                                      <audio src={m.media_url} controls controlsList="nodownload noplaybackrate" className="h-8 w-48 custom-audio" />
                                    </div>
                                  )}
                                  {m.content && (
                                    <p className={cn("leading-relaxed whitespace-pre-wrap", isEmojiOnly && "text-center")}>
                                      {m.content}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Persistent Multi-React Logic */}
                              {m.message_reactions && m.message_reactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 -mb-1">
                                  {[...new Set(m.message_reactions.map(r => r.emoji))].map((emoji, idx) => (
                                    <div key={idx} className="bg-background/80 backdrop-blur-sm border border-border rounded-full px-1.5 py-0.5 text-xs shadow-sm animate-in zoom-in-50 duration-200">
                                      {emoji} {m.message_reactions!.filter(r => r.emoji === emoji).length > 1 && m.message_reactions!.filter(r => r.emoji === emoji).length}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {!isOwn && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className={cn("absolute top-1/2 -translate-y-1/2 -right-8 opacity-0 group-hover:opacity-100 flex items-center justify-center h-6 w-6 bg-background border border-border shadow-md rounded-full transition-all text-muted-foreground hover:text-primary", isEmojiOnly && "-right-12")}>
                                      ☺
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent side="top" align="center" className="w-auto p-1.5 flex gap-1 rounded-full shadow-lg border-border/50 animate-in fade-in slide-in-from-bottom-2">
                                    {['👏', '👍', '❤️', '🤗', '👎', '😂'].map(emoji => (
                                      <button 
                                        key={emoji} 
                                        onClick={() => handleReact(m, emoji)} 
                                        className="h-8 w-8 hover:bg-secondary rounded-full flex items-center justify-center text-lg hover:scale-125 transition-transform"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </PopoverContent>
                                </Popover>
                              )}

                              <p className={cn("text-[10px] mt-1 flex items-center gap-1", isOwn ? "justify-end" : "justify-start", isEmojiOnly ? "text-muted-foreground opacity-100 font-medium drop-shadow-md bg-background/50 px-2 py-0.5 rounded-full inline-flex absolute -bottom-6 right-0" : (isOwn ? "text-white/80 opacity-60" : "text-muted-foreground opacity-60"))}>
                                <span>{formatTimeAgo(m.created_at)}</span>
                                {m.updated_at && new Date(m.updated_at).getTime() - new Date(m.created_at).getTime() > 1000 && (
                                  <span>{t('chat_edited')}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    {botError && (
                      <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 max-w-xs mx-auto text-center">
                        {botError}
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-background border-t border-border">
                  <div className="flex items-center gap-2 max-w-4xl mx-auto">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("shrink-0 text-muted-foreground hover:text-primary", isUploading && "animate-pulse")}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    
                    {!isBotSelected && (
                      <VoiceRecorder onRecord={handleVoiceRecord} onCancel={() => {}} />
                    )}

                    <div className="relative flex-1">
                      <Input
                        ref={inputRef}
                        placeholder={isBotSelected ? t('chat_bot_placeholder') : t('chat_msg_placeholder')}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        className="pr-16 bg-secondary/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
                      />
                      
                      {/* Emoji Button */}
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="absolute right-10 top-1/2 -translate-y-1/2 text-lg hover:scale-110 transition-transform"
                      >
                        😊
                      </button>

                      {/* Emoji Picker */}
                      {showEmojiPicker && (
                        <div className="absolute bottom-12 right-0 z-50 shadow-xl border border-border/50 rounded-lg">
                          <EmojiPicker
                            onEmojiClick={(emojiData: any) => {
                              setMessageInput(prev => prev + emojiData.emoji)
                              setShowEmojiPicker(false)
                            }}
                          />
                        </div>
                      )}

                      <Sparkles className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 transition-opacity",
                        isBotSelected ? "opacity-100" : "opacity-0"
                      )} />
                    </div>
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || isStreaming}
                      className="shrink-0 bg-gradient-to-r from-[#4B0082] to-[#E6E6FA] hover:from-[#CC1A3E] hover:to-[#4A0B34] text-white border-0 shadow-md transition-all active:scale-95"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-transparent to-secondary/5">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-[#4B0082] to-[#E6E6FA] flex items-center justify-center shadow-2xl">
                    <Bot className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-background border-4 border-secondary/5 flex items-center justify-center shadow-lg">
                    <Sparkles className="h-5 w-5 text-[#4B0082]" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-3">{t('chat_empty_title')}</h2>
                <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
                  {t('chat_empty_desc1')}<span className="text-primary font-semibold">{t('chat_bot_name')}</span>{t('chat_empty_desc2')}
                </p>
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                  <Button
                    onClick={() => { setIsBotSelected(true); setSelectedConversation(null); }}
                    className="h-12 gap-2 bg-gradient-to-r from-[#4B0082] to-[#E6E6FA] hover:from-[#CC1A3E] hover:to-[#4A0B34] text-white border-0 shadow-lg"
                  >
                    <Bot className="h-5 w-5" />
                    {t('chat_with_ai')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsNewChatOpen(true)}
                    className="h-12 gap-2 border-primary/20 hover:bg-primary/5"
                  >
                    <Plus className="h-5 w-5" />
                    {t('chat_new_message')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
