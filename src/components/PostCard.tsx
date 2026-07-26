import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { likePost, unlikePost, isPostLiked, deletePost, getPostShareUrl, shareContent } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import CommentSection from './CommentSection'
import Avatar from './Avatar'
import type { Post } from '../types'

interface PostCardProps {
  post: Post
  onDelete?: (postId: string) => void
  onLikeChange?: (postId: string, isLiked: boolean) => void
}

const PostCard = ({ post, onDelete, onLikeChange }: PostCardProps) => {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (user) {
      isPostLiked(post.id).then(setLiked).catch(console.error)
    }
  }, [post.id, user])

  useEffect(() => {
    setLikeCount(post.likes_count || 0)
  }, [post.likes_count])

  const handleLike = async () => {
    if (!user) return
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
    }
  }

  const handleDelete = async () => {
    try {
      await deletePost(post.id)
      onDelete?.(post.id)
    } catch (err) {
      console.error('Error deleting post:', err)
    }
    setShowMenu(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const profile = post.profiles
  const isOwner = user?.id === post.user_id

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Post Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden">
              <Avatar
                src={profile?.avatar_url}
                name={profile?.full_name || profile?.username}
                size="w-10 h-10"
              />
            </div>
            <div>
              <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors text-sm">
                {profile?.full_name || profile?.username || 'Unknown User'}
              </p>
              <p className="text-xs text-gray-500">@{profile?.username || 'unknown'}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                      <button
                        onClick={handleDelete}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
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

      {/* Post Content */}
      <div className="p-4">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>

        {post.image_url && !imageError && (
          <div className="mt-3 rounded-xl overflow-hidden bg-gray-50 relative">
            {!imageLoaded && (
              <div className="w-full h-64 bg-gray-100 animate-pulse flex items-center justify-center absolute inset-0 z-10">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <img
              src={post.image_url}
              alt="Post image"
              className={`w-full object-cover max-h-96 ${imageLoaded ? 'block' : 'opacity-0'}`}
              onLoad={() => {
                setImageLoaded(true)
                setImageError(false)
              }}
              onError={() => {
                setImageError(true)
                setImageLoaded(true)
              }}
            />
          </div>
        )}
        {imageError && (
          <div className="mt-3 rounded-xl bg-red-50 p-4 text-center text-sm text-red-500">
            Failed to load image
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-6">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
          }`}
        >
          <svg
            className="w-5 h-5"
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.36l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className={liked ? 'font-medium' : ''}>{likeCount}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            showComments ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>{post.comments_count || 0}</span>
        </button>

        <button
          onClick={() => {
            const url = getPostShareUrl(post.id)
            const text = `Check out this post by ${profile?.full_name || profile?.username || 'someone'} on SocialMedia!`
            shareContent('Share Post', text, url)
          }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span>Share</span>
        </button>
      </div>

      {/* Comment Section */}
      {showComments && (
        <div className="border-t border-gray-100">
          <CommentSection postId={post.id} />
        </div>
      )}
    </div>
  )
}

export default PostCard
