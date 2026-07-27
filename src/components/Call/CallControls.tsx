interface CallControlsProps {
  isVideo: boolean
  micEnabled: boolean
  cameraEnabled: boolean
  speakerEnabled: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onToggleSpeaker: () => void
  onSwitchCamera: () => void
  onEndCall: () => void
}

const CallControls = ({
  isVideo,
  micEnabled,
  cameraEnabled,
  speakerEnabled,
  onToggleMic,
  onToggleCamera,
  onToggleSpeaker,
  onSwitchCamera,
  onEndCall,
}: CallControlsProps) => {
  return (
    <div className="flex items-center justify-center gap-4">
{/* Toggle Mic */}
      <button
        onClick={onToggleMic}
        className={`p-4 rounded-full transition-all relative ${
          micEnabled
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-red-500 text-white hover:bg-red-600'
        }`}
        title={micEnabled ? 'Mute' : 'Unmute'}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {micEnabled ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          ) : (
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" strokeWidth={2} />
            </>
          )}
        </svg>
      </button>

      {/* Toggle Speaker */}
      <button
        onClick={onToggleSpeaker}
        className={`p-4 rounded-full transition-all ${
          speakerEnabled
            ? 'bg-indigo-500 text-white hover:bg-indigo-600'
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
        title={speakerEnabled ? 'Speaker On' : 'Speaker Off'}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {speakerEnabled ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          )}
        </svg>
      </button>

      {/* Toggle Camera (only in video call) */}
      {isVideo && (
        <button
          onClick={onToggleCamera}
          className={`p-4 rounded-full transition-all ${
            cameraEnabled
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
          title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {cameraEnabled ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            )}
          </svg>
        </button>
      )}

      {/* Switch Camera (only in video call) */}
      {isVideo && cameraEnabled && (
        <button
          onClick={onSwitchCamera}
          className="p-4 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
          title="Switch camera"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}

      {/* End Call */}
      <button
        onClick={onEndCall}
        className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg"
        title="End call"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.28 3H5z" />
        </svg>
      </button>
    </div>
  )
}

export default CallControls

