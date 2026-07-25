import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getComments, addComment } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import Avatar from './Avatar'
import type { Comment } from '../types'

interface CommentSectionProps {
  postId: string
}

const CommentSection = ({ postId }: CommentSectionProps) => {
  const { user, profile } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadComments()
  }, [postId])

  const loadComments = async () => {
    try {
      const data = await getComments(postId)
      setComments(data)
    } catch (err) {
      console.error('Error loading comments:', err)
      setError('Failed to load comments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return

    setIsSubmitting(true)
    try {
      const comment = await addComment(postId, newComment.trim())
      setComments((prev) => [...prev, comment])
      setNewComment('')
      setError('')
    } catch (err: any) {
      setError(err.message || 'Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-4">
        Comments ({comments.length})
      </h4>

      {/* Comment List */}
      <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Link to={`/profile/${comment.user_id}`}>
                <Avatar
                  src={comment.profiles?.avatar_url}
                  name={comment.profiles?.full_name || comment.profiles?.username}
                  size="w-8 h-8"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="bg-gray-50 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/profile/${comment.user_id}`} className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                      {comment.profiles?.full_name || comment.profiles?.username || 'Unknown'}
                    </Link>
                    <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment */}
      {user && (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || profile?.username || user.email}
            size="w-8 h-8"
          />
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-gray-50 border-0 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '...' : 'Post'}
            </button>
          </div>
        </form>
      )}
      {!user && (
        <p className="text-sm text-gray-500 text-center">
          <Link to="/login" className="text-indigo-600 hover:underline">Sign in</Link> to leave a comment
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export default CommentSection

