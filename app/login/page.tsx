'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/backend/lib/auth-context'
// Removed Firebase OAuth imports
import { Button } from '@/frontend/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/frontend/components/ui/card'
import { Input } from '@/frontend/components/ui/input'
import { Label } from '@/frontend/components/ui/label'
import { Separator } from '@/frontend/components/ui/separator'
import { useLanguage } from '@/backend/lib/i18n/context'
import { InteraXLogo } from '@/frontend/components/ui/logo'
import { supabase } from '@/backend/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { login, isLoggedIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    const err = searchParams.get('error')
    if (err) setError(err.replace(/\+/g, ' '))
  }, [searchParams])

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (authError) setError(authError.message)
    } catch (err: any) {
      setError(err.message || 'OAuth error')
    }
  }

  // Redirect if already logged in - use useEffect to avoid calling router during render
  useEffect(() => {
    if (isLoggedIn) {
      router.push('/')
    }
  }, [isLoggedIn, router])

  // Show nothing while redirecting
  if (isLoggedIn) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login(username, password)
      if (result.success) {
        // AuthContext listener will handle isLoggedIn state
        // and trigger the useEffect redirect
      } else {
        setError(result.error || 'Invalid credentials')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">


      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4 transition-transform hover:scale-105 duration-500">
            <InteraXLogo className="h-24 w-auto drop-shadow-2xl" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#4B0082] via-[#9370DB] to-[#E6E6FA] bg-clip-text text-transparent">
              InteraX
            </h1>
            <p className="text-muted-foreground font-medium">{t('auth_welcome')}</p>
          </div>
        </div>

        {/* Login Form */}
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">{t('auth_signin_btn')}</CardTitle>
              <CardDescription>
                {t('auth_login')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">{t('auth_email')}</Label>
                <Input
                  id="username"
                  name="email"
                  type="email"
                  placeholder={t('auth_email')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('auth_password')}</Label>
                  <Link href="#" className="text-xs text-muted-foreground hover:text-foreground">
                    {t('auth_forgot')}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth_password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '...' : t('auth_signin_btn')}
              </Button>

              <div className="relative w-full">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  or continue with
                </span>
              </div>

              {/* Social login buttons */}
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="outline" type="button" className="w-full" onClick={() => handleOAuthLogin('google')}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button variant="outline" type="button" className="w-full" onClick={() => handleOAuthLogin('github')}>
                  <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Sign up link */}
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Sign up
          </Link>
        </p>

        {/* Demo hint */}
        <div className="text-center text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
          <p className="font-medium mb-1">InteraX</p>
          <p>Sign in with your registered email and password</p>
        </div>
      </div>
    </div>
  )
}
