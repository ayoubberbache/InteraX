// Mock Users
export interface User {
  id: string
  name: string
  username: string
  avatar: string
  bio: string
  rating: number
  ratingCount: number
  followers: number
  following: number
  postsCount: number
}

export const users: User[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    username: 'sarahchen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    bio: 'Digital creator & photographer. Exploring the world one frame at a time.',
    rating: 4.8,
    ratingCount: 234,
    followers: 12500,
    following: 890,
    postsCount: 156,
  },
  {
    id: '2',
    name: 'Alex Rivera',
    username: 'alexrivera',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    bio: 'Tech enthusiast | Coffee lover | Building cool stuff',
    rating: 4.5,
    ratingCount: 189,
    followers: 8900,
    following: 456,
    postsCount: 89,
  },
  {
    id: '3',
    name: 'Emma Wilson',
    username: 'emmawilson',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    bio: 'Food blogger & recipe developer. Making cooking fun!',
    rating: 4.9,
    ratingCount: 567,
    followers: 25000,
    following: 234,
    postsCount: 312,
  },
  {
    id: '4',
    name: 'Marcus Johnson',
    username: 'marcusj',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    bio: 'Fitness coach | Helping you reach your goals',
    rating: 4.7,
    ratingCount: 312,
    followers: 18000,
    following: 567,
    postsCount: 203,
  },
  {
    id: '5',
    name: 'Lisa Park',
    username: 'lisapark',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    bio: 'Artist & designer. Creating beauty in everyday life.',
    rating: 4.6,
    ratingCount: 145,
    followers: 9500,
    following: 678,
    postsCount: 98,
  },
]

// Mock Posts
export interface Comment {
  id: string
  userId: string
  text: string
  createdAt: string
}

export interface Post {
  id: string
  userId: string
  image: string
  caption: string
  likes: number
  rating: number
  ratingCount: number
  comments: Comment[]
  createdAt: string
  isLiked?: boolean
  userRating?: number
}

export const posts: Post[] = [
  {
    id: '1',
    userId: '1',
    image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=600&h=600&fit=crop',
    caption: 'Golden hour magic at the beach. These moments are what life is all about.',
    likes: 1234,
    rating: 4.7,
    ratingCount: 89,
    comments: [
      { id: '1', userId: '2', text: 'Stunning shot! The colors are incredible.', createdAt: '2024-01-15T10:30:00Z' },
      { id: '2', userId: '3', text: 'Where is this? I need to visit!', createdAt: '2024-01-15T11:00:00Z' },
    ],
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: '2',
    userId: '3',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=600&fit=crop',
    caption: 'New recipe alert! Homemade pasta with fresh tomato basil sauce. Recipe in bio!',
    likes: 2567,
    rating: 4.9,
    ratingCount: 156,
    comments: [
      { id: '3', userId: '1', text: 'This looks absolutely delicious!', createdAt: '2024-01-14T15:00:00Z' },
      { id: '4', userId: '4', text: 'Made it last night - amazing!', createdAt: '2024-01-14T18:00:00Z' },
    ],
    createdAt: '2024-01-14T12:00:00Z',
  },
  {
    id: '3',
    userId: '4',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=600&fit=crop',
    caption: 'Morning workout complete! Remember: consistency beats intensity every time.',
    likes: 890,
    rating: 4.5,
    ratingCount: 67,
    comments: [
      { id: '5', userId: '2', text: 'Great motivation! Keep it up!', createdAt: '2024-01-13T07:00:00Z' },
    ],
    createdAt: '2024-01-13T06:00:00Z',
  },
  {
    id: '4',
    userId: '5',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=600&fit=crop',
    caption: 'New art piece finished! This one took 3 weeks but so worth it.',
    likes: 1567,
    rating: 4.8,
    ratingCount: 112,
    comments: [
      { id: '6', userId: '1', text: 'The detail is incredible!', createdAt: '2024-01-12T14:00:00Z' },
      { id: '7', userId: '3', text: 'Do you sell prints?', createdAt: '2024-01-12T16:00:00Z' },
    ],
    createdAt: '2024-01-12T10:00:00Z',
  },
  {
    id: '5',
    userId: '2',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=600&fit=crop',
    caption: 'Building something cool with the new tech stack. Stay tuned for the reveal!',
    likes: 678,
    rating: 4.3,
    ratingCount: 45,
    comments: [
      { id: '8', userId: '4', text: 'Cant wait to see it!', createdAt: '2024-01-11T20:00:00Z' },
    ],
    createdAt: '2024-01-11T18:00:00Z',
  },
]

// Mock Stories
export interface StoryItem {
  id: string
  image: string
  timestamp: string
}

export interface Story {
  id: string
  userId: string
  items: StoryItem[]
  viewed: boolean
}

export const stories: Story[] = [
  {
    id: '1',
    userId: '1',
    items: [
      { id: '1-1', image: 'https://images.unsplash.com/photo-1682687221038-404670f01d03?w=400&h=700&fit=crop', timestamp: '2024-01-15T07:00:00Z' },
      { id: '1-2', image: 'https://images.unsplash.com/photo-1682695794947-17061dc284dd?w=400&h=700&fit=crop', timestamp: '2024-01-15T08:00:00Z' },
      { id: '1-3', image: 'https://images.unsplash.com/photo-1682686581660-3693f0c588d2?w=400&h=700&fit=crop', timestamp: '2024-01-15T09:00:00Z' },
    ],
    viewed: false,
  },
  {
    id: '2',
    userId: '2',
    items: [
      { id: '2-1', image: 'https://images.unsplash.com/photo-1682695797221-8164ff1fafc9?w=400&h=700&fit=crop', timestamp: '2024-01-15T06:00:00Z' },
    ],
    viewed: false,
  },
  {
    id: '3',
    userId: '3',
    items: [
      { id: '3-1', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=700&fit=crop', timestamp: '2024-01-15T10:00:00Z' },
      { id: '3-2', image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=700&fit=crop', timestamp: '2024-01-15T11:00:00Z' },
    ],
    viewed: true,
  },
  {
    id: '4',
    userId: '4',
    items: [
      { id: '4-1', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=700&fit=crop', timestamp: '2024-01-15T05:00:00Z' },
      { id: '4-2', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=700&fit=crop', timestamp: '2024-01-15T05:30:00Z' },
    ],
    viewed: false,
  },
  {
    id: '5',
    userId: '5',
    items: [
      { id: '5-1', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=700&fit=crop', timestamp: '2024-01-15T09:00:00Z' },
    ],
    viewed: true,
  },
]

// Mock Groups
export interface Group {
  id: string
  name: string
  description: string
  cover: string
  memberCount: number
  members: string[]
  rating: number
  ratingCount: number
  isJoined?: boolean
  postsCount: number
  category: string
}

export const groups: Group[] = [
  {
    id: '1',
    name: 'Photography Enthusiasts',
    description: 'A community for photographers of all levels. Share your work, get feedback, and learn new techniques.',
    cover: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&h=400&fit=crop',
    memberCount: 15234,
    members: ['1', '2', '5'],
    rating: 4.8,
    ratingCount: 456,
    postsCount: 2345,
    category: 'Photography',
  },
  {
    id: '2',
    name: 'Foodies United',
    description: 'Share recipes, restaurant recommendations, and your culinary creations!',
    cover: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop',
    memberCount: 28567,
    members: ['3', '1'],
    rating: 4.9,
    ratingCount: 789,
    postsCount: 5678,
    category: 'Food & Drink',
  },
  {
    id: '3',
    name: 'Tech Innovators',
    description: 'Discuss the latest in technology, startups, and innovation.',
    cover: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=400&fit=crop',
    memberCount: 12890,
    members: ['2', '4'],
    rating: 4.6,
    ratingCount: 234,
    postsCount: 1234,
    category: 'Technology',
  },
  {
    id: '4',
    name: 'Fitness & Wellness',
    description: 'Your journey to a healthier lifestyle starts here. Tips, motivation, and support.',
    cover: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=400&fit=crop',
    memberCount: 34567,
    members: ['4', '1', '2'],
    rating: 4.7,
    ratingCount: 567,
    postsCount: 3456,
    category: 'Health & Fitness',
  },
  {
    id: '5',
    name: 'Art & Design',
    description: 'Celebrating creativity in all its forms. Share your art, get inspired, collaborate.',
    cover: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=400&fit=crop',
    memberCount: 9876,
    members: ['5', '3'],
    rating: 4.5,
    ratingCount: 123,
    postsCount: 890,
    category: 'Art & Design',
  },
  {
    id: '6',
    name: 'Travel Adventures',
    description: 'Explore the world together. Share travel tips, photos, and hidden gems.',
    cover: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=400&fit=crop',
    memberCount: 45678,
    members: ['1', '2', '3', '4', '5'],
    rating: 4.8,
    ratingCount: 890,
    postsCount: 7890,
    category: 'Travel',
  },
]

// Mock Messages / Conversations
export interface Message {
  id: string
  senderId: string
  text: string
  timestamp: string
  isRead: boolean
}

export interface Conversation {
  id: string
  participants: string[]
  messages: Message[]
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
}

export const conversations: Conversation[] = [
  {
    id: '1',
    participants: ['1', '2'],
    messages: [
      { id: 'm1', senderId: '2', text: 'Hey! Love your recent photos!', timestamp: '2024-01-15T10:00:00Z', isRead: true },
      { id: 'm2', senderId: '1', text: 'Thanks so much! That means a lot coming from you', timestamp: '2024-01-15T10:05:00Z', isRead: true },
      { id: 'm3', senderId: '2', text: 'Would love to collaborate sometime!', timestamp: '2024-01-15T10:10:00Z', isRead: true },
      { id: 'm4', senderId: '1', text: 'That sounds amazing! What did you have in mind?', timestamp: '2024-01-15T10:15:00Z', isRead: true },
      { id: 'm5', senderId: '2', text: 'Maybe a tech x photography project? Let me know when you are free!', timestamp: '2024-01-15T10:20:00Z', isRead: false },
    ],
    lastMessage: 'Maybe a tech x photography project? Let me know when you are free!',
    lastMessageTime: '2024-01-15T10:20:00Z',
    unreadCount: 1,
  },
  {
    id: '2',
    participants: ['1', '3'],
    messages: [
      { id: 'm6', senderId: '3', text: 'Your pasta recipe was incredible!', timestamp: '2024-01-14T18:00:00Z', isRead: true },
      { id: 'm7', senderId: '1', text: 'So glad you liked it! Did you add the extra basil?', timestamp: '2024-01-14T18:10:00Z', isRead: true },
      { id: 'm8', senderId: '3', text: 'Yes! It made such a difference. Can you share your sauce recipe?', timestamp: '2024-01-14T18:15:00Z', isRead: false },
    ],
    lastMessage: 'Yes! It made such a difference. Can you share your sauce recipe?',
    lastMessageTime: '2024-01-14T18:15:00Z',
    unreadCount: 1,
  },
  {
    id: '3',
    participants: ['1', '4'],
    messages: [
      { id: 'm9', senderId: '4', text: 'Great workout tips! Following your routine now', timestamp: '2024-01-13T09:00:00Z', isRead: true },
      { id: 'm10', senderId: '1', text: 'Awesome! Let me know how it goes', timestamp: '2024-01-13T09:30:00Z', isRead: true },
    ],
    lastMessage: 'Awesome! Let me know how it goes',
    lastMessageTime: '2024-01-13T09:30:00Z',
    unreadCount: 0,
  },
  {
    id: '4',
    participants: ['1', '5'],
    messages: [
      { id: 'm11', senderId: '5', text: 'Hi! Would you be interested in a commission?', timestamp: '2024-01-12T14:00:00Z', isRead: true },
      { id: 'm12', senderId: '1', text: 'Definitely! What are you thinking?', timestamp: '2024-01-12T14:30:00Z', isRead: true },
      { id: 'm13', senderId: '5', text: 'A portrait in your signature style. Budget is flexible!', timestamp: '2024-01-12T15:00:00Z', isRead: false },
    ],
    lastMessage: 'A portrait in your signature style. Budget is flexible!',
    lastMessageTime: '2024-01-12T15:00:00Z',
    unreadCount: 1,
  },
]

// Mock Notifications
export interface Notification {
  id: string
  type: 'like' | 'comment' | 'follow' | 'mention' | 'group_invite' | 'rating'
  fromUserId: string
  targetId?: string
  targetType?: 'post' | 'group' | 'user'
  message: string
  timestamp: string
  isRead: boolean
}

export const notifications: Notification[] = [
  {
    id: 'n1',
    type: 'like',
    fromUserId: '2',
    targetId: '1',
    targetType: 'post',
    message: 'liked your photo',
    timestamp: '2024-01-15T11:00:00Z',
    isRead: false,
  },
  {
    id: 'n2',
    type: 'comment',
    fromUserId: '3',
    targetId: '1',
    targetType: 'post',
    message: 'commented: "This is stunning!"',
    timestamp: '2024-01-15T10:30:00Z',
    isRead: false,
  },
  {
    id: 'n3',
    type: 'follow',
    fromUserId: '4',
    message: 'started following you',
    timestamp: '2024-01-15T09:00:00Z',
    isRead: false,
  },
  {
    id: 'n4',
    type: 'rating',
    fromUserId: '5',
    targetId: '1',
    targetType: 'post',
    message: 'gave your post 5 stars',
    timestamp: '2024-01-15T08:30:00Z',
    isRead: true,
  },
  {
    id: 'n5',
    type: 'group_invite',
    fromUserId: '2',
    targetId: '3',
    targetType: 'group',
    message: 'invited you to join Tech Innovators',
    timestamp: '2024-01-14T20:00:00Z',
    isRead: true,
  },
  {
    id: 'n6',
    type: 'mention',
    fromUserId: '3',
    targetId: '2',
    targetType: 'post',
    message: 'mentioned you in a comment',
    timestamp: '2024-01-14T15:00:00Z',
    isRead: true,
  },
  {
    id: 'n7',
    type: 'like',
    fromUserId: '4',
    targetId: '1',
    targetType: 'post',
    message: 'liked your photo',
    timestamp: '2024-01-14T12:00:00Z',
    isRead: true,
  },
  {
    id: 'n8',
    type: 'follow',
    fromUserId: '5',
    message: 'started following you',
    timestamp: '2024-01-13T18:00:00Z',
    isRead: true,
  },
]

// Helper functions
export function getUserById(id: string): User | undefined {
  return users.find(user => user.id === id)
}

export function getConversationById(id: string): Conversation | undefined {
  return conversations.find(conv => conv.id === id)
}

export function getConversationsForUser(userId: string): Conversation[] {
  return conversations.filter(conv => conv.participants.includes(userId))
}

export function getUnreadNotificationsCount(): number {
  return notifications.filter(n => !n.isRead).length
}

export function getTotalUnreadMessages(userId: string): number {
  return conversations
    .filter(conv => conv.participants.includes(userId))
    .reduce((total, conv) => total + conv.unreadCount, 0)
}

export function getPostsByUserId(userId: string): Post[] {
  return posts.filter(post => post.userId === userId)
}

export function getStoryByUserId(userId: string): Story | undefined {
  return stories.find(story => story.userId === userId)
}

export function getGroupById(id: string): Group | undefined {
  return groups.find(group => group.id === id)
}

export function getGroupsByUserId(userId: string): Group[] {
  return groups.filter(group => group.members.includes(userId))
}
