/**
 * WebRTCManager - Singleton class that manages a single RTCPeerConnection.
 * Prevents duplicate connections and ensures proper cleanup.
 */
import { sendCallSignal } from '../lib/supabaseClient'

type SignalCallback = (data: any, type: string) => void

class WebRTCManager {
  private static instance: WebRTCManager

  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private pendingCandidates: RTCIceCandidateInit[] = []
  private pendingOffer: RTCSessionDescriptionInit | null = null
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null
  private onConnectionStateCallback: ((state: string) => void) | null = null
  private onIceCandidateCallback: SignalCallback | null = null
  private conversationId: string | null = null
  private otherUserId: string | null = null

  private constructor() {}

  static getInstance(): WebRTCManager {
    if (!WebRTCManager.instance) {
      WebRTCManager.instance = new WebRTCManager()
    }
    return WebRTCManager.instance
  }

  /**
   * Initialize and create a new RTCPeerConnection
   */
  async initialize(
    localStream: MediaStream,
    conversationId: string,
    otherUserId: string,
    onRemoteStream: (stream: MediaStream) => void,
    onConnectionState: (state: string) => void
  ): Promise<RTCPeerConnection> {
    // Save pendingOffer before cleanup destroys it
    const savedOffer = this.pendingOffer

    this.cleanup()
    this.localStream = localStream
    this.conversationId = conversationId
    this.otherUserId = otherUserId
    this.onRemoteStreamCallback = onRemoteStream
    this.onConnectionStateCallback = onConnectionState

    // Restore the pending offer after cleanup
    if (savedOffer) {
      this.pendingOffer = savedOffer
    }

    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    }

    const pc = new RTCPeerConnection(configuration)
    this.peerConnection = pc

    // Add local tracks
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream)
    })

    // Handle remote stream
    pc.ontrack = (event) => {
      const stream = event.streams[0]
      this.remoteStream = stream
      this.onRemoteStreamCallback?.(stream)
    }

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.conversationId && this.otherUserId) {
        sendCallSignal(this.conversationId, this.otherUserId, event.candidate.toJSON(), 'ice-candidate')
          .catch(console.error)
      }
    }

    // Connection state
    pc.onconnectionstatechange = () => {
      this.onConnectionStateCallback?.(pc.connectionState)
    }

    pc.oniceconnectionstatechange = () => {
      this.onConnectionStateCallback?.(pc.iceConnectionState)
    }

    return pc
  }

  /**
   * Create and send an offer
   */
  async createOffer(): Promise<void> {
    const pc = this.peerConnection
    if (!pc || !this.conversationId || !this.otherUserId) throw new Error('Not initialized')

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await sendCallSignal(this.conversationId, this.otherUserId, offer, 'offer')
  }

  /**
   * Handle an incoming offer — stores it for later use
   */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    this.pendingOffer = offer
  }

  /**
   * Set a stored offer as the remote description on the current peer connection.
   * This is used when initialize() was called after handleOffer() and wiped pendingOffer.
   */
  async setRemoteOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnection
    if (!pc) throw new Error('Not initialized')

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
  }

  /**
   * Create and send an answer (must call handleOffer or setRemoteOffer first)
   */
  async createAnswer(): Promise<void> {
    const pc = this.peerConnection
    if (!pc || !this.conversationId || !this.otherUserId) throw new Error('Not initialized')

    // If remote description hasn't been set yet, set it from pendingOffer
    if (!pc.remoteDescription && this.pendingOffer) {
      await pc.setRemoteDescription(new RTCSessionDescription(this.pendingOffer))
      this.pendingOffer = null
    }

    // Process pending candidates
    if (this.pendingCandidates.length > 0) {
      for (const candidate of this.pendingCandidates) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
      }
      this.pendingCandidates = []
    }

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await sendCallSignal(this.conversationId, this.otherUserId, answer, 'answer')
  }

  /**
   * Handle an incoming answer
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnection
    if (!pc || pc.signalingState !== 'have-local-offer') return

    await pc.setRemoteDescription(new RTCSessionDescription(answer))

    // Process pending candidates
    if (this.pendingCandidates.length > 0) {
      for (const candidate of this.pendingCandidates) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
      }
      this.pendingCandidates = []
    }
  }

  /**
   * Handle an ICE candidate
   */
  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnection
    if (pc && pc.remoteDescription) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
    } else {
      this.pendingCandidates.push(candidate)
    }
  }

  /**
   * Replace video track (for camera switch)
   */
  async replaceVideoTrack(newTrack: MediaStreamTrack): Promise<void> {
    const pc = this.peerConnection
    if (!pc || !this.localStream) return

    const sender = pc.getSenders().find(s => s.track?.kind === 'video')
    if (sender) {
      await sender.replaceTrack(newTrack)
    }

    // Remove old tracks and add new
    const oldTracks = this.localStream.getVideoTracks()
    oldTracks.forEach(t => {
      this.localStream?.removeTrack(t)
      t.stop()
    })
    this.localStream.addTrack(newTrack)
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream
  }

  /**
   * Get the stored pending offer (if any) without clearing it.
   */
  getPendingOffer(): RTCSessionDescriptionInit | null {
    return this.pendingOffer
  }

  /**
   * Toggle microphone
   */
  toggleMic(): boolean {
    if (!this.localStream) return false
    const track = this.localStream.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      return track.enabled
    }
    return false
  }

  /**
   * Toggle camera
   */
  toggleCamera(): boolean {
    if (!this.localStream) return false
    const track = this.localStream.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      return track.enabled
    }
    return false
  }

  /**
   * Cleanup everything
   */
  cleanup(): void {
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop())
      this.localStream = null
    }
    this.remoteStream = null
    this.pendingCandidates = []
    this.pendingOffer = null
    this.conversationId = null
    this.otherUserId = null
    this.onRemoteStreamCallback = null
    this.onConnectionStateCallback = null
    this.onIceCandidateCallback = null
  }
}

export const webRTCManager = WebRTCManager.getInstance()

