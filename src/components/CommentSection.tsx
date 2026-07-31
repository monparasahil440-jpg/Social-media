import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  getComments,
  addComment,
  addReply,
  reactToComment,
  removeCommentReaction,
  getBatchCommentReactions,
} from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import Avatar from './Avatar'
import type { Comment, CommentReactionType } from '../types'

interface CommentSectionProps {
  postId: string
}

const REACTION_EMOJIS: Record<CommentReactionType, string> = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
}

const REACTION_LABELS: Record<CommentReactionType, string> = {
  like: 'Like',
  love: 'Love',
  laugh: 'Laugh',
  wow: 'Wow',
  sad: 'Sad',
  angry: 'Angry',
}

// Group flat comments into parent + nested replies
function buildCommentTree(flat: Comment[]): Comment[] {
  const map = new Map<string, Comment>()
  const roots: Comment[] = []

  flat.forEach((c) => map.set(c.id, { ...c, replies: [] }))

  flat.forEach((c) => {
    if (c.parent_comment_id && map.has(c.parent_comment_id)) {
      map.get(c.parent_comment_id)!.replies!.push(map.get(c.id)!)
    } else {
      roots.push(map.get(c.id)!)
    }
  })

  return roots
}

// ─── Single Comment Row ────────────────────────────────────────────
interface CommentRowProps {
  comment: Comment
  postId: string
  isReply?: boolean
  onReplyAdded: (reply: Comment) => void
  onReactionChanged: (commentId: string, reaction: CommentReactionType | null, old: CommentReactionType | null) => void
  openPickerId: string | null
  setOpenPickerId: (id: string | null) => void
  reactionLoading: Record<string, boolean>
  setReactionLoading: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

const CommentRow = ({
  comment,
  postId,
  isReply = false,
  onReplyAdded,
  onReactionChanged,
  openPickerId,
  setOpenPickerId,
  reactionLoading,
  setReactionLoading,
}: CommentRowProps) => {
  const { user, profile } = useAuth()
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const replyInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (showReplyInput) {
      setTimeout(() => replyInputRef.current?.focus(), 100)
    }
  }, [showReplyInput])

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpenPickerId(null)
      }
    }
    if (openPickerId === comment.id) {
      document.addEventListener('mousedown', handler)
    }
    return () => document.removeEventListener('mousedown', handler)
  }, [openPickerId, comment.id])

  const getTotalReactions = (reactions?: Record<string, number>) =>
    reactions ? Object.values(reactions).reduce((s, c) => s + c, 0) : 0

  const handleReaction = async (reaction: CommentReactionType) => {
    if (!user) return
    setReactionLoading((prev) => ({ ...prev, [comment.id]: true }))
    setOpenPickerId(null)
    try {
      const old = comment.user_reaction ?? null
      if (old === reaction) {
        await removeCommentReaction(comment.id)
        onReactionChanged(comment.id, null, old)
      } else {
        await reactToComment(comment.id, reaction)
        onReactionChanged(comment.id, reaction, old)
      }
    } catch (err) {
      console.error('Reaction error:', err)
    } finally {
      setReactionLoading((prev) => ({ ...prev, [comment.id]: false }))
    }
  }

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !user || isSubmittingReply) return
    setIsSubmittingReply(true)
    try {
      const reply = await addReply(postId, comment.id, replyText.trim())
      onReplyAdded(reply)
      setReplyText('')
      setShowReplyInput(false)
    } catch (err) {
      console.error('Reply error:', err)
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diffMs / 60000)
    const h = Math.floor(diffMs / 3600000)
    const d = Math.floor(diffMs / 86400000)
    if (m < 1) return 'now'
    if (m < 60) return `${m}m`
    if (h < 24) return `${h}h`
    if (d < 7) return `${d}d`
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const topReactions = Object.entries(comment.reactions || {})
    .filter(([, count]) => (count as number) > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)

  return (
    <div className={`flex gap-2.5 ${isReply ? 'pl-10' : ''} group`}>
      {/* Avatar */}
      <Link to={`/profile/${comment.user_id}`} className="shrink-0 mt-0.5">
        <Avatar
          src={comment.profiles?.avatar_url}
          name={comment.profiles?.full_name || comment.profiles?.username}
          size={isReply ? 'w-6 h-6' : 'w-8 h-8'}
        />
      </Link>

      <div className="flex-1 min-w-0">
        {/* Bubble */}
        <div className="inline-block bg-slate-100 rounded-2xl rounded-tl-sm px-3 py-2 max-w-full">
          <Link
            to={`/profile/${comment.user_id}`}
            className="text-xs font-extrabold text-slate-900 hover:text-indigo-600 transition-colors font-heading"
          >
            {comment.profiles?.full_name || comment.profiles?.username || 'Unknown'}
          </Link>
          <p className="text-xs text-slate-700 leading-relaxed mt-0.5 break-words font-body">
            {comment.content}
          </p>
        </div>

        {/* Reaction count pill — shown on bubble bottom-right */}
        {getTotalReactions(comment.reactions) > 0 && (
          <div className="inline-flex items-center gap-0.5 bg-white border border-slate-200 rounded-full px-1.5 py-0.5 shadow-sm ml-2 -mt-1 relative">
            {topReactions.map(([type]) => (
              <span key={type} className="text-[11px]">
                {REACTION_EMOJIS[type as CommentReactionType]}
              </span>
            ))}
            <span className="text-[10px] font-bold text-slate-500 ml-0.5">
              {getTotalReactions(comment.reactions)}
            </span>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-3 mt-1 ml-1 relative flex-wrap font-body">
          {/* Timestamp */}
          <span className="text-[10px] font-semibold text-slate-400">{formatDate(comment.created_at)}</span>

          {/* Like / Reaction button */}
          {user && (
            <div className="relative" ref={openPickerId === comment.id ? pickerRef : undefined}>
              <button
                onClick={() => setOpenPickerId(openPickerId === comment.id ? null : comment.id)}
                disabled={reactionLoading[comment.id]}
                className={`text-[11px] font-bold tracking-tight font-heading transition-colors ${
                  comment.user_reaction
                    ? 'text-indigo-600'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {reactionLoading[comment.id] ? (
                  <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                ) : comment.user_reaction ? (
                  <span>{REACTION_EMOJIS[comment.user_reaction]} {REACTION_LABELS[comment.user_reaction]}</span>
                ) : (
                  'Like'
                )}
              </button>

              {/* Floating Emoji Picker */}
              {openPickerId === comment.id && (
                <div className="absolute bottom-full left-0 mb-2 bg-white backdrop-blur-md rounded-full shadow-2xl border border-slate-200/80 px-2 py-1.5 z-50 flex gap-1 animate-fade-in">
                  {(Object.entries(REACTION_EMOJIS) as [CommentReactionType, string][]).map(([type, emoji]) => (
                    <button
                      key={type}
                      onClick={() => handleReaction(type)}
                      title={REACTION_LABELS[type]}
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-lg hover:scale-125 active:scale-95 transition-all duration-150 ${
                        comment.user_reaction === type
                          ? 'bg-indigo-100 ring-2 ring-indigo-400 scale-110'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reply button — only on top-level comments */}
          {user && !isReply && (
            <button
              onClick={() => setShowReplyInput((v) => !v)}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-700 transition-colors font-heading"
            >
              Reply
            </button>
          )}

          {/* Replies count badge */}
          {!isReply && (comment.replies?.length ?? 0) > 0 && (
            <span className="text-[10px] font-semibold text-indigo-500 font-heading">
              {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>

        {/* Inline reply input */}
        {showReplyInput && (
          <form onSubmit={handleSubmitReply} className="flex items-center gap-2 mt-2 ml-1">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.full_name || profile?.username || user?.email}
              size="w-6 h-6"
            />
            <div className="flex-1 flex items-center bg-slate-100 rounded-full px-3 py-1 focus-within:bg-white focus-within:border focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20 transition-all">
              <input
                ref={replyInputRef}
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitReply(e as any)
                  }
                  if (e.key === 'Escape') setShowReplyInput(false)
                }}
                placeholder={`Reply to ${comment.profiles?.full_name || comment.profiles?.username || 'comment'}…`}
                maxLength={500}
                className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none font-body"
              />
              {replyText.trim() && (
                <button
                  type="submit"
                  disabled={isSubmittingReply}
                  className="ml-2 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 shrink-0 font-heading"
                >
                  {isSubmittingReply ? (
                    <span className="inline-block w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  ) : 'Post'}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowReplyInput(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Nested replies */}
        {(comment.replies?.length ?? 0) > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies!.map((reply) => (
              <CommentRow
                key={reply.id}
                comment={reply}
                postId={postId}
                isReply
                onReplyAdded={onReplyAdded}
                onReactionChanged={onReactionChanged}
                openPickerId={openPickerId}
                setOpenPickerId={setOpenPickerId}
                reactionLoading={reactionLoading}
                setReactionLoading={setReactionLoading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main CommentSection ───────────────────────────────────────────
const CommentSection = ({ postId }: CommentSectionProps) => {
  const { user, profile } = useAuth()
  const [commentTree, setCommentTree] = useState<Comment[]>([])
  const [allComments, setAllComments] = useState<Comment[]>([]) // flat, for reactions update
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [openPickerId, setOpenPickerId] = useState<string | null>(null)
  const [reactionLoading, setReactionLoading] = useState<Record<string, boolean>>({})
  const inputRef = useRef<HTMLInputElement | null>(null)
  const commentsEndRef = useRef<HTMLDivElement | null>(null)

  // Load comments on mount
  useEffect(() => {
    loadComments()
  }, [postId])

  // Auto-focus input
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150)
    return () => clearTimeout(t)
  }, [])

  const loadComments = async () => {
    setIsLoading(true)
    try {
      const data = await getComments(postId)
      setAllComments(data)
      if (data.length > 0) {
        // Reactions are optional — don't crash comments if table is missing
        try {
          const reactionData = await getBatchCommentReactions(data.map((c) => c.id))
          const withReactions = data.map((c) => ({
            ...c,
            reactions: reactionData[c.id]?.reactions,
            user_reaction: reactionData[c.id]?.user_reaction || null,
          }))
          setAllComments(withReactions)
          setCommentTree(buildCommentTree(withReactions))
        } catch {
          // comment_reactions table may not exist yet — show comments without reactions
          setCommentTree(buildCommentTree(data))
        }
      } else {
        setCommentTree([])
      }
    } catch (err) {
      console.error('Error loading comments:', err)
      setError('Failed to load comments')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle a reply being added deep in the tree
  const handleReplyAdded = (reply: Comment) => {
    setAllComments((prev) => {
      const updated = [...prev, reply]
      setCommentTree(buildCommentTree(updated))
      return updated
    })
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // Handle reaction change propagated from any row
  const handleReactionChanged = (
    commentId: string,
    newReaction: CommentReactionType | null,
    oldReaction: CommentReactionType | null
  ) => {
    setAllComments((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== commentId) return c
        const reactions = { ...(c.reactions || { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 }) }
        if (oldReaction) reactions[oldReaction] = Math.max(0, (reactions[oldReaction] || 0) - 1)
        if (newReaction) reactions[newReaction] = (reactions[newReaction] || 0) + 1
        return { ...c, user_reaction: newReaction, reactions }
      })
      setCommentTree(buildCommentTree(updated))
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user || isSubmitting) return
    setIsSubmitting(true)
    try {
      const comment = await addComment(postId, newComment.trim())
      setAllComments((prev) => {
        const updated = [...prev, comment]
        setCommentTree(buildCommentTree(updated))
        return updated
      })
      setNewComment('')
      setError('')
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err: any) {
      setError(err.message || 'Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalCount = allComments.length

  return (
    <div className="flex flex-col">
      {/* Comment List */}
      <div className="max-h-[420px] overflow-y-auto px-4 pt-3 pb-1 space-y-3">
        {isLoading ? (
          <div className="space-y-4 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2.5 animate-pulse">
                <div className="w-8 h-8 bg-slate-200 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-3 bg-slate-200 rounded-full w-24" />
                  <div className="h-3 bg-slate-200 rounded-full w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : commentTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-3xl mb-2">💬</span>
            <p className="text-xs font-semibold text-slate-400 font-heading">No comments yet</p>
            <p className="text-[11px] text-slate-300 mt-0.5 font-body">Be the first to share your thoughts!</p>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 font-heading">
              {totalCount} {totalCount === 1 ? 'Comment' : 'Comments'}
            </p>
            {commentTree.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                postId={postId}
                onReplyAdded={handleReplyAdded}
                onReactionChanged={handleReactionChanged}
                openPickerId={openPickerId}
                setOpenPickerId={setOpenPickerId}
                reactionLoading={reactionLoading}
                setReactionLoading={setReactionLoading}
              />
            ))}
          </>
        )}
        <div ref={commentsEndRef} />
      </div>

      {error && <p className="px-4 py-1 text-xs font-semibold text-rose-500">{error}</p>}

      {/* Instagram-style Add Comment Bar */}
      {user ? (
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2.5 px-4 py-3 border-t border-slate-100/80"
        >
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || profile?.username || user.email}
            size="w-8 h-8"
          />
          <div className="flex-1 flex items-center bg-slate-100 rounded-full px-4 py-1.5 focus-within:bg-white focus-within:border focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e as any)
                }
              }}
              placeholder="Add a comment…"
              maxLength={500}
              className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none font-body"
            />
            {newComment.trim() && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="ml-2 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 font-heading"
              >
                {isSubmitting ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : 'Post'}
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="text-xs text-slate-400 text-center py-3 border-t border-slate-100/80 font-medium">
          <Link to="/login" className="text-indigo-600 hover:underline font-bold">Sign in</Link> to comment
        </p>
      )}
    </div>
  )
}

export default CommentSection
