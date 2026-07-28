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
    <div className="flex items-center gap-1 h-8 mt-4">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="w-1 bg-green-400 rounded-full animate-wave"
          style={{ height: `${12 + Math.random() * 24}px`, animationDelay: `${i * 0.1}s`, animationDuration: '1.2s' }} />
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
      <div className="absolute inset-0 z-[9999] flex flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-black">
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl">
              <Avatar src={otherUserProfile?.avatar_url} name={otherUserProfile?.full_name || otherUserProfile?.username} size="w-32 h-32" />
            </div>
            <div className="absolute -inset-2 rounded-full border border-green-400/20 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{otherUserProfile?.full_name || otherUserProfile?.username || 'Unknown'}</h2>
          <WaveBars />
          <p className="text-white/50 text-sm mt-4">{formatDuration(callDuration)}</p>
        </div>
        <div className="pb-12">
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
      <div className="absolute top-4 right-4 w-36 h-48 md:w-44 md:h-56 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-gray-800 z-10">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      </div>
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2">
          <p className="text-white text-sm font-medium">{formatDuration(callDuration)}</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 pb-12 pt-24 bg-gradient-to-t from-black/80 to-transparent">
        <CallControls isVideo={true} micEnabled={micEnabled} cameraEnabled={cameraEnabled} speakerEnabled={speakerEnabled}
          onToggleMic={onToggleMic} onToggleCamera={onToggleCamera} onToggleSpeaker={onToggleSpeaker}
          onSwitchCamera={onSwitchCamera} onEndCall={onEndCall} />
      </div>
    </div>
  )
}

