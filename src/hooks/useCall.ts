import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './useAuth'
import {
  sendCallSignal,
  subscribeToCallSignals,
  deleteCallSignals,
} from '../lib/supabaseClient'
import type { CallSignal, Profile } from '../types'

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'
export type CallType = 'audio' | 'video'

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

export function useCall() {
  const { user } = useAuth()
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    type: 'audio',
    conversationId: null,
    otherUserId: null,
    otherUserProfile: null,
    localStream: null,
    remoteStream: null,
    callDuration: 0,
    incoming: false,
  })

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const durationIntervalRef = useRef<number | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null)

  // Cleanup function
  const cleanupCall = useCallback(() => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Stop local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    // Clean remote stream ref
    remoteStreamRef.current = null

    pendingCandidatesRef.current = []
    pendingOfferRef.current = null
  }, [])

  // Start call duration timer
  const startDurationTimer = useCallback(() => {
    const startTime = Date.now()
    durationIntervalRef.current = window.setInterval(() => {
      setCallState(prev => ({
        ...prev,
        callDuration: Math.floor((Date.now() - startTime) / 1000),
      }))
    }, 1000)
  }, [])

  // Create RTCPeerConnection
  const createPeerConnection = useCallback(async (
    localStream: MediaStream,
    conversationId: string,
    otherUserId: string,
    isCaller: boolean
  ): Promise<RTCPeerConnection> => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    }

    const pc = new RTCPeerConnection(configuration)

    // Add local stream tracks
    localStream.getTracks().forEach(track => {
      if (localStream) {
        pc.addTrack(track, localStream)
      }
    })

    // Handle incoming tracks (remote stream)
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0]
      remoteStreamRef.current = remoteStream
      setCallState(prev => ({
        ...prev,
        remoteStream,
        status: 'connected',
      }))
      startDurationTimer()
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal(conversationId, otherUserId, event.candidate.toJSON(), 'ice-candidate')
          .catch(console.error)
      }
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        endCall()
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        endCall()
      }
    }

    peerConnectionRef.current = pc

    // Process any pending ICE candidates
    if (pendingCandidatesRef.current.length > 0 && !isCaller) {
      for (const candidate of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.error('Error adding pending ICE candidate:', err)
        }
      }
      pendingCandidatesRef.current = []
    }

    return pc
  }, [startDurationTimer])

  // Start a call (outgoing)
  const startCall = useCallback(async (
    conversationId: string,
    otherUserId: string,
    otherUserProfile: Profile,
    type: CallType = 'audio'
  ) => {
    try {
      // Get user media
      const mediaConstraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video',
      }
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
      localStreamRef.current = stream

      setCallState(prev => ({
        ...prev,
        status: 'calling',
        type,
        conversationId,
        otherUserId,
        otherUserProfile,
        localStream: stream,
        remoteStream: null,
        callDuration: 0,
        incoming: false,
      }))

      // Create peer connection
      const pc = await createPeerConnection(stream, conversationId, otherUserId, true)

      // Create and send offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await sendCallSignal(conversationId, otherUserId, offer, 'offer')
    } catch (err: any) {
      console.error('Error starting call:', err)
      cleanupCall()
      setCallState(prev => ({ ...prev, status: 'idle' }))
    }
  }, [createPeerConnection, cleanupCall])

  // Answer an incoming call
  const answerCall = useCallback(async () => {
    const { conversationId, otherUserId } = callState
    if (!conversationId || !otherUserId) return

    try {
      const mediaConstraints: MediaStreamConstraints = {
        audio: true,
        video: callState.type === 'video',
      }
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
      localStreamRef.current = stream

      setCallState(prev => ({
        ...prev,
        localStream: stream,
        status: 'connected',
      }))

      // Create peer connection for the answerer
      const pc = await createPeerConnection(stream, conversationId, otherUserId, false)

      // Apply the pending offer BEFORE creating the answer
      // This is critical: the remote description must be set first
      if (pendingOfferRef.current) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current))
          pendingOfferRef.current = null
        } catch (err) {
          console.error('Error setting remote description from pending offer:', err)
        }
      }

      // Create and send answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await sendCallSignal(conversationId, otherUserId, answer, 'answer')
    } catch (err: any) {
      console.error('Error answering call:', err)
      cleanupCall()
      setCallState(prev => ({ ...prev, status: 'idle' }))
    }
  }, [callState, createPeerConnection, cleanupCall])

  // Reject an incoming call
  const rejectCall = useCallback(() => {
    const { conversationId, otherUserId } = callState
    if (conversationId && otherUserId) {
      // Send a rejection signal (simple offer with null)
      sendCallSignal(conversationId, otherUserId, { type: 'reject' }, 'offer').catch(console.error)
    }
    cleanupCall()
    setCallState({
      status: 'idle',
      type: 'audio',
      conversationId: null,
      otherUserId: null,
      otherUserProfile: null,
      localStream: null,
      remoteStream: null,
      callDuration: 0,
      incoming: false,
    })
  }, [callState, cleanupCall])

  // End the call
  const endCall = useCallback(() => {
    cleanupCall()
    setCallState({
      status: 'ended',
      type: 'audio',
      conversationId: null,
      otherUserId: null,
      otherUserProfile: null,
      localStream: null,
      remoteStream: null,
      callDuration: 0,
      incoming: false,
    })

    // Reset to idle after a brief moment
    setTimeout(() => {
      setCallState(prev => prev.status === 'ended'
        ? { ...prev, status: 'idle' }
        : prev
      )
    }, 1000)
  }, [cleanupCall])

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
      }
    }
  }, [])

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
      }
    }
  }, [])

  // Switch camera (front/back)
  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current) return

    const videoTrack = localStreamRef.current.getVideoTracks()[0]
    if (!videoTrack) return

    const constraints = videoTrack.getConstraints()
    const facingMode = constraints.facingMode === 'user' ? 'environment' : 'user'

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode },
      })

      const newVideoTrack = newStream.getVideoTracks()[0]
      if (newVideoTrack && peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(newVideoTrack)
        }
        videoTrack.stop()
        localStreamRef.current.removeTrack(videoTrack)
        localStreamRef.current.addTrack(newVideoTrack)
      }
    } catch (err) {
      console.error('Error switching camera:', err)
    }
  }, [])

  // Handle incoming signals
  useEffect(() => {
    if (!user) return

    const handleSignal = async (signal: CallSignal) => {
      const pc = peerConnectionRef.current

      switch (signal.signal_type) {
        case 'offer': {
          // Check if it's a rejection
          if (signal.signal_data?.type === 'reject') {
            setCallState(prev => ({ ...prev, status: 'ended' }))
            setTimeout(() => {
              setCallState(prev => prev.status === 'ended'
                ? { ...prev, status: 'idle' }
                : prev
              )
              cleanupCall()
            }, 1000)
            return
          }

          // Incoming call — use functional updater to avoid stale state
          setCallState(prev => {
            // Don't overwrite an active call
            if (prev.status !== 'idle' && prev.status !== 'ended') return prev
            return {
              ...prev,
              status: 'ringing',
              type: signal.signal_data?.sdp?.includes('video') ? 'video' : 'audio',
              conversationId: signal.conversation_id,
              otherUserId: signal.sender_id,
              otherUserProfile: signal.sender || null,
              incoming: true,
            }
          })

          // Store the offer so answerCall can use it later.
          // At this point pc is null because the peer connection
          // hasn't been created yet — it will be created in answerCall.
          pendingOfferRef.current = signal.signal_data as RTCSessionDescriptionInit
          break
        }

        case 'answer': {
          if (pc && pc.signalingState === 'have-local-offer') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data))
            } catch (err) {
              console.error('Error setting remote description (answer):', err)
            }
          }
          break
        }

        case 'ice-candidate': {
          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data))
            } catch (err) {
              console.error('Error adding ICE candidate:', err)
            }
          } else {
            // Queue candidates until remote description is set
            pendingCandidatesRef.current.push(signal.signal_data)
          }
          break
        }
      }
    }

    const sub = subscribeToCallSignals(user.id, handleSignal)

    return () => {
      sub.unsubscribe()
      // IMPORTANT: Do NOT delete call signals here.
      // Previously we called deleteCallSignals() which DESTROYED
      // incoming offers before the user could answer them.
      // Call signals are cleaned up when the call ends naturally.
    }
  }, [user, cleanupCall])
  // Intentionally NOT including callState.conversationId in deps.
  // The subscription must stay alive for the entire component lifecycle.
  // Including conversationId would tear down and recreate the subscription
  // on every state change, deleting incoming signals in the process.

  return {
    callState,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCamera,
    switchCamera,
  }
}
