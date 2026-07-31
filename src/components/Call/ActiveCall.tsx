import { useCallback } from 'react'
import { webRTCManager } from '../../services/WebRTCManager'
import Avatar from '../Avatar'
import CallControls from './CallControls'
import type { Profile } from '../../types'

interface ActiveCallProps {
  callType: 'audio' | 'video'
  callDuration: number
  otherUserProfile: Profile | null
  micEnabled: boolean
  cameraEnabled: boolean
  speakerEnabled: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onToggleSpeaker: () => void
  onSwitchCamera: () => void
  onEndCall: () => void
}

function WaveBars() {
  return (
    <div className="flex items-center gap-1.5 h-10 mt-6">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="w-1.5 bg-gradient-to-t from-emerald-400 to-teal-300 rounded-full animate-wave"
          style={{ height: `${16 + Math.random() * 28}px`, animationDelay: `${i * 0.15}s`, animationDuration: '1s' }} />
      ))}
    </div>
  )
}

export default function ActiveCall({
  callType, callDuration, otherUserProfile, micEnabled, cameraEnabled, speakerEnabled,
  onToggleMic, onToggleCamera, onToggleSpeaker, onSwitchCamera, onEndCall,
}: ActiveCallProps) {
  const localVideoRef = useCallback((el: HTMLVideoElement | null) => {
    const stream = webRTCManager.getLocalStream()
    if (el && stream) el.srcObject = stream
  }, [])

  const remoteVideoRef = useCallback((el: HTMLVideoElement | null) => {
    const stream = webRTCManager.getRemoteStream()
    if (el && stream) el.srcObject = stream
  }, [])

  const remoteAudioRef = useCallback((el: HTMLAudioElement | null) => {
    const stream = webRTCManager.getRemoteStream()
    if (el && stream) el.srcObject = stream
  }, [])

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (callType === 'audio') {
    return (
      <div className="absolute inset-0 z-[9999] flex flex-col bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          
          <div className="relative mb-8 z-10">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 to-transparent">
              <Avatar src={otherUserProfile?.avatar_url} name={otherUserProfile?.full_name || otherUserProfile?.username} size="w-40 h-40" />
            </div>
            <div className="absolute -inset-3 rounded-full border-2 border-emerald-400/30 animate-pulse" />
            <div className="absolute -inset-4 rounded-full border border-emerald-400/20 animate-ping opacity-20" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2 z-10 drop-shadow-lg">{otherUserProfile?.full_name || otherUserProfile?.username || 'Unknown'}</h2>
          <WaveBars />
          <div className="mt-6 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 z-10">
            <p className="text-white/90 text-lg font-medium tracking-wide">{formatDuration(callDuration)}</p>
          </div>
        </div>
        <div className="relative z-[999] pb-8 pt-8 bg-gradient-to-t from-black/50 to-transparent">
          <CallControls isVideo={false} micEnabled={micEnabled} cameraEnabled={cameraEnabled} speakerEnabled={speakerEnabled}
            onToggleMic={onToggleMic} onToggleCamera={onToggleCamera} onToggleSpeaker={onToggleSpeaker}
            onSwitchCamera={onSwitchCamera} onEndCall={onEndCall} />
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-[9999] flex flex-col bg-black">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      
      {/* Local video - Picture in Picture */}
      <div className="absolute top-4 right-4 w-40 h-56 md:w-48 md:h-64 rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-gray-900/80 backdrop-blur-xl z-20 transition-all hover:scale-105">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute bottom-2 left-2 right-2">
          <div className="bg-black/50 backdrop-blur-md rounded-full px-3 py-1">
            <p className="text-white/80 text-xs font-medium">You</p>
          </div>
        </div>
      </div>
      
      {/* Duration badge */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl px-5 py-2.5 border border-white/20 shadow-lg">
          <p className="text-white text-sm font-semibold tracking-wide">{formatDuration(callDuration)}</p>
        </div>
      </div>
      
      {/* Other user name */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl px-5 py-2.5 border border-white/20 shadow-lg">
          <p className="text-white text-sm font-semibold">{otherUserProfile?.full_name || otherUserProfile?.username || 'Unknown'}</p>
        </div>
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-[999] pb-8 pt-32 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <CallControls isVideo={true} micEnabled={micEnabled} cameraEnabled={cameraEnabled} speakerEnabled={speakerEnabled}
          onToggleMic={onToggleMic} onToggleCamera={onToggleCamera} onToggleSpeaker={onToggleSpeaker}
          onSwitchCamera={onSwitchCamera} onEndCall={onEndCall} />
      </div>
    </div>
  )
}

