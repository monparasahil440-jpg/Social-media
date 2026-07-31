import { useState, useEffect } from 'react'
import { getActiveStories } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../Avatar'
import CreateStoryModal from './CreateStoryModal'
import StoryViewerModal from './StoryViewerModal'
import type { UserStoriesGroup, Story } from '../../types'

const StoriesBar = () => {
  const { user, profile } = useAuth()
  const [groups, setGroups] = useState<UserStoriesGroup[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewingGroupIndex, setViewingGroupIndex] = useState<number | null>(null)

  const loadStories = async () => {
    try {
      setLoading(true)
      const data = await getActiveStories()
      setGroups(data)
    } catch (err) {
      console.error('Error loading stories:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStories()
  }, [])

  const myGroupIndex = groups.findIndex((g) => g.user_id === user?.id)
  const myGroup = myGroupIndex >= 0 ? groups[myGroupIndex] : null

  const handleMyStoryClick = () => {
    if (myGroup && myGroup.stories.length > 0) {
      setViewingGroupIndex(myGroupIndex)
    } else {
      setShowCreateModal(true)
    }
  }

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-card p-3 sm:p-4 mb-6">
      <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 px-1 select-none">
        {/* "Your Story" circle */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="relative group cursor-pointer" onClick={handleMyStoryClick}>
            <div
              className={`w-[60px] h-[60px] p-[2px] rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${
                myGroup && myGroup.stories.length > 0
                  ? 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500'
                  : 'border-2 border-dashed border-slate-300'
              }`}
            >
              <div className="w-full h-full rounded-full p-[1.5px] bg-white flex items-center justify-center overflow-hidden">
                <Avatar
                  src={profile?.avatar_url}
                  name={profile?.full_name || profile?.username || user?.email}
                  size="w-full h-full"
                />
              </div>
            </div>

            {/* Plus Icon Badge */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowCreateModal(true)
              }}
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md border-2 border-white hover:scale-110 active:scale-95 transition-all"
              title="Add story"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <span className="text-[11px] font-bold text-slate-700 font-heading truncate max-w-[64px]">
            Your Story
          </span>
        </div>

        {/* Separator Divider */}
        {groups.filter((g) => g.user_id !== user?.id).length > 0 && (
          <div className="w-px h-10 bg-slate-200 shrink-0 mx-0.5" />
        )}

        {/* Other Users' Stories */}
        {loading ? (
          <div className="flex gap-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-[60px] h-[60px] bg-slate-200 rounded-full" />
                <div className="w-12 h-2.5 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          groups
            .filter((g) => g.user_id !== user?.id)
            .map((group) => {
              const globalIndex = groups.findIndex((g) => g.user_id === group.user_id)
              const prof = group.profile || group.stories[0]?.profiles

              return (
                <div
                  key={group.user_id}
                  onClick={() => setViewingGroupIndex(globalIndex)}
                  className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
                >
                  <div
                    className={`w-[60px] h-[60px] p-[2.5px] rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${
                      group.hasUnviewed
                        ? 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-pulse'
                        : 'border-2 border-slate-300'
                    }`}
                  >
                    <div className="w-full h-full rounded-full p-[1.5px] bg-white flex items-center justify-center overflow-hidden">
                      <Avatar
                        src={prof?.avatar_url}
                        name={prof?.full_name || prof?.username}
                        size="w-full h-full"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 font-heading truncate max-w-[64px]">
                    {prof?.username || prof?.full_name?.split(' ')[0] || 'User'}
                  </span>
                </div>
              )
            })
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateStoryModal
          onClose={() => setShowCreateModal(false)}
          onStoryCreated={() => {
            loadStories()
          }}
        />
      )}

      {viewingGroupIndex !== null && (
        <StoryViewerModal
          groups={groups}
          initialGroupIndex={viewingGroupIndex}
          onClose={() => setViewingGroupIndex(null)}
          onStoryDeleted={() => {
            loadStories()
          }}
        />
      )}
    </div>
  )
}

export default StoriesBar
