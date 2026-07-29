import { useEffect, useState } from 'react'
import Avatar from '../Avatar'
import type { Profile } from '../../types'

interface OutgoingCallProps {
  callee: Profile | null
  callType: 'audio' | 'video'
  onCancel: () => void
}

export default function OutgoingCall({ callee, callType, onCancel }: OutgoingCallProps) {
  const [dots, setDots] = useState('')
  const [showConnecting, setShowConnecting] = useState(false)

  useEffect(() => {
    const dotsInterval = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600)
    const connectingTimeout = setTimeout(() => setShowConnecting(true), 8000)
    return () => { clearInterval(dotsInterval); clearTimeout(connectingTimeout) }
  }, [])

  return (
    <div className="absolute inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900/30 to-slate-900 backdrop-blur-xl">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Avatar with pulse effect */}
      <div className="relative mb-10 z-10">
        <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 to-transparent animate-pulse">
          <Avatar src={callee?.avatar_url} name={callee?.full_name || callee?.username} size="w-36 h-36" />
        </div>
        <div className="absolute -inset-4">
          <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping opacity-40 scale-110" />
          <div className="absolute inset-0 rounded-full border-2 border-blue-400/50 animate-pulse scale-105" />
          <div className="absolute inset-0 rounded-full shadow-[0_0_60px_rgba(59,130,246,0.3)]" />
        </div>
      </div>
      
      {/* Callee name */}
      <h2 className="text-3xl font-bold text-white mb-3 z-10 drop-shadow-lg">{callee?.full_name || callee?.username || 'Unknown'}</h2>
      
      {/* Call type indicator */}
      <div className="flex items-center gap-2.5 text-white/70 mb-6 z-10 bg-white/10 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/20">
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
      
      {/* Status text */}
      <p className="text-white/50 text-lg mb-20 z-10">{showConnecting ? 'Connecting' : 'Calling'}{dots}</p>
      
      {showConnecting && (
        <div className="flex items-center gap-2 mb-20 z-10">
          {[1,2,3].map(i => (
            <div key={i} className="w-3 h-3 rounded-full bg-gradient-to-t from-blue-400 to-cyan-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      )}
      
      {/* Cancel button */}
      <button onClick={onCancel} className="z-10 flex flex-col items-center gap-3 group">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center group-hover:from-red-600 group-hover:to-red-700 transition-all group-hover:scale-110 shadow-xl shadow-red-500/30">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <span className="text-white/70 text-sm font-medium group-hover:text-white transition-colors">Cancel</span>
      </button>
    </div>
  )
}

