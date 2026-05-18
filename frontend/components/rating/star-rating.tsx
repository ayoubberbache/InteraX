'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/backend/lib/utils'

interface StarRatingProps {
  rating?: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onRatingChange?: (rating: number) => void
  className?: string
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

export function StarRating({
  rating = 0,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)
  const [selectedRating, setSelectedRating] = useState(rating)

  const displayRating = interactive
    ? hoverRating || selectedRating
    : rating

  const handleClick = (index: number) => {
    if (!interactive) return
    const newRating = index + 1
    setSelectedRating(newRating)
    onRatingChange?.(newRating)
  }

  const handleMouseEnter = (index: number) => {
    if (!interactive) return
    setHoverRating(index + 1)
  }

  const handleMouseLeave = () => {
    if (!interactive) return
    setHoverRating(0)
  }

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const isFilled = index < Math.floor(displayRating)
        const isHalfFilled = !isFilled && index < displayRating

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(index)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            disabled={!interactive}
            className={cn(
              'relative transition-transform',
              interactive && 'cursor-pointer hover:scale-110',
              !interactive && 'cursor-default'
            )}
          >
            {/* Background star */}
            <Star
              className={cn(
                sizeClasses[size],
                'text-muted-foreground/30'
              )}
            />
            {/* Filled star overlay */}
            {(isFilled || isHalfFilled) && (
              <Star
                className={cn(
                  sizeClasses[size],
                  'absolute inset-0 fill-amber-400 text-amber-400',
                  isHalfFilled && 'clip-path-half'
                )}
                style={isHalfFilled ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
