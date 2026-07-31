import { useState, useEffect, memo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  likePost,
  unlikePost,
  isPostLiked,
  deletePost,
  getPostShareUrl,
  shareContent,
  isFollowing,
  followUserWithPrivacy,
  getPendingFollowRequest,
  isPostSaved,
  toggleSavePost,
} from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../contexts/ToastProvider'
import CommentSection from './CommentSection'
import Avatar from './Avatar'
import { escapeHTML } from '../lib/sanitize'
import type { Post } from '../types'

interface PostCardProps {
  post: Post
  onDelete?: (postId: string) => void
  onLikeChange?: (postId: string, isLiked: boolean) => void
}

const PostCard = ({ post, onDelete, onLikeChange }: PostCardProps) => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes_count || 0)
  const [isLiking, setIsLiking] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)

  // Double tap heart animation state
  const [showHeartPop, setShowHeartPop] = useState(false)
  const lastTapRef = useRef<number>(0)

  useEffect(() => {
    if (user) {
      isPostLiked(post.id).then(setLiked).catch(console.error)
      setSaved(isPostSaved(post.id, user.id))

      if (post.user_id !== user.id) {
        isFollowing(post.user_id).then(setIsFollowingUser).catch(console.error)
        getPendingFollowRequest(post.user_id).then((req) => setHasPendingRequest(!!req)).catch(console.error)
      }
    }
  }, [post.id, post.user_id, user])

  useEffect(() => {
    setLikeCount(post.likes_count || 0)
  }, [post.likes_count])

  const handleLike = async () => {
    if (!user || isLiking) return
    setIsLiking(true)
    try {
      if (liked) {
        await unlikePost(post.id)
        setLiked(false)
        setLikeCount((prev) => Math.max(0, prev - 1))
        onLikeChange?.(post.id, false)
      } else {
        await likePost(post.id)
        setLiked(true)
        setLikeCount((prev) => prev + 1)
        onLikeChange?.(post.id, true)
      }
    } catch (err) {
      console.error('Error toggling like:', err)
      showToast('Failed to like post', 'error')
    } finally {
      setIsLiking(false)
    }
  }

  const handleSaveToggle = () => {
    if (!user) {
      showToast('Please sign in to save posts', 'error')
      return
    }
    const nextSavedState = toggleSavePost(post.id, user.id)
    setSaved(nextSavedState)
    if (nextSavedState) {
      showToast('Post saved to collection 🔖', 'success', 2000)
    } else {
      showToast('Post removed from saved', 'info', 2000)
    }
  }

  // Double-tap or double-click to like on post image (Instagram gesture)
  const handleImageDoubleTap = () => {
    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Trigger heart pop animation
      setShowHeartPop(true)
      setTimeout(() => setShowHeartPop(false), 800)

      if (!liked) {
        handleLike()
      }
    }
    lastTapRef.current = now
  }

  const handleDelete = async () => {
    try {
      await deletePost(post.id)
      onDelete?.(post.id)
      showToast('Post deleted', 'success')
    } catch (err) {
      console.error('Error deleting post:', err)
      showToast('Failed to delete post', 'error')
    }
    setShowMenu(false)
  }

  const handleFollow = async () => {
    if (!user) return
    try {
      const result = await followUserWithPrivacy(post.user_id)
      if (result.type === 'requested') {
        setHasPendingRequest(true)
        showToast('Follow request sent!', 'success')
      } else {
        setIsFollowingUser(true)
        showToast('You are now following this user', 'success')
      }
    } catch (err) {
      console.error('Error following user:', err)
      showToast('Failed to follow user', 'error')
    }
  }

  const handleShare = () => {
    const url = getPostShareUrl(post.id)
    const text = `Check out this post by ${profile?.full_name || profile?.username || 'someone'} on SocialMedia!`
    shareContent('Share Post', text, url)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const profile = post.profiles
  const isOwner = user?.id === post.user_id
  const isPrivateAccount = profile?.is_private || false
  const shouldShowFollowButton = !isOwner && user && !isFollowingUser && !hasPendingRequest && isPrivateAccount

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden post-enter">
      {/* ─── Post Header ─── */}
      <div className="p-4 sm:p-4 pb-2">
        <div className="flex items-center justify-between">
          <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3 group">
            <div className="w-[50px] h-[50px] p-[2px] rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 group-hover:scale-105 transition-transform duration-300 shrink-0 flex items-center justify-center overflow-hidden">
              <Avatar
                src={profile?.avatar_url}
                name={profile?.full_name || profile?.username}
                size="w-full h-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm sm:text-base font-heading">
                  {profile?.full_name || profile?.username || 'Unknown User'}
                </p>
                {profile?.is_private && (
                  <span title="Private Account" className="text-xs text-slate-400">🔒</span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-400 font-body">@{profile?.username || 'unknown'}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            {shouldShowFollowButton && (
              <button
                onClick={handleFollow}
                className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all font-heading"
              >
                Follow
              </button>
            )}
            {hasPendingRequest && (
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full font-heading">
                Requested
              </span>
            )}
            <span className="text-xs font-medium text-slate-400 font-body">{formatDate(post.created_at)}</span>

            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label="Post settings menu"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-1 w-36 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 z-20 py-1.5 animate-fade-in">
                      <button
                        onClick={handleDelete}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 font-heading"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Post
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Post Body (Text + Image) ─── */}
      <div className="px-4 sm:px-5 py-2">
        <p className="text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-normal font-body">
          {escapeHTML(post.content)}
        </p>

        {post.image_url && !imageError && (
          <div
            onClick={handleImageDoubleTap}
            className="relative mt-3 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/50 shadow-inner group/img cursor-pointer select-none"
          >
            {!imageLoaded && (
              <div className="w-full h-64 bg-slate-200/60 animate-pulse flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <img
              src={post.image_url}
              alt="Post content media"
              className={`w-full object-cover max-h-[500px] transition-transform duration-500 group-hover/img:scale-[1.01] ${imageLoaded ? 'block' : 'hidden'}`}
              onLoad={() => {
                setImageLoaded(true)
                setImageError(false)
              }}
              onError={() => {
                setImageError(true)
                setImageLoaded(true)
              }}
            />

            {/* Floating double-tap heart overlay animation */}
            {showHeartPop && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 animate-double-tap-heart">
                <svg className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-2xl" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
            )}
          </div>
        )}

        {imageError && (
          <div className="mt-3 rounded-2xl bg-rose-50/80 p-4 text-center text-xs font-semibold text-rose-500 font-body">
            Failed to load post image
          </div>
        )}
      </div>

      {/* ─── Instagram-Style Action Bar (Like, Comment, Share, Save) ─── */}
      <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex items-center justify-between">
        {/* Left Action Buttons: Like, Comment, Share */}
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <button
            onClick={handleLike}
            disabled={isLiking}
            aria-label={liked ? 'Unlike post' : 'Like post'}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-90 disabled:opacity-60 font-heading ${
              liked
                ? 'text-rose-600'
                : 'text-slate-600 hover:text-rose-600'
            }`}
          >
            <svg
              className={`w-6 h-6 transition-transform ${liked ? 'animate-pop-heart fill-rose-500 text-rose-500' : ''}`}
              fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={liked ? 0 : 2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.36l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{likeCount}</span>
          </button>

          {/* Comment Toggle Button */}
          <button
            onClick={() => setShowComments(!showComments)}
            aria-label={showComments ? 'Hide comments' : 'Show comments'}
            aria-expanded={showComments}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-90 font-heading ${
              showComments
                ? 'text-indigo-600'
                : 'text-slate-600 hover:text-indigo-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>{post.comments_count || 0}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            aria-label="Share post"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-all active:scale-90 font-heading"
            title="Share post"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M20.5 3.5L3.5 9L10 12L17 7L12 14L15 20.5L20.5 3.5Z"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Right Action Button: Save / Bookmark (Instagram Ribbon Icon) */}
        <button
          onClick={handleSaveToggle}
          aria-label={saved ? 'Remove from saved' : 'Save post'}
          title={saved ? 'Post saved' : 'Save post'}
          className={`flex items-center text-xs font-bold transition-all active:scale-90 font-heading ${
            saved
              ? 'text-slate-900 fill-slate-900'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <svg
            className={`w-6 h-6 transition-transform ${saved ? 'scale-105' : ''}`}
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={saved ? 0 : 2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </button>
      </div>

      {/* ─── Comment Section Expansion ─── */}
      {showComments && (
        <div className="border-t border-slate-100/80 bg-slate-50/50">
          <CommentSection postId={post.id} />
        </div>
      )}
    </div>
  )
}

export default memo(PostCard)
