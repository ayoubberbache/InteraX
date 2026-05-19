'use client'

import { usePathname } from 'next/navigation'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'
import { cn } from '@/backend/lib/utils'

import { useEffect, useState } from 'react'
import { useAuth } from '@/backend/lib/auth-context'

interface MainLayoutProps {
  children: React.ReactNode
  hideHeaderMobile?: boolean
  hideBottomNavMobile?: boolean
}

export function MainLayout({ 
  children,
  hideHeaderMobile = false,
  hideBottomNavMobile = false
}: MainLayoutProps) {
  const pathname = usePathname()
  const { currentUser } = useAuth()
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateHeight = () => {
      if (window.innerWidth >= 768) {
        setViewportHeight(null)
        return
      }
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height)
      } else {
        setViewportHeight(window.innerHeight)
      }
    }

    updateHeight()

    const handleResize = () => {
      updateHeight()
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
      window.visualViewport.addEventListener('scroll', handleResize)
    } else {
      window.addEventListener('resize', handleResize)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
        window.visualViewport.removeEventListener('scroll', handleResize)
      } else {
        window.removeEventListener('resize', handleResize)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  
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
  
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto'
      if (pathname === '/chat') {
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = 'auto'
        document.documentElement.style.overflow = 'auto'
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'auto'
        document.documentElement.style.overflow = 'auto'
      }
    }
  }, [pathname])

  useEffect(() => {
    if (pathname !== '/chat') return

    const lockScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0)
      }
    }
    window.addEventListener('scroll', lockScroll)
    return () => {
      window.removeEventListener('scroll', lockScroll)
    }
  }, [pathname])
  
  const isAuthPage = pathname === '/login' || pathname === '/logout' || pathname === '/signup'
  const isFullWidth = pathname === '/chat'

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
      <div className={cn(hideHeaderMobile && "hidden md:block")}>
        <Header />
      </div>
      
      <div className={cn(
        "flex flex-1",
        hideHeaderMobile ? "pt-0 md:pt-14" : "pt-14"
      )}>
        {/* Left Sidebar - Desktop only */}
        <Sidebar />

        {/* Main Content */}
        <main 
          className={cn(
            "flex-1 md:ms-64",
            isFullWidth
              ? cn(
                  "overflow-hidden",
                  (hideHeaderMobile && hideBottomNavMobile)
                    ? "h-[100dvh] md:h-[calc(100vh-3.5rem)]"
                    : "h-[calc(100vh-7.5rem)] md:h-[calc(100vh-3.5rem)]"
                )
              : "min-h-screen pb-16 md:pb-0 w-full max-w-full overflow-x-hidden"
          )}
          style={isFullWidth && viewportHeight ? {
            height: (hideHeaderMobile && hideBottomNavMobile)
              ? `${viewportHeight}px`
              : `${viewportHeight - 120}px`
          } : undefined}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className={cn(hideBottomNavMobile && "hidden")}>
        <BottomNav />
      </div>
    </div>
  )
}
