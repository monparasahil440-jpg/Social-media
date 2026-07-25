import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { searchProfiles } from '../lib/supabaseClient'
import Avatar from './Avatar'
import type { Profile } from '../types'

const UserSearch = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const data = await searchProfiles(query.trim())
        setResults(data)
        setIsOpen(data.length > 0)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
          <div className="py-2">
            {results.map((profile) => (
              <Link
                key={profile.id}
                to={`/profile/${profile.id}`}
                onClick={() => {
                  setIsOpen(false)
                  setQuery('')
                }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <Avatar
                  src={profile.avatar_url}
                  name={profile.full_name || profile.username}
                  size="w-10 h-10"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {profile.full_name || profile.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
                </div>
                {profile.bio && (
                  <p className="text-xs text-gray-400 truncate max-w-[150px] hidden sm:block">
                    {profile.bio}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserSearch

