'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Users, Trash2 } from 'lucide-react'
import { MainLayout } from '@/frontend/components/layout/main-layout'
import { GroupCard } from '@/frontend/components/groups/group-card'
import { Badge } from '@/frontend/components/ui/badge'
import { Button } from '@/frontend/components/ui/button'
import { Input } from '@/frontend/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/frontend/components/ui/dialog'
import { Label } from '@/frontend/components/ui/label'
import { Textarea } from '@/frontend/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select'
import { cn } from '@/backend/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/backend/lib/auth-context'

const categories = ['All', 'Photography', 'Food & Drink', 'Technology', 'Health & Fitness', 'Art & Design', 'Travel', 'General']

export default function GroupsPage() {
  const { currentUser } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [groups, setGroups] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Creation state
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    category: 'General',
    avatar_url: '',
    cover_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=60'
  })

  const loadGroups = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/groups')
      if (res.ok) {
        const data = await res.json()
        setGroups(data)
      }
    } catch (err) {
      toast.error('Failed to load groups')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Delete this group permanently? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/groups?id=${groupId}&userId=${currentUser?.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id || '' },
      })
      if (res.ok) {
        setGroups(prev => prev.filter(g => g.id !== groupId))
        toast.success('Group deleted')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete group')
      }
    } catch {
      toast.error('Connection error')
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroup.name) return
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newGroup, userId: currentUser?.id })
      })
      if (res.ok) {
        toast.success('Group created successfully!')
        setIsCreateOpen(false)
        setNewGroup({ name: '', description: '', category: 'General', avatar_url: '', cover_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=60' })
        loadGroups()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create group')
      }
    } catch (err) {
      toast.error('An error occurred')
    }
  }

  const filteredGroups = groups.filter(group => {
    const matchesCategory = selectedCategory === 'All' || (group.category || 'General') === selectedCategory
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (group.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Discover Groups</h1>
            <p className="text-muted-foreground">Find communities that share your interests</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-gradient-to-r from-[#4B0082] to-[#9370DB] text-white shadow-lg hover:shadow-primary/20 transition-all">
                <Plus className="h-4 w-4 mr-2" />
                Create New Group
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create a Community</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Campus Photography" 
                    value={newGroup.name}
                    onChange={e => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newGroup.category} 
                    onValueChange={v => setNewGroup(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c !== 'All').map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea 
                    id="description" 
                    placeholder="What is this group about?" 
                    value={newGroup.description}
                    onChange={e => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleCreateGroup}
                  disabled={!newGroup.name}
                  className="bg-primary text-primary-foreground"
                >
                  Create Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups by name or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 rounded-xl bg-secondary/50 pl-10 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-8">
          {categories.map(category => (
            <button
              key={category}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/80 text-muted-foreground hover:bg-secondary'
              )}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Groups Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[280px] rounded-xl bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map(group => (
              <div key={group.id} className="relative group/card">
                <GroupCard group={group} />
                {currentUser?.id === group.owner_id && (
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-destructive/90 text-white flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity shadow-md hover:bg-destructive"
                    title="Delete group"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No groups found</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">Try adjusting your search or category filters to find what you&apos;re looking for.</p>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
