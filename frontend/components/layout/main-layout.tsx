'use client'

import { usePathname } from 'next/navigation'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'
import { cn } from '@/backend/lib/utils'

import { useEffect } from 'react'
import { useAuth } from '@/backend/lib/auth-context'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  const { currentUser } = useAuth()
  
  useEffect(() => {
    if (!currentUser) return
    
    const pollNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${currentUser.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data)) {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const notifiedStr = localStorage.getItem(`interax_notified_notifs_${currentUser.id}`) || '[]'
            const notifiedIds = new Set<string>(JSON.parse(notifiedStr))
            
            let changed = false
            data.forEach((notif: any) => {
              if (!notif.is_read && !notifiedIds.has(notif.id)) {
                new Notification('InteraX', {
                  body: notif.message,
                  icon: notif.from_user_avatar || '/favicon.ico'
                })
                notifiedIds.add(notif.id)
                changed = true
              }
            })
            
            if (changed) {
              localStorage.setItem(`interax_notified_notifs_${currentUser.id}`, JSON.stringify(Array.from(notifiedIds)))
            }
          }
        }
      } catch (err) {
        console.error('Failed to poll notifications globally', err)
      }
    }
    
    pollNotifications()
    const interval = setInterval(pollNotifications, 7000)
    return () => clearInterval(interval)
  }, [currentUser])
  
  const isAuthPage = pathname === '/login' || pathname === '/logout' || pathname === '/signup'
  const isFullWidth = pathname === '/chat'

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1 pt-14">
        {/* Left Sidebar - Desktop only */}
        <Sidebar />

        {/* Main Content */}
        <main className={cn(
          "flex-1 md:ms-64",
          isFullWidth
            ? "h-[calc(100vh-7.5rem)] md:h-[calc(100vh-3.5rem)] overflow-hidden"
            : "min-h-screen pb-16 md:pb-0"
        )}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
