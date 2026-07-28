export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string
  website: string
  is_private: boolean
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string
  image_url: string | null
  created_at: string
  updated_at: string
  // Joined fields
  profiles?: Profile
  likes_count?: number
  comments_count?: number
  is_liked?: boolean
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  // Joined fields
  profiles?: Profile
}

export interface Like {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface FollowRequest {
  id: string
  requester_id: string
  requested_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  // Joined fields
  requester?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: 'follow' | 'like' | 'comment' | 'follow_request' | 'follow_accept' | 'mention'
  actor_id: string
  post_id: string | null
  comment_id: string | null
  is_read: boolean
  created_at: string
  // Joined fields
  actor?: Profile
  post?: Post
}

export interface Block {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

// ============== CHAT & CALL TYPES ==============

export interface Conversation {
  id: string
  created_at: string
  updated_at: string
  last_message_at: string
  // Joined fields
  participants?: ConversationParticipant[]
  last_message?: Message
  other_participant?: Profile
  unread_count?: number
  hidden_at?: string | null // Timestamp when user hid this conversation, null if not hidden
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  joined_at: string
  last_read_at: string
  // Joined fields
  profile?: Profile
}

export type MessageType = 'text' | 'image' | 'call'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  image_url: string | null
  message_type: MessageType
  call_type: 'audio' | 'video' | null
  call_duration: number | null
  created_at: string
  // Joined fields
  sender?: Profile
}

export interface CallSignal {
  id: string
  conversation_id: string
  sender_id: string
  receiver_id: string
  signal_data: any
  signal_type: 'offer' | 'answer' | 'ice-candidate' | 'call-end' | 'reject'
  created_at: string
  // Joined fields
  sender?: Profile
}

// ============== CALL SESSION & RATING TYPES ==============

export type CallSessionStatus = 'missed' | 'answered' | 'rejected' | 'cancelled' | 'failed'

export interface CallSession {
  id: string
  conversation_id: string
  caller_id: string
  receiver_id: string
  call_type: 'audio' | 'video'
  status: CallSessionStatus
  started_at: string
  ended_at: string | null
  duration: number
  created_at: string
  // Joined fields
  caller?: Profile
  receiver?: Profile
}

export interface CallRating {
  id: string
  call_session_id: string
  user_id: string
  rating: number
  feedback: string | null
  created_at: string
}

