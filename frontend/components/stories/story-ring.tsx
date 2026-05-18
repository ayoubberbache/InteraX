'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/backend/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'

interface StoryRingProps {
  src: string
  alt: string
  fallback: string
  hasUnviewed?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
}

const sizeClasses = {
  sm: {
    ring: 'h-12 w-12',
    avatar: 'h-10 w-10',
  },
  md: {
    ring: 'h-16 w-16',
    avatar: 'h-14 w-14',
  },
  lg: {
    ring: 'h-20 w-20',
    avatar: 'h-[72px] w-[72px]',
  },
}

export function StoryRing({
  src,
  alt,
  fallback,
  hasUnviewed = true,
  size = 'md',
  onClick,
  className,
}: StoryRingProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  // Inverse-of-theme logic:
  // Light mode → dark vivid ring (indigo/deep purple) — visible on light bg
  // Dark mode  → bright light ring (lavender/violet glow) — visible on dark bg
  const ringStyle: React.CSSProperties = hasUnviewed
    ? {
        background: isDark
          // Dark bg → bright lavender-to-violet gradient
          ? 'linear-gradient(135deg, #E6E6FA 0%, #C084FC 50%, #9370DB 100%)'
          // Light bg → deep indigo-to-purple gradient
          : 'linear-gradient(135deg, #4B0082 0%, #7C3AED 50%, #9370DB 100%)',
      }
    : {
        // Already-viewed: subtle neutral ring
        background: isDark ? 'rgba(230,230,250,0.2)' : 'rgba(75,0,130,0.15)',
      }

  // The inner gap ring should match the background so the ring "floats"
  const gapBg = isDark ? 'bg-[#0d0018]' : 'bg-[#F8F5FF]'

  return (
    <button
      onClick={onClick}
      style={ringStyle}
      className={cn(
        'flex items-center justify-center rounded-full p-[2.5px] transition-all hover:scale-105 hover:brightness-110 active:scale-95',
        sizeClasses[size].ring,
        className
      )}
    >
      <div className={cn(
        'flex items-center justify-center rounded-full p-[2px]',
        gapBg,
        sizeClasses[size].avatar
      )}>
        <Avatar className="h-full w-full">
          <AvatarImage src={src} alt={alt} className="object-cover" />
          <AvatarFallback
            className={cn(
              'font-bold text-sm',
              isDark
                ? 'bg-[#2d1b4e] text-[#E6E6FA]'
                : 'bg-[#E6E6FA] text-[#4B0082]'
            )}
          >
            {fallback}
          </AvatarFallback>
        </Avatar>
      </div>
    </button>
  )
}
