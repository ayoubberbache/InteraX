'use client'

import { usePathname } from 'next/navigation'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'
import { cn } from '@/backend/lib/utils'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  
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
            ? "h-[calc(100vh-3.5rem)] overflow-hidden"
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
