import { useEffect, useState } from 'react'
import Avatar from '../Avatar'
import type { Profile } from '../../types'

interface IncomingCallProps {
  caller: Profile | null
  callType: 'audio' | 'video'
  onAccept: () => void
  onDecline: () => void
}

export default function IncomingCall({ caller, callType, onAccept, onDecline }: IncomingCallProps) {
  const [avatarGlow, setAvatarGlow] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setAvatarGlow(g => !g), 1500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="absolute inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-gray-900/95 via-gray-800/90 to-black/95 backdrop-blur-xl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="absolute inset-0 rounded-full border border-white/5 animate-pulse"
              style={{ animationDelay: `${i * 0.5}s`, animationDuration: '3s' }} />
          ))}
        </div>
      </div>
      <div className="relative mb-8">
        <div className={`w-28 h-28 rounded-full overflow-hidden border-4 transition-all duration-700 ${
          avatarGlow ? 'border-green-400 shadow-[0_0_40px_rgba(34,197,94,0.5)] scale-105' : 'border-white/30 shadow-lg'
        }`}>
          <Avatar src={caller?.avatar_url} name={caller?.full_name || caller?.username} size="w-28 h-28" />
        </div>
        <div className="absolute -inset-4">
          <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-20 scale-110" />
          <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-pulse opacity-40 scale-105" />
          <div className="absolute inset-0 rounded-full shadow-[0_0_60px_rgba(34,197,94,0.3)]" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-1">{caller?.full_name || caller?.username || 'Unknown'}</h2>
      <div className="flex items-center gap-2 text-white/60 mb-16">
        {callType === 'video' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        )}
        <span className="text-lg">{callType === 'video' ? 'Video Call' : 'Voice Call'}</span>
      </div>
      <p className="text-white/40 text-sm mb-auto">Incoming call...</p>
      <div className="flex items-center gap-16 pb-16">
        <button onClick={onDecline} className="flex flex-col items-center gap-2 group">
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center group-hover:bg-red-600 transition-all group-hover:scale-105 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="text-white/60 text-xs font-medium">Decline</span>
        </button>
        <button onClick={onAccept} className="flex flex-col items-center gap-2 group">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center group-hover:bg-green-600 transition-all group-hover:scale-105 shadow-lg animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <span className="text-white/60 text-xs font-medium">Accept</span>
        </button>
      </div>
    </div>
  )
}

