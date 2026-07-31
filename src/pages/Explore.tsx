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
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 font-heading">
          <span>🔍</span> Explore People
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Discover friends, creators, and new accounts to follow</p>
      </div>

      {/* Search Input Container */}
      <div className="mb-8 relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, username (@handle)..."
          className="w-full pl-12 pr-10 py-3.5 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all"
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Empty State */}
      {query.length === 0 && (
        <div className="text-center py-16 bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 p-8 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
            🔎
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Search SocialMedia</h3>
          <p className="text-slate-500 text-xs sm:text-sm">Type at least 2 characters to discover users and profiles</p>
        </div>
      )}

      {/* Search Results */}
      {query.length >= 2 && (
        <>
          {isLoading ? (
            <div className="py-16">
              <LoadingSpinner size="lg" message="Searching profiles..." />
            </div>
          ) : profiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profiles.filter(p => p.id !== currentUser?.id).map((profile) => (
                <Link
                  key={profile.id}
                  to={`/profile/${profile.id}`}
                  className="bg-white/85 backdrop-blur-xl rounded-3xl border border-slate-200/80 p-4 hover:shadow-xl hover:shadow-indigo-500/10 hover:scale-[1.02] transition-all duration-200 group flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-0.5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 group-hover:scale-105 transition-transform duration-200">
                      <Avatar
                        src={profile.avatar_url}
                        name={profile.full_name || profile.username}
                        size="w-12 h-12"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm truncate">
                        {profile.full_name || profile.username}
                      </p>
                      <p className="text-xs font-medium text-slate-400 truncate">@{profile.username}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {profile.iFollow && profile.followsMe && (
                        <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                          Mutual
                        </span>
                      )}
                      {profile.followsMe && !profile.iFollow && (
                        <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                          Follows you
                        </span>
                      )}
                      {profile.iFollow && !profile.followsMe && (
                        <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                          Following
                        </span>
                      )}
                    </div>
                  </div>
                  {profile.bio && (
                    <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-2xl">{profile.bio}</p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 p-8 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-3xl mx-auto mb-4">
                🙁
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No users found</h3>
              <p className="text-slate-500 text-xs sm:text-sm">No profiles matched "{query}". Try checking the spelling or search another handle.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Explore

