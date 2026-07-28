import { useState, useEffect, useCallback } from 'react'
import { getFeedPosts, getPosts } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import PostCard from '../components/PostCard'
import CreatePost from '../components/CreatePost'
import UserSearch from '../components/UserSearch'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Post } from '../types'

const Home = () => {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedMode, setFeedMode] = useState<'feed' | 'latest'>('feed')

  const loadPosts = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError('')
    try {
      let data: Post[]
      if (feedMode === 'feed') {
        data = await getFeedPosts(user.id)
      } else {
        data = await getPosts(20)
      }
      setPosts(data)
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
  }

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  const handleLikeChange = (postId: string, isLiked: boolean) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likes_count: (p.likes_count || 0) + (isLiked ? 1 : -1), is_liked: isLiked }
          : p
      )
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{profile?.username ? `, ${profile.username}` : user?.email ? `, ${user.email.split('@')[0]}` : ''}! 👋
        </h1>
        <p className="text-gray-500 mt-1">See what's happening in your world</p>
      </div>

      {/* Search Bar - Mobile */}
      <div className="mb-6 md:hidden">
        <UserSearch />
      </div>

      {/* Feed Toggle */}
      <div className="flex items-center gap-2 mb-6 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
        <button
          onClick={() => setFeedMode('feed')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            feedMode === 'feed'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Following
        </button>
        <button
          onClick={() => setFeedMode('latest')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            feedMode === 'latest'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Latest
        </button>
      </div>

      {/* Create Post */}
      <CreatePost onPostCreated={handlePostCreated} />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600 flex-1">{error}</p>
            <button
              onClick={loadPosts}
              className="text-sm text-red-700 font-medium hover:text-red-800"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="py-12">
          <LoadingSpinner size="lg" message="Loading posts..." />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No posts yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            {feedMode === 'feed'
              ? 'Follow some users to see their posts here, or switch to Latest to see all posts.'
              : 'Be the first to share something!'}
          </p>
          {feedMode === 'feed' && (
            <button
              onClick={() => setFeedMode('latest')}
              className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
            >
              Browse latest posts →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
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

