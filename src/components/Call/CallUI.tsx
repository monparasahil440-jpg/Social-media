import { useCall } from '../../contexts/CallProvider'
import IncomingCall from './IncomingCall'
import OutgoingCall from './OutgoingCall'
import ActiveCall from './ActiveCall'
import CallSummary from './CallSummary'
import RatingDialog from './RatingDialog'

export default function CallUI() {
  const {
    callState, startCall, answerCall, rejectCall, endCall, dismissSummary,
    toggleMic, toggleCamera, toggleSpeaker, switchCamera,
    openRating, closeRating, showRating, submitRating,
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
          conversationId={summaryData.conversationId}
          otherUserId={summaryData.otherUserId}
          onDone={dismissSummary}
          onMessage={(conversationId, otherUserId) => {
            dismissSummary()
            // Navigate to chat with this conversation
            window.location.hash = `/chat/${conversationId}`
          }}
          onCallAgain={(conversationId, otherUserId, otherUserProfile, callType) => {
            dismissSummary()
            if (conversationId && otherUserId && otherUserProfile) {
              startCall(conversationId, otherUserId, otherUserProfile, callType)
            }
          }}
        />
        {showRating && (
          <RatingDialog
            onSubmit={async (rating, feedback) => {
              await submitRating(rating, feedback)
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

