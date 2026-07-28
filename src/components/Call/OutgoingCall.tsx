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
    <div className="absolute inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-black">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="relative mb-8 z-10">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl animate-pulse">
          <Avatar src={callee?.avatar_url} name={callee?.full_name || callee?.username} size="w-24 h-24" />
        </div>
        <div className="absolute -inset-3 rounded-full border-2 border-white/10 animate-ping opacity-30" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2 z-10">{callee?.full_name || callee?.username || 'Unknown'}</h2>
      <p className="text-white/50 text-sm mb-2 z-10">{callType === 'video' ? 'Video Call' : 'Voice Call'}</p>
      <p className="text-white/40 text-base mb-16 z-10">{showConnecting ? 'Connecting' : 'Calling'}{dots}</p>
      {showConnecting && (
        <div className="flex items-center gap-1 mb-16">
          {[1,2,3].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      )}
      <button onClick={onCancel} className="z-10 flex flex-col items-center gap-2 group">
        <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center group-hover:bg-red-600 transition-all group-hover:scale-105 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <span className="text-red-400 text-xs font-medium">Cancel</span>
      </button>
    </div>
  )
}

