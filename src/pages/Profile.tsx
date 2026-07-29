import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
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
  followUserWithPrivacy,
  cancelFollowRequest,
  getPendingFollowRequest,
  getPendingFollowRequestsForMe,
  updateProfile,
  uploadImage,
  blockUser,
  unblockUser,
  isBlocked,
  getProfileShareUrl,
  shareContent,
  signOutUser,
  supabase,
} from '../lib/supabaseClient'
import PostCard from '../components/PostCard'
import FollowListModal from '../components/FollowListModal'
import FollowRequests from '../components/FollowRequests'
import LoadingSpinner from '../components/LoadingSpinner'
import { escapeHTML, sanitizeURL } from '../lib/sanitize'
import type { Profile as ProfileType, Post } from '../types'

const Profile = () => {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [followsYou, setFollowsYou] = useState(false)
  const [iFollowThem, setIFollowThem] = useState(false)
  const [isRequested, setIsRequested] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [showFollowRequests, setShowFollowRequests] = useState(false)
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const [isUserBlocked, setIsUserBlocked] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts')

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false)
  const [editFullName, setEditFullName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    if (userId) {
      loadProfile()
    }
  }, [userId])

  useEffect(() => {
    if (isOwnProfile) {
      loadPendingRequestCount()
    }
  }, [isOwnProfile])

  const loadPendingRequestCount = async () => {
    try {
      const requests = await getPendingFollowRequestsForMe()
      setPendingRequestCount(requests.length)
    } catch (err) {
      console.error('Error loading pending request count:', err)
    }
  }

  const loadProfile = async () => {
    if (!userId) return
    setIsLoading(true)
    setError('')
    try {
      const [profileData, userPostsResult, followers, following, iFollowThemResult, theyFollowMeResult, pendingRequest, blocked] = await Promise.all([
        getProfile(userId),
        getUserPosts(userId),
        getFollowersCount(userId),
        getFollowingCount(userId),
        currentUser ? isFollowing(userId) : Promise.resolve(false),
        currentUser ? doesUserFollowMe(userId) : Promise.resolve(false),
        currentUser ? getPendingFollowRequest(userId) : Promise.resolve(null),
        currentUser ? isBlocked(userId) : Promise.resolve(false),
      ])

      if (!profileData) {
        setError('Profile not found')
        setIsLoading(false)
        return
      }

      setProfile(profileData)
      setPosts(userPostsResult.posts)
      setFollowersCount(followers)
      setFollowingCount(following)
      setIFollowThem(iFollowThemResult)
      setFollowsYou(theyFollowMeResult)
      setIsRequested(!!pendingRequest)
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
      } else if (isRequested) {
        await cancelFollowRequest(userId)
        setIsRequested(false)
      } else {
        const result = await followUserWithPrivacy(userId)
        if (result.type === 'requested') {
          setIsRequested(true)
        } else {
          setIFollowThem(true)
          setFollowersCount((prev) => prev + 1)
        }
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

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
    setShowOptions(false)
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    try {
      setIsChangingPassword(true)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error

      alert('Password updated successfully')
      setShowChangePassword(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Password update error:', err)
      alert('Failed to update password. Please check your current password.')
    } finally {
      setIsChangingPassword(false)
    }
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
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm p-6">
        {/* Profile Info */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {/* Avatar - Centered on mobile, left on desktop */}
          <div className="relative group shrink-0 mx-auto sm:mx-0">
            {/* Avatar Image or Initial */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
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
              <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity border-4 border-white">
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
              <label className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity border-4 border-white">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </label>
            )}
          </div>

          {/* Profile Info Container */}
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            {/* Stats - Under avatar on mobile, inline on desktop */}
            <div className="flex items-center justify-center sm:justify-start gap-6 mb-4 sm:mb-0 sm:mt-4">
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
              {isOwnProfile && (
                <button
                  onClick={() => setShowFollowRequests(true)}
                  className="text-center hover:opacity-80 transition-opacity relative"
                >
                  <p className="text-lg font-bold text-gray-900">
                    {pendingRequestCount > 0 ? pendingRequestCount : 'Requests'}
                  </p>
                  <p className="text-xs text-gray-500">Requests</p>
                  {pendingRequestCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {pendingRequestCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Name, Username, and Bio - Centered on mobile, left on desktop */}
            <div className="text-center sm:text-left mt-4 sm:mt-6">
              <div className="min-w-0">
                {isEditing && isOwnProfile ? (
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="text-xl font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 w-full max-w-sm outline-none focus:ring-2 focus:ring-indigo-500 mx-auto sm:mx-0"
                    placeholder="Your full name"
                  />
                ) : (
                  <h1 className="text-xl font-bold text-gray-900 truncate">
                    {profile.full_name || profile.username}
                  </h1>
                )}
                <p className="text-sm text-gray-500 mt-1">@{profile.username}</p>
                {profile.is_private && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 rounded-full mt-2">
                    <svg className="w-3.5 h-3.5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-indigo-700">Private account</span>
                  </div>
                )}
              </div>

              {/* Bio */}
              {profile.bio && !isEditing && (
                <div className="mt-3 space-y-2">
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{profile.bio}</p>
                </div>
              )}

              {/* Buttons - Centered on mobile, left on desktop */}
              <div className="flex gap-2 shrink-0 justify-center sm:justify-start mt-4">
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
                  <button
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
                      iFollowThem
                        ? followsYou
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : isRequested
                          ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
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
                    ) : isRequested ? (
                      'Requested'
                    ) : followsYou ? (
                      'Follow Back'
                    ) : (
                      'Follow'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Options menu for own profile - positioned at top right */}
          {isOwnProfile && (
            <div className="absolute top-6 right-6 sm:static sm:self-start">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {showOptions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                    <button
                      onClick={() => {
                        setShowOptions(false)
                        setShowChangePassword(true)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        setShowOptions(false)
                        navigate('/login')
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Add Account
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Edit Profile Form */}
        {isEditing && isOwnProfile && (
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
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-7 bg-gray-300 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-purple-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">Private account</span>
                  <span className="text-xs text-gray-500">Only followers can see your posts</span>
                </div>
              </label>
            </div>
            <div className="flex gap-2">
              {editAvatarFile && (
                <button
                  onClick={() => {
                    if (editAvatarPreview && editAvatarPreview.startsWith('blob:')) {
                      URL.revokeObjectURL(editAvatarPreview)
                    }
                    setEditAvatarFile(null)
                    setEditAvatarPreview(null)
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bio & Website (non-editing) */}
        {!isEditing && profile.bio && (
          <div className="mt-4 space-y-2">
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{profile.bio}</p>
          </div>
        )}
      </div>

      {/* Followers/Following Modals */}
      {showFollowers && userId && (
        <FollowListModal userId={userId} type="followers" onClose={() => setShowFollowers(false)} />
      )}
      {showFollowing && userId && (
        <FollowListModal userId={userId} type="following" onClose={() => setShowFollowing(false)} />
      )}
      {showFollowRequests && (
        <FollowRequests onClose={() => {
          setShowFollowRequests(false)
          loadPendingRequestCount()
        }} />
      )}

      {/* User's Posts */}
      <div className="mt-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'posts'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Posts
            </div>
          </button>
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'saved'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Saved
              </div>
            </button>
          )}
        </div>

        {/* Posts Grid */}
        {activeTab === 'posts' && (
          <>
            {posts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No posts yet</h3>
                <p className="text-gray-500 text-sm">
                  {isOwnProfile ? 'Share your first post with the community!' : 'This user hasn\'t posted anything yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className="aspect-square bg-gray-100 relative group overflow-hidden rounded-xl border-4 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
                    style={{ borderColor: 'oklch(0.49 0.24 263.97)' }}
                  >
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt={post.content || 'Post'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <p className="text-xs text-gray-600 line-clamp-3 text-center">{post.content}</p>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                      <div className="flex items-center gap-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <span className="font-semibold">{post.likes_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                        </svg>
                        <span className="font-semibold">{post.comments_count || 0}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Saved Tab */}
        {activeTab === 'saved' && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <div className="text-5xl mb-4">🔖</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Saved posts</h3>
            <p className="text-gray-500 text-sm">Posts you save will appear here</p>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
              <button
                onClick={() => setShowChangePassword(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowChangePassword(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  {isChangingPassword ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </div>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
