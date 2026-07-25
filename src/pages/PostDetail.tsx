import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import CommentSection from '../components/CommentSection'
import Avatar from '../components/Avatar'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Post, Profile } from '../types'

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (!postId) return
    loadPost(postId)
  }, [postId])

  const loadPost = async (id: string) => {
    setIsLoading(true)
    setError('')
    try {
      // Fetch the post with aggregated counts
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          likes_count:likes(count),
          comments_count:comments(count)
        `)
        .eq('id', id)
        .maybeSingle()

      if (postError) throw postError
      if (!postData) {
        setError('Post not found')
        return
      }

      // Fetch the author's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', postData.user_id)
        .maybeSingle()

      const likesCount = postData.likes_count?.[0]?.count ?? postData.likes_count ?? 0

      setPost({
        ...postData,
        profiles: profile as Profile || null,
        likes_count: likesCount,
        comments_count: postData.comments_count?.[0]?.count ?? postData.comments_count ?? 0,
      } as Post)
      setLikeCount(likesCount)
    } catch (err: any) {
      console.error('Error loading post:', err)
      setError(err.message || 'Failed to load post')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading post..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Post Not Found</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!post) return null

  const profile = post.profiles

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back Button - Instagram style */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Post Card - Instagram Detail Style */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Post Author Header */}
        <div className="p-4 flex items-center gap-3 border-b border-gray-100">
          <Link to={`/profile/${post.user_id}`}>
            <Avatar
              src={profile?.avatar_url}
              name={profile?.full_name || profile?.username}
              size="w-10 h-10"
            />
          </Link>
          <Link to={`/profile/${post.user_id}`} className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-sm">
              {profile?.full_name || profile?.username || 'Unknown User'}
            </p>
            <p className="text-xs text-gray-500">@{profile?.username || 'unknown'}</p>
          </Link>
          <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
        </div>

        {/* Post Image - Full width Instagram style */}
        {post.image_url && (
          <div className="bg-gray-50">
            {!imageLoaded && !imageError && (
              <div className="w-full aspect-square bg-gray-100 animate-pulse flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <img
              src={post.image_url}
              alt="Post image"
              className={`w-full object-cover max-h-[600px] ${imageLoaded ? 'block' : 'hidden'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {imageError && (
              <div className="w-full aspect-square bg-red-50 flex items-center justify-center">
                <p className="text-sm text-red-500">Failed to load image</p>
              </div>
            )}
          </div>
        )}

        {/* Post Content */}
        <div className="p-4">
          {/* Like & Comment Stats - Instagram style */}
          <div className="flex items-center gap-6 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">{likeCount} likes</span>
            </div>
            <span className="text-sm text-gray-500">{post.comments_count || 0} comments</span>
          </div>

          {/* Post Text */}
          <div className="mb-4">
            <span className="font-semibold text-sm text-gray-900 mr-2">
              {profile?.full_name || profile?.username || 'Unknown'}
            </span>
            <span className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</span>
          </div>

          {/* Date */}
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            {formatDate(post.created_at)}
          </p>
        </div>

        {/* Comment Section - Opens automatically */}
        <div className="border-t border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-900">Comments</h4>
          </div>
          <CommentSection postId={post.id} />
        </div>
      </div>
    </div>
  )
}

export default PostDetail

