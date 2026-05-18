'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, Search, PlusSquare, Users, User, Settings, LogOut, 
  MessageCircle, Bell, Newspaper, BookOpen, Star, Sparkles
} from 'lucide-react'
import { cn } from '@/backend/lib/utils'
import { useAuth } from '@/backend/lib/auth-context'
import { useLanguage } from '@/backend/lib/i18n/context'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { Button } from '@/frontend/components/ui/button'
import { Badge } from '@/frontend/components/ui/badge'

import { TranslationKey } from '@/backend/lib/i18n/translations'

const navItems: { href: string, icon: any, transKey: TranslationKey }[] = [
  { href: '/', icon: Home, transKey: 'nav_home' },
  { href: '/search', icon: Search, transKey: 'nav_explore' },
  { href: '/create', icon: PlusSquare, transKey: 'nav_create' },
  { href: '/chat', icon: MessageCircle, transKey: 'nav_messages' },
  { href: '/notifications', icon: Bell, transKey: 'nav_notifications' },
  { href: '/groups', icon: Users, transKey: 'nav_groups' },
  { href: '/pages', icon: Newspaper, transKey: 'nav_pages' },
  { href: '/profile', icon: User, transKey: 'nav_profile' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { currentUser, isLoggedIn, logout } = useAuth()
  const { t } = useLanguage()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnread = useCallback(async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setUnreadCount(data.filter((n: any) => !n.is_read).length)
        }
      }
    } catch {}
  }, [currentUser])

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return
    fetchUnread()
    const id = setInterval(fetchUnread, 10000)
    return () => clearInterval(id)
  }, [isLoggedIn, currentUser, fetchUnread])

  if (pathname === '/login' || pathname === '/logout' || pathname === '/signup') {
    return null
  }

  return (
    <aside className="hidden md:flex fixed start-0 top-14 bottom-0 w-64 flex-col border-e border-border bg-background z-40 overflow-y-auto">
      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          const Icon = item.icon
          const href = !isLoggedIn && (item.href === '/profile' || item.href === '/create')
            ? '/login'
            : item.href

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group',
                isActive
                  ? 'bg-gradient-to-r from-[#4B0082]/10 to-[#E6E6FA]/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              )}
            >
              <div className={cn(
                'h-9 w-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0',
                isActive 
                  ? 'bg-gradient-to-br from-[#4B0082] to-[#E6E6FA] text-white shadow-md shadow-primary/20'
                  : 'bg-secondary/50 text-muted-foreground group-hover:bg-secondary'
              )}>
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              </div>
              <span>{t(item.transKey)}</span>
              {item.href === '/notifications' && unreadCount > 0 && (
                <Badge className="ms-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>




    </aside>
  )
}
