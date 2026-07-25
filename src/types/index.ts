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

