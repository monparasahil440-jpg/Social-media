import { useEffect, useState } from 'react'
import Avatar from '../Avatar'
import type { Profile } from '../../types'

interface CallSummaryProps {
  duration: number
  endedAt: string
  callType: 'audio' | 'video'
  otherUserProfile: Profile | null
  currentUserProfile: Profile | undefined
  conversationId: string | null
  otherUserId: string | null
  onDone: () => void
  onMessage: (conversationId: string, otherUserId: string) => void
  onCallAgain: (conversationId: string, otherUserId: string, otherUserProfile: Profile, callType: 'audio' | 'video') => void
}

export default function CallSummary({
  duration, endedAt, callType, otherUserProfile, currentUserProfile, conversationId, otherUserId,
  onDone, onMessage, onCallAgain,
}: CallSummaryProps) {
  const [visible, setVisible] = useState(false)
  const [buttonsVisible, setButtonsVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    setTimeout(() => setButtonsVisible(true), 600)
  }, [])

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className={`absolute inset-0 z-[9999] flex flex-col bg-white transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <div className="pt-12 px-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Call Ended</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Success Icon */}
        <div className={`mb-8 transition-all duration-500 delay-200 ${visible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Avatars */}
        <div className={`flex items-center gap-6 mb-8 transition-all duration-500 delay-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <Avatar src={currentUserProfile?.avatar_url} name={currentUserProfile?.full_name || currentUserProfile?.username} size="w-20 h-20" />
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">You</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <Avatar src={otherUserProfile?.avatar_url} name={otherUserProfile?.full_name || otherUserProfile?.username} size="w-20 h-20" />
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium max-w-[80px] truncate">{otherUserProfile?.full_name || otherUserProfile?.username || 'Unknown'}</p>
          </div>
        </div>

        {/* Duration */}
        <p className={`text-5xl font-bold text-gray-900 mb-3 transition-all duration-500 delay-400 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {formatDuration(duration)}
        </p>

        {/* Call Type */}
        <div className={`flex items-center gap-2 text-gray-500 mb-2 transition-all duration-500 delay-500 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {callType === 'video' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.517l2.257-1.128a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          )}
          <span className="text-sm font-medium">{callType === 'video' ? 'Video Call' : 'Voice Call'}</span>
        </div>

        {/* Date/Time */}
        <p className={`text-gray-400 text-sm transition-all duration-500 delay-600 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {dateStr} at {endedAt}
        </p>
      </div>

      {/* Action Buttons */}
      <div className={`px-6 pb-8 space-y-3 transition-all duration-500 delay-700 ${buttonsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <button
          onClick={() => conversationId && otherUserId && otherUserProfile && onCallAgain(conversationId, otherUserId, otherUserProfile, callType)}
          disabled={!conversationId || !otherUserId || !otherUserProfile}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-green-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.517l2.257-1.128a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Call Again
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => conversationId && otherUserId && onMessage(conversationId, otherUserId)}
            disabled={!conversationId || !otherUserId}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message
          </button>
          <button
            onClick={onDone}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

