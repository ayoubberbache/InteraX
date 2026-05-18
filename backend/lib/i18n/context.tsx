'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Language, translations, TranslationKey } from './translations'
import { useAuth } from '../auth-context'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
  dir: 'ltr' | 'rtl'
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const LANG_STORAGE_KEY = 'interax_lang'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const { currentUser, isLoggedIn } = useAuth()

  // Load from local storage initially
  useEffect(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY) as Language
    if (saved && (saved === 'en' || saved === 'fr' || saved === 'ar')) {
      setLanguageState(saved)
      document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = saved
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(LANG_STORAGE_KEY, lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang

    // If logged in, update user settings in DB
    if (isLoggedIn && currentUser) {
      fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, language: lang })
      }).catch(() => null)
    }
  }, [isLoggedIn, currentUser])

  const t = useCallback((key: TranslationKey) => {
    return translations[language][key] || translations.en[key] || key
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir: language === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
