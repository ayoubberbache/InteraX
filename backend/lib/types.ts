// ─── Shared Database Entity Types ─────────────────────────────────────

export type UserRole = 'user' | 'moderator' | 'admin'
export type GroupPrivacy = 'public' | 'private' | 'invite_only'
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file'
export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'mention'
  | 'group_invite'
  | 'message'
  | 'system'
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other'
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned'

export interface DbUser {
  id: string
  email: string
  username: string
  password_hash: string
  full_name: string
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  role: UserRole
  is_verified: boolean
  is_active: boolean
  points: number
  rating: number
  followers_count: number
  following_count: number
  posts_count: number
  ai_persona: string | null
  email_verified_at: string | null
  last_login_at: string | null
  refresh_token_hash: string | null
  created_at: string
  updated_at: string
}

export interface DbPost {
  id: string
  author_id: string
  group_id: string | null
  content: string
  image_url: string | null
  video_url: string | null
  likes_count: number
  comments_count: number
  shares_count: number
  is_pinned: boolean
  is_archived: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  // joined
  author?: Partial<DbUser>
  comments?: DbComment[]
  is_liked?: boolean
}

export interface DbComment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  content: string
  likes_count: number
  is_deleted: boolean
  created_at: string
  updated_at: string
  author?: Partial<DbUser>
}

export interface DbStory {
  id: string
  user_id: string
  image_url: string
  media_type: string
  caption: string | null
  view_count: number
  expires_at: string
  created_at: string
  // joined
  author?: Partial<DbUser>
  is_viewed?: boolean
}

export interface DbConversation {
  id: string
  is_group_chat: boolean
  name: string | null
  image_url: string | null
  last_message_at: string | null
  created_at: string
  // joined
  participants?: DbConversationParticipant[]
}

export interface DbConversationParticipant {
  conversation_id: string
  user_id: string
  is_admin: boolean
  last_read_at: string | null
  joined_at: string
  user?: Partial<DbUser>
}

export interface DbMessage {
  id: string
  conversation_id: string
  sender_id: string
  type: MessageType
  content: string | null
  media_url: string | null
  reply_to_id: string | null
  is_deleted: boolean
  read_count: number
  created_at: string
  updated_at: string
  sender?: Partial<DbUser>
}

export interface DbNotification {
  id: string
  user_id: string
  actor_id: string | null
  type: NotificationType
  entity_id: string | null
  entity_type: string | null
  message: string | null
  is_read: boolean
  created_at: string
  actor?: Partial<DbUser>
}

export interface DbGroup {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  cover_url: string | null
  privacy: GroupPrivacy
  owner_id: string
  members_count: number
  posts_count: number
  is_active: boolean
  created_at: string
  updated_at: string
  owner?: Partial<DbUser>
}

export interface AiChatbotSession {
  id: string
  user_id: string
  session_title: string | null
  model_used: string
  total_messages: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AiChatbotMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  token_count: number | null
  created_at: string
}

export interface PostLike {
  user_id: string
  post_id: string
  created_at: string
}

export interface UserFollow {
  follower_id: string
  following_id: string
  created_at: string
}
