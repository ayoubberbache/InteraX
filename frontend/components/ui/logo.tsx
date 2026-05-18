'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function InteraXLogo({ className = '', color }: { className?: string, color?: string }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  // Light mode: deep indigo → medium purple → lavender (brand 60/30/10)
  // Dark mode: inverse — start bright lavender, through violet, end deep indigo
  const gradientId = isDark ? 'interax-grad-dark' : 'interax-grad-light'

  return (
    <svg
      viewBox="200 110 280 280"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Light mode: indigo → purple → lavender */}
        <linearGradient id="interax-grad-light" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#4B0082" />
          <stop offset="50%"  stopColor="#9370DB" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>

        {/* Dark mode: lavender → violet → bright purple (glows on dark bg) */}
        <linearGradient id="interax-grad-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#E6E6FA" />
          <stop offset="50%"  stopColor="#C084FC" />
          <stop offset="100%" stopColor="#9370DB" />
        </linearGradient>
      </defs>

      <circle
        cx="340" cy="250" r="130" fill="none"
        stroke={color || `url(#${gradientId})`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray="762 55"
        strokeDashoffset="0"
        transform="rotate(238 340 250)"
      />
      <circle cx="248" cy="158" r="9" fill={color || `url(#${gradientId})`} />
      <line x1="274" y1="178" x2="406" y2="322" stroke={color || `url(#${gradientId})`} strokeWidth="22" strokeLinecap="round" />
      <line x1="406" y1="178" x2="274" y2="322" stroke={color || `url(#${gradientId})`} strokeWidth="22" strokeLinecap="round" />
    </svg>
  )
}
