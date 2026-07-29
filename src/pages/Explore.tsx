import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { searchProfiles, isFollowing, doesUserFollowMe } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import LoadingSpinner from '../components/LoadingSpinner'
import Avatar from '../components/Avatar'
import type { Profile } from '../types'

const Explore = () => {
  const { user: currentUser } = useAuth()
  const [query, setQuery] = useState('')
  const [profiles, setProfiles] = useState<(Profile & { iFollow?: boolean; followsMe?: boolean })[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setProfiles([])
      setIsLoading(false)
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const data = await searchProfiles(query.trim())
        
        // Load follow status for each profile
        if (currentUser) {
          const enhancedProfiles = await Promise.all(
            data.map(async (profile) => {
              const [iFollow, followsMe] = await Promise.all([
                isFollowing(profile.id),
                doesUserFollowMe(profile.id),
              ])
              return { ...profile, iFollow, followsMe }
            })
          )
          setProfiles(enhancedProfiles)
        } else {
          setProfiles(data)
        }
      } catch (err) {
        console.error('Search error:', err)
        setProfiles([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, currentUser])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
        <p className="text-gray-500 mt-1">Search for people to connect with</p>
      </div>

      {/* Search Input */}
      <div className="mb-8 relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by name or username..."
          className="w-full pl-12 pr-4 py-3 bg-gray-100 border-0 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Empty State */}
      {query.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Search for users</h3>
          <p className="text-gray-500 text-sm">Enter a name or username to find people</p>
        </div>
      )}

      {/* Search Results */}
      {query.length >= 2 && (
        <>
          {isLoading ? (
            <div className="py-12">
              <LoadingSpinner size="lg" message="Searching..." />
            </div>
          ) : profiles.length > 0 ? (
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
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">�</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No users found</h3>
              <p className="text-gray-500 text-sm">Try a different search term</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Explore

