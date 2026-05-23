'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/backend/lib/auth-context'
import { Button } from '@/frontend/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/frontend/components/ui/card'

export default function LogoutPage() {
  const router = useRouter()
  const { logout, currentUser, isLoggedIn } = useAuth()

  // Redirect if not logged in - use useEffect to avoid calling router during render
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login')
    }
  }, [isLoggedIn, router])

  // Show nothing while redirecting
  if (!isLoggedIn) {
    return null
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">


      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">C</span>
          </div>
          <h1 className="text-2xl font-bold">Sign out</h1>
          <p className="text-muted-foreground">Are you sure you want to sign out?</p>
        </div>

        {/* Logout Card */}
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <LogOut className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Sign out of Connect</CardTitle>
            <CardDescription>
              {currentUser && (
                <span>
                  You are signed in as <strong>@{currentUser.username}</strong>
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>
              You will need to sign in again to access your feed, groups, and messages.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go back
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Help text */}
        <p className="text-center text-xs text-muted-foreground">
          Having issues?{' '}
          <Link href="#" className="font-medium text-foreground hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  )
}
