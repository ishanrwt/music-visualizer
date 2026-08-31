import { FFT_SIZE } from './constants.ts'

/**
 * Owns the Web Audio graph: lazy AudioContext, one HTML audio element,
 * MediaElementSource → AnalyserNode → destination.
 *
 * AudioContext is created on the first play() call (user gesture), never on construct.
 */
export class AudioEngine {
  private context: AudioContext | null = null
  private source: MediaElementAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private audioElement: HTMLAudioElement | null = null

  private ensureGraph(): void {
    if (this.context && this.context.state !== 'closed') {
      return
    }

    this.context = new AudioContext()

    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audio.preload = 'auto'
    audio.loop = true
    this.audioElement = audio

    this.source = this.context.createMediaElementSource(audio)

    const analyser = this.context.createAnalyser()
    analyser.fftSize = FFT_SIZE
    // We apply our own exponential smoothing in FrequencyAnalyser.
    analyser.smoothingTimeConstant = 0
    this.analyser = analyser

    this.source.connect(this.analyser)
    this.analyser.connect(this.context.destination)
  }

  async play(trackUrl: string): Promise<void> {
    this.ensureGraph()

    const context = this.context
    const audio = this.audioElement
    if (!context || !audio) {
      return
    }

    if (context.state === 'suspended') {
      await context.resume()
    }

    const absolute = new URL(trackUrl, window.location.href).href
    if (audio.src !== absolute) {
      audio.src = trackUrl
      audio.load()
    }

    try {
      await audio.play()
    } catch (error) {
      audio.removeAttribute('src')
      audio.load()
      throw error
    }
  }

  pause(): void {
    this.audioElement?.pause()
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume()
    }
    await this.audioElement?.play()
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  getAudioElement(): HTMLAudioElement | null {
    return this.audioElement
  }

  async close(): Promise<void> {
    this.audioElement?.pause()
    this.audioElement = null
    this.source = null
    this.analyser = null

    if (this.context) {
      await this.context.close()
      this.context = null
    }
  }
}
