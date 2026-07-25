import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  getProfile,
  getUserPosts,
  getFollowersCount,
  getFollowingCount,
  isFollowing,
  doesUserFollowMe,
  followUser,
  unfollowUser,
  updateProfile,
  uploadImage,
  blockUser,
  unblockUser,
  isBlocked,
  getProfileShareUrl,
  shareContent,
} from '../lib/supabaseClient'
import PostCard from '../components/PostCard'
import FollowListModal from '../components/FollowListModal'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Profile as ProfileType, Post } from '../types'

const Profile = () => {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser, refreshProfile } = useAuth()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [followsYou, setFollowsYou] = useState(false)
  const [iFollowThem, setIFollowThem] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [isUserBlocked, setIsUserBlocked] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false)
  const [editFullName, setEditFullName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)

  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    if (userId) {
      loadProfile()
    }
  }, [userId])

  const loadProfile = async () => {
    if (!userId) return
    setIsLoading(true)
    setError('')
    try {
      const [profileData, userPosts, followers, following, iFollowThemResult, theyFollowMeResult, blocked] = await Promise.all([
        getProfile(userId),
        getUserPosts(userId),
        getFollowersCount(userId),
        getFollowingCount(userId),
        currentUser ? isFollowing(userId) : Promise.resolve(false),
        currentUser ? doesUserFollowMe(userId) : Promise.resolve(false),
        currentUser ? isBlocked(userId) : Promise.resolve(false),
      ])

      if (!profileData) {
        setError('Profile not found')
        setIsLoading(false)
        return
      }

      setProfile(profileData)
      setPosts(userPosts)
      setFollowersCount(followers)
      setFollowingCount(following)
      setIFollowThem(iFollowThemResult)
      setFollowsYou(theyFollowMeResult)
      setIsUserBlocked(blocked)
      setIsPrivate(profileData.is_private)

      setEditFullName(profileData.full_name || '')
      setEditBio(profileData.bio || '')
      setEditWebsite(profileData.website || '')
    } catch (err: any) {
      console.error('Error loading profile:', err)
      setError(err.message || 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!userId || !currentUser) return
    setIsFollowLoading(true)
    try {
      if (iFollowThem) {
        await unfollowUser(userId)
        setIFollowThem(false)
        setFollowersCount((prev) => Math.max(0, prev - 1))
      } else {
        await followUser(userId)
        setIFollowThem(true)
        setFollowersCount((prev) => prev + 1)
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
    } finally {
      setIsFollowLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!userId) return
    setIsSaving(true)
    try {
      let avatarUrl = profile?.avatar_url || undefined

      if (editAvatarFile) {
        avatarUrl = await uploadImage(editAvatarFile)
      }

      const updated = await updateProfile(userId, {
        full_name: editFullName || null,
        bio: editBio || '',
        website: editWebsite || '',
        avatar_url: avatarUrl || null,
        is_private: isPrivate,
      } as any)

      setProfile(updated)
      setIsEditing(false)
      // Revoke the object URL to prevent memory leaks
      if (editAvatarPreview && editAvatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(editAvatarPreview)
      }
      setEditAvatarFile(null)
      setEditAvatarPreview(null)
      // Refresh the global auth profile so Navbar and other components update
      await refreshProfile()
    } catch (err: any) {
      console.error('Error updating profile:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditFullName(profile?.full_name || '')
    setEditBio(profile?.bio || '')
    setEditWebsite(profile?.website || '')
    // Revoke the object URL to prevent memory leaks
    if (editAvatarPreview && editAvatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editAvatarPreview)
    }
    setEditAvatarFile(null)
    setEditAvatarPreview(null)
    setIsPrivate(profile?.is_private || false)
  }

  const handleBlockToggle = async () => {
    if (!userId) return
    try {
      if (isUserBlocked) {
        await unblockUser(userId)
        setIsUserBlocked(false)
      } else {
        await blockUser(userId)
        setIsUserBlocked(true)
        setIFollowThem(false)
        setFollowsYou(false)
      }
    } catch (err) {
      console.error('Error toggling block:', err)
    }
    setShowMenu(false)
  }

  const handleShareProfile = () => {
    if (!userId) return
    const url = getProfileShareUrl(userId)
    const text = `Check out ${profile?.full_name || profile?.username}'s profile on SocialMedia!`
    shareContent('Share Profile', text, url)
    setShowMenu(false)
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <LoadingSpinner size="lg" message="Loading profile..." />
      </div>
    )
  }

  // Error State
  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center bg-white rounded-xl border border-gray-100 p-8">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">User not found</h2>
          <p className="text-gray-500 mb-4">{error || 'This user does not exist or has been removed.'}</p>
          <Link to="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Go back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="relative group">
              {/* Avatar Image or Initial */}
              <div className="w-24 h-24 rounded-xl border-4 border-white bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                {(editAvatarPreview || profile.avatar_url) && isEditing ? (
                  <img
                    src={editAvatarPreview || profile.avatar_url || ''}
                    alt={profile.full_name || ''}
                    className="w-full h-full object-cover"
                  />
                ) : profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (profile.full_name || profile.username).charAt(0).toUpperCase()
                )}
              </div>

              {/* Instagram-style camera overlay on hover - only in edit mode */}
              {isOwnProfile && isEditing && (
                <label className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity border-4 border-white">
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-white text-[10px] font-medium">Change Photo</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setEditAvatarFile(file)
                        // Use createObjectURL for instant synchronous preview
                        const previewUrl = URL.createObjectURL(file)
                        setEditAvatarPreview(previewUrl)
                      }
                    }}
                  />
                </label>
              )}

              {/* Non-editing mode: simple camera overlay on hover */}
              {isOwnProfile && !isEditing && (
                <label className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity border-4 border-white">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                </label>
              )}
            </div>

            <div className="flex-1 min-w-0 sm:pb-1">
              {isEditing && isOwnProfile ? (
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="text-xl font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 w-full max-w-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your full name"
                />
              ) : (
                <h1 className="text-xl font-bold text-gray-900 truncate">
                  {profile.full_name || profile.username}
                </h1>
              )}
              <p className="text-sm text-gray-500">@{profile.username}</p>
              {profile.is_private && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400 mt-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Private account
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => {
                      if (isEditing) {
                        handleSaveProfile()
                      } else {
                        setIsEditing(true)
                      }
                    }}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : isEditing ? (
                      'Save Profile'
                    ) : (
                      'Edit Profile'
                    )}
                  </button>
                  {isEditing && (
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
                      iFollowThem
                        ? followsYou
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : followsYou
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-sm'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-sm'
                    }`}
                  >
                    {isFollowLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : iFollowThem ? (
                      followsYou ? (
                        <>
                          <span>Following</span>
                          <span className="text-xs opacity-80">· Mutual</span>
                        </>
                      ) : (
                        'Following'
                      )
                    ) : followsYou ? (
                      'Follow Back'
                    ) : (
                      'Follow'
                    )}
                  </button>

                  {/* Three-dot menu for non-own profiles */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    {showMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                          <button
                            onClick={handleShareProfile}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share Profile
                          </button>
                          <button
                            onClick={handleBlockToggle}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${
                              isUserBlocked ? 'text-gray-700 hover:bg-gray-50' : 'text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            {isUserBlocked ? 'Unblock User' : 'Block User'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* "Follows you" badge */}
          {followsYou && !iFollowThem && !isOwnProfile && (
            <div className="mt-2">
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Follows you</span>
            </div>
          )}

          {/* Bio & Website */}
          {isEditing && isOwnProfile ? (
            <div className="mt-4 space-y-3">
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder="Tell us about yourself..."
                maxLength={200}
              />
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">🔗</span>
                <input
                  type="url"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://your-website.com"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </div>
                  <span className="text-sm text-gray-700">Private account</span>
                </label>
              </div>
              <div className="flex gap-2">
                {editAvatarFile && (
                  <button
                    onClick={() => {
                      // Revoke the blob URL to prevent memory leaks
                      if (editAvatarPreview && editAvatarPreview.startsWith('blob:')) {
                        URL.revokeObjectURL(editAvatarPreview)
                      }
                      setEditAvatarFile(null)
                      setEditAvatarPreview(null)
                    }}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    Remove new avatar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {profile.bio && (
                <p className="text-gray-700 text-sm leading-relaxed">{profile.bio}</p>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  🔗 {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          )}

          {/* Stats - Clickable */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{posts.length}</p>
              <p className="text-xs text-gray-500">Posts</p>
            </div>
            <button
              onClick={() => setShowFollowers(true)}
              className="text-center hover:opacity-80 transition-opacity"
            >
              <p className="text-lg font-bold text-gray-900">{followersCount}</p>
              <p className="text-xs text-gray-500">Followers</p>
            </button>
            <button
              onClick={() => setShowFollowing(true)}
              className="text-center hover:opacity-80 transition-opacity"
            >
              <p className="text-lg font-bold text-gray-900">{followingCount}</p>
              <p className="text-xs text-gray-500">Following</p>
            </button>
            {!isOwnProfile && iFollowThem && followsYou && (
              <div className="text-center">
                <p className="text-lg font-bold text-indigo-600">✓</p>
                <p className="text-xs text-indigo-500 font-medium">Mutual</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Followers/Following Modals */}
      {showFollowers && userId && (
        <FollowListModal userId={userId} type="followers" onClose={() => setShowFollowers(false)} />
      )}
      {showFollowing && userId && (
        <FollowListModal userId={userId} type="following" onClose={() => setShowFollowing(false)} />
      )}

      {/* User's Posts */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Posts</h2>
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No posts yet</h3>
            <p className="text-gray-500 text-sm">
              {isOwnProfile ? 'Share your first post with the community!' : 'This user hasn\'t posted anything yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
