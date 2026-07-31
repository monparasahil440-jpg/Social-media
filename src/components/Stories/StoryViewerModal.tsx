import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  markStoryViewed,
  deleteStory,
  recordStoryView,
  getStoryViewers,
  isStoryLiked,
  toggleLikeStory,
  sendStoryReply,
  sendStoryReactionDM,
} from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../contexts/ToastProvider'
import Avatar from '../Avatar'
import type { UserStoriesGroup, StoryViewerItem } from '../../types'

interface StoryViewerModalProps {
  groups: UserStoriesGroup[]
  initialGroupIndex?: number
  onClose: () => void
  onStoryDeleted?: (storyId: string) => void
}

const STORY_DURATION = 5000 // 5 seconds per story slide
const QUICK_REACTION_EMOJIS = ['❤️', '🔥', '😂', '😮', '😢', '👏']

const StoryViewerModal = ({
  groups,
  initialGroupIndex = 0,
  onClose,
  onStoryDeleted,
}: StoryViewerModalProps) => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showViewersSheet, setShowViewersSheet] = useState(false)
  const [viewers, setViewers] = useState<StoryViewerItem[]>([])
  const [viewerSearch, setViewerSearch] = useState('')
  const [loadingViewers, setLoadingViewers] = useState(false)

  // Story interactions state
  const [liked, setLiked] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)

  const timerRef = useRef<any>(null)

  const currentGroup = groups[groupIndex]
  const currentStory = currentGroup?.stories[storyIndex]

  const isOwner = user?.id === currentStory?.user_id
  const profile = currentGroup?.profile || currentStory?.profiles

  // Mark current story as viewed and record view
  useEffect(() => {
    if (currentStory) {
      markStoryViewed(currentStory.id)
      recordStoryView(currentStory.id)
    }
  }, [currentStory])

  // Check if story is liked
  useEffect(() => {
    if (currentStory && user) {
      setLiked(isStoryLiked(currentStory.id, user.id))
    }
  }, [currentStory, user])

  // Load viewers for owner
  useEffect(() => {
    if (currentStory && isOwner) {
      setLoadingViewers(true)
      getStoryViewers(currentStory.id)
        .then(setViewers)
        .catch(console.error)
        .finally(() => setLoadingViewers(false))
    }
  }, [currentStory, isOwner])

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0)
    setShowViewersSheet(false)
    setReplyText('')
  }, [groupIndex, storyIndex])

  // Progress Bar timer logic
  useEffect(() => {
    if (isPaused || showViewersSheet || !currentStory) return

    const interval = 50 // Update progress every 50ms
    const step = (interval / STORY_DURATION) * 100

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          handleNextStory()
          return 0
        }
        return prev + step
      })
    }, interval)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [groupIndex, storyIndex, isPaused, showViewersSheet, currentStory])

  const handleNextStory = () => {
    if (!currentGroup) return

    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((prev) => prev + 1)
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((prev) => prev + 1)
      setStoryIndex(0)
    } else {
      onClose()
    }
  }

  const handlePrevStory = () => {
    if (!currentGroup) return

    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1)
    } else if (groupIndex > 0) {
      setGroupIndex((prev) => prev - 1)
      const prevGroup = groups[groupIndex - 1]
      setStoryIndex(prevGroup.stories.length - 1)
    }
  }

  const handleLikeToggle = async (emoji: string = '❤️') => {
    if (!currentStory || !user) return
    const nextState = await toggleLikeStory(currentStory.id, emoji)
    setLiked(nextState)
    if (nextState) {
      showToast(`Reacted ${emoji} to status`, 'success', 2000)
      if (!isOwner && currentStory.user_id) {
        sendStoryReactionDM(
          currentStory.user_id,
          emoji,
          currentStory.caption,
          currentStory.media_url
        ).catch(console.error)
      }
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !currentStory || !currentStory.user_id) return

    setIsSendingReply(true)
    try {
      await sendStoryReply(
        currentStory.user_id,
        replyText.trim(),
        currentStory.caption,
        currentStory.media_url
      )
      setReplyText('')
      setIsPaused(false)
      showToast(`Reply sent to @${profile?.username || 'user'} 💬`, 'success')
    } catch (err: any) {
      console.error('Error sending story reply:', err)
      showToast('Failed to send reply', 'error')
    } finally {
      setIsSendingReply(false)
    }
  }

  const handleDeleteStory = async () => {
    if (!currentStory) return
    try {
      await deleteStory(currentStory.id)
      showToast('Story deleted', 'success')
      onStoryDeleted?.(currentStory.id)

      if (currentGroup.stories.length > 1) {
        setStoryIndex((prev) => Math.max(0, prev - 1))
      } else {
        onClose()
      }
    } catch (err: any) {
      showToast('Failed to delete story', 'error')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!currentGroup || !currentStory) return null

  const filteredViewers = viewers.filter((v) => {
    const q = viewerSearch.toLowerCase()
    const name = v.profile?.full_name?.toLowerCase() || ''
    const uname = v.profile?.username?.toLowerCase() || ''
    return name.includes(q) || uname.includes(q)
  })

  const viewerContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-fade-in select-none">
      {/* Back button overlay */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-slate-800/60 text-white hover:bg-slate-800 transition-all shadow-lg"
        aria-label="Close story"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Main Story Container */}
      <div
        onMouseDown={() => !showViewersSheet && !replyText && setIsPaused(true)}
        onMouseUp={() => !showViewersSheet && !replyText && setIsPaused(false)}
        onTouchStart={() => !showViewersSheet && !replyText && setIsPaused(true)}
        onTouchEnd={() => !showViewersSheet && !replyText && setIsPaused(false)}
        className="relative w-full max-w-sm sm:max-w-md h-full sm:h-[90vh] sm:rounded-3xl overflow-hidden bg-slate-900 shadow-2xl flex flex-col justify-between"
      >
        {/* Story Background / Media */}
        {currentStory.media_url ? (
          <div className="absolute inset-0 z-0">
            <img
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/80" />
          </div>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${currentStory.background_color || 'from-indigo-600 to-purple-600'} flex items-center justify-center p-8 text-center`}>
            <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed drop-shadow-lg font-heading">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Top Section: Progress Indicators + Profile Header */}
        <div className="relative z-10 p-4 space-y-3">
          {/* Segmented Progress Bar */}
          <div className="flex gap-1.5 w-full">
            {currentGroup.stories.map((story, idx) => {
              let fillWidth = '0%'
              if (idx < storyIndex) fillWidth = '100%'
              else if (idx === storyIndex) fillWidth = `${progress}%`

              return (
                <div key={story.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-75 rounded-full"
                    style={{ width: fillWidth }}
                  />
                </div>
              )
            })}
          </div>

          {/* Profile & Info Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar
                src={profile?.avatar_url}
                name={profile?.full_name || profile?.username}
                size="w-9 h-9"
              />
              <div>
                <p className="text-sm font-bold text-white drop-shadow-md font-heading">
                  {profile?.full_name || profile?.username || 'Unknown'}
                </p>
                <p className="text-[11px] text-white/70 font-medium font-body">
                  {formatDate(currentStory.created_at)}
                </p>
              </div>
            </div>

            {/* Trash button if owner */}
            {isOwner && (
              <button
                onClick={handleDeleteStory}
                className="p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition-colors"
                title="Delete this story"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tap Controls (Left for previous, Right for next) */}
        {!showViewersSheet && (
          <div className="absolute inset-0 z-0 flex">
            <div onClick={handlePrevStory} className="w-1/3 h-full cursor-pointer" />
            <div onClick={handleNextStory} className="w-2/3 h-full cursor-pointer" />
          </div>
        )}

        {/* Bottom Section: Photo Caption, Viewers & Story Actions */}
        <div className="relative z-10 p-4 space-y-3">
          {currentStory.media_url && currentStory.caption && (
            <div className="text-center">
              <p className="text-sm font-bold text-white leading-relaxed drop-shadow-lg px-4 py-2 bg-black/40 backdrop-blur-md rounded-2xl font-heading inline-block max-w-full break-words">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Instagram Viewers Eye Button for Story Owner */}
          {isOwner ? (
            <div className="flex justify-center pt-1">
              <button
                onClick={() => {
                  setIsPaused(true)
                  setShowViewersSheet(true)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-slate-700/80 hover:bg-slate-800 transition-all font-heading text-xs font-bold shadow-xl active:scale-95"
              >
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{viewers.length} {viewers.length === 1 ? 'Viewer' : 'Viewers'}</span>
              </button>
            </div>
          ) : (
            /* Instagram Reply & Quick Emoji Reaction Bar for Other Users' Stories */
            <div className="space-y-2 pt-1">
              {/* Instagram Quick Reaction Emojis */}
              <div className="flex items-center justify-around px-2 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 max-w-[280px] mx-auto">
                {QUICK_REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleLikeToggle(emoji)}
                    className="text-lg hover:scale-125 active:scale-90 transition-transform p-1"
                    title={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => {
                      if (!replyText.trim()) setIsPaused(false)
                    }}
                    placeholder={`Send message to @${profile?.username || 'user'}...`}
                    className="w-full px-4 py-2.5 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-xs sm:text-sm text-white placeholder-white/60 outline-none focus:border-white/50 focus:bg-black/60 transition-all font-body pr-16"
                  />
                  {replyText.trim() && (
                    <button
                      type="submit"
                      disabled={isSendingReply}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-full hover:scale-105 active:scale-95 transition-all font-heading"
                    >
                      {isSendingReply ? '...' : 'Send'}
                    </button>
                  )}
                </div>

                {/* Heart Button */}
                <button
                  type="button"
                  onClick={() => handleLikeToggle('❤️')}
                  aria-label={liked ? 'Unlike story' : 'Like story'}
                  className={`p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:scale-110 active:scale-95 transition-all ${
                    liked ? 'text-rose-500 border-rose-500/50' : 'hover:text-rose-400'
                  }`}
                >
                  <svg
                    className={`w-5 h-5 ${liked ? 'fill-rose-500 animate-pop-heart text-rose-500' : ''}`}
                    fill={liked ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.36l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ─── Instagram Story Viewers Bottom Sheet ─── */}
        {showViewersSheet && (
          <div className="absolute inset-x-0 bottom-0 top-1/4 z-30 bg-white rounded-t-3xl shadow-2xl flex flex-col animate-slide-up border-t border-slate-200 overflow-hidden">
            {/* Sheet Handle Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-slate-300 rounded-full mx-auto absolute top-2 left-1/2 -translate-x-1/2" />
                <h3 className="text-base font-bold text-slate-900 font-heading pt-1">
                  Story Activity
                </h3>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full font-heading mt-1">
                  {viewers.length}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowViewersSheet(false)
                  setIsPaused(false)
                }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors mt-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Filter */}
            {viewers.length > 3 && (
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                <input
                  type="text"
                  value={viewerSearch}
                  onChange={(e) => setViewerSearch(e.target.value)}
                  placeholder="Search viewers…"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 font-body"
                />
              </div>
            )}

            {/* Viewers List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingViewers ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredViewers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">👁️</div>
                  <p className="text-sm font-bold text-slate-800 font-heading">
                    {viewers.length === 0 ? 'No viewers yet' : 'No matching viewers'}
                  </p>
                  <p className="text-xs text-slate-400 font-body">
                    {viewers.length === 0 ? 'People who view your status will appear here.' : 'Try searching another name.'}
                  </p>
                </div>
              ) : (
                filteredViewers.map((item) => (
                  <Link
                    key={item.id}
                    to={`/profile/${item.viewer_id}`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-2xl transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <Avatar
                          src={item.profile?.avatar_url}
                          name={item.profile?.full_name || item.profile?.username}
                          size="w-10 h-10"
                        />
                        {item.user_reaction && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center text-xs border border-slate-100 animate-pop-heart">
                            {item.user_reaction}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate font-heading group-hover:text-indigo-600 transition-colors">
                          {item.profile?.full_name || item.profile?.username || 'User'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate font-body">
                          @{item.profile?.username || 'unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.user_reaction && (
                        <span className="text-xs px-2 py-0.5 bg-rose-50 border border-rose-100 rounded-full font-bold shadow-xs flex items-center gap-1 text-slate-800">
                          <span>{item.user_reaction}</span>
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-slate-400 shrink-0 font-body">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(viewerContent, document.body)
}

export default StoryViewerModal
