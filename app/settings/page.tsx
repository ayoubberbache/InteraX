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
  HelpCircle, LogOut, ChevronRight, Moon, Sun, Monitor, Shield, Eye, Volume2, Mail, Smartphone 
} from 'lucide-react'
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
import Cropper from 'react-easy-crop'
import getCroppedImg from '@/frontend/lib/cropImage'
import { uploadMedia } from '@/backend/lib/upload'

type SettingsSection = 'profile' | 'notifications' | 'privacy' | 'appearance' | 'language'

export default function SettingsPage() {
  const router = useRouter()
  const { currentUser, isLoggedIn, logout, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [mounted, setMounted] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form states
  const [name, setName] = useState(currentUser?.name || '')
  const [username, setUsername] = useState(currentUser?.username || '')
  const [bio, setBio] = useState(currentUser?.bio || '')
  
  // Cropper states
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  
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
  ]

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setSelectedImage(url)
  }

  const handleCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const handleUploadPhoto = async () => {
    if (!currentUser || !selectedImage || !croppedAreaPixels) return
    setIsUploading(true)
    try {
      const croppedImageFile = await getCroppedImg(selectedImage, croppedAreaPixels)
      if (!croppedImageFile) throw new Error('Crop failed')

      const url = await uploadMedia(croppedImageFile, currentUser.id, 'avatar')

      const patchRes = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id, avatar_url: url })
      })
      if (!patchRes.ok) throw new Error('Failed to update db')
      if (refreshUser) await refreshUser()
      toast.success(t('set_avatar_success'))
      setSelectedImage(null)
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
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>{t('set_activity_status')}</Label>
                    <p className="text-sm text-muted-foreground">{t('set_activity_status_desc')}</p>
                  </div>
                </div>
                <Switch checked={showActivity} onCheckedChange={setShowActivity} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>{t('set_allow_tags')}</Label>
                    <p className="text-sm text-muted-foreground">{t('set_allow_tags_desc')}</p>
                  </div>
                </div>
                <Switch checked={allowTags} onCheckedChange={setAllowTags} />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('set_security')}</h3>
              
              <Button variant="outline" className="w-full justify-between">
                {t('set_change_password')}
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" className="w-full justify-between">
                {t('set_2fa')}
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" className="w-full justify-between">
                {t('set_login_activity')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      
      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('set_theme')}</h3>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    mounted && theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Sun className="h-6 w-6" />
                  <span className="text-sm font-medium">{t('set_theme_light')}</span>
                </button>
                
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    mounted && theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Moon className="h-6 w-6" />
                  <span className="text-sm font-medium">{t('set_theme_dark')}</span>
                </button>
                
                <button
                  onClick={() => setTheme('system')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    mounted && theme === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Monitor className="h-6 w-6" />
                  <span className="text-sm font-medium">{t('set_theme_system')}</span>
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
    }
  }

  return (
    <MainLayout>
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b font-semibold flex justify-between items-center bg-background">
              <span>{t('set_adjust_photo')}</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedImage(null)}>{t('set_cancel')}</Button>
            </div>
            <div className="relative w-full h-[400px] bg-black/90">
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={handleCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-6 space-y-6 bg-background">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{t('set_zoom')}</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <Button className="w-full rounded-full" onClick={handleUploadPhoto} disabled={isUploading}>
                {isUploading ? t('set_applying') : t('set_apply_save')}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">{t('nav_settings')}</h1>
        
        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar Menu */}
          <Card className="h-fit">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
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
          <Card>
            <CardHeader>
              <CardTitle>{menuItems.find(m => m.id === activeSection)?.label}</CardTitle>
              <CardDescription>
                {activeSection === 'profile' && t('set_profile_desc')}
                {activeSection === 'notifications' && t('set_notif_desc')}
                {activeSection === 'privacy' && t('set_privacy_desc')}
                {activeSection === 'appearance' && t('set_appearance_desc')}
                {activeSection === 'language' && t('lang_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
