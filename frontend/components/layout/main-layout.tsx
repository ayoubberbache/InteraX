'use client'

import { usePathname } from 'next/navigation'
import { Header } from './header'
import { Sidebar } from './sidebar'
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
        {/* Left Sidebar - Always visible on desktop */}
        <Sidebar />

        {/* Main Content */}
        <main className={cn(
          "flex-1 ms-64",
          isFullWidth ? "h-[calc(100vh-3.5rem)] overflow-hidden" : "min-h-screen"
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}
