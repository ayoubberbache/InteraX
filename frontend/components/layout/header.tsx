'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, MessageCircle, Search, Plus, Command } from 'lucide-react'
import { Button } from '@/frontend/components/ui/button'
import { useAuth } from '@/backend/lib/auth-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { InteraXLogo } from '@/frontend/components/ui/logo'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useLanguage } from '@/backend/lib/i18n/context'

export function Header() {
  const { currentUser, isLoggedIn } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
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

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }, [query, router])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex-shrink-0 flex items-center md:w-64">
          <Link href="/" className="flex items-center gap-2.5 group">
            <InteraXLogo className="h-9 w-auto transition-transform duration-300 group-hover:scale-110" />
            <span className="hidden sm:block font-black text-xl tracking-tight bg-clip-text text-transparent" style={{ backgroundImage: 'var(--brand-gradient)' }}>
              InteraX
            </span>
          </Link>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto px-2 sm:px-0">
          <div className="relative w-full group">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('search_placeholder')}
              className="w-full h-9 sm:h-10 rounded-2xl border border-border bg-secondary/40 px-4 ps-9 pe-4 sm:pe-16 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:bg-secondary/60 transition-all"
            />
            <div className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <kbd className="hidden md:flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </div>
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isLoggedIn && (
            <>
              {/* Create CTA - hidden on mobile (use bottom nav instead) */}
              <Button
                asChild
                className="hidden md:flex h-9 px-4 rounded-xl bg-brand-gradient text-primary-foreground border-0 shadow-md hover:shadow-primary/25 hover:scale-105 transition-all text-sm font-semibold me-1 cursor-pointer"
              >
                <Link href="/create">
                  <Plus className="h-4 w-4 me-1.5" />
                  {t('nav_create')}
                </Link>
              </Button>

              {/* Bell — visible on all screen sizes */}
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl relative" asChild>
                <Link href="/notifications">
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-0.5">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              </Button>

            </>
          )}
          
          {isLoggedIn && currentUser ? (
            <Link href="/profile" className="ms-1">
              <Avatar className="h-9 w-9 ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
                <AvatarImage src={currentUser.avatar || undefined} alt={currentUser.name} />
                <AvatarFallback className="bg-primary/10 text-primary uppercase">
                  {currentUser.name?.[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <div className="flex items-center gap-2 ms-1">
              <Button variant="outline" size="sm" className="h-9 rounded-xl" asChild>
                <Link href="/login">{t('nav_sign_in')}</Link>
              </Button>
              <Button size="sm" className="h-9 rounded-xl bg-brand-gradient text-primary-foreground border-0 cursor-pointer" asChild>
                <Link href="/signup">{t('auth_signup_btn')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
