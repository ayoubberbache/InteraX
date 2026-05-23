'use client'

import { useId } from 'react'

export function InteraXLogo({ className = '', color }: { className?: string, color?: string }) {
  const uniqueId = useId()
  const gradientId = `interax-logo-gradient-${uniqueId.replace(/:/g, '')}`

  return (
    <svg
      viewBox="200 110 280 280"
      width="280"
      height="280"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Dynamic theme-aware logo gradient driven entirely by CSS variables, unique per instance */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="var(--logo-grad-start)" />
          <stop offset="50%"  stopColor="var(--logo-grad-mid)" />
          <stop offset="100%" stopColor="var(--logo-grad-end)" />
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
