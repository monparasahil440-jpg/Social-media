import { useState, useEffect } from 'react'
import { searchProfiles } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../Avatar'
import type { Profile } from '../../types'

interface NewChatModalProps {
  onSelect: (userId: string) => void
  onClose: () => void
}

const NewChatModal = ({ onSelect, onClose }: NewChatModalProps) => {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchProfiles(query.trim())
        // Filter out current user
        setResults(data.filter(p => p.id !== user?.id))
      } catch (err) {
        console.error('Error searching profiles:', err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, user?.id])

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 font-heading">New Message</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-5 py-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-body"
                autoFocus
              />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {searching ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : results.length === 0 && query.trim() ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-sm text-gray-500 font-body">No users found</p>
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {results.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => onSelect(profile.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                  >
                    <Avatar
                      src={profile.avatar_url}
                      name={profile.full_name || profile.username}
                      size="w-11 h-11"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate font-heading">
                        {profile.full_name || profile.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate font-body">@{profile.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-sm text-gray-500">Search for someone to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default NewChatModal

