'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send,
  Bot,
  Plus,
  Trash2,
  Sparkles,
  ArrowLeft,
  MessageSquare,
  ChevronLeft,
} from 'lucide-react'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { useAuth } from '@/backend/lib/auth-context'
import { Button } from '@/frontend/components/ui/button'
import { ScrollArea } from '@/frontend/components/ui/scroll-area'
import { cn } from '@/backend/lib/utils'

/* ───── Types ───── */
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
}

/* ───── Local-storage helpers ───── */
const STORAGE_KEY = 'campusbot_sessions'
const ACTIVE_KEY = 'campusbot_session_id'

function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

function loadActiveId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_KEY)
}

function saveActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id)
}

/* ───── Component ───── */
export default function CampusBotPage() {
  const router = useRouter()
  const { currentUser, isLoggedIn } = useAuth()

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) router.push('/login')
  }, [isLoggedIn, router])

  // Load sessions from storage on mount
  useEffect(() => {
    const loaded = loadSessions()
    setSessions(loaded)
    const savedId = loadActiveId()
    if (savedId && loaded.find((s) => s.id === savedId)) {
      setActiveSessionId(savedId)
    } else if (loaded.length > 0) {
      setActiveSessionId(loaded[0].id)
    }
  }, [])

  // Persist sessions whenever they change
  useEffect(() => {
    if (sessions.length > 0) saveSessions(sessions)
  }, [sessions])

  // Persist active id
  useEffect(() => {
    if (activeSessionId) saveActiveId(activeSessionId)
  }, [activeSessionId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessions, activeSessionId])

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null

  /* ── Session management ── */
  const createSession = useCallback(() => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
    }
    setSessions((prev) => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    setError(null)
    inputRef.current?.focus()
  }, [])

  const deleteSession = useCallback(
    (id: string) => {
      const updated = sessions.filter((s) => s.id !== id)
      
      setSessions(updated)
      
      if (updated.length === 0) {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        saveSessions(updated)
      }
      
      if (activeSessionId === id) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null)
      }
    },
    [sessions, activeSessionId]
  )

  /* ── Send message with streaming ── */
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming || !activeSessionId) return

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    // Optimistically add user message
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s
        const updated = {
          ...s,
          messages: [...s.messages, userMsg],
          title:
            s.messages.length === 0
              ? userMsg.content.slice(0, 40) + (userMsg.content.length > 40 ? '…' : '')
              : s.title,
        }
        return updated
      })
    )

    setInput('')
    setIsStreaming(true)
    setError(null)

    // Build context (all messages in this session + the new one)
    const session = sessions.find((s) => s.id === activeSessionId)
    const history = [
      ...(session?.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user' as const, content: userMsg.content },
    ]

    // Placeholder for assistant reply
    const assistantId = `msg_${Date.now() + 1}`
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s
        return {
          ...s,
          messages: [
            ...s.messages,
            {
              id: assistantId,
              role: 'assistant' as const,
              content: '',
              timestamp: new Date().toISOString(),
            },
          ],
        }
      })
    )

    try {
      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, stream: true }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const payload = trimmed.slice(6)
          if (payload === '[DONE]') continue

          try {
            const parsed = JSON.parse(payload)
            if (parsed.content) {
              fullContent += parsed.content
              // Update assistant message in-place
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== activeSessionId) return s
                  return {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: fullContent }
                        : m
                    ),
                  }
                })
              )
            }
          } catch {
            /* skip */
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      const errMsg = err instanceof Error ? err.message : 'Failed to get response'
      setError(errMsg)
      // Remove empty assistant message on error
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s
          return {
            ...s,
            messages: s.messages.filter(
              (m) => !(m.id === assistantId && m.content === '')
            ),
          }
        })
      )
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [input, isStreaming, activeSessionId, sessions])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const stopStreaming = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  if (!isLoggedIn || !currentUser) return null

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto h-[calc(100vh-8rem)] md:h-[calc(100vh-4.5rem)]">
        <div className="grid md:grid-cols-[280px_1fr] h-full border border-border rounded-xl overflow-hidden bg-background shadow-sm">
          {/* ── Sessions Sidebar ── */}
          <div
            className={cn(
              'border-r border-border flex flex-col bg-secondary/20',
              activeSession && !showSidebar ? 'hidden md:flex' : 'flex'
            )}
          >
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold leading-tight">CampusBot</h1>
                  <p className="text-xs text-muted-foreground">Powered by Qwen AI</p>
                </div>
              </div>
              <Button
                onClick={createSession}
                className="w-full gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-0"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {sessions.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No conversations yet
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setActiveSessionId(session.id)
                        setShowSidebar(false)
                        setError(null)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all group flex items-center gap-2',
                        activeSessionId === session.id
                          ? 'bg-secondary text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      )}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1">{session.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ── Chat Area ── */}
          <div
            className={cn(
              'flex flex-col',
              !activeSession && showSidebar ? 'hidden md:flex' : 'flex'
            )}
          >
            {activeSession ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 p-3 border-b border-border bg-background/80 backdrop-blur-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8"
                    onClick={() => setShowSidebar(true)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{activeSession.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {isStreaming ? (
                        <span className="text-violet-500 font-medium">Thinking…</span>
                      ) : (
                        'Online — Qwen3'
                      )}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4 max-w-3xl mx-auto">
                    {activeSession.messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-4">
                          <Sparkles className="h-8 w-8 text-violet-500" />
                        </div>
                        <h2 className="text-lg font-semibold mb-1">How can I help you today?</h2>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Ask me anything — homework help, campus info, general knowledge, or just chat!
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-md">
                          {[
                            'What events are happening on campus?',
                            'Help me with my essay outline',
                            'Explain quantum computing simply',
                            'What should I eat for dinner?',
                          ].map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => {
                                setInput(suggestion)
                                inputRef.current?.focus()
                              }}
                              className="text-left text-xs p-3 rounded-lg border border-border hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeSession.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-3',
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                        <div
                          className={cn(
                            'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                            msg.role === 'user'
                              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-br-md'
                              : 'bg-secondary text-secondary-foreground rounded-bl-md'
                          )}
                        >
                          {msg.role === 'assistant' && msg.content === '' ? (
                            <div className="flex gap-1.5 py-1">
                              <span className="h-2 w-2 rounded-full bg-violet-400 animate-[dotBounce_1.4s_ease-in-out_infinite]" />
                              <span className="h-2 w-2 rounded-full bg-violet-400 animate-[dotBounce_1.4s_ease-in-out_0.2s_infinite]" />
                              <span className="h-2 w-2 rounded-full bg-violet-400 animate-[dotBounce_1.4s_ease-in-out_0.4s_infinite]" />
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Error banner */}
                {error && (
                  <div className="mx-4 mb-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                    <span>⚠️ {error}</span>
                    <button
                      onClick={() => setError(null)}
                      className="ml-auto text-xs underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Input area */}
                <div className="p-3 border-t border-border bg-background/80 backdrop-blur-sm">
                  <div className="max-w-3xl mx-auto flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        placeholder="Message CampusBot…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        className="w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder:text-muted-foreground max-h-32 overflow-y-auto"
                        style={{
                          height: 'auto',
                          minHeight: '44px',
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement
                          target.style.height = 'auto'
                          target.style.height = Math.min(target.scrollHeight, 128) + 'px'
                        }}
                      />
                    </div>
                    {isStreaming ? (
                      <Button
                        onClick={stopStreaming}
                        size="icon"
                        variant="outline"
                        className="h-11 w-11 rounded-xl border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0"
                      >
                        <div className="h-3.5 w-3.5 rounded-sm bg-current" />
                      </Button>
                    ) : (
                      <Button
                        onClick={sendMessage}
                        size="icon"
                        disabled={!input.trim()}
                        className="h-11 w-11 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-0 disabled:opacity-40 shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center text-center p-4">
                <div>
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mx-auto mb-4">
                    <Bot className="h-10 w-10 text-violet-500" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Welcome to CampusBot</h2>
                  <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                    Your AI-powered campus assistant. Start a new chat to begin!
                  </p>
                  <Button
                    onClick={createSession}
                    className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-0"
                  >
                    <Plus className="h-4 w-4" />
                    Start New Chat
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
