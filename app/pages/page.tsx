'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Sparkles, ArrowRight, Trash2 } from 'lucide-react'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { Badge } from '@/frontend/components/ui/badge'
import { Button } from '@/frontend/components/ui/button'
import { Input } from '@/frontend/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/frontend/components/ui/dialog'
import { Label } from '@/frontend/components/ui/label'
import { Textarea } from '@/frontend/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar'
import { cn } from '@/backend/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import { useAuth } from '@/backend/lib/auth-context'

const categories = ['All', 'Creator', 'Business', 'Education', 'Entertainment', 'Science', 'Gaming', 'Other']

export default function PagesDirPage() {
  const { currentUser } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [pages, setPages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const [newPage, setNewPage] = useState({
    name: '',
    handle: '',
    description: '',
    category: 'Creator',
  })

  const loadPages = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/pages')
      if (res.ok) {
        const data = await res.json()
        setPages(data)
      }
    } catch (err) {
      toast.error('Failed to load pages')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPages()
  }, [loadPages])

  const handleCreatePage = async () => {
    if (!newPage.name || !newPage.handle) return
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPage, userId: currentUser?.id })
      })
      if (res.ok) {
        toast.success('Your Page is live!')
        setIsCreateOpen(false)
        setNewPage({ name: '', handle: '', description: '', category: 'Creator' })
        loadPages()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create page')
      }
    } catch (err) {
      toast.error('An error occurred')
    }
  }

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Delete this page permanently? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/pages?id=${pageId}&userId=${currentUser?.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id || '' },
      })
      if (res.ok) {
        setPages(prev => prev.filter(p => p.id !== pageId))
        toast.success('Page deleted')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete page')
      }
    } catch {
      toast.error('Connection error')
    }
  }

  const filteredPages = pages.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.handle.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">InteraX Pages</h1>
            <p className="text-muted-foreground">Showcase your work and build your brand</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full px-6 bg-gradient-to-r from-[#4B0082] to-[#6366f1] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Page
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start your InteraX Page</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Page Name</Label>
                  <Input placeholder="e.g. Creative Studio" value={newPage.name} onChange={e => setNewPage(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Handle (@)</Label>
                  <Input placeholder="unique-handle" value={newPage.handle} onChange={e => setNewPage(p => ({ ...p, handle: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={newPage.category}
                    onChange={e => setNewPage(p => ({ ...p, category: e.target.value }))}
                  >
                    {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Tell people what your page is about..." value={newPage.description} onChange={e => setNewPage(p => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreatePage} className="w-full">Initialize Page</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search creators and brands..."
            className="pl-10 h-12 rounded-xl bg-secondary/50 border-none"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-8">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm transition-all',
                selectedCategory === c ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-secondary animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPages.map(page => (
              <div key={page.id} className="relative group/card">
                <Link href={`/pages/${page.id}`}>
                  <div className="group bg-background border border-border p-5 rounded-2xl hover:border-primary/50 transition-all hover:translate-y-[-2px] hover:shadow-lg">
                    <div className="flex items-start justify-between mb-4">
                      <Avatar className="h-14 w-14 rounded-xl border border-border shadow-sm">
                        <AvatarImage src={page.avatar_url} />
                        <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#4B0082]/10 to-[#6366f1]/10 text-primary uppercase">{page.name[0]}</AvatarFallback>
                      </Avatar>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{page.category}</Badge>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-0.5 group-hover:text-primary transition-colors">{page.name}</h3>
                      <p className="text-xs text-muted-foreground mb-3 font-mono">@{page.handle}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">{page.description || 'InteraX Official Page'}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-4 border-t border-border">
                      <div className="flex gap-4">
                        <span className="text-muted-foreground"><strong className="text-foreground">0</strong> followed</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
                {currentUser?.id === page.owner_id && (
                  <button
                    onClick={(e) => { e.preventDefault(); handleDeletePage(page.id) }}
                    className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-destructive/90 text-white flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity shadow-md hover:bg-destructive"
                    title="Delete page"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
