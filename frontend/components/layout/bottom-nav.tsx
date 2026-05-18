'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react'
import { cn } from '@/backend/lib/utils'
import { useAuth } from '@/backend/lib/auth-context'
import { useState, useEffect, useCallback } from 'react'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/create', icon: PlusSquare, label: 'Create' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { isLoggedIn, currentUser } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnread = useCallback(async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setUnreadCount(data.filter((n: any) => !n.is_read).length)
      }
    } catch {}
  }, [currentUser])

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return
    fetchUnread()
    const id = setInterval(fetchUnread, 15000)
    return () => clearInterval(id)
  }, [isLoggedIn, currentUser, fetchUnread])

  const isAuthPage = pathname === '/login' || pathname === '/logout' || pathname === '/signup'
  if (isAuthPage) return null

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center justify-around px-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        const Icon = item.icon
        const isCreate = item.href === '/create'
        const href = !isLoggedIn && (item.href === '/profile' || item.href === '/create')
          ? '/login' : item.href

        return (
          <Link
            key={item.href}
            href={href}
            className="flex flex-col items-center justify-center flex-1 py-2 relative"
          >
            {isActive && !isCreate && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
            )}
            {isCreate ? (
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#4B0082] to-[#9370DB] flex items-center justify-center shadow-lg shadow-primary/30 transition-transform active:scale-95">
                <Icon className="h-5 w-5 text-white" />
              </div>
            ) : (
              <>
                <div className="relative">
                  <Icon className={cn(
                    'h-[22px] w-[22px] transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>
                <span className={cn(
                  'text-[10px] font-medium mt-0.5 leading-none',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {item.label}
                </span>
              </>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
