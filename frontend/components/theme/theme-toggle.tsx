'use client'

import * as React from 'react'
import { Moon, Sun, Palette } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/frontend/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl cursor-pointer">
          {theme === 'dark' ? (
            <Moon className="h-[18px] w-[18px]" />
          ) : theme === 'oat-olive' ? (
            <Palette className="h-[18px] w-[18px] text-primary" />
          ) : (
            <Sun className="h-[18px] w-[18px]" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 z-[120]">
        <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer">
          <Sun className="h-4 w-4 mr-2" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer">
          <Moon className="h-4 w-4 mr-2" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('oat-olive')} className="cursor-pointer">
          <Palette className="h-4 w-4 mr-2 text-primary" />
          <span>Oat & Olive</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
