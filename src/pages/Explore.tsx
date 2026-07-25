import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isFollowing, doesUserFollowMe } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import UserSearch from '../components/UserSearch'
import LoadingSpinner from '../components/LoadingSpinner'
import Avatar from '../components/Avatar'
import type { Profile } from '../types'

const Explore = () => {
  const { user: currentUser } = useAuth()
  const [profiles, setProfiles] = useState<(Profile & { iFollow?: boolean; followsMe?: boolean })[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(30)

      if (error) throw error
      const profilesData = data || []

      // Load follow status for each profile
      if (currentUser) {
        const enhancedProfiles = await Promise.all(
          profilesData.map(async (profile) => {
            const [iFollow, followsMe] = await Promise.all([
              isFollowing(profile.id),
              doesUserFollowMe(profile.id),
            ])
            return { ...profile, iFollow, followsMe }
          })
        )
        setProfiles(enhancedProfiles)
      } else {
        setProfiles(profilesData)
      }
    } catch (err) {
      console.error('Error loading profiles:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
        <p className="text-gray-500 mt-1">Discover new people to follow</p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <UserSearch />
      </div>

      {/* Suggested Users */}
      {isLoading ? (
        <div className="py-12">
          <LoadingSpinner size="lg" message="Loading users..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profiles.filter(p => p.id !== currentUser?.id).map((profile) => (
            <Link
              key={profile.id}
              to={`/profile/${profile.id}`}
              className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={profile.avatar_url}
                  name={profile.full_name || profile.username}
                  size="w-12 h-12"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                    {profile.full_name || profile.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {profile.iFollow && profile.followsMe && (
                    <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      Mutual
                    </span>
                  )}
                  {profile.followsMe && !profile.iFollow && (
                    <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      Follows you
                    </span>
                  )}
                  {profile.iFollow && !profile.followsMe && (
                    <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                      Following
                    </span>
                  )}
                </div>
              </div>
              {profile.bio && (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{profile.bio}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {!isLoading && profiles.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No users found</h3>
          <p className="text-gray-500 text-sm">Check back later for new members!</p>
        </div>
      )}
    </div>
  )
}

export default Explore

