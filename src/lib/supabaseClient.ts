import { createClient } from '@supabase/supabase-js'
import type { Profile, Post, Comment, CommentReaction, CommentReactionType, Notification, FollowRequest, Block, Conversation, ConversationParticipant, Message, CallSignal, Story, UserStoriesGroup, StoryViewerItem } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Validate Supabase URL format
try {
  const url = new URL(supabaseUrl)
  if (!url.protocol.startsWith('https')) {
    throw new Error('Supabase URL must use HTTPS protocol')
  }
  if (!url.hostname.includes('.supabase.co')) {
    console.warn('Warning: Supabase URL does not appear to be a valid Supabase project URL')
  }
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${error}`)
}

// Validate anon key format (basic check for JWT-like structure)
if (supabaseAnonKey.length < 20) {
  throw new Error('Supabase anon key appears to be invalid (too short)')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============== AUTH HELPERS ==============

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const signUpWithEmail = async (email: string, password: string, username?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username || email.split('@')[0],
        full_name: username || email.split('@')[0],
      },
    },
  })
  if (error) throw error
  return data
}

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ============== PROFILE HELPERS ==============

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

/**
 * Ensures a profile exists for the current authenticated user.
 * If no profile is found, it creates one automatically using auth user metadata.
 * This prevents FK constraint violations when inserting posts/comments.
 */
export const ensureProfile = async (): Promise<Profile> => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  // Check if profile already exists
  const existingProfile = await getProfile(user.id)
  if (existingProfile) return existingProfile

  // Create profile if it doesn't exist
  const username = user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.substring(0, 8)}`
  const fullName = user.user_metadata?.full_name || username

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      username,
      full_name: fullName,
      avatar_url: user.user_metadata?.avatar_url || null,
      bio: '',
      website: '',
    })
    .select('*')
    .single()

  if (error) {
    // If another request created the profile concurrently, fetch it
    if (error.code === '23505') {
      const profile = await getProfile(user.id)
      if (profile) return profile
    }
    throw error
  }

  return data as Profile
}

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data as Profile
}

export const searchProfiles = async (query: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(20)
  if (error) throw error
  return data as Profile[]
}

// ============== POST HELPERS ==============

// Helper to attach profile data to posts
const attachProfilesToPosts = async (posts: any[]): Promise<Post[]> => {
  if (posts.length === 0) return []

  const userIds = [...new Set(posts.map((p: any) => p.user_id))]

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)

  if (error) throw error

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  return posts.map((post: any) => ({
    ...post,
    profiles: profileMap.get(post.user_id) || null,
    likes_count: post.likes_count?.[0]?.count ?? post.likes_count ?? 0,
    comments_count: post.comments_count?.[0]?.count ?? post.comments_count ?? 0,
  })) as Post[]
}

export const getPosts = async (limit = 20, offset = 0) => {
  const user = await getCurrentUser()
  
  // If user is authenticated, get posts excluding private accounts they don't follow
  if (user) {
    // Get users the current user follows
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = following?.map(f => f.following_id) || []
    followingIds.push(user.id) // Include own posts

    // Get posts from public accounts OR from private accounts the user follows
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        likes_count:likes(count),
        comments_count:comments(count),
        profiles!posts_user_id_fkey(id, is_private)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Filter posts: show if public OR if user follows the author
    const filteredPosts = (posts || []).filter((post: any) => {
      const isPrivate = post.profiles?.is_private || false
      const isFollowed = followingIds.includes(post.user_id)
      const isOwnPost = post.user_id === user.id
      return !isPrivate || isFollowed || isOwnPost
    })

    return {
      posts: await attachProfilesToPosts(filteredPosts),
      hasMore: (posts || []).length === limit,
    }
  }

  // If not authenticated, only show posts from public accounts
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      likes_count:likes(count),
      comments_count:comments(count),
      profiles!posts_user_id_fkey(id, is_private)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  // Filter to only show posts from public accounts
  const filteredPosts = (posts || []).filter((post: any) => !post.profiles?.is_private)

  return {
    posts: await attachProfilesToPosts(filteredPosts),
    hasMore: (posts || []).length === limit,
  }
}

export const getUserPosts = async (userId: string, limit = 20, offset = 0) => {
  const currentUser = await getCurrentUser()
  const isOwnProfile = currentUser?.id === userId

  // Get the target profile to check if it's private
  const targetProfile = await getProfile(userId)
  const isPrivate = targetProfile?.is_private || false

  // If profile is private and not own profile, check if current user follows them
  if (isPrivate && !isOwnProfile && currentUser) {
    const isFollowed = await isFollowing(userId)
    if (!isFollowed) {
      // Return empty posts for private accounts not followed
      return {
        posts: [],
        hasMore: false,
      }
    }
  }

  // If profile is private and user is not authenticated, return empty
  if (isPrivate && !currentUser) {
    return {
      posts: [],
      hasMore: false,
    }
  }

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      likes_count:likes(count),
      comments_count:comments(count)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return {
    posts: await attachProfilesToPosts(data || []),
    hasMore: (data || []).length === limit,
  }
}

export const getUserPostsCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) throw error
  return count || 0
}

export const getFeedPosts = async (userId: string, limit = 20, offset = 0) => {
  // Get posts from users the current user follows + own posts
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  const followingIds = following?.map(f => f.following_id) || []
  followingIds.push(userId) // Include own posts

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      likes_count:likes(count),
      comments_count:comments(count)
    `)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return {
    posts: await attachProfilesToPosts(data || []),
    hasMore: (data || []).length === limit,
  }
}

export const createPost = async (content: string, imageUrl?: string) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  // Ensure the user's profile exists before inserting (prevents FK violation)
  await ensureProfile()

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      content,
      image_url: imageUrl || null,
    })
    .select('*')
    .single()

  if (error) throw error

  // Attach the user's profile
  const profile = await getProfile(user.id)

  return {
    ...data,
    profiles: profile,
    likes_count: 0,
    comments_count: 0,
  } as Post
}

export const deletePost = async (postId: string) => {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (error) throw error
}

// ============== LIKE HELPERS ==============

export const likePost = async (postId: string) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  // Ensure the user's profile exists before inserting (prevents FK violation)
  await ensureProfile()

  const { error } = await supabase
    .from('likes')
    .insert({ post_id: postId, user_id: user.id })

  if (error && error.code !== '23505') throw error // Ignore duplicate
}

export const unlikePost = async (postId: string) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', user.id)

  if (error) throw error
}

export const isPostLiked = async (postId: string): Promise<boolean> => {
  const user = await getCurrentUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  return !!data
}

// ============== SAVE / BOOKMARK HELPERS ==============

export const isPostSaved = (postId: string, userId?: string): boolean => {
  try {
    const key = userId ? `saved_posts_${userId}` : 'saved_posts_guest'
    const saved = localStorage.getItem(key)
    const list: string[] = saved ? JSON.parse(saved) : []
    return list.includes(postId)
  } catch {
    return false
  }
}

export const toggleSavePost = (postId: string, userId?: string): boolean => {
  try {
    const key = userId ? `saved_posts_${userId}` : 'saved_posts_guest'
    const saved = localStorage.getItem(key)
    let list: string[] = saved ? JSON.parse(saved) : []
    const isAlreadySaved = list.includes(postId)
    if (isAlreadySaved) {
      list = list.filter((id) => id !== postId)
    } else {
      list = [postId, ...list]
    }
    localStorage.setItem(key, JSON.stringify(list))
    return !isAlreadySaved
  } catch {
    return false
  }
}

export const getSavedPosts = async (userId?: string): Promise<Post[]> => {
  try {
    const key = userId ? `saved_posts_${userId}` : 'saved_posts_guest'
    const savedJson = localStorage.getItem(key)
    const savedIds: string[] = savedJson ? JSON.parse(savedJson) : []

    if (savedIds.length === 0) return []

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        likes_count:likes(count),
        comments_count:comments(count)
      `)
      .in('id', savedIds)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!data) return []

    return await attachProfilesToPosts(data)
  } catch (err) {
    console.error('Error fetching saved posts:', err)
    return []
  }
}

// ============== COMMENT HELPERS ==============

// Helper to attach profile data to comments
const attachProfilesToComments = async (comments: any[]): Promise<Comment[]> => {
  if (comments.length === 0) return []

  const userIds = [...new Set(comments.map((c: any) => c.user_id))]

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)

  if (error) throw error

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  return comments.map((comment: any) => ({
    ...comment,
    profiles: profileMap.get(comment.user_id) || null,
  })) as Comment[]
}

export const getComments = async (postId: string) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return attachProfilesToComments(data || [])
}

export const addComment = async (postId: string, content: string) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  // Ensure the user's profile exists before inserting (prevents FK violation)
  await ensureProfile()

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      content,
      parent_comment_id: null,
    })
    .select('*')
    .single()

  if (error) throw error

  // Attach the user's profile
  const profile = await getProfile(user.id)

  return {
    ...data,
    profiles: profile,
  } as Comment
}

export const addReply = async (postId: string, parentCommentId: string, content: string) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  await ensureProfile()

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      content,
      parent_comment_id: parentCommentId,
    })
    .select('*')
    .single()

  if (error) throw error

  const profile = await getProfile(user.id)

  return {
    ...data,
    profiles: profile,
  } as Comment
}

// ============== COMMENT REACTION HELPERS ==============

/**
 * React to a comment with a specific reaction type.
 * If the user already has a reaction on this comment, it updates it (upsert behavior).
 * Returns the updated reaction data.
 */
export const reactToComment = async (
  commentId: string,
  reaction: CommentReactionType
): Promise<CommentReaction> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  await ensureProfile()

  const { data, error } = await supabase
    .from('comment_reactions')
    .upsert(
      {
        comment_id: commentId,
        user_id: currentUser.id,
        reaction,
      },
      {
        onConflict: 'comment_id, user_id',
        ignoreDuplicates: false,
      }
    )
    .select('*')
    .single()

  if (error) throw error
  return data as CommentReaction
}

/**
 * Remove the current user's reaction from a comment.
 */
export const removeCommentReaction = async (commentId: string): Promise<void> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('comment_reactions')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', currentUser.id)

  if (error) throw error
}

/**
 * Get reaction counts for a single comment and the current user's reaction.
 * Returns a map of reaction type to count, and the user's reaction if any.
 */
export const getCommentReactions = async (
  commentId: string
): Promise<{
  reactions: Record<string, number>
  user_reaction: CommentReactionType | null
}> => {
  const currentUser = await getCurrentUser()

  // Get all reactions for this comment
  const { data, error } = await supabase
    .from('comment_reactions')
    .select('reaction, user_id')
    .eq('comment_id', commentId)

  if (error) throw error

  // Count reactions by type
  const defaultCounts: Record<string, number> = {
    like: 0,
    love: 0,
    laugh: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  }

  const counts = (data || []).reduce((acc: Record<string, number>, r: any) => {
    acc[r.reaction] = (acc[r.reaction] || 0) + 1
    return acc
  }, { ...defaultCounts })

  // Find current user's reaction
  let userReaction: CommentReactionType | null = null
  if (currentUser) {
    const userReactionData = (data || []).find(
      (r: any) => r.user_id === currentUser.id
    )
    userReaction = userReactionData?.reaction || null
  }

  return { reactions: counts, user_reaction: userReaction }
}

/**
 * Get all reactions for a list of comments (batch query for efficiency).
 * Returns a map of comment_id -> { reactions, user_reaction }
 */
export const getBatchCommentReactions = async (
  commentIds: string[]
): Promise<Record<string, { reactions: Record<string, number>; user_reaction: CommentReactionType | null }>> => {
  if (commentIds.length === 0) return {}

  const currentUser = await getCurrentUser()

  const { data, error } = await supabase
    .from('comment_reactions')
    .select('comment_id, reaction, user_id')
    .in('comment_id', commentIds)

  if (error) throw error

  const defaultCounts: Record<string, number> = {
    like: 0,
    love: 0,
    laugh: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  }

  const result: Record<string, { reactions: Record<string, number>; user_reaction: CommentReactionType | null }> = {}

  // Initialize all comments with zero counts
  commentIds.forEach((id) => {
    result[id] = { reactions: { ...defaultCounts }, user_reaction: null }
  })

  // Aggregate counts and find user's reaction
  ;(data || []).forEach((r: any) => {
    if (!result[r.comment_id]) {
      result[r.comment_id] = { reactions: { ...defaultCounts }, user_reaction: null }
    }
    result[r.comment_id].reactions[r.reaction] =
      (result[r.comment_id].reactions[r.reaction] || 0) + 1

    if (currentUser && r.user_id === currentUser.id) {
      result[r.comment_id].user_reaction = r.reaction
    }
  })

  return result
}

// ============== FOLLOW HELPERS ==============

export const followUser = async (userId: string) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  // Ensure the user's profile exists before inserting (prevents FK violation)
  await ensureProfile()

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: currentUser.id, following_id: userId })

  if (error && error.code !== '23505') throw error
}

export const unfollowUser = async (userId: string) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', currentUser.id)
    .eq('following_id', userId)

  if (error) throw error
}

export const isFollowing = async (userId: string): Promise<boolean> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return false

  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', currentUser.id)
    .eq('following_id', userId)
    .maybeSingle()

  if (error) throw error
  return !!data
}

/**
 * Checks if the specified user follows the current authenticated user.
 * Used for "Follows You" and "Follow Back" indicators.
 */
export const doesUserFollowMe = async (targetUserId: string): Promise<boolean> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return false

  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', targetUserId)
    .eq('following_id', currentUser.id)
    .maybeSingle()

  if (error) throw error
  return !!data
}

export const getFollowersCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)

  if (error) throw error
  return count || 0
}

export const getFollowingCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId)

  if (error) throw error
  return count || 0
}

// ============== FOLLOW LISTS HELPERS ==============

/**
 * Get followers of a user with profile data
 */
export const getFollowers = async (userId: string) => {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      follower_id,
      profiles!follows_follower_id_fkey(*)
    `)
    .eq('following_id', userId)

  if (error) throw error

  return (data || []).map((item: any) => item.profiles).filter(Boolean) as Profile[]
}

/**
 * Get users a user is following with profile data
 */
export const getFollowing = async (userId: string) => {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      following_id,
      profiles!follows_following_id_fkey(*)
    `)
    .eq('follower_id', userId)

  if (error) throw error

  return (data || []).map((item: any) => item.profiles).filter(Boolean) as Profile[]
}

/**
 * Get mutual friends between two users
 * Returns users that both user1 and user2 follow
 */
export const getMutualFriends = async (user1Id: string, user2Id: string, limit = 6) => {
  // Get users that user1 follows
  const { data: user1Following, error: error1 } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user1Id)

  if (error1) throw error1

  const user1FollowingIds = user1Following?.map(f => f.following_id) || []

  // Get users that user2 follows
  const { data: user2Following, error: error2 } = await supabase
    .from('follows')
    .select(`
      following_id,
      profiles!follows_following_id_fkey(*)
    `)
    .eq('follower_id', user2Id)

  if (error2) throw error2

  // Filter to find mutual friends (users that both follow)
  const mutualFriends = (user2Following || [])
    .filter((item: any) => user1FollowingIds.includes(item.following_id))
    .map((item: any) => item.profiles)
    .filter(Boolean)
    .slice(0, limit) as Profile[]

  return mutualFriends
}

// ============== FOLLOW REQUEST HELPERS ==============

export const sendFollowRequest = async (userId: string) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  await ensureProfile()

  try {
    // Use the SECURITY DEFINER RPC function to bypass RLS issues with upsert.
    // The RPC handles both INSERT and UPDATE (re-request after rejection) cases.
    const { data, error } = await supabase.rpc('send_follow_request', {
      p_requester_id: currentUser.id,
      p_requested_id: userId,
    })

    if (error) {
      // If RPC is not found (migration not yet applied), provide clear message
      if (error.code === 'PGRST202' || error.message?.includes('function "send_follow_request" does not exist')) {
        throw new Error('Follow request is not available. Please run the latest database migration (00020).')
      }
      throw error
    }

    // The RPC handles notification creation internally, no extra work needed
    return data
  } catch (err: any) {
    // Re-throw with more context
    if (err instanceof Error) {
      throw err
    }
    throw new Error(err?.message || 'Failed to send follow request')
  }
}

export const approveFollowRequest = async (requestId: string) => {
  try {
    // Use the SECURITY DEFINER RPC function that atomically:
    // 1. Updates the follow request status to 'approved'
    // 2. Creates the follow relationship (requester follows requested user)
    // 3. Creates a notification for the requester
    const { data, error } = await supabase.rpc('approve_follow_request', {
      p_request_id: requestId,
    })

    if (error) {
      // If RPC is not found (migration not yet applied), provide clear message
      if (error.code === 'PGRST202' || error.message?.includes('function "approve_follow_request" does not exist')) {
        throw new Error('Follow request approval is not available. Please run the latest database migration (00020).')
      }
      throw error
    }

    return data as FollowRequest
  } catch (err) {
    console.warn('Follow request operation failed:', err)
    return null as any
  }
}

export const rejectFollowRequest = async (requestId: string) => {
  try {
    const { error } = await supabase
      .from('follow_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)

    if (error) throw error
  } catch (err) {
    console.warn('Follow request operation failed (table may not exist):', err)
  }
}

export const cancelFollowRequest = async (userId: string) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  try {
    const { error } = await supabase
      .from('follow_requests')
      .delete()
      .eq('requester_id', currentUser.id)
      .eq('requested_id', userId)
      .eq('status', 'pending')

    if (error) throw error
  } catch (err) {
    console.warn('Follow request operation failed (table may not exist):', err)
  }
}

export const getPendingFollowRequest = async (userId: string): Promise<FollowRequest | null> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  try {
    const { data, error } = await supabase
      .from('follow_requests')
      .select('*')
      .eq('requester_id', currentUser.id)
      .eq('requested_id', userId)
      .eq('status', 'pending')
      .maybeSingle()

    if (error) throw error
    return data as FollowRequest | null
  } catch (err) {
    return null
  }
}

export const getPendingFollowRequestsForMe = async (): Promise<FollowRequest[]> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return []

  try {
    // Fetch follow requests without FK join to avoid schema cache issues
    const { data, error } = await supabase
      .from('follow_requests')
      .select('*')
      .eq('requested_id', currentUser.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!data || data.length === 0) return []

    // Fetch requester profiles separately
    const requesterIds = [...new Set(data.map((r: any) => r.requester_id).filter(Boolean))]

    if (requesterIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', requesterIds)

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

      return data.map((request: any) => ({
        ...request,
        requester: profileMap.get(request.requester_id) || null,
      })) as FollowRequest[]
    }

    return data as FollowRequest[]
  } catch (err) {
    return []
  }
}

// ============== FOLLOW WITH PRIVATE ACCOUNT SUPPORT ==============

/**
 * Follow a user. If their account is private, sends a follow request instead.
 * Returns { type: 'followed' | 'requested' }
 */
export const followUserWithPrivacy = async (userId: string): Promise<{ type: 'followed' | 'requested' }> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  await ensureProfile()

  // Check if the target account is private
  const targetProfile = await getProfile(userId)
  if (!targetProfile) throw new Error('User not found')

  if (targetProfile.is_private) {
    // Send a follow request instead
    await sendFollowRequest(userId)
    return { type: 'requested' }
  }

  // Directly follow
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: currentUser.id, following_id: userId })

  if (error && error.code !== '23505') throw error
  return { type: 'followed' }
}

// ============== NOTIFICATION HELPERS ==============

export const getNotifications = async (limit = 20): Promise<Notification[]> => {
  const user = await getCurrentUser()
  if (!user) return []

  try {
    // Fetch notifications without FK joins first (avoids schema cache issues)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    if (!data || data.length === 0) return []

    // Fetch actor profiles and posts separately
    const actorIds = [...new Set(data.map((n: any) => n.actor_id).filter(Boolean))]
    const postIds = [...new Set(data.map((n: any) => n.post_id).filter(Boolean))]

    const [profilesResult, postsResult] = await Promise.all([
      actorIds.length > 0
        ? supabase.from('profiles').select('*').in('id', actorIds)
        : { data: [] },
      postIds.length > 0
        ? supabase.from('posts').select('*').in('id', postIds)
        : { data: [] },
    ])

    const profileMap = new Map((profilesResult.data || []).map((p: any) => [p.id, p]))
    const postMap = new Map((postsResult.data || []).map((p: any) => [p.id, p]))

    return data.map((notification: any) => ({
      ...notification,
      actor: profileMap.get(notification.actor_id) || null,
      post: postMap.get(notification.post_id) || null,
    })) as Notification[]
  } catch (err) {
    // Gracefully handle missing table (migration not run yet)
    console.warn('Notifications table not available yet:', err)
    return []
  }
}

export const getUnreadNotificationCount = async (): Promise<number> => {
  const user = await getCurrentUser()
  if (!user) return 0

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) throw error
    return count || 0
  } catch (err) {
    // Gracefully handle missing table
    return 0
  }
}

export const markNotificationRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) throw error
  } catch (err) {
    // Gracefully handle missing table
  }
}

export const markAllNotificationsRead = async () => {
  const user = await getCurrentUser()
  if (!user) return

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) throw error
  } catch (err) {
    // Gracefully handle missing table
  }
}

export const subscribeToNotifications = (callback: (payload: any) => void) => {
  try {
    // Use a unique channel name per subscription to prevent conflicts
    // when React StrictMode double-invokes effects (unmount/remount cycle)
    const uniqueChannelName = `realtime-notifications-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        callback
      )
      .subscribe((status) => {
        // Only log unexpected errors, not normal CLOSED states
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime notification channel error:', status)
        }
      })
    return channel
  } catch (err) {
    // Gracefully handle if realtime is not configured for this table
    return { unsubscribe: () => {} } as any
  }
}

// ============== BLOCK HELPERS ==============

export const blockUser = async (userId: string) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  try {
    // Remove any existing follow relationships
    await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId)
    await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', currentUser.id)

    const { error } = await supabase
      .from('blocks')
      .insert({ blocker_id: currentUser.id, blocked_id: userId })

    if (error && error.code !== '23505') throw error
  } catch (err) {
    console.warn('Block operation failed (table may not exist):', err)
  }
}

export const unblockUser = async (userId: string) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  try {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', currentUser.id)
      .eq('blocked_id', userId)

    if (error) throw error
  } catch (err) {
    console.warn('Unblock operation failed (table may not exist):', err)
  }
}

export const isBlocked = async (userId: string): Promise<boolean> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return false

  try {
    // Check if current user blocked the target, or target blocked current user
    const { data, error } = await supabase
      .from('blocks')
      .select('id')
      .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`)
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
      .maybeSingle()

    if (error) throw error
    return !!data
  } catch (err) {
    // Gracefully handle missing table (migration not run yet)
    return false
  }
}

export const getBlockedUsers = async (): Promise<Profile[]> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return []

  try {
    const { data, error } = await supabase
      .from('blocks')
      .select(`
        blocked_id,
        blocked_profile:profiles!blocks_blocked_id_fkey(*)
      `)
      .eq('blocker_id', currentUser.id)

    if (error) throw error
    return (data || []).map((item: any) => item.blocked_profile).filter(Boolean) as Profile[]
  } catch (err) {
    // Gracefully handle missing table
    return []
  }
}

// ============== SHARE HELPERS ==============

export const getPostShareUrl = (postId: string): string => {
  return `${window.location.origin}/post/${postId}`
}

export const getProfileShareUrl = (userId: string): string => {
  return `${window.location.origin}/profile/${userId}`
}

export const shareContent = async (title: string, text: string, url: string) => {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return true
    } catch {
      return false
    }
  }
  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    return false
  }
}

// ============== STORAGE HELPERS ==============

export const uploadImage = async (file: File, bucket: string = 'posts'): Promise<string> => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${user.id}/${Date.now()}.${fileExt}`

  // 1. Try uploading to requested bucket
  try {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file)

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)
      return publicUrl
    }
  } catch {
    // Fall through to fallback bucket
  }

  // 2. Fallback to 'posts' bucket if requested bucket (e.g. 'stories') is missing
  if (bucket !== 'posts') {
    try {
      const { error: fallbackError } = await supabase.storage
        .from('posts')
        .upload(fileName, file)

      if (!fallbackError) {
        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName)
        return publicUrl
      }
    } catch {
      // Fall through to data URL
    }
  }

  // 3. Fallback to Data URL so photo upload never fails
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

// ============== REALTIME SUBSCRIPTIONS ==============

export const subscribeToPosts = (callback: (payload: any) => void) => {
  return supabase
    .channel('realtime-posts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      callback
    )
    .subscribe()
}

export const subscribeToLikes = (postId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`realtime-likes-${postId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${postId}` },
      callback
    )
    .subscribe()
}

// ============== CHAT HELPERS ==============

// ────────────────────────────────────────────
// Helper: Get the other participant's profile in a 1-on-1 conversation
// Uses 3-tier fallback to handle restrictive RLS policies:
//   Tier 1: Try direct DB query on conversation_participants (needs migration 00009)
//   Tier 2: Probe the messages table for a sender_id != current user
//   Tier 3: If messages has no rows yet, return null (caller can try getProfile)
// ────────────────────────────────────────────
export async function getOtherParticipantInConversation(
  conversationId: string,
  currentUserId: string
): Promise<Profile | null> {
  // ── Tier 1: Query conversation_participants directly ──
  // This works if migration 00009 (broadened SELECT policy) has been applied.
  const { data: participants, error: pErr } = await supabase
    .from('conversation_participants')
    .select(`
      user_id,
      profiles!inner (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('conversation_id', conversationId)

  if (!pErr && participants) {
    const other = participants.find((p: any) => p.user_id !== currentUserId)
    if (other?.profiles) {
  const profile = Array.isArray(other.profiles)
    ? other.profiles[0]
    : other.profiles;

      if (profile) {
        console.log(
          `[getOtherParticipant] Tier-1 success for conv ${conversationId}:`,
          profile.username
        );

        return profile as Profile;
      }
    }
    // If we got exactly 2 rows but the other row's profile somehow null,
    // try fetching profile manually by user_id
    if (other?.user_id) {
      const profile = await getProfile(other.user_id)
      if (profile) {
        console.log(`[getOtherParticipant] Tier-1 fallback (direct getProfile) for conv ${conversationId}:`, profile.username)
        return profile
      }
    }
  }

  // ── Tier 2: Look through messages for a sender who is not the current user ──
  // The messages RLS policy lets participants see all messages in conversations
  // they belong to, so this works even if conversation_participants SELECT is restricted.
  const { data: msgs, error: mErr } = await supabase
    .from('messages')
    .select('sender_id')
    .eq('conversation_id', conversationId)
    .neq('sender_id', currentUserId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!mErr && msgs && msgs.length > 0) {
    const otherUserId = msgs[0].sender_id
    const profile = await getProfile(otherUserId)
    if (profile) {
      console.log(`[getOtherParticipant] Tier-2 success (from messages) for conv ${conversationId}:`, profile.username)
      return profile
    }
  }

  // ── Tier 3: If no messages yet, try getProfile on any participant that isn't us ──
  // This time without the nested join (in case the join itself fails due to RLS)
  const { data: rawParts, error: rErr } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)

  if (!rErr && rawParts) {
    const otherRow = rawParts.find((p: any) => p.user_id !== currentUserId)
    if (otherRow?.user_id) {
      const profile = await getProfile(otherRow.user_id)
      if (profile) {
        console.log(`[getOtherParticipant] Tier-3 success (raw user_id + getProfile) for conv ${conversationId}:`, profile.username)
        return profile
      }
    }
  }

  console.warn(`[getOtherParticipant] All tiers exhausted for conv ${conversationId} — no other participant found`)
  return null
}

/**
 * Create a new conversation or get existing one between two users.
 * For 1-on-1 chat, this ensures only one conversation exists per pair.
 */
export const createOrGetConversation = async (otherUserId: string): Promise<Conversation> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  try {
    // Check if a 1-on-1 conversation already exists between these two users
    try {
      const { data: existingConversations, error: searchError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUser.id)

      if (!searchError && existingConversations && existingConversations.length > 0) {
        const conversationIds = existingConversations.map(c => c.conversation_id)

        const { data: mutual, error: mutualError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', conversationIds)

        if (!mutualError && mutual && mutual.length > 0) {
          // Check each mutual conversation to find one that actually exists in `conversations`
          for (const m of mutual) {
            const { data: conv } = await supabase
              .from('conversations')
              .select('*')
              .eq('id', m.conversation_id)
              .maybeSingle()

            if (conv) {
              const otherProfile = await getProfile(otherUserId)
              return {
                ...conv,
                other_participant: otherProfile,
              } as Conversation
            }
          }
        }
      }
    } catch (err) {
      console.warn('[createOrGetConversation] Could not check existing conversations due to RLS — will create new one', err)
    }

    // Generate UUID client-side to avoid RLS SELECT policy blocking the insert return value
    const conversationId = crypto.randomUUID()

    const { error: createError } = await supabase
      .from('conversations')
      .insert({ id: conversationId })

    if (createError) throw createError

    // Add current user as participant first
    const { error: participantError1 } = await supabase
      .from('conversation_participants')
      .insert({ conversation_id: conversationId, user_id: currentUser.id })

    if (participantError1) {
      console.error('createOrGetConversation: failed to insert current user as participant', participantError1)
      throw participantError1
    }

    // Add other user as participant
    const { error: participantError2 } = await supabase
      .from('conversation_participants')
      .insert({ conversation_id: conversationId, user_id: otherUserId })

    if (participantError2) {
      console.error('createOrGetConversation: failed to insert other user as participant', participantError2)
      throw participantError2
    }

    // Fetch the full conversation safely with maybeSingle (avoid PGRST116)
    const { data: fullConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()

    const otherProfile = await getProfile(otherUserId)
    const now = new Date().toISOString()

    return {
      id: conversationId,
      created_at: fullConversation?.created_at || now,
      updated_at: fullConversation?.updated_at || now,
      last_message_at: fullConversation?.last_message_at || now,
      ...fullConversation,
      other_participant: otherProfile,
    } as Conversation
  } catch (err: any) {
    if (err?.code === 'PGRST205' || err?.message?.includes('Could not find the table')) {
      console.warn('Chat tables not available yet. Run the migration first.')
      throw new Error('Chat tables not set up. Please run the database migration.')
    }
    throw err
  }
}

/**
 * Delete a conversation and all associated data (messages, participants).
 */
export const deleteConversation = async (conversationId: string) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  try {
    // 1. Delete messages from messages table
    await supabase.from('messages').delete().eq('conversation_id', conversationId)

    // 2. Delete conversation participants
    await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId)

    // 3. Delete the conversation itself
    await supabase.from('conversations').delete().eq('id', conversationId)
  } catch (error: any) {
    console.warn('DB delete conversation error:', error?.message || error)
  }

  // 4. Thoroughly clear local storage caches
  try {
    localStorage.removeItem(`local_messages_${conversationId}`)
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('local_conversations_') || key.startsWith('local_messages_'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

/**
 * Get all conversations for the current user with the last message and other participant profile.
 * Works even when conversation_participants RLS is broken (recursive policy).
 * Uses messages table as the primary source of conversation IDs as a fallback.
 */
export const getUserConversations = async (): Promise<Conversation[]> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return []

  // ─── STEP 1: Get conversation IDs the user is part of (excluding hidden) ───
  // Primary method: use conversation_participants (needs working RLS + hidden_at column)
  let conversationIds: string[] = []

  try {
    const { data: participations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, hidden_at')
      .eq('user_id', currentUser.id)
      .is('hidden_at', null)  // Only get non-hidden conversations

    if (partError) throw partError
    if (participations) {
      conversationIds = participations
        .filter(p => p.hidden_at === null) // Only include non-hidden conversations
        .map(p => p.conversation_id)
    }
  } catch (err: any) {
    // If the hidden_at column doesn't exist yet (42703 - migration 00014 not run)
    // or RLS recursion (42P17), try a basic query without hidden_at first
    console.warn('[getUserConversations] conversation_participants query with hidden_at failed:', err?.code || err?.message)

    try {
      // Try without hidden_at (column might not exist if migration 00014 hasn't been run)
      const { data: basicParticipations, error: basicPartError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUser.id)

      if (basicPartError) throw basicPartError
      if (basicParticipations) {
        conversationIds = basicParticipations.map(p => p.conversation_id)
      }
    } catch (basicErr: any) {
      // If basic query also fails (RLS recursion etc), fallback to messages table
      console.warn('[getUserConversations] basic conversation_participants query also failed, falling back to messages:', basicErr?.code || basicErr?.message)
      try {
        const { data: allUserMessages } = await supabase
          .from('messages')
          .select('conversation_id')
          .order('created_at', { ascending: false })
          .limit(100)

        if (allUserMessages) {
          conversationIds = [...new Set(allUserMessages.map(m => m.conversation_id))]
        }
      } catch (msgErr: any) {
        console.error('[getUserConversations] messages fallback also failed:', msgErr)
        return []
      }
    }
  }

  if (conversationIds.length === 0) return []

  // ─── STEP 2: Get conversations ordered by last_message_at ───
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .in('id', conversationIds)
    .order('last_message_at', { ascending: false })

  if (convError) throw convError
  if (!conversations) return []

  // ─── STEP 3: Get my last_read_at timestamps ───
  let myLastReadAt: Record<string, string> = {}
  try {
    const { data: myParticipations } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', currentUser.id)
      .in('conversation_id', conversationIds)

    if (myParticipations) {
      for (const p of myParticipations) {
        myLastReadAt[p.conversation_id] = p.last_read_at
      }
    }
  } catch {
    // RLS might block this too — that's okay, we'll use 0 unread
    myLastReadAt = {}
  }

  // ─── STEP 4: Build enriched conversation objects ───
  const conversationsWithDetails: Conversation[] = await Promise.all(
    conversations.map(async (conv: any) => {
      const otherProfile = await getOtherParticipantInConversation(conv.id, currentUser.id)

      const myLastRead = myLastReadAt[conv.id]

      // Get last message
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const lastMessage = lastMessages?.[0] || null

      // Get unread count
      let unreadCount = 0
      if (myLastRead) {
        try {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .gt('created_at', myLastRead)
            .neq('sender_id', currentUser.id)

          unreadCount = count || 0
        } catch {
          // If messages RLS also fails, just show 0
          unreadCount = 0
        }
      }

      return {
        ...conv,
        other_participant: otherProfile,
        last_message: lastMessage,
        unread_count: unreadCount,
        hidden_at: conv.hidden_at || null, // Map the hidden_at field
      } as Conversation
    })
  )

  return conversationsWithDetails
}

/**
 * Get messages for a conversation with sender profiles.
 */
export const getMessages = async (conversationId: string, limit = 50, offset = 0): Promise<Message[]> => {
  let dbMessages: Message[] = []

  // 1. Try DB fetch
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!error && data && data.length > 0) {
      dbMessages = data
    }
  } catch {
    // ignore DB error
  }

  // 2. Merge local storage messages fallback
  try {
    const key = `local_messages_${conversationId}`
    const raw = localStorage.getItem(key)
    if (raw) {
      const localMsgs: Message[] = JSON.parse(raw)
      const existingIds = new Set(dbMessages.map((m) => m.id))
      for (const lm of localMsgs) {
        if (!existingIds.has(lm.id)) {
          dbMessages.push(lm)
        }
      }
    }
  } catch {
    // ignore
  }

  if (dbMessages.length === 0) return []

  // Sort by created_at descending
  dbMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Attach sender profiles
  const senderIds = [...new Set(dbMessages.map((m: any) => m.sender_id))]
  const profilesMap = new Map<string, Profile>()

  if (senderIds.length > 0) {
    for (const sid of senderIds) {
      const prof = await getProfile(sid).catch(() => null)
      if (prof) profilesMap.set(sid, prof)
    }
  }

  return dbMessages
    .map((msg: any) => ({
      ...msg,
      sender: profilesMap.get(msg.sender_id) || msg.sender || null,
    }))
    .reverse() as Message[]
}

/**
 * Send a message in a conversation.
 */
export const sendMessage = async (
  conversationId: string,
  content: string,
  messageType: Message['message_type'] = 'text',
  imageUrl?: string
): Promise<Message> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  await ensureProfile()

  const profile = await getProfile(currentUser.id)
  const now = new Date().toISOString()
  const messageId = crypto.randomUUID()

  const newMessage: Message = {
    id: messageId,
    conversation_id: conversationId,
    sender_id: currentUser.id,
    content,
    message_type: messageType,
    image_url: imageUrl || null,
    created_at: now,
    sender: profile || undefined,
  }

  // 1. Try DB Insert
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content,
        message_type: messageType,
        image_url: imageUrl || null,
      })
      .select('*')
      .maybeSingle()

    if (!error && data) {
      newMessage.id = data.id
      newMessage.created_at = data.created_at
    }
  } catch (err) {
    console.warn('[sendMessage] DB insert error — saving to local storage fallback:', err)
  }

  // 2. ALWAYS save to local_messages_${conversationId} fallback store
  try {
    const key = `local_messages_${conversationId}`
    const raw = localStorage.getItem(key)
    const localMsgs: Message[] = raw ? JSON.parse(raw) : []
    if (!localMsgs.some((m) => m.id === newMessage.id)) {
      localStorage.setItem(key, JSON.stringify([...localMsgs, newMessage]))
    }
  } catch {
    // ignore
  }

  // 3. Unhide conversation for both sender and receiver
  try {
    await unhideConversation(conversationId)
  } catch {
    // ignore
  }

  // 4. Update conversation last_message_at timestamp
  try {
    await supabase
      .from('conversations')
      .update({ last_message_at: now })
      .eq('id', conversationId)
  } catch {
    // ignore
  }

  return newMessage
}

/**
 * Mark a conversation as read for the current user.
 */
export const markConversationRead = async (conversationId: string) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', currentUser.id)

  if (error) throw error
}

/**
 * Get total unread message count across all conversations for navbar badge.
 */
export const getUnreadConversationCount = async (): Promise<number> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return 0

  try {
    // Get user's participations
    const { data: participations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', currentUser.id)

    if (partError) throw partError
    if (!participations || participations.length === 0) return 0

    // Sum unread counts across all conversations
    let totalUnread = 0
    for (const p of participations) {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', p.conversation_id)
        .gt('created_at', p.last_read_at)
        .neq('sender_id', currentUser.id)

      totalUnread += count || 0
    }

    return totalUnread
  } catch (err) {
    console.error('Error getting unread count:', err)
    return 0
  }
}

/**
 * Subscribe to new messages in a conversation (realtime).
 */
export const subscribeToConversationMessages = (
  conversationId: string,
  callback: (message: Message) => void
) => {
  const uniqueChannelName = `realtime-chat-${conversationId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

  const channel = supabase
    .channel(uniqueChannelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload: any) => {
        // Attach sender profile
        const profile = await getProfile(payload.new.sender_id).catch(() => null)
        callback({
          ...payload.new,
          sender: profile,
        } as Message)
      }
    )
    .subscribe()

  return channel
}

/**
 * Subscribe to conversation list updates (new messages in any of user's conversations).
 */
export const subscribeToConversationList = (
  userId: string,
  callback: (payload: any) => void
) => {
  const uniqueChannelName = `realtime-conv-list-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

  // Get user's conversation IDs
  supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId)
    .then(({ data }) => {
      if (data && data.length > 0) {
        const convIds = data.map(d => d.conversation_id)
        // Subscribe to message inserts in these conversations
        supabase
          .channel(uniqueChannelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=in.(${convIds.join(',')})`,
            },
            callback
          )
          .subscribe()
      }
    })

  return { unsubscribe: () => supabase.removeChannel(supabase.channel(uniqueChannelName)) }
}

// ============== CONVERSATION HELPERS ==============

export const removeUserFromConversation = async (conversationId: string, userId: string) => {
  const { error } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)

  if (error) throw error
}

/**
 * Hide a conversation from the user's list (like Instagram's hide chat feature)
 */
export const hideConversation = async (conversationId: string): Promise<void> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  const { error } = await supabase
    .rpc('hide_conversation', { p_conversation_id: conversationId })

  if (error) throw error
}

/**
 * Unhide a conversation that was previously hidden
 */
export const unhideConversation = async (conversationId: string): Promise<void> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  try {
    await supabase.rpc('unhide_conversation', { p_conversation_id: conversationId })
  } catch {
    // ignore
  }

  // Ensure hidden_at is reset to NULL for all participants in this conversation so receiver sees it too
  try {
    await supabase
      .from('conversation_participants')
      .update({ hidden_at: null })
      .eq('conversation_id', conversationId)
  } catch {
    // ignore
  }
}

// ============== CALL SIGNALING HELPERS ==============

/**
 * Send a WebRTC signal (offer/answer/ICE candidate) to the other user.
 */
export const sendCallSignal = async (
  conversationId: string,
  receiverId: string,
  signalData: any,
  signalType: 'offer' | 'answer' | 'ice-candidate'
): Promise<void> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('call_signals')
    .insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      receiver_id: receiverId,
      signal_data: signalData,
      signal_type: signalType,
    })

  if (error) throw error
}

/**
 * Subscribe to incoming call signals for the current user (realtime).
 */
export const subscribeToCallSignals = (
  userId: string,
  callback: (signal: CallSignal) => void
) => {
  const uniqueChannelName = `realtime-call-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

  const channel = supabase
    .channel(uniqueChannelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `receiver_id=eq.${userId}`,
      },
      async (payload: any) => {
        const profile = await getProfile(payload.new.sender_id).catch(() => null)
        callback({
          ...payload.new,
          sender: profile,
        } as CallSignal)
      }
    )
    .subscribe()

  return channel
}

/**
 * Delete call signals after processing (cleanup).
 */
export const deleteCallSignals = async (conversationId: string) => {
  const { error } = await supabase
    .from('call_signals')
    .delete()
    .eq('conversation_id', conversationId)

  if (error) throw error
}

/**
 * Send a "call-end" signal to notify the other user that the call has ended.
 * This enables the remote side to immediately end the call too.
 */
export const sendCallEndSignal = async (
  conversationId: string,
  receiverId: string
): Promise<void> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('call_signals')
    .insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      receiver_id: receiverId,
      signal_data: { type: 'call-end' },
      signal_type: 'offer', // Reuse 'offer' type since db enum might not have 'call-end'
    })

  if (error) throw error
}

/**
 * Save a call event message (answered/missed call) to the conversation.
 * This shows up in the chat like Instagram's call history.
 * @param conversationId - The conversation ID
 * @param callType - 'audio' or 'video'
 * @param callDuration - Duration in seconds (null for missed calls)
 * @param wasAnswered - Whether the call was answered
 * @param callerId - The ID of the user who initiated the call (this will be the message sender)
 */
export const createCallMessage = async (
  conversationId: string,
  callType: 'audio' | 'video',
  callDuration: number | null,
  wasAnswered: boolean,
  callerId: string
): Promise<Message> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  await ensureProfile()

  let content: string
  if (wasAnswered) {
    content = callType === 'video' ? 'Video call' : 'Audio call'
  } else {
    content = callType === 'video' ? 'Missed video call' : 'Missed audio call'
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: callerId,
      content,
      message_type: 'call',
      call_type: callType,
      call_duration: callDuration,
      image_url: null,
    })
    .select('*')
    .single()

  if (error) throw error

  const profile = await getProfile(callerId)
  return { ...data, sender: profile } as Message
}

// ============== STORIES / STATUS HELPERS ==============

export const getViewedStoryIds = (): string[] => {
  try {
    const raw = localStorage.getItem('viewed_story_ids')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const markStoryViewed = (storyId: string) => {
  try {
    const ids = getViewedStoryIds()
    if (!ids.includes(storyId)) {
      localStorage.setItem('viewed_story_ids', JSON.stringify([...ids, storyId]))
    }
  } catch {
    // ignore
  }
}

export const createStory = async (
  caption?: string,
  mediaUrl?: string,
  backgroundColor?: string
): Promise<Story> => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  await ensureProfile()

  const storyObj = {
    user_id: user.id,
    caption: caption || null,
    media_url: mediaUrl || null,
    background_color: backgroundColor || 'from-indigo-600 to-purple-600',
  }

  try {
    const { data, error } = await supabase
      .from('stories')
      .insert(storyObj)
      .select('*')
      .maybeSingle()

    if (!error && data) {
      const profile = await getProfile(user.id)
      return { ...data, profiles: profile } as Story
    }
  } catch {
    // DB migration 00023 might not be executed yet — fallback to localStorage
  }

  // Fallback to localStorage story store
  const fallbackStory: Story = {
    id: crypto.randomUUID(),
    user_id: user.id,
    caption: caption || null,
    media_url: mediaUrl || null,
    background_color: backgroundColor || 'from-indigo-600 to-purple-600',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    profiles: (await getProfile(user.id)) || undefined,
  }

  try {
    const rawLocal = localStorage.getItem('local_stories')
    const localStories: Story[] = rawLocal ? JSON.parse(rawLocal) : []
    localStorage.setItem('local_stories', JSON.stringify([fallbackStory, ...localStories]))
  } catch {
    // ignore
  }

  return fallbackStory
}

export const getActiveStories = async (): Promise<UserStoriesGroup[]> => {
  const currentUser = await getCurrentUser()

  let allStories: Story[] = []

  // Try DB query
  try {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', now)
      .order('created_at', { ascending: true })

    if (!error && data && data.length > 0) {
      allStories = data
    }
  } catch {
    // ignore
  }

  // Also include unexpired localStorage stories
  try {
    const rawLocal = localStorage.getItem('local_stories')
    if (rawLocal) {
      const localStories: Story[] = JSON.parse(rawLocal)
      const validLocal = localStories.filter(s => new Date(s.expires_at || s.created_at).getTime() + 86400000 > Date.now())
      const existingIds = new Set(allStories.map(s => s.id))
      for (const s of validLocal) {
        if (!existingIds.has(s.id)) {
          allStories.push(s)
        }
      }
    }
  } catch {
    // ignore
  }

  if (allStories.length === 0) return []

  // Group stories by user_id
  const viewedIds = new Set(getViewedStoryIds())
  const userMap = new Map<string, Story[]>()

  for (const s of allStories) {
    s.viewed = viewedIds.has(s.id)
    if (!userMap.has(s.user_id)) {
      userMap.set(s.user_id, [])
    }
    userMap.get(s.user_id)!.push(s)
  }

  // Fetch profiles for users
  const userIds = Array.from(userMap.keys())
  const profilesMap = new Map<string, Profile>()

  for (const uid of userIds) {
    const prof = await getProfile(uid)
    if (prof) profilesMap.set(uid, prof)
  }

  const groups: UserStoriesGroup[] = []

  // Put current user first if they have stories
  if (currentUser && userMap.has(currentUser.id)) {
    const myStories = userMap.get(currentUser.id)!
    groups.push({
      user_id: currentUser.id,
      profile: profilesMap.get(currentUser.id),
      stories: myStories,
      hasUnviewed: myStories.some(s => !s.viewed),
    })
    userMap.delete(currentUser.id)
  }

  // Rest of users
  for (const [uid, stories] of userMap.entries()) {
    groups.push({
      user_id: uid,
      profile: profilesMap.get(uid),
      stories,
      hasUnviewed: stories.some(s => !s.viewed),
    })
  }

  return groups
}

export const deleteStory = async (storyId: string): Promise<void> => {
  try {
    await supabase.from('stories').delete().eq('id', storyId)
  } catch {
    // ignore
  }

  try {
    const rawLocal = localStorage.getItem('local_stories')
    if (rawLocal) {
      const localStories: Story[] = JSON.parse(rawLocal)
      const updated = localStories.filter(s => s.id !== storyId)
      localStorage.setItem('local_stories', JSON.stringify(updated))
    }
  } catch {
    // ignore
  }
}

export const recordStoryView = async (storyId: string): Promise<void> => {
  const user = await getCurrentUser()
  if (!user) return

  markStoryViewed(storyId)

  try {
    // Check if viewing own story
    const { data: story } = await supabase
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .maybeSingle()

    if (story && story.user_id === user.id) return

    // Record view in DB
    await supabase
      .from('story_views')
      .insert({ story_id: storyId, viewer_id: user.id })
  } catch {
    // ignore duplicate or DB error
  }

  // Local storage fallback for views
  try {
    const rawMap = localStorage.getItem('local_story_views')
    const viewMap: Record<string, { viewer_id: string; created_at: string }[]> = rawMap ? JSON.parse(rawMap) : {}
    if (!viewMap[storyId]) viewMap[storyId] = []
    if (!viewMap[storyId].some(v => v.viewer_id === user.id)) {
      viewMap[storyId].push({ viewer_id: user.id, created_at: new Date().toISOString() })
      localStorage.setItem('local_story_views', JSON.stringify(viewMap))
    }
  } catch {
    // ignore
  }
}

export const getStoryViewers = async (storyId: string): Promise<StoryViewerItem[]> => {
  let viewers: StoryViewerItem[] = []

  // Try DB query
  try {
    const { data, error } = await supabase
      .from('story_views')
      .select('*')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      viewers = data
    }
  } catch {
    // ignore
  }

  // Local storage fallback
  try {
    const rawMap = localStorage.getItem('local_story_views')
    if (rawMap) {
      const viewMap: Record<string, { viewer_id: string; created_at: string }[]> = JSON.parse(rawMap)
      const localList = viewMap[storyId] || []
      const existingViewerIds = new Set(viewers.map(v => v.viewer_id))
      for (const item of localList) {
        if (!existingViewerIds.has(item.viewer_id)) {
          viewers.push({
            id: crypto.randomUUID(),
            story_id: storyId,
            viewer_id: item.viewer_id,
            created_at: item.created_at,
          })
        }
      }
    }
  } catch {
    // ignore
  }

  // Fetch story likes / reactions for this story
  const reactionsMap = new Map<string, string>()
  try {
    const { data: likes } = await supabase
      .from('story_likes')
      .select('user_id, reaction')
      .eq('story_id', storyId)

    if (likes) {
      likes.forEach((l: any) => reactionsMap.set(l.user_id, l.reaction || '❤️'))
    }
  } catch {
    // ignore
  }

  // Local storage reactions fallback
  try {
    const rawLocal = localStorage.getItem('local_story_reactions')
    if (rawLocal) {
      const localMap: Record<string, string> = JSON.parse(rawLocal)
      for (const v of viewers) {
        const key = `${storyId}_${v.viewer_id}`
        if (localMap[key] && !reactionsMap.has(v.viewer_id)) {
          reactionsMap.set(v.viewer_id, localMap[key])
        }
      }
    }
  } catch {
    // ignore
  }

  // Attach profiles and reactions
  const enriched: StoryViewerItem[] = []
  for (const v of viewers) {
    const prof = await getProfile(v.viewer_id)
    enriched.push({
      ...v,
      profile: prof || undefined,
      user_reaction: reactionsMap.get(v.viewer_id) || null,
    })
  }

  return enriched
}

export const isStoryLiked = (storyId: string, userId?: string): boolean => {
  try {
    const key = userId ? `liked_stories_${userId}` : 'liked_stories_guest'
    const raw = localStorage.getItem(key)
    const list: string[] = raw ? JSON.parse(raw) : []
    return list.includes(storyId)
  } catch {
    return false
  }
}

export const toggleLikeStory = async (storyId: string, reactionEmoji: string = '❤️'): Promise<boolean> => {
  const user = await getCurrentUser()
  if (!user) return false

  const key = `liked_stories_${user.id}`
  let list: string[] = []
  try {
    const raw = localStorage.getItem(key)
    if (raw) list = JSON.parse(raw)
  } catch {
    list = []
  }

  const isLiked = list.includes(storyId)
  let nextState: boolean

  if (isLiked) {
    list = list.filter((id) => id !== storyId)
    nextState = false
    try {
      await supabase.from('story_likes').delete().eq('story_id', storyId).eq('user_id', user.id)
    } catch {
      // ignore
    }

    try {
      const rawLocal = localStorage.getItem('local_story_reactions')
      const localMap: Record<string, string> = rawLocal ? JSON.parse(rawLocal) : {}
      delete localMap[`${storyId}_${user.id}`]
      localStorage.setItem('local_story_reactions', JSON.stringify(localMap))
    } catch {
      // ignore
    }
  } else {
    list = [storyId, ...list]
    nextState = true
    try {
      await supabase.from('story_likes').insert({ story_id: storyId, user_id: user.id, reaction: reactionEmoji })
    } catch {
      // ignore
    }

    try {
      const rawLocal = localStorage.getItem('local_story_reactions')
      const localMap: Record<string, string> = rawLocal ? JSON.parse(rawLocal) : {}
      localMap[`${storyId}_${user.id}`] = reactionEmoji
      localStorage.setItem('local_story_reactions', JSON.stringify(localMap))
    } catch {
      // ignore
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // ignore
  }

  return nextState
}

export const sendStoryReply = async (
  storyAuthorId: string,
  replyText: string,
  storyCaption?: string | null,
  mediaUrl?: string | null
): Promise<Message> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  // 1. Get or create conversation with story author
  const conv = await createOrGetConversation(storyAuthorId)

  // 2. Unhide conversation if hidden
  try {
    await unhideConversation(conv.id)
  } catch {
    // ignore
  }

  // 3. Format message content
  let headerText = '✨ Replied to story'
  if (storyCaption) {
    headerText = `✨ Replied to status: "${storyCaption}"`
  }
  const fullContent = `${headerText}\n\n${replyText}`

  // 4. Send message
  const msg = await sendMessage(conv.id, fullContent, 'text', mediaUrl || undefined)

  // 5. Update conversation timestamp to bump it to top of chat list
  try {
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conv.id)
  } catch {
    // ignore
  }

  return msg
}

export const sendStoryReactionDM = async (
  storyAuthorId: string,
  reactionEmoji: string,
  storyCaption?: string | null,
  mediaUrl?: string | null
): Promise<Message> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  const conv = await createOrGetConversation(storyAuthorId)

  try {
    await unhideConversation(conv.id)
  } catch {
    // ignore
  }

  let content = `Reacted ${reactionEmoji} to story`
  if (storyCaption) {
    content = `Reacted ${reactionEmoji} to status: "${storyCaption}"`
  }

  const msg = await sendMessage(conv.id, content, 'text', mediaUrl || undefined)

  try {
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conv.id)
  } catch {
    // ignore
  }

  return msg
}
