import { Star } from 'lucide-react'
import { cn } from '@/backend/lib/utils'

interface RatingDisplayProps {
  rating: number
  count?: number
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: {
    star: 'h-3 w-3',
    text: 'text-xs',
  },
  md: {
    star: 'h-4 w-4',
    text: 'text-sm',
  },
  lg: {
    star: 'h-5 w-5',
    text: 'text-base',
  },
}

export function RatingDisplay({
  rating,
  count,
  showCount = true,
  size = 'md',
  className,
}: RatingDisplayProps) {
  const numericRating = Number(rating) || 0

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Star className={cn(sizeClasses[size].star, 'fill-amber-400 text-amber-400')} />
      <span className={cn(sizeClasses[size].text, 'font-medium')}>
        {numericRating.toFixed(1)}
      </span>
      {showCount && count !== undefined && (
        <span className={cn(sizeClasses[size].text, 'text-muted-foreground')}>
          ({count})
        </span>
      )}
    </div>
  )
}
