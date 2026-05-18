'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, MessageCircle, UserPlus, AtSign, Users, Star, Check, Bell, Trash2, Newspaper, BookOpen } from 'lucide-react'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { useAuth } from '@/backend/lib/auth-context'
import { formatTimeAgo } from '@/backend/lib/utils'
import { Button } from '@/frontend/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { Card, CardContent } from '@/frontend/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs'
import { cn } from '@/backend/lib/utils'
import { useLanguage } from '@/backend/lib/i18n/context'

interface Notification {
  id: string
  user_id: string
  type: string
  message: string
  is_read: boolean
  target_id?: string
  target_type?: string
  from_user_id?: string
  from_user_name?: string
  from_user_avatar?: string
  created_at: string
}

const POLL_INTERVAL = 5000 // 5 seconds

export default function NotificationsPage() {
  const router = useRouter()
  const { currentUser, isLoggedIn } = useAuth()
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!currentUser) return
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) {
        setNotifications(data)
        setLastFetchedAt(new Date())
      }
    } catch (err) {
      if (!silent) console.error('[notifications]', err)
    }
  }, [currentUser])

  // Initial fetch + real-time polling
  useEffect(() => {
    if (!isLoggedIn) { router.push('/login'); return }
    if (!currentUser) return

    fetchNotifications()

    pollingRef.current = setInterval(() => fetchNotifications(true), POLL_INTERVAL)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [isLoggedIn, currentUser, router, fetchNotifications])

  if (!isLoggedIn || !currentUser) return null

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === 'all') return true
    if (activeTab === 'unread') return !notif.is_read
    return notif.type === activeTab
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true, userId: currentUser.id }),
      })
    } catch {}
  }

  const markAsRead = async (notifId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)))
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notifId, isRead: true }),
      })
    } catch {}
  }

  const deleteNotification = async (notifId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId))
    try {
      await fetch(`/api/notifications?id=${notifId}`, { method: 'DELETE' })
    } catch {}
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="h-4 w-4 text-red-500" />
      case 'comment': return <MessageCircle className="h-4 w-4 text-blue-500" />
      case 'follow': return <UserPlus className="h-4 w-4 text-green-500" />
      case 'mention': return <AtSign className="h-4 w-4 text-purple-500" />
      case 'group_invite': return <Users className="h-4 w-4 text-orange-500" />
      case 'rating': return <Star className="h-4 w-4 text-yellow-500" />
      case 'story': return <BookOpen className="h-4 w-4 text-purple-500" />
      case 'story_reaction': return <Heart className="h-4 w-4 text-red-500" />
      case 'post': return <Newspaper className="h-4 w-4 text-emerald-500" />
      default: return <Bell className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getNotificationLink = (notif: Notification) => {
    if (notif.target_type === 'post' && notif.target_id) return '/'
    if (notif.target_type === 'story') return '/'
    if (notif.target_type === 'group' && notif.target_id) return `/groups/${notif.target_id}`
    if (notif.type === 'follow' && notif.from_user_id) return `/profile/${notif.from_user_id}`
    return '#'
  }

  return (
    <MainLayout>
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {t('notif_title')}
              <span className="text-[10px] font-normal text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full animate-pulse">
                ● {t('notif_live')}
              </span>
            </h1>
            {lastFetchedAt && (
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {t('notif_updated')} {formatTimeAgo(lastFetchedAt.toISOString())}
              </p>
            )}
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount} {unreadCount === 1 ? t('notif_unread_singular') : t('notif_unread_plural')}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              {t('notif_mark_all_read')}
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">{t('notif_tab_all')}</TabsTrigger>
            <TabsTrigger value="unread" className="relative">
              {t('notif_tab_unread')}
              {unreadCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="like">{t('notif_tab_likes')}</TabsTrigger>
            <TabsTrigger value="follow">{t('notif_tab_follows')}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">{t('notif_empty_title')}</h3>
                  <p className="text-muted-foreground text-sm">
                    {activeTab === 'unread'
                      ? t('notif_empty_unread')
                      : t('notif_empty_all')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        'group flex items-start gap-3 p-4 hover:bg-secondary/50 transition-colors',
                        !notif.is_read && 'bg-primary/5'
                      )}
                    >
                      {/* Avatar + type icon badge */}
                      <Link
                        href={getNotificationLink(notif)}
                        onClick={() => markAsRead(notif.id)}
                        className="relative flex-shrink-0"
                      >
                        <Avatar className="h-11 w-11">
                          {notif.from_user_avatar ? (
                            <AvatarImage src={notif.from_user_avatar} alt={notif.from_user_name || 'User'} />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-primary font-bold uppercase">
                            {notif.from_user_name?.[0] || 'N'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background flex items-center justify-center shadow-sm ring-1 ring-border">
                          {getNotificationIcon(notif.type)}
                        </div>
                      </Link>

                      {/* Text */}
                      <Link
                        href={getNotificationLink(notif)}
                        onClick={() => markAsRead(notif.id)}
                        className="flex-1 min-w-0"
                      >
                        {notif.from_user_name && (
                          <p className="text-sm font-semibold text-foreground leading-snug">
                            {notif.from_user_name}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground leading-snug">{notif.message}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {formatTimeAgo(notif.created_at)}
                        </p>
                      </Link>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 self-center">
                        {!notif.is_read && <div className="h-2 w-2 rounded-full bg-primary" />}
                        <button
                          onClick={() => deleteNotification(notif.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
