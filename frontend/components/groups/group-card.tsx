'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Users, Star } from 'lucide-react'
import { Card, CardContent } from '@/frontend/components/ui/card'
import { Badge } from '@/frontend/components/ui/badge'

interface GroupCardProps {
  group: any
}

export function GroupCard({ group }: GroupCardProps) {
  const memberCount = group.members_count ?? group.member_count ?? 0
  const rating = group.rating || 0
  const ratingCount = group.rating_count || 0
  
  return (
    <Link href={`/groups/${group.id}`}>
      <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer h-full border-border/50 bg-background/50 backdrop-blur-sm">
        {/* Cover Image */}
        <div className="relative h-36 w-full overflow-hidden">
          <Image
            src={group.cover_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200'}
            alt={group.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <Badge 
            className="absolute top-3 right-3 bg-primary/90 text-white border-none backdrop-blur-md"
          >
            {group.category || 'General'}
          </Badge>
          
          <div className="absolute bottom-3 left-4 right-4">
             <h3 className="font-bold text-lg text-white line-clamp-1 drop-shadow-md">{group.name}</h3>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
            {group.description || 'No description provided.'}
          </p>
          
          <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-auto">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="h-7 w-7 rounded-full bg-secondary/80 flex items-center justify-center">
                <Users className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-medium">{memberCount} members</span>
            </div>
            
            <div className="flex items-center gap-1 text-[#FFB800]">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-xs font-bold">{rating.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground font-normal">({ratingCount})</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
