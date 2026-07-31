import { useState, useEffect, useCallback } from 'react'
import { getFeedPosts, getPosts } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../contexts/ToastProvider'
import PostCard from '../components/PostCard'
import CreatePost from '../components/CreatePost'
import UserSearch from '../components/UserSearch'
import LoadingSpinner from '../components/LoadingSpinner'
import NotificationBell from '../components/NotificationBell'
import StoriesBar from '../components/Stories/StoriesBar'
import type { Post } from '../types'

const Home = () => {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedMode, setFeedMode] = useState<'feed' | 'latest'>('feed')
  const [showCreatePostModal, setShowCreatePostModal] = useState(false)

  const loadPosts = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError('')
    try {
      let result
      if (feedMode === 'feed') {
        result = await getFeedPosts(user.id)
      } else {
        result = await getPosts(20)
      }
      setPosts(result.posts)
    } catch (err: any) {
      console.error('Error loading posts:', err)
      setError(err.message || 'Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }, [user, feedMode])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev])
    showToast('Post created successfully!', 'success')
  }

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    showToast('Post deleted', 'success')
  }

  const handleLikeChange = (postId: string, isLiked: boolean) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likes_count: (p.likes_count || 0) + (isLiked ? 1 : -1), is_liked: isLiked }
          : p
      )
    )
    showToast(isLiked ? 'Post liked!' : 'Post unliked', 'info')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center text-white text-sm shadow-md">
            ✨
          </div>
          <span className="text-lg font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            SocialMedia
          </span>
        </div>
        <NotificationBell />
      </div>

      {/* Welcome & Quick Create Hero Card */}
      <div className="mb-6 bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/80 shadow-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading">
              Welcome back{profile?.username ? `, ${profile.username}` : user?.email ? `, ${user.email.split('@')[0]}` : ''}! 👋
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Discover what's trending and connect with friends</p>
          </div>
        </div>

        {/* Quick inline post launcher */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={() => setShowCreatePostModal(true)}
            className="flex-1 text-left px-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 rounded-full text-xs sm:text-sm text-slate-400 font-medium transition-all"
          >
            What's on your mind? Share an update...
          </button>
          <button
            onClick={() => setShowCreatePostModal(true)}
            className="p-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:scale-105 active:scale-95 transition-all"
            title="Create Post"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="mb-5 md:hidden">
        <UserSearch />
      </div>

      {/* Stories / Status Tray */}
      <StoriesBar />

      {/* Feed Toggle Pills */}
      <div className="flex items-center gap-2 mb-6 bg-white/80 backdrop-blur-xl rounded-2xl p-1.5 border border-slate-200/80 shadow-sm">
        <button
          onClick={() => setFeedMode('feed')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
            feedMode === 'feed'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          ✨ Following Feed
        </button>
        <button
          onClick={() => setFeedMode('latest')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
            feedMode === 'latest'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          🔥 Latest Global
        </button>
      </div>

      {/* Create Post Modal */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-all">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-heading">
                <span>📝</span> Create New Post
              </h1>
              <button
                onClick={() => setShowCreatePostModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <CreatePost onPostCreated={(post) => {
                handlePostCreated(post)
                setShowCreatePostModal(false)
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-rose-600 flex-1">{error}</p>
            <button
              onClick={loadPosts}
              className="text-xs text-rose-700 font-bold hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="py-16">
          <LoadingSpinner size="lg" message="Curating your feed..." />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 p-8 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
            📝
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No posts found</h3>
          <p className="text-slate-500 text-xs sm:text-sm mb-5 max-w-md mx-auto">
            {feedMode === 'feed'
              ? 'Follow more accounts to view posts here, or check out the latest global stream.'
              : 'Be the pioneer who shares the first post!'}
          </p>
          {feedMode === 'feed' && (
            <button
              onClick={() => setFeedMode('latest')}
              className="px-5 py-2.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors"
            >
              Browse Latest Global Feed →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={handleDeletePost}
              onLikeChange={handleLikeChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Home
