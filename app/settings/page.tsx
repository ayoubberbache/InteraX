'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { 
  User, 
  Bell, 
  Lock, 
  Palette, 
  Globe, 
  HelpCircle, LogOut, ChevronRight, Moon, Sun, Monitor, Shield, Eye, Volume2, Mail, Smartphone, UserX,
  Users, FileText, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/backend/lib/supabase'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { useAuth } from '@/backend/lib/auth-context'
import { useLanguage } from '@/backend/lib/i18n/context'
import { Language } from '@/backend/lib/i18n/translations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card'
import { Button } from '@/frontend/components/ui/button'
import { Switch } from '@/frontend/components/ui/switch'
import { Label } from '@/frontend/components/ui/label'
import { Separator } from '@/frontend/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { Input } from '@/frontend/components/ui/input'
import { Textarea } from '@/frontend/components/ui/textarea'
import { toast } from 'sonner'
import { ImageEditorModal } from '@/frontend/components/image-editor-modal'
import { uploadMedia } from '@/backend/lib/upload'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/frontend/components/ui/dialog'
import { cn } from '@/backend/lib/utils'
import { useColorTheme } from '@/frontend/components/color-theme-provider'

type SettingsSection = 'profile' | 'notifications' | 'privacy' | 'appearance' | 'language' | 'blocks' | 'groups' | 'pages' | 'help'

export default function SettingsPage() {
  const router = useRouter()
  const { currentUser, isLoggedIn, logout, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const { palette, setPalette } = useColorTheme()
  const { language, setLanguage, t } = useLanguage()
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [mounted, setMounted] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Password change states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Mobile layout state
  const [showSidebar, setShowSidebar] = useState(true)

  // Groups and Pages settings states
  const [myGroups, setMyGroups] = useState<any[]>([])
  const [loadingMyGroups, setLoadingMyGroups] = useState(false)
  const [myPages, setMyPages] = useState<any[]>([])
  const [loadingMyPages, setLoadingMyPages] = useState(false)

  const fetchMyGroups = async () => {
    if (!currentUser) return
    setLoadingMyGroups(true)
    try {
      const res = await fetch(`/api/groups?userId=${currentUser.id}&memberOf=true`)
      if (res.ok) {
        const data = await res.json()
        setMyGroups(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMyGroups(false)
    }
  }

  const fetchMyPages = async () => {
    if (!currentUser) return
    setLoadingMyPages(true)
    try {
      const res = await fetch(`/api/pages?userId=${currentUser.id}&followedOnly=true`)
      if (res.ok) {
        const data = await res.json()
        setMyPages(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMyPages(false)
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    if (!currentUser) return
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      })
      if (res.ok) {
        toast.success('Left group successfully')
        setMyGroups(prev => prev.filter(g => g.id !== groupId))
      } else {
        toast.error('Failed to leave group')
      }
    } catch {
      toast.error('Error leaving group')
    }
  }

  const handleUnfollowPage = async (pageId: string) => {
    if (!currentUser) return
    try {
      const res = await fetch(`/api/pages/${pageId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      })
      if (res.ok) {
        toast.success('Unfollowed page successfully')
        setMyPages(prev => prev.filter(p => p.id !== pageId))
      } else {
        toast.error('Failed to unfollow page')
      }
    } catch {
      toast.error('Error unfollowing page')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) {
      toast.error('Password cannot be empty')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Password updated successfully')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordDialog(false)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating password')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Block List states
  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [loadingBlocks, setLoadingBlocks] = useState(false)
  const [blockSearchQuery, setBlockSearchQuery] = useState('')
  const [blockSearchResults, setBlockSearchResults] = useState<any[]>([])

  const fetchBlockedUsers = async () => {
    if (!currentUser) return
    setLoadingBlocks(true)
    try {
      const res = await fetch(`/api/users/block?userId=${currentUser.id}`)
      if (res.ok) {
        const { data } = await res.json()
        setBlockedUsers(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingBlocks(false)
    }
  }

  useEffect(() => {
    if (activeSection === 'blocks') {
      fetchBlockedUsers()
    } else if (activeSection === 'groups') {
      fetchMyGroups()
    } else if (activeSection === 'pages') {
      fetchMyPages()
    }
  }, [activeSection])

  const handleSearchToBlock = async (q: string) => {
    setBlockSearchQuery(q)
    if (q.trim().length < 1) {
      setBlockSearchResults([])
      return
    }
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q.trim())}&viewerId=${currentUser?.id}`)
      if (res.ok) {
        const { data } = await res.json()
        setBlockSearchResults(
          data.filter((u: any) => currentUser && u.id !== currentUser.id && !blockedUsers.find(b => b.id === u.id))
        )
      }
    } catch {}
  }

  const handleBlockUser = async (blockedId: string) => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockerId: currentUser.id, blockedId })
      })
      if (res.ok) {
        toast.success('User blocked successfully')
        setBlockSearchQuery('')
        setBlockSearchResults([])
        fetchBlockedUsers()
      } else {
        toast.error('Failed to block user')
      }
    } catch {
      toast.error('Error blocking user')
    }
  }

  const handleUnblock = async (blockedId: string) => {
    if (!currentUser) return
    try {
      const res = await fetch(`/api/users/block?blockerId=${currentUser.id}&blockedId=${blockedId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast.success('User unblocked successfully')
        setBlockedUsers(prev => prev.filter(u => u.id !== blockedId))
      } else {
        toast.error('Failed to unblock user')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error unblocking user')
    }
  }
  
  // Form states
  const [name, setName] = useState(currentUser?.name || '')
  const [username, setUsername] = useState(currentUser?.username || '')
  const [bio, setBio] = useState(currentUser?.bio || '')
  
  // Editor states
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  
  // Notification settings
  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [likesNotif, setLikesNotif] = useState(true)
  const [commentsNotif, setCommentsNotif] = useState(true)
  const [followsNotif, setFollowsNotif] = useState(true)
  const [messagesNotif, setMessagesNotif] = useState(true)
  
  // Privacy settings
  const [privateAccount, setPrivateAccount] = useState(currentUser?.isPrivate || false)
  const [showActivity, setShowActivity] = useState(true)
  const [allowTags, setAllowTags] = useState(true)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushEnabled(Notification.permission === 'granted')
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '')
      setUsername(currentUser.username || '')
      setBio(currentUser.bio || '')
      setPrivateAccount(currentUser.isPrivate || false)
    }
  }, [currentUser])

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login')
    }
  }, [isLoggedIn, router])

  if (!isLoggedIn || !currentUser) {
    return null
  }

  const menuItems = [
    { id: 'profile' as const, icon: User, label: t('set_edit_profile') },
    { id: 'notifications' as const, icon: Bell, label: t('set_notifications') },
    { id: 'privacy' as const, icon: Lock, label: t('set_privacy') },
    { id: 'appearance' as const, icon: Palette, label: t('set_appearance') },
    { id: 'language' as const, icon: Globe, label: t('set_language') },
    { id: 'blocks' as const, icon: UserX, label: 'Blocked Users' },
    { id: 'groups' as const, icon: Users, label: 'Groups' },
    { id: 'pages' as const, icon: FileText, label: 'Pages' },
  ]

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setIsEditorOpen(true)
  }

  const handleEditorSave = async (editedFile: File) => {
    if (!currentUser) return
    setIsEditorOpen(false)
    setIsUploading(true)
    try {
      const url = await uploadMedia(editedFile, currentUser.id, 'avatar')

      const patchRes = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id, avatar_url: url })
      })
      if (!patchRes.ok) throw new Error('Failed to update db')
      if (refreshUser) await refreshUser()
      toast.success(t('set_avatar_success'))
      setAvatarFile(null)
    } catch (err) {
      console.error(err)
      toast.error(t('set_avatar_error'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!currentUser) return
    try {
      const patchRes = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id, avatar_url: '' })
      })
      if (!patchRes.ok) throw new Error('Failed to update db')
      if (refreshUser) await refreshUser()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveChanges = async () => {
    if (!currentUser) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          username: username !== currentUser.username ? username : undefined,
          full_name: name,
          bio: bio
        })
      })
      if (!res.ok) throw new Error('Failed to update profile')
      if (refreshUser) await refreshUser()
      toast.success(t('set_profile_success'))
    } catch (err) {
      console.error(err)
      toast.error(t('set_profile_error'))
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrivacyToggle = async (checked: boolean) => {
    if (!currentUser) return
    setPrivateAccount(checked)
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id, is_private: checked })
      })
      if (!res.ok) throw new Error('Failed to update privacy setting')
      if (refreshUser) await refreshUser()
      toast.success('Privacy setting updated')
    } catch (err) {
      console.error(err)
      setPrivateAccount(!checked)
      toast.error('Failed to update privacy setting')
    }
  }

  const handlePushNotifToggle = async (checked: boolean) => {
    if (checked) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          setPushEnabled(true)
          toast.success('Notification permission granted!')
          new Notification('InteraX', {
            body: 'You have enabled push notifications on InteraX!',
            icon: currentUser?.avatar || '/favicon.ico'
          })
        } else {
          setPushEnabled(false)
          toast.error('Notification permission denied.')
        }
      } else {
        setPushEnabled(false)
        toast.error('Your browser does not support notifications.')
      }
    } else {
      setPushEnabled(false)
      toast.success('Push notifications muted locally. Block permission in browser to completely disable.')
    }
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 shadow-md border border-border">
                <AvatarImage src={currentUser.avatar || undefined} alt={currentUser.name} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-[#4B0082] to-[#9370DB] text-white">
                  {currentUser.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={isUploading} onClick={() => document.getElementById('avatar-upload')?.click()}>
                    {isUploading ? t('set_uploading') : t('set_change_photo')}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleRemovePhoto}>
                    {t('set_remove')}
                  </Button>
                  <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleFileSelect} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t('set_photo_hint')}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('set_name')}</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('set_name_placeholder')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">{t('set_username')}</Label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('set_username_placeholder')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">{t('set_bio')}</Label>
                <Textarea 
                  id="bio" 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('set_bio_placeholder')}
                  rows={3}
                />
              </div>
              
              <Button 
                className="w-full sm:w-auto" 
                onClick={handleSaveChanges} 
                disabled={isSaving}
              >
                {isSaving ? t('set_saving') : t('set_save_changes')}
              </Button>
            </div>
          </div>
        )
      
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('set_channels')}</h3>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>{t('set_push_notif')}</Label>
                    <p className="text-sm text-muted-foreground">{t('set_push_notif_desc')}</p>
                  </div>
                </div>
                <Switch checked={pushEnabled} onCheckedChange={handlePushNotifToggle} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>{t('set_email_notif')}</Label>
                    <p className="text-sm text-muted-foreground">{t('set_email_notif_desc')}</p>
                  </div>
                </div>
                <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>{t('set_sound')}</Label>
                    <p className="text-sm text-muted-foreground">{t('set_sound_desc')}</p>
                  </div>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('set_activity')}</h3>
              
              <div className="flex items-center justify-between">
                <Label>{t('set_likes')}</Label>
                <Switch checked={likesNotif} onCheckedChange={setLikesNotif} />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>{t('set_comments')}</Label>
                <Switch checked={commentsNotif} onCheckedChange={setCommentsNotif} />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>{t('set_new_followers')}</Label>
                <Switch checked={followsNotif} onCheckedChange={setFollowsNotif} />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>{t('set_direct_messages')}</Label>
                <Switch checked={messagesNotif} onCheckedChange={setMessagesNotif} />
              </div>
            </div>
          </div>
        )
      
      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('set_account_privacy')}</h3>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Lock className="h-5 w-5 text-muted-foreground" />
                   <div>
                     <Label>{t('set_private_account')}</Label>
                     <p className="text-sm text-muted-foreground">{t('set_private_account_desc')}</p>
                   </div>
                </div>
                <Switch checked={privateAccount} onCheckedChange={handlePrivacyToggle} />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('set_security')}</h3>
              
              <Button variant="outline" className="w-full justify-between" onClick={() => setShowPasswordDialog(true)}>
                {t('set_change_password')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      
      case 'appearance':
        return (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Color Theme Selector */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('set_color_palette')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setPalette('default')}
                  className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all text-left group cursor-pointer ${
                    mounted && palette === 'default' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#4B0082] to-[#9370DB] shadow-sm group-hover:scale-105 transition-transform" />
                    <span className="text-sm font-bold text-foreground">{t('palette_lavender_violet')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Clean, high-fidelity experience featuring deep indigo accents, rich purple brand hues, and violet backdrops.
                  </p>
                </button>
                
                <button
                  onClick={() => setPalette('oat-olive')}
                  className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all text-left group cursor-pointer ${
                    mounted && palette === 'oat-olive' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#415B06] to-[#6C862F] shadow-sm group-hover:scale-105 transition-transform" />
                    <span className="text-sm font-bold text-foreground">{t('palette_oat_olive')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Earthy, warm aesthetic combining organic brand olive accents with soothing cream and oat backgrounds.
                  </p>
                </button>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Theme Mode Selector */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('set_theme_mode')}</h3>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    mounted && theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card'
                  }`}
                >
                  <Sun className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-bold text-foreground">{t('set_theme_light')}</span>
                </button>
                
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    mounted && theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card'
                  }`}
                >
                  <Moon className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-bold text-foreground">{t('set_theme_dark')}</span>
                </button>
                
                <button
                  onClick={() => setTheme('system')}
                  className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    mounted && theme === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card'
                  }`}
                >
                  <Monitor className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-bold text-foreground">{t('set_theme_system')}</span>
                </button>
              </div>
            </div>
          </div>
        )
      
      case 'language':
        const languages: { code: Language; name: string }[] = [
          { code: 'en', name: 'English' },
          { code: 'fr', name: 'Français' },
          { code: 'ar', name: 'العربية' }
        ]
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('lang_title')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('lang_desc')}</p>
            <div className="space-y-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    language === lang.code ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="font-medium">{lang.name}</span>
                  {language === lang.code && <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(255,32,78,0.5)]" />}
                </button>
              ))}
            </div>
          </div>
        )

      case 'blocks':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Block a new user</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Search username to block..." 
                  value={blockSearchQuery} 
                  onChange={(e) => handleSearchToBlock(e.target.value)}
                />
              </div>
              {blockSearchResults.length > 0 && (
                <Card className="mt-2 border-border/80 shadow-md">
                  <CardContent className="p-2 space-y-2 max-h-48 overflow-y-auto bg-card">
                    {blockSearchResults.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-2 hover:bg-secondary/40 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback>{u.full_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-semibold">{u.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">@{u.username}</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleBlockUser(u.id)}
                        >
                          Block
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-sm font-semibold mb-3">Blocked Accounts</h3>
              {loadingBlocks ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                </div>
              ) : blockedUsers.length > 0 ? (
                <div className="space-y-3">
                  {blockedUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-secondary/10 border border-border/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                          <AvatarFallback>{user.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleUnblock(user.id)}>
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">You haven't blocked any users yet.</p>
              )}
            </div>
          </div>
        )
      
      case 'help':
        return (
          <div className="space-y-4">
            <Button variant="outline" className="w-full justify-between">
              Help Center
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              Report a Problem
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              Terms of Service
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              Privacy Policy
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Separator />
            <div className="text-center text-sm text-muted-foreground">
              <p>Connect v1.0.0</p>
              <p>Made with love</p>
            </div>
          </div>
        )

      case 'groups':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Your Groups</h3>
              {loadingMyGroups ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                </div>
              ) : myGroups.length > 0 ? (
                <div className="space-y-3">
                  {myGroups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-3 bg-secondary/10 border border-border/50 rounded-xl">
                      <Link href={`/groups/${group.id}`} className="flex items-center gap-3 hover:opacity-80">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={group.avatar_url || undefined} alt={group.name} />
                          <AvatarFallback>{group.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{(group.members_count || 1)} members</p>
                        </div>
                      </Link>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => handleLeaveGroup(group.id)}>
                        Leave Group
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">You haven't joined any groups yet.</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link href="/groups">Discover Groups</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )

      case 'pages':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Followed Pages</h3>
              {loadingMyPages ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                </div>
              ) : myPages.length > 0 ? (
                <div className="space-y-3">
                  {myPages.map((page) => (
                    <div key={page.id} className="flex items-center justify-between p-3 bg-secondary/10 border border-border/50 rounded-xl">
                      <Link href={`/pages/${page.id}`} className="flex items-center gap-3 hover:opacity-80">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={page.avatar_url || undefined} alt={page.name} />
                          <AvatarFallback>{page.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{page.name}</p>
                          <p className="text-xs text-muted-foreground">@{page.handle}</p>
                        </div>
                      </Link>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => handleUnfollowPage(page.id)}>
                        Unfollow
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">You aren't following any pages yet.</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link href="/pages">Discover Pages</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
    }
  }

  return (
    <>
      {/* Image editor portal — rendered outside MainLayout so it never
          interferes with the page's layout tree */}
      <ImageEditorModal
        isOpen={isEditorOpen}
        source={avatarFile}
        onSave={handleEditorSave}
        onClose={() => {
          setIsEditorOpen(false)
          setAvatarFile(null)
        }}
        cropShape="round"
        context="Profile Photo"
      />
      <MainLayout>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md bg-background border border-border rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{t('set_change_password') || 'Change Password'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">{t('nav_settings')}</h1>
        
        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar Menu */}
          <Card className={cn("h-fit", !showSidebar && "hidden md:block")}>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id)
                        setShowSidebar(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeSection === item.id
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  )
                })}
                
                <Separator className="my-2" />
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  {t('nav_logout')}
                </button>
              </nav>
            </CardContent>
          </Card>
          
          {/* Content Area */}
          <Card className={cn(showSidebar && "hidden md:block")}>
            <CardHeader className="relative pr-4">
              {!showSidebar && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mb-2 md:hidden flex items-center gap-1 w-fit p-0 h-auto font-semibold text-primary"
                  onClick={() => setShowSidebar(true)}
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              )}
              <CardTitle>{menuItems.find(m => m.id === activeSection)?.label}</CardTitle>
              <CardDescription>
                {activeSection === 'profile' && t('set_profile_desc')}
                {activeSection === 'notifications' && t('set_notif_desc')}
                {activeSection === 'privacy' && t('set_privacy_desc')}
                {activeSection === 'appearance' && t('set_appearance_desc')}
                {activeSection === 'language' && t('lang_desc')}
                {activeSection === 'groups' && 'Manage your joined groups'}
                {activeSection === 'pages' && 'Manage your followed pages'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
    </>
  )
}
