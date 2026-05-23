'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type ColorPalette = 'default' | 'oat-olive'

interface ColorThemeContextType {
  palette: ColorPalette
  setPalette: (p: ColorPalette) => void
}

const ColorThemeContext = createContext<ColorThemeContextType>({
  palette: 'default',
  setPalette: () => {},
})

function applyPalette(p: ColorPalette) {
  if (p === 'oat-olive') {
    document.documentElement.setAttribute('data-palette', 'oat-olive')
  } else {
    document.documentElement.removeAttribute('data-palette')
  }
}

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<ColorPalette>('default')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem('color-palette') as ColorPalette) || 'default'
    setPaletteState(saved)
    applyPalette(saved)
    setMounted(true)
  }, [])

  const setPalette = (p: ColorPalette) => {
    setPaletteState(p)
    localStorage.setItem('color-palette', p)
    applyPalette(p)
  }

  return (
    <ColorThemeContext.Provider value={{ palette: mounted ? palette : 'default', setPalette }}>
      {children}
    </ColorThemeContext.Provider>
  )
}

export const useColorTheme = () => useContext(ColorThemeContext)
