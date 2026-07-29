/**
 * CallProvider - Global call state context.
 * Provides call state across all routes and pages.
 * Handles incoming call detection, outgoing calls, active call management,
 * call summary state, and rating dialog state.
 */
import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { sendCallSignal, subscribeToCallSignals, sendCallEndSignal, getProfile, createCallMessage } from '../lib/supabaseClient'
import { webRTCManager } from '../services/WebRTCManager'
import { audioService } from '../services/AudioService'
import { createCallSession, updateCallSession, submitCallRating } from '../services/CallService'
import { useToast } from './ToastProvider'
import { showNotification } from '../utils/notification'
import type { Profile, CallSignal } from '../types'

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'summary' | 'rating'
export type CallType = 'audio' | 'video'

export interface CallState {
  status: CallStatus
  type: CallType
  conversationId: string | null
  otherUserId: string | null
  otherUserProfile: Profile | null
  callDuration: number
  incoming: boolean
  micEnabled: boolean
  cameraEnabled: boolean
  speakerEnabled: boolean
  sessionId: string | null
  // Summary screen
    summaryData: {
      duration: number
      endedAt: string
      callType: CallType
      otherUserProfile: Profile | null
      currentUserProfile: Profile | undefined
      conversationId: string | null
      otherUserId: string | null
    } | null
}

interface CallContextType {
  callState: CallState
  startCall: (conversationId: string, otherUserId: string, otherUserProfile: Profile, type: CallType) => Promise<void>
  answerCall: () => Promise<void>
  rejectCall: () => Promise<void>
  endCall: () => Promise<void>
  dismissSummary: () => void
  toggleMic: () => void
  toggleCamera: () => void
  toggleSpeaker: () => void
  switchCamera: () => Promise<void>
  openRating: () => void
  closeRating: () => void
  showRating: boolean
  submitRating: (rating: number, feedback?: string) => Promise<void>
}

const defaultCallState: CallState = {
  status: 'idle',
  type: 'audio',
  conversationId: null,
  otherUserId: null,
  otherUserProfile: null,
  callDuration: 0,
  incoming: false,
  micEnabled: true,
  cameraEnabled: true,
  speakerEnabled: false,
  sessionId: null,
  summaryData: null,
}

const CallContext = createContext<CallContextType | undefined>(undefined)

export function CallProvider({ children }: { children: ReactNode }) {
  const { user, profile: currentUserProfile } = useAuth()
  const { showToast } = useToast()
  const [callState, setCallState] = useState<CallState>(defaultCallState)
  const [showRating, setShowRating] = useState(false)

  // Refs to avoid stale closures
  const callStateRef = useRef(callState)
  const durationIntervalRef = useRef<number | null>(null)
  const isEndingRef = useRef(false)
  const startTimeRef = useRef<number | null>(null)
  // Store the incoming offer SDP so it survives WebRTCManager.initialize() cleanup cycle
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null)

  callStateRef.current = callState

  // Update supabaseClient's sendCallSignal to include our new signal types
  // We use the existing sendCallSignal from supabaseClient which accepts 'offer' | 'answer' | 'ice-candidate'
  // For 'call-end' and 'reject', we use 'offer' type with data.type flag

  const cleanupCall = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    webRTCManager.cleanup()
    audioService.stopAll()
    startTimeRef.current = null
  }, [])

const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) return

    startTimeRef.current = Date.now()

    durationIntervalRef.current = window.setInterval(() => {
        const elapsed =
            startTimeRef.current
                ? Math.floor((Date.now() - startTimeRef.current) / 1000)
                : 0

        setCallState(prev => ({
            ...prev,
            callDuration: elapsed,
        }))
    }, 1000)
}, [])

  const setNavbarVisibility = (visible: boolean) => {
    const nav = document.querySelector('nav')
    if (nav) nav.style.display = visible ? '' : 'none'
  }

  // Start an outgoing call
  const startCall = useCallback(async (
    conversationId: string,
    otherUserId: string,
    otherUserProfile: Profile,
    type: CallType
  ) => {
    try {
      setNavbarVisibility(false)
      setShowRating(false)

      const mediaConstraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video',
      }
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)

      setCallState(prev => ({
        ...prev,
        status: 'calling',
        type,
        conversationId,
        otherUserId,
        otherUserProfile,
        callDuration: 0,
        incoming: false,
        micEnabled: true,
        cameraEnabled: true,
        speakerEnabled: false,
        sessionId: null,
        summaryData: null,
      }))

      // Play outgoing ringtone
      audioService.playOutgoingRingtone()

      // Create call session
      if (user) {
        try {
          const session = await createCallSession(conversationId, user.id, otherUserId, type)
          setCallState(prev => ({ ...prev, sessionId: session.id }))
        } catch (err) {
          console.error('Failed to create call session:', err)
        }
      }

      // Initialize WebRTC
      await webRTCManager.initialize(
        stream,
        conversationId,
        otherUserId,
              () => {
          setCallState(prev => ({
            ...prev,
            status: 'connected',
          }))

          audioService.stopAll()
          startDurationTimer()
        },
        (state) => {
          if (!isEndingRef.current && (state === 'disconnected' || state === 'failed')) {
            endCall()
          }
        }
      )

      // Create and send offer
      await webRTCManager.createOffer()
    } catch (err) {
      console.error('Error starting call:', err)
      cleanupCall()
      setNavbarVisibility(true)
      setCallState(prev => ({ ...prev, status: 'idle' }))
    }
  }, [user, cleanupCall, startDurationTimer])

  // Answer an incoming call
  const answerCall = useCallback(async () => {
    const { conversationId, otherUserId, type } = callStateRef.current
    if (!conversationId || !otherUserId) return

    try {
      setNavbarVisibility(false)
      audioService.stopAll()
      audioService.playAcceptSound()

      const mediaConstraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video',
      }
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)

      // Save the pending offer before initialize() -> cleanup() wipes it
      const savedOffer = pendingOfferRef.current

      // Update call session
      if (callStateRef.current.sessionId) {
        try {
          await updateCallSession(callStateRef.current.sessionId, {
            status: 'answered',
          })
        } catch (err) {
          console.error('Failed to update call session:', err)
        }
      }

      await webRTCManager.initialize(
        stream,
        conversationId,
        otherUserId,
        () => {
          startDurationTimer()
        },
        (state) => {
          if (!isEndingRef.current && (state === 'disconnected' || state === 'failed')) {
            endCall()
          }
        }
      )

      // If we had a stored offer, set it as the remote description on the new PC
      // before creating the answer. This prevents the InvalidStateError from
      // createAnswer() being called without a remote offer.
      if (savedOffer && !webRTCManager.getPendingOffer()) {
        await webRTCManager.setRemoteOffer(savedOffer)
      }

      // Now the PC is in have-remote-offer state — createAnswer() will succeed
      await webRTCManager.createAnswer()

      // Set status to connected only AFTER WebRTC operations succeed
      setCallState(prev => ({ ...prev, status: 'connected' }))
    } catch (err) {
      console.error('Error answering call:', err)
      cleanupCall()
      setCallState(prev => ({ ...prev, status: 'idle' }))
    }
  }, [cleanupCall, startDurationTimer])

  // Reject an incoming call
  const rejectCall = useCallback(async () => {
    const { conversationId, otherUserId, type, sessionId } = callStateRef.current
    if (conversationId && otherUserId) {
      try {
        await sendCallSignal(conversationId, otherUserId, { type: 'reject' }, 'offer')
      } catch {}
    }

    // Update session
    if (sessionId) {
      try {
        await updateCallSession(sessionId, { status: 'rejected', ended_at: new Date().toISOString() })
      } catch {}
    }

    // Create missed call message in chat (caller is the one who initiated the call)
    if (conversationId && type && otherUserId) {
      try {
        await createCallMessage(conversationId, type, null, false, otherUserId)
      } catch (err) {
        console.error('Failed to create call message:', err)
      }
    }

    audioService.stopAll()
    cleanupCall()
    setNavbarVisibility(true)
    setCallState(defaultCallState)
  }, [cleanupCall])

  // End the current call
  const endCall = useCallback(async () => {
    if (isEndingRef.current) return
    isEndingRef.current = true

    const { conversationId, otherUserId, type, callDuration, status, sessionId } = callStateRef.current
    const wasConnected = status === 'connected'

    // Send end signal
    if (conversationId && otherUserId) {
      try {
        await sendCallEndSignal(conversationId, otherUserId)
      } catch {}
    }

    // Update session
    if (sessionId) {
      try {
        await updateCallSession(sessionId, {
          status: wasConnected ? 'answered' : 'missed',
          ended_at: new Date().toISOString(),
          duration: callDuration,
        })
      } catch {}
    }

    audioService.stopAll()
    audioService.playEndSound()
    cleanupCall()

    // Create call message in chat (caller is always the one who initiated)
    if (conversationId) {
      try {
        await createCallMessage(conversationId, type, wasConnected ? callDuration : null, wasConnected, user?.id || '')
      } catch (err) {
        console.error('Failed to create call message:', err)
      }
    }

    // Build summary data
    const otherProfile = callStateRef.current.otherUserProfile
    const currentConversationId = callStateRef.current.conversationId
    const currentOtherUserId = callStateRef.current.otherUserId

    setCallState(prev => ({
      ...prev,
      status: 'summary',
      summaryData: {
        duration: callDuration,
        endedAt: new Date().toLocaleTimeString(),
        callType: type,
        otherUserProfile: otherProfile ?? null,
        currentUserProfile: currentUserProfile ?? undefined,
        conversationId: currentConversationId,
        otherUserId: currentOtherUserId,
      },
    }))

    // Auto-show rating dialog for connected calls
    if (wasConnected) {
      setTimeout(() => setShowRating(true), 500)
    }

    setTimeout(() => {
      isEndingRef.current = false
    }, 1000)
  }, [cleanupCall, currentUserProfile])

    const dismissSummary = useCallback(() => {
      setCallState(defaultCallState)
      setNavbarVisibility(true)
    }, [])

  const openRating = useCallback(() => setShowRating(true), [])
  const closeRating = useCallback(() => setShowRating(false), [])

  const submitRating = useCallback(async (rating: number, feedback?: string) => {
    const { sessionId } = callStateRef.current
    if (!sessionId || !user) return

    try {
      await submitCallRating(sessionId, user.id, rating, feedback)
      showToast('Rating submitted successfully', 'success')
    } catch (err) {
      console.error('Failed to submit rating:', err)
      showToast('Failed to submit rating', 'error')
    }
  }, [user, showToast])

  // Toggle mic
  const toggleMic = useCallback(() => {
    const enabled = webRTCManager.toggleMic()
    setCallState(prev => ({ ...prev, micEnabled: enabled }))
    audioService.playMuteSound()
  }, [])

  // Toggle camera
  const toggleCamera = useCallback(() => {
    const enabled = webRTCManager.toggleCamera()
    setCallState(prev => ({ ...prev, cameraEnabled: enabled }))
  }, [])

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setCallState(prev => ({ ...prev, speakerEnabled: !prev.speakerEnabled }))
  }, [])

  // Switch camera
  const switchCamera = useCallback(async () => {
    const currentStream = webRTCManager.getLocalStream()
    if (!currentStream) return

    const videoTrack = currentStream.getVideoTracks()[0]
    if (!videoTrack) return

    const facingMode = videoTrack.getConstraints().facingMode === 'user' ? 'environment' : 'user'

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode },
      })
      const newTrack = newStream.getVideoTracks()[0]
      if (newTrack) {
        await webRTCManager.replaceVideoTrack(newTrack)
      }
    } catch (err) {
      console.error('Error switching camera:', err)
    }
  }, [])

  // Subscribe to incoming signals (global, survives navigation)
  useEffect(() => {
    if (!user) return

    const handleSignal = async (signal: CallSignal) => {
      // Detect and handle reject signal
      if (signal.signal_data?.type === 'reject') {
        const { conversationId, type } = callStateRef.current

        // Create missed call message in chat (caller is the other user who initiated)
        if (conversationId && type) {
          try {
            await createCallMessage(conversationId, type, null, false, signal.sender_id)
          } catch (err) {
            console.error('Failed to create call message:', err)
          }
        }

        audioService.stopAll()
        cleanupCall()
        setCallState(prev => {
          if (prev.status === 'calling' || prev.status === 'ringing') {
            return {
              ...prev,
              status: 'idle',
            }
          }
          return prev
        })
        setNavbarVisibility(true)
        showToast('Call was rejected', 'warning')
        return
      }

      // Detect call-end signal
      if (signal.signal_data?.type === 'call-end') {
        const { conversationId, type, callDuration, status } = callStateRef.current
        const wasConnected = status === 'connected'

        // Create call message in chat (caller is the one who initiated the call)
        if (conversationId && type) {
          try {
            // For incoming calls, the caller is the other user; for outgoing, it's the current user
            const callerId = callStateRef.current.incoming ? callStateRef.current.otherUserId : user?.id
            if (callerId) {
              await createCallMessage(conversationId, type, wasConnected ? callDuration : null, wasConnected, callerId)
            }
          } catch (err) {
            console.error('Failed to create call message:', err)
          }
        }

        audioService.stopAll()
        cleanupCall()
        setNavbarVisibility(true)
        setCallState(prev => ({
          ...prev,
          status: 'idle',
          summaryData: null,
        }))
        showToast('Call ended', 'info')
        return
      }

      switch (signal.signal_type) {
        case 'offer': {
          // Skip our own signals
          if (
            callStateRef.current.status !== 'idle' &&
            callStateRef.current.status !== 'ended'
          ) {
            console.log('User already in another call')
            return
          }

          // Get sender profile if not attached
          let senderProfile: Profile | null = signal.sender ?? null
          if (!senderProfile) {
            try { senderProfile = await getProfile(signal.sender_id) } catch {}
          }

          // Determine call type from SDP
          const isVideo = signal.signal_data?.sdp?.includes('video')

          // Play incoming ringtone
          audioService.playIncomingRingtone()

          // Show browser notification for incoming call
          const callerName = senderProfile?.full_name || senderProfile?.username || 'Someone'
          showNotification({
            title: `${isVideo ? '📹 Video' : '📞 Audio'} call from ${callerName}`,
            body: 'Tap to answer',
            onClick: () => {
              window.focus()
            },
          })

          // Create a session for incoming call
          let sessionId: string | null = null
          try {
            const session = await createCallSession(
              signal.conversation_id,
              signal.sender_id,
              user.id,
              isVideo ? 'video' : 'audio'
            )
            sessionId = session.id
          } catch (err) {
            console.error('Failed to create session for incoming call:', err)
          }

          // Store offer in WebRTC manager AND in ref for answerCall() to use
          await webRTCManager.handleOffer(signal.signal_data)
          pendingOfferRef.current = signal.signal_data

          setCallState(prev => {
            if (prev.status !== 'idle' && prev.status !== 'ended') return prev
            return {
              ...prev,
              status: 'ringing',
              type: isVideo ? 'video' : 'audio',
              conversationId: signal.conversation_id,
              otherUserId: signal.sender_id,
              otherUserProfile: senderProfile || null,
              incoming: true,
              sessionId,
              callDuration: 0,
              summaryData: null,
            }
          })
          break
        }

        case 'answer': {
          await webRTCManager.handleAnswer(signal.signal_data)
          audioService.stopAll()
          audioService.playAcceptSound()
          setCallState(prev => ({
            ...prev,
            status: 'connected',
          }))
          startDurationTimer()
          break
        }

        case 'ice-candidate': {
          await webRTCManager.handleIceCandidate(signal.signal_data)
          break
        }
      }
    }

    // Clean up previous subscriptions when user changes
    const sub = subscribeToCallSignals(user.id, handleSignal)

    return () => {
      sub.unsubscribe()
    }
  }, [user, cleanupCall, startDurationTimer])

  return (
    <CallContext.Provider
      value={{
        callState,
        startCall,
        answerCall,
        rejectCall,
        endCall,
        dismissSummary,
        toggleMic,
        toggleCamera,
        toggleSpeaker,
        switchCamera,
        openRating,
        closeRating,
        showRating,
        submitRating,
      }}
    >
      {children}
    </CallContext.Provider>
  )
}

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used within CallProvider')
  return ctx
}

