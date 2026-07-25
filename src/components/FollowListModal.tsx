import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getFollowers, getFollowing, isFollowing, doesUserFollowMe, followUser, unfollowUser } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import Avatar from './Avatar'
import LoadingSpinner from './LoadingSpinner'
import type { Profile } from '../types'

interface FollowListModalProps {
  userId: string
  type: 'followers' | 'following'
  onClose: () => void
}

const FollowListModal = ({ userId, type, onClose }: FollowListModalProps) => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<(Profile & { iFollow?: boolean; followsMe?: boolean })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const data = type === 'followers'
        ? await getFollowers(userId)
        : await getFollowing(userId)

      // Load follow status for each user relative to current user
      if (currentUser) {
        const enhanced = await Promise.all(
          data.map(async (profile) => {
            const [iFollow, followsMe] = await Promise.all([
              isFollowing(profile.id),
              doesUserFollowMe(profile.id),
            ])
            return { ...profile, iFollow, followsMe }
          })
        )
        setUsers(enhanced)
      } else {
        setUsers(data)
      }
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowToggle = async (targetUserId: string) => {
    setFollowLoading((prev) => ({ ...prev, [targetUserId]: true }))
    try {
      const user = users.find((u) => u.id === targetUserId)
      if (!user) return

      if (user.iFollow) {
        await unfollowUser(targetUserId)
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, iFollow: false } : u))
        )
      } else {
        await followUser(targetUserId)
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, iFollow: true } : u))
        )
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
    } finally {
      setFollowLoading((prev) => ({ ...prev, [targetUserId]: false }))
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays < 1) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="py-8">
              <LoadingSpinner size="md" message={`Loading ${type}...`} />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-gray-500 text-sm">
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            users.map((profile) => (
              <div key={profile.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <Link
                  to={`/profile/${profile.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <Avatar
                    src={profile.avatar_url}
                    name={profile.full_name || profile.username}
                    size="w-10 h-10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {profile.full_name || profile.username}
                      </p>
                      {profile.followsMe && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                          Follows you
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
                  </div>
                </Link>

                {currentUser && profile.id !== currentUser.id && (
                  <button
                    onClick={() => handleFollowToggle(profile.id)}
                    disabled={followLoading[profile.id]}
                    className={`shrink-0 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      profile.iFollow
                        ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                    }`}
                  >
                    {followLoading[profile.id] ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : profile.iFollow ? (
                      'Following'
                    ) : (
                      'Follow'
                    )}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default FollowListModal

