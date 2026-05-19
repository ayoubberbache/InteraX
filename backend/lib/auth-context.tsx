'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/backend/lib/supabase'

/** Safely parse a fetch Response as JSON, returning null on HTML/error pages */
async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '')
    throw new Error(`Server returned non-JSON response (${res.status}): ${text.slice(0, 120)}`)
  }
  return res.json()
}

export interface User {
  id: string
  name: string
  username: string
  email: string
  avatar: string
  bio: string
  rating: number
  ratingCount: number
  followers: number
  following: number
  postsCount: number
  isVerified: boolean
  role: string
  points: number
  coverUrl: string | null
  login_at?: number
  isPrivate?: boolean
}

interface AuthContextType {
  currentUser: User | null
  isLoggedIn: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (fullName: string, username: string, email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const USER_STORAGE_KEY = 'interax_user'
const TOKEN_KEY = 'interax_token'

function dbToUser(d: any): User {
  return {
    id: d.id,
    name: d.full_name || 'User',
    username: d.username || 'user',
    email: d.email || '',
    avatar: d.avatar_url || '',
    bio: d.bio || '',
    rating: Number(d.rating) || 0,
    ratingCount: d.rating_count || 0,
    followers: d.followers_count || 0,
    following: d.following_count || 0,
    postsCount: d.posts_count || 0,
    isVerified: d.is_verified || false,
    role: d.role || 'user',
    points: d.points || 0,
    coverUrl: d.cover_url || null,
    isPrivate: d.is_private || false,
    login_at: Date.now(),
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.id && parsed.id.length === 36) {
          setCurrentUser(parsed)
        } else {
          localStorage.removeItem(USER_STORAGE_KEY)
          localStorage.removeItem(TOKEN_KEY)
        }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      
      if (authError) return { success: false, error: authError.message }
      if (!authData.session) return { success: false, error: 'Failed to get session' }

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: authData.session.access_token }),
      })
      const data = await safeJson(res)
      if (!res.ok) return { success: false, error: data.error || 'Login failed' }

      const user = dbToUser(data.user)
      setCurrentUser(user)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      localStorage.setItem(TOKEN_KEY, data.token)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' }
    }
  }, [])

  const signup = useCallback(async (fullName: string, username: string, email: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
            username: username.toLowerCase()
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (authError) return { success: false, error: authError.message }

      if (authData.session) {
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: authData.session.access_token }),
        })
        const data = await safeJson(res)
        if (!res.ok) return { success: false, error: data.error || 'Signup failed' }

        const user = dbToUser(data.user)
        setCurrentUser(user)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
        localStorage.setItem(TOKEN_KEY, data.token)
        return { success: true }
      }

      return { success: true, message: 'Please check your email to verify your account.' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' }
    }
  }, [])

  const logout = useCallback(() => {
    setCurrentUser(null)
    localStorage.removeItem(USER_STORAGE_KEY)
    localStorage.removeItem(TOKEN_KEY)
  }, [])

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(USER_STORAGE_KEY)
    if (!stored) return
    try {
      const u = JSON.parse(stored)
      const res = await fetch(`/api/users?id=${u.id}`)
      const data = await safeJson(res)
      if (data.data) {
        const user = dbToUser(data.data)
        setCurrentUser(user)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      }
    } catch { /* ignore */ }
  }, [])

  return (
    <AuthContext.Provider
      value={{ currentUser, isLoggedIn: currentUser !== null, loading, login, signup, logout, refreshUser }}
    >
      {loading ? (
        <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            <p className="text-sm font-medium animate-pulse">Initializing InteraX...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
