'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/backend/lib/supabase'
import { useAuth } from '@/backend/lib/auth-context'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()

  useEffect(() => {
    const handleAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        router.push('/login?error=OAuth+authentication+failed')
        return
      }

      try {
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: session.access_token }),
        })
        
        const data = await res.json()
        if (!res.ok) {
          router.push(`/login?error=${encodeURIComponent(data.error || 'Authentication failed')}`)
          return
        }

        // Save token and user data locally as expected by auth-context
        localStorage.setItem('interax_token', data.token)
        localStorage.setItem('interax_user', JSON.stringify(data.user))
        
        // Refresh auth context
        await refreshUser()
        
        // Redirect to home
        window.location.href = '/'
      } catch (err) {
        router.push('/login?error=Server+error+during+authentication')
      }
    }

    handleAuth()
  }, [router, refreshUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        <p className="text-sm font-medium animate-pulse">Completing sign in...</p>
      </div>
    </div>
  )
}
