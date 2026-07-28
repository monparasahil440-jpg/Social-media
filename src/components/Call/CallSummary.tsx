import { useEffect, useState } from 'react'
import Avatar from '../Avatar'
import type { Profile } from '../../types'

interface CallSummaryProps {
  duration: number
  endedAt: string
  callType: 'audio' | 'video'
  otherUserProfile: Profile | null
  currentUserProfile: Profile | undefined
  onDone: () => void
  onMessage: () => void
  onCallAgain: () => void
}

export default function CallSummary({
  duration, endedAt, callType, otherUserProfile, currentUserProfile,
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
    <div className={`absolute inset-0 z-[9999] flex flex-col bg-gray-50 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className={`mb-6 transition-all duration-500 delay-200 ${visible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className={`flex items-center gap-4 mb-6 transition-all duration-500 delay-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md">
            <Avatar src={currentUserProfile?.avatar_url} name={currentUserProfile?.full_name || currentUserProfile?.username} size="w-16 h-16" />
          </div>
          <div className="text-gray-400 text-2xl">&</div>
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md">
            <Avatar src={otherUserProfile?.avatar_url} name={otherUserProfile?.full_name || otherUserProfile?.username} size="w-16 h-16" />
          </div>
        </div>
        <p className={`text-3xl font-bold text-gray-900 mb-2 transition-all duration-500 delay-400 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {formatDuration(duration)}
        </p>
        <div className={`flex items-center gap-2 text-gray-500 mb-1 transition-all duration-500 delay-500 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {callType === 'video' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          )}
          <span className="text-sm">{callType === 'video' ? 'Video Call' : 'Voice Call'}</span>
        </div>
        <p className="text-gray-400 text-xs">Ended</p>
        <p className={`text-gray-400 text-xs mt-1 transition-all duration-500 delay-600 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {dateStr} · {endedAt}
        </p>
      </div>
      <div className={`px-6 pb-12 space-y-3 transition-all duration-500 delay-700 ${buttonsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <button onClick={onDone} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98]">Done</button>
        <div className="flex gap-3">
          <button onClick={onMessage} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98]">Message User</button>
          <button onClick={onCallAgain} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98]">Call Again</button>
        </div>
      </div>
    </div>
  )
}

