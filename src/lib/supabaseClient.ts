import { createClient } from '@supabase/supabase-js'
import type { Profile, Post, Comment, Notification, FollowRequest, Block, Conversation, ConversationParticipant, Message, CallSignal } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
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
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      likes_count:likes(count),
      comments_count:comments(count)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return attachProfilesToPosts(posts || [])
}

export const getUserPosts = async (userId: string) => {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      likes_count:likes(count),
      comments_count:comments(count)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return attachProfilesToPosts(data || [])
}

export const getFeedPosts = async (userId: string, limit = 20) => {
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
    .limit(limit)

  if (error) throw error

  return attachProfilesToPosts(data || [])
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

// ============== FOLLOW REQUEST HELPERS ==============

export const sendFollowRequest = async (userId: string) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  await ensureProfile()

  try {
    const { error } = await supabase
      .from('follow_requests')
      .insert({ requester_id: currentUser.id, requested_id: userId, status: 'pending' })

    if (error && error.code !== '23505') throw error
  } catch (err) {
    console.warn('Follow request operation failed (table may not exist):', err)
  }
}

export const approveFollowRequest = async (requestId: string) => {
  try {
    const { data, error } = await supabase
      .from('follow_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)
      .select('*')
      .single()

    if (error) throw error
    return data as FollowRequest
  } catch (err) {
    console.warn('Follow request operation failed (table may not exist):', err)
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
        if (status !== 'SUBSCRIBED') {
          console.warn('Realtime notification channel status:', status)
        }
      })
    return channel
  } catch (err) {
    // Gracefully handle if realtime is not configured for this table
    console.warn('Could not subscribe to notifications:', err)
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

export const uploadImage = async (file: File, bucket: string = 'images'): Promise<string> => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return publicUrl
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

/**
 * Create a new conversation or get existing one between two users.
 * For 1-on-1 chat, this ensures only one conversation exists per pair.
 */
export const createOrGetConversation = async (otherUserId: string): Promise<Conversation> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('User not authenticated')

  try {
    // Check if a 1-on-1 conversation already exists between these two users
    const { data: existingConversations, error: searchError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUser.id)

    if (searchError) throw searchError

    if (existingConversations && existingConversations.length > 0) {
      const conversationIds = existingConversations.map(c => c.conversation_id)

      // Check if any of these conversations also include the other user
      const { data: mutual, error: mutualError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', conversationIds)

      if (mutualError) throw mutualError

      if (mutual && mutual.length > 0) {
        // Existing conversation found
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', mutual[0].conversation_id)
          .single()

        if (convError) throw convError
        return conv as Conversation
      }
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({})
      .select('*')
      .single()

    if (createError) throw createError

    // Add both participants
    const participants = [
      { conversation_id: newConversation.id, user_id: currentUser.id },
      { conversation_id: newConversation.id, user_id: otherUserId },
    ]

    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert(participants)

    if (participantError) throw participantError

    return newConversation as Conversation
  } catch (err: any) {
    // Gracefully handle missing tables (migration not run yet)
    if (err?.code === 'PGRST205' || err?.message?.includes('Could not find the table')) {
      console.warn('Chat tables not available yet. Run the migration first.')
      throw new Error('Chat tables not set up. Please run the database migration.')
    }
    throw err
  }
}

/**
 * Get all conversations for the current user with the last message and other participant profile.
 */
export const getUserConversations = async (): Promise<Conversation[]> => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return []

  // Get conversations the user is part of
  const { data: participations, error: partError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', currentUser.id)

  if (partError) throw partError
  if (!participations || participations.length === 0) return []

  const conversationIds = participations.map(p => p.conversation_id)

  // Get conversations ordered by last_message_at
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .in('id', conversationIds)
    .order('last_message_at', { ascending: false })

  if (convError) throw convError
  if (!conversations) return []

  // For each conversation, get participants and last message
  const conversationsWithDetails: Conversation[] = await Promise.all(
    conversations.map(async (conv: any) => {
      // Get other participant
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id, last_read_at')
        .eq('conversation_id', conv.id)

      const otherParticipantId = participants?.find((p: any) => p.user_id !== currentUser.id)?.user_id
      const myParticipation = participants?.find((p: any) => p.user_id === currentUser.id)

      // Get other user's profile
      let otherProfile: Profile | null = null
      if (otherParticipantId) {
        otherProfile = await getProfile(otherParticipantId)
      }

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
      if (myParticipation) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .gt('created_at', myParticipation.last_read_at)
          .neq('sender_id', currentUser.id)

        unreadCount = count || 0
      }

      return {
        ...conv,
        other_participant: otherProfile,
        last_message: lastMessage,
        unread_count: unreadCount,
      } as Conversation
    })
  )

  return conversationsWithDetails
}

/**
 * Get messages for a conversation with sender profiles.
 */
export const getMessages = async (conversationId: string, limit = 50, offset = 0): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  if (!data || data.length === 0) return []

  // Attach sender profiles
  const senderIds = [...new Set(data.map((m: any) => m.sender_id))]
  const profilesMap = new Map<string, Profile>()

  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', senderIds)

    if (profiles) {
      profiles.forEach((p: any) => profilesMap.set(p.id, p))
    }
  }

  return data.map((msg: any) => ({
    ...msg,
    sender: profilesMap.get(msg.sender_id) || null,
  })).reverse() as Message[]
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

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content,
      message_type: messageType,
      image_url: imageUrl || null,
    })
    .select('*')
    .single()

  if (error) throw error

  // Attach sender profile
  const profile = await getProfile(currentUser.id)

  return {
    ...data,
    sender: profile,
  } as Message
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
