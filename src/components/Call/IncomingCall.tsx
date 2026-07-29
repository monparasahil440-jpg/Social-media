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
    <div className="absolute inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900/40 to-slate-900 backdrop-blur-xl">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="absolute inset-0 rounded-full border border-white/5 animate-pulse"
              style={{ animationDelay: `${i * 0.5}s`, animationDuration: '3s' }} />
          ))}
        </div>
      </div>
      
      {/* Avatar with glow effect */}
      <div className="relative mb-10 z-10">
        <div className={`w-36 h-36 rounded-full overflow-hidden border-4 transition-all duration-700 backdrop-blur-xl bg-gradient-to-br from-white/10 to-transparent shadow-2xl ${
          avatarGlow ? 'border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)] scale-105' : 'border-white/30'
        }`}>
          <Avatar src={caller?.avatar_url} name={caller?.full_name || caller?.username} size="w-36 h-36" />
        </div>
        <div className="absolute -inset-4">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30 scale-110" />
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400/50 animate-pulse scale-105" />
          <div className="absolute inset-0 rounded-full shadow-[0_0_80px_rgba(16,185,129,0.4)]" />
        </div>
      </div>
      
      {/* Caller name */}
      <h2 className="text-3xl font-bold text-white mb-3 z-10 drop-shadow-lg">{caller?.full_name || caller?.username || 'Unknown'}</h2>
      
      {/* Call type indicator */}
      <div className="flex items-center gap-2.5 text-white/70 mb-20 z-10 bg-white/10 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/20">
        {callType === 'video' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        )}
        <span className="text-base font-medium">{callType === 'video' ? 'Video Call' : 'Voice Call'}</span>
      </div>
      
      <p className="text-white/50 text-sm mb-auto z-10">Incoming call...</p>
      
      {/* Action buttons */}
      <div className="flex items-center gap-8 pb-12 z-10">
        <button onClick={onDecline} className="flex flex-col items-center gap-3 group">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center group-hover:from-red-600 group-hover:to-red-700 transition-all group-hover:scale-110 shadow-xl shadow-red-500/30">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="text-white/70 text-sm font-medium group-hover:text-white transition-colors">Decline</span>
        </button>
        <button onClick={onAccept} className="flex flex-col items-center gap-3 group">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center group-hover:from-emerald-600 group-hover:to-teal-700 transition-all group-hover:scale-110 shadow-xl shadow-emerald-500/30 animate-pulse">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <span className="text-white/70 text-sm font-medium group-hover:text-white transition-colors">Accept</span>
        </button>
      </div>
    </div>
  )
}

