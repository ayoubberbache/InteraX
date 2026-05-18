'use client'

import { MainLayout } from '@/frontend/components/layout/main-layout'
import { StoriesBar } from '@/frontend/components/stories/stories-bar'
import { PostFeed } from '@/frontend/components/feed/post-feed'

export default function HomePage() {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Stories */}
        <div className="mb-6 rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <StoriesBar />
        </div>

        {/* Feed */}
        <PostFeed />
      </div>
    </MainLayout>
  )
}
