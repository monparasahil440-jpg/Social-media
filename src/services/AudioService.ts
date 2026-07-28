/**
 * AudioService - Manages ringtones and call sound effects.
 * Uses Web Audio API for precise playback control.
 */
class AudioService {
  private audioContext: AudioContext | null = null
  private oscillator: OscillatorNode | null = null
  private gainNode: GainNode | null = null
  private isPlaying = false

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    return this.audioContext
  }

  /**
   * Play incoming call ringtone (repeating melodic pattern)
   */
  playIncomingRingtone(): void {
    if (this.isPlaying) return
    this.isPlaying = true
    const ctx = this.getContext()
    this.gainNode = ctx.createGain()
    this.gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    this.gainNode.connect(ctx.destination)

    this.playRingPattern(ctx, this.gainNode)
  }

  private playRingPattern(ctx: AudioContext, gain: GainNode): void {
    if (!this.isPlaying) return

    const note = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      const noteGain = ctx.createGain()
      noteGain.gain.setValueAtTime(0, start)
      noteGain.gain.linearRampToValueAtTime(0.3, start + 0.02)
      noteGain.gain.linearRampToValueAtTime(0, start + dur)
      osc.connect(noteGain)
      noteGain.connect(gain)
      osc.start(start)
      osc.stop(start + dur + 0.05)
    }

    // Ring pattern: two-tone ascending, pause, repeat
    const patternStart = ctx.currentTime
    for (let i = 0; i < 4; i++) {
      const t = patternStart + i * 3
      note(440, t, 0.4)        // A4
      note(554.37, t + 0.4, 0.4) // C#5
      note(659.25, t + 0.8, 0.4) // E5
    }

    // Schedule next pattern repetition
    setTimeout(() => {
      this.playRingPattern(ctx, gain)
    }, 12000) // Repeat after 12 seconds
  }

  /**
   * Play outgoing call ringback tone (waiting tone)
   */
  playOutgoingRingtone(): void {
    if (this.isPlaying) return
    this.isPlaying = true
    const ctx = this.getContext()
    this.gainNode = ctx.createGain()
    this.gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    this.gainNode.connect(ctx.destination)

    this.playOutgoingPattern(ctx, this.gainNode)
  }

  private playOutgoingPattern(ctx: AudioContext, gain: GainNode): void {
    if (!this.isPlaying) return

    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, t)
    const noteGain = ctx.createGain()
    noteGain.gain.setValueAtTime(0, t)
    noteGain.gain.linearRampToValueAtTime(0.3, t + 0.02)
    noteGain.gain.setValueAtTime(0.3, t + 0.8)
    noteGain.gain.linearRampToValueAtTime(0, t + 1)
    osc.connect(noteGain)
    noteGain.connect(gain)
    osc.start(t)
    osc.stop(t + 1.1)

    setTimeout(() => {
      this.playOutgoingPattern(ctx, gain)
    }, 2000)
  }

  /**
   * Play sound when call is connected
   */
  playAcceptSound(): void {
    const ctx = this.getContext()
    const t = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.2, t)
    gain.connect(ctx.destination)

    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, t)
    osc1.connect(gain)
    osc1.start(t)
    osc1.stop(t + 0.1)

    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(659.25, t + 0.1)
    osc2.connect(gain)
    osc2.start(t + 0.1)
    osc2.stop(t + 0.3)
  }

  /**
   * Play sound when call ends
   */
  playEndSound(): void {
    const ctx = this.getContext()
    const t = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.2, t)
    gain.gain.linearRampToValueAtTime(0, t + 0.5)
    gain.connect(ctx.destination)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, t)
    osc.frequency.linearRampToValueAtTime(220, t + 0.4)
    osc.connect(gain)
    osc.start(t)
    osc.stop(t + 0.5)
  }

  /**
   * Play mute toggle feedback sound
   */
  playMuteSound(): void {
    const ctx = this.getContext()
    const t = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.1, t)
    gain.connect(ctx.destination)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1000, t)
    osc.connect(gain)
    osc.start(t)
    osc.stop(t + 0.05)
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.isPlaying = false
    if (this.oscillator) {
      try { this.oscillator.stop() } catch {}
      this.oscillator = null
    }
    if (this.gainNode) {
      try { this.gainNode.disconnect() } catch {}
      this.gainNode = null
    }
  }
}

export const audioService = new AudioService()

