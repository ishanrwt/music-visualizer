import {
  BAND_CURVE,
  BAND_GAIN,
  BASS_RANGE_HZ,
  MID_RANGE_HZ,
  SMOOTHING_ATTACK,
  SMOOTHING_RELEASE,
  TREBLE_RANGE_HZ,
} from './constants.ts'

export type FrequencyBands = {
  bass: number
  mid: number
  treble: number
  /** Level across the whole spectrum, 0–1. Useful for an overall "energy" drive. */
  level: number
  /** Fast-decaying transient envelope that spikes on bass onsets, 0–1. */
  beat: number
  /**
   * Spectral centroid, 0–1 — roughly "how bright / trebly the mix is right now".
   * Bass-heavy passage ≈ 0.1, cymbal-heavy passage ≈ 0.6. A slow envelope of
   * this is what shifts the palette as a song moves between sections.
   */
  centroid: number
}

function hzToBin(hz: number, sampleRate: number, fftSize: number): number {
  const binCount = fftSize / 2
  const bin = Math.floor((hz * fftSize) / sampleRate)
  return Math.max(0, Math.min(bin, binCount - 1))
}

function averageRange(
  data: Uint8Array<ArrayBuffer>,
  startBin: number,
  endBin: number,
): number {
  // Skip DC bin 0 — it is not a useful frequency energy reading.
  const lo = Math.max(1, startBin)
  const hi = Math.max(lo, endBin)
  let sum = 0
  let count = 0
  for (let i = lo; i <= hi && i < data.length; i++) {
    sum += data[i] ?? 0
    count += 1
  }
  if (count === 0) {
    return 0
  }
  return sum / count / 255
}

/** Make-up gain + contrast curve, soft-clipped into 0–1. */
function shape(raw: number, gain: number): number {
  const boosted = Math.min(1, Math.max(0, raw * gain))
  return Math.pow(boosted, BAND_CURVE)
}

/** Fast when the signal rises, slow when it falls. */
function follow(current: number, target: number): number {
  const rate = target > current ? SMOOTHING_ATTACK : SMOOTHING_RELEASE
  return current + (target - current) * rate
}

/**
 * Reads AnalyserNode frequency data every animation frame, buckets it into
 * bass / mid / treble, and writes a mutable 0–1 snapshot.
 *
 * React can subscribe via useAudioAnalyser. A non-React consumer (e.g. a
 * Three.js render loop) can call getBands() each frame with no React involved.
 */
export class FrequencyAnalyser {
  private analyser: AnalyserNode
  private data: Uint8Array<ArrayBuffer>
  private snapshot: FrequencyBands = {
    bass: 0,
    mid: 0,
    treble: 0,
    level: 0,
    beat: 0,
    centroid: 0.25,
  }
  private rafId: number | null = null
  private bassStart: number
  private bassEnd: number
  private midEnd: number
  private trebleEnd: number
  private prevBass = 0

  constructor(analyser: AnalyserNode) {
    this.analyser = analyser
    this.data = new Uint8Array(analyser.frequencyBinCount)

    const sampleRate = analyser.context.sampleRate
    const fftSize = analyser.fftSize
    const nyquist = sampleRate / 2

    this.bassStart = hzToBin(BASS_RANGE_HZ[0], sampleRate, fftSize)
    this.bassEnd = hzToBin(BASS_RANGE_HZ[1], sampleRate, fftSize)
    this.midEnd = hzToBin(MID_RANGE_HZ[1], sampleRate, fftSize)
    this.trebleEnd = hzToBin(
      Math.min(TREBLE_RANGE_HZ[1], nyquist),
      sampleRate,
      fftSize,
    )
  }

  /**
   * Pull one frame of analysis into the snapshot. Safe to call from an
   * external loop (Phase 2 Three.js) if you prefer not to use start().
   */
  update(): FrequencyBands {
    this.analyser.getByteFrequencyData(this.data)

    const rawBass = shape(
      averageRange(this.data, this.bassStart, this.bassEnd),
      BAND_GAIN.bass,
    )
    const rawMid = shape(
      averageRange(this.data, this.bassEnd + 1, this.midEnd),
      BAND_GAIN.mid,
    )
    const rawTreble = shape(
      averageRange(this.data, this.midEnd + 1, this.trebleEnd),
      BAND_GAIN.treble,
    )

    this.snapshot.bass = follow(this.snapshot.bass, rawBass)
    this.snapshot.mid = follow(this.snapshot.mid, rawMid)
    this.snapshot.treble = follow(this.snapshot.treble, rawTreble)
    this.snapshot.level =
      this.snapshot.bass * 0.5 +
      this.snapshot.mid * 0.35 +
      this.snapshot.treble * 0.15

    // Transient detection: rectified rise in raw bass, then a fast decay so it
    // reads as a punch rather than a sustained level.
    const rise = Math.max(0, rawBass - this.prevBass) * 4.0
    this.prevBass = rawBass
    this.snapshot.beat = Math.max(this.snapshot.beat * 0.8, Math.min(1, rise))

    // Spectral centroid over the full usable range, normalized to 0–1.
    let weighted = 0
    let total = 0
    for (let i = 1; i < this.trebleEnd && i < this.data.length; i++) {
      const mag = this.data[i] ?? 0
      weighted += mag * i
      total += mag
    }
    const rawCentroid =
      total > 0 ? weighted / total / Math.max(1, this.trebleEnd) : 0.2
    // Ease it — this signal should track song sections, not individual hits.
    this.snapshot.centroid += (rawCentroid - this.snapshot.centroid) * 0.05

    return this.snapshot
  }

  /** Mutable snapshot — do not replace the object; read `.bass` / `.mid` / `.treble`. */
  getBands(): FrequencyBands {
    return this.snapshot
  }

  start(): void {
    if (this.rafId !== null) {
      return
    }

    const tick = () => {
      this.update()
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}
