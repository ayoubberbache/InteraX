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

import { InteraXLogo } from '@/frontend/components/ui/logo'

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
    <aside className="hidden md:flex fixed start-0 top-0 bottom-0 w-64 flex-col border-e border-border bg-card z-40 overflow-y-auto p-4">
      {/* Logo */}
      <div className="mb-6 flex items-center px-2 pt-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <InteraXLogo className="h-9 w-auto transition-transform duration-300 group-hover:scale-110" />
          <span className="font-black text-xl tracking-tight bg-clip-text text-transparent" style={{ backgroundImage: 'var(--brand-gradient)' }}>
            InteraX
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
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
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group cursor-pointer',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <div className={cn(
                'h-9 w-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0',
                isActive 
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-secondary/50 text-muted-foreground group-hover:bg-secondary'
              )}>
                <Icon className="h-[18px] w-[18px]" />
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

      {/* User profile & Actions at bottom */}
      {isLoggedIn && currentUser && (
        <div className="mt-auto pt-4 border-t border-border flex flex-col gap-2">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <Avatar className="h-9 w-9">
              <AvatarImage src={currentUser.avatar || undefined} alt={currentUser.name} />
              <AvatarFallback className="bg-primary/10 text-primary uppercase">{currentUser.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs truncate">{currentUser.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">@{currentUser.username}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={logout}
            className="flex items-center justify-start gap-3 w-full rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
          >
            <LogOut className="h-[18px] w-[18px] text-destructive shrink-0" />
            <span>Logout</span>
          </Button>
        </div>
      )}
    </aside>
  )
}
