'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react'
import { cn } from '@/backend/lib/utils'
import { useAuth } from '@/backend/lib/auth-context'
import { useLanguage } from '@/backend/lib/i18n/context'

const navItems = [
  { href: '/', icon: Home, labelKey: 'nav_home' as const },
  { href: '/search', icon: Search, labelKey: 'nav_explore' as const },
  { href: '/create', icon: PlusSquare, labelKey: 'nav_create' as const },
  { href: '/chat', icon: MessageCircle, labelKey: 'nav_messages' as const },
  { href: '/profile', icon: User, labelKey: 'nav_profile' as const },
]

export function BottomNav() {
  const pathname = usePathname()
  const { isLoggedIn } = useAuth()
  const { t } = useLanguage()

  // Hide on auth pages
  if (pathname === '/login' || pathname === '/logout' || pathname === '/signup') {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          // Redirect to login if not logged in for certain pages
          const href = !isLoggedIn && (item.href === '/profile' || item.href === '/create') 
            ? '/login' 
            : item.href

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'drop-shadow-[0_0_4px_rgba(255,32,78,0.5)]')} />
              <span className="text-xs">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
