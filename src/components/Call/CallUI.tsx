import { useRef, useEffect } from 'react'
import Avatar from '../Avatar'
import CallControls from './CallControls'
import type { CallStatus, CallType } from '../../hooks/useCall'
import type { Profile } from '../../types'

interface CallState {
  status: CallStatus
  type: CallType
  conversationId: string | null
  otherUserId: string | null
  otherUserProfile: Profile | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  callDuration: number
  incoming: boolean
}

interface CallUIProps {
  callState: CallState
  onEndCall: () => void
  onToggleMic: () => void
  onToggleCamera: () => void
  onSwitchCamera: () => void
  onAnswerCall?: () => void
  onRejectCall?: () => void
}

const CallUI = ({
  callState,
  onEndCall,
  onToggleMic,
  onToggleCamera,
  onSwitchCamera,
  onAnswerCall,
  onRejectCall,
}: CallUIProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const micEnabledRef = useRef(true)
  const cameraEnabledRef = useRef(true)

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      localVideoRef.current.srcObject = callState.localStream
    }
  }, [callState.localStream])

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && callState.remoteStream) {
      remoteVideoRef.current.srcObject = callState.remoteStream
    }
  }, [callState.remoteStream])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatCallStatus = () => {
    switch (callState.status) {
      case 'calling':
        return 'Calling...'
      case 'ringing':
        return 'Incoming Call...'
      case 'connected':
        return formatDuration(callState.callDuration)
      case 'ended':
        return 'Call ended'
      default:
        return ''
    }
  }

  // For audio calls, show profile UI overlay instead of video
  const isAudioOnly = callState.type === 'audio' || callState.status === 'ringing' || callState.status === 'calling'

  return (
    <div className="absolute inset-0 z-30 bg-gray-900 flex flex-col">
      {/* Video Streams */}
      {callState.type === 'video' && callState.status === 'connected' && (
        <>
          {/* Remote video (full screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Local video (picture-in-picture) */}
          <div className="absolute top-4 right-4 w-32 h-48 rounded-2xl overflow-hidden shadow-lg border-2 border-white/30 bg-gray-800 z-10">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        </>
      )}

      {/* Audio call / ringing / calling UI */}
      {isAudioOnly && (
        <div className="flex-1 flex flex-col items-center justify-center text-white">
          <div className="mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-xl">
              <Avatar
                src={callState.otherUserProfile?.avatar_url}
                name={callState.otherUserProfile?.full_name || callState.otherUserProfile?.username}
                size="w-24 h-24"
              />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-1">
            {callState.otherUserProfile?.full_name || callState.otherUserProfile?.username || 'User'}
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            {callState.type === 'video' ? 'Video call' : 'Audio call'}
          </p>

          {/* Status */}
          <p className="text-gray-300 text-lg font-medium mb-12">
            {formatCallStatus()}
          </p>

          {/* Local video preview for video calls while ringing */}
          {callState.type === 'video' && callState.localStream && (
            <div className="w-24 h-36 rounded-xl overflow-hidden mb-6 border border-white/20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      )}

      {/* Connected video call overlay */}
      {callState.type === 'video' && callState.status === 'connected' && (
        <div className="absolute top-4 left-4 z-10">
          <p className="text-white text-sm font-medium bg-black/40 px-3 py-1.5 rounded-full">
            {formatCallStatus()}
          </p>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="pb-8 pt-4 px-4 bg-gradient-to-t from-black/60 to-transparent">
        {/* Incoming call controls */}
        {callState.status === 'ringing' && callState.incoming && (
          <div className="flex items-center justify-center gap-8 mb-6">
            <button
              onClick={onRejectCall}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg"
              title="Decline"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={onAnswerCall}
              className="p-4 rounded-full bg-green-500 text-white hover:bg-green-600 transition-all shadow-lg"
              title="Answer"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        )}

        {/* Active call controls */}
        {(callState.status === 'calling' || callState.status === 'connected') && (
          <CallControls
            isVideo={callState.type === 'video'}
            micEnabled={true}
            cameraEnabled={true}
            onToggleMic={onToggleMic}
            onToggleCamera={onToggleCamera}
            onSwitchCamera={onSwitchCamera}
            onEndCall={onEndCall}
          />
        )}
      </div>
    </div>
  )
}

export default CallUI

