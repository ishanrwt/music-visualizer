import {
  BAND_CURVE,
  BAND_GAIN,
  BASS_RANGE_HZ,
  BEAT_DECAY,
  BEAT_HISTORY_FRAMES,
  BEAT_MIN_GAP_FRAMES,
  BEAT_SENSITIVITY,
  KICK_RANGE_HZ,
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
   * Sharp high-band spectral-flux envelope, 0–1 — spikes on "mechanical" hits:
   * clicks, snares, hats, metallic / percussive transients. Distinct from `beat`
   * (which is the low-end kick). Very fast decay so it reads as a crack.
   */
  hit: number
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
    hit: 0,
    centroid: 0.25,
  }
  private rafId: number | null = null
  private bassStart: number
  private bassEnd: number
  private midEnd: number
  private trebleEnd: number
  private kickStart: number
  private kickEnd: number
  private prevHi: Float32Array
  private kickHistory = new Float32Array(BEAT_HISTORY_FRAMES)
  private kickHistIdx = 0
  private kickHistLen = 0
  private framesSinceBeat = 999

  constructor(analyser: AnalyserNode) {
    this.analyser = analyser
    this.data = new Uint8Array(analyser.frequencyBinCount)
    this.prevHi = new Float32Array(analyser.frequencyBinCount)

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
    this.kickStart = hzToBin(KICK_RANGE_HZ[0], sampleRate, fftSize)
    this.kickEnd = hzToBin(KICK_RANGE_HZ[1], sampleRate, fftSize)
  }

  /** Instantaneous kick-band energy (mean of squared bin magnitudes, 0–1). */
  private kickEnergy(): number {
    let sum = 0
    let count = 0
    for (
      let i = Math.max(1, this.kickStart);
      i <= this.kickEnd && i < this.data.length;
      i++
    ) {
      const v = (this.data[i] ?? 0) / 255
      sum += v * v
      count += 1
    }
    return count > 0 ? sum / count : 0
  }

  /**
   * Adaptive beat detection: compare current kick energy to its rolling local
   * average + variance, fire on a real margin, enforce a refractory gap, and
   * return an onset strength scaled by how hard the hit exceeded the average.
   */
  private detectBeat(): number {
    const energy = this.kickEnergy()

    const n = this.kickHistLen
    let mean = 0
    for (let i = 0; i < n; i++) {
      mean += this.kickHistory[i]!
    }
    mean = n > 0 ? mean / n : 0

    let varSum = 0
    for (let i = 0; i < n; i++) {
      const d = this.kickHistory[i]! - mean
      varSum += d * d
    }
    const variance = n > 0 ? varSum / n : 0

    // Steadier signal (low variance) needs a clearer jump to count as a beat.
    const sens = BEAT_SENSITIVITY + Math.max(0, 0.18 - variance * 5)

    this.framesSinceBeat += 1
    let strength = 0
    if (
      n >= 16 &&
      energy > mean * sens &&
      energy - mean > 0.015 &&
      this.framesSinceBeat >= BEAT_MIN_GAP_FRAMES
    ) {
      strength = Math.min(
        1,
        ((energy - mean) / (mean + 0.12)) * 2.0 + 0.4,
      )
      this.framesSinceBeat = 0
    }

    this.kickHistory[this.kickHistIdx] = energy
    this.kickHistIdx = (this.kickHistIdx + 1) % BEAT_HISTORY_FRAMES
    this.kickHistLen = Math.min(this.kickHistLen + 1, BEAT_HISTORY_FRAMES)

    return strength
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

    // Bass beat — adaptive energy-based onset detection (see detectBeat).
    const beatStrength = this.detectBeat()
    this.snapshot.beat = Math.max(this.snapshot.beat * BEAT_DECAY, beatStrength)

    // "Mechanical" hit: positive spectral flux across the high band. Sustained
    // treble contributes nothing — only sharp per-bin rises (clicks, snares,
    // metallic transients). Snappier decay than the bass beat.
    let flux = 0
    for (let i = this.midEnd + 1; i < this.trebleEnd && i < this.data.length; i++) {
      const v = (this.data[i] ?? 0) / 255
      const dv = v - this.prevHi[i]!
      if (dv > 0) {
        flux += dv
      }
      this.prevHi[i] = v
    }
    const span = Math.max(1, this.trebleEnd - this.midEnd - 1)
    const hitRaw = Math.min(1, (flux / span) * 14)
    this.snapshot.hit = Math.max(this.snapshot.hit * 0.72, hitRaw)

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
