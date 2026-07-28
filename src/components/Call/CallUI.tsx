import { useCall } from '../../contexts/CallProvider'
import IncomingCall from './IncomingCall'
import OutgoingCall from './OutgoingCall'
import ActiveCall from './ActiveCall'
import CallSummary from './CallSummary'
import RatingDialog from './RatingDialog'

export default function CallUI() {
  const {
    callState, answerCall, rejectCall, endCall, dismissSummary,
    toggleMic, toggleCamera, toggleSpeaker, switchCamera,
    openRating, closeRating, showRating,
  } = useCall()

  const { status, type, otherUserProfile, callDuration, micEnabled, cameraEnabled, speakerEnabled, summaryData } = callState

  if (status === 'idle' || status === 'ended') return null

  if (status === 'ringing') {
    return (
      <IncomingCall
        caller={otherUserProfile}
        callType={type}
        onAccept={answerCall}
        onDecline={rejectCall}
      />
    )
  }

  if (status === 'calling' || status === 'connecting') {
    return (
      <OutgoingCall
        callee={otherUserProfile}
        callType={type}
        onCancel={rejectCall}
      />
    )
  }

  if (status === 'connected') {
    return (
      <ActiveCall
        callType={type}
        callDuration={callDuration}
        otherUserProfile={otherUserProfile}
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        speakerEnabled={speakerEnabled}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onToggleSpeaker={toggleSpeaker}
        onSwitchCamera={switchCamera}
        onEndCall={endCall}
      />
    )
  }

  if (status === 'summary' && summaryData) {
    return (
      <>
        <CallSummary
          duration={summaryData.duration}
          endedAt={summaryData.endedAt}
          callType={summaryData.callType}
          otherUserProfile={summaryData.otherUserProfile}
          currentUserProfile={summaryData.currentUserProfile}
          onDone={dismissSummary}
          onMessage={dismissSummary}
          onCallAgain={() => {
            dismissSummary()
            // startCall can be called from elsewhere
          }}
        />
        {showRating && (
          <RatingDialog
            onSubmit={(rating, feedback) => {
              console.log('Rating submitted:', rating, feedback)
              closeRating()
            }}
            onSkip={closeRating}
            onClose={closeRating}
          />
        )}
      </>
    )
  }

  return null
}

