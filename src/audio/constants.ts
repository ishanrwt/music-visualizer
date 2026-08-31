/**
 * FFT size for the AnalyserNode. Frequency resolution ≈ sampleRate / FFT_SIZE.
 * Smaller = more time-localized = snappier reaction to transients, at the cost
 * of low-end frequency resolution. 1024 keeps the 3-band split usable while
 * shaving the analysis window to ~21 ms.
 */
export const FFT_SIZE = 1024

/**
 * Bass band in Hz. Kept tight to the kick / sub region so it tracks the beat
 * instead of being diluted by low-mid content.
 */
export const BASS_RANGE_HZ = [20, 160] as const

/** Mid band in Hz — vocals and the body of most instruments. */
export const MID_RANGE_HZ = [160, 2000] as const

/** Treble band in Hz. Upper end is clamped to Nyquist at runtime. */
export const TREBLE_RANGE_HZ = [2000, 9000] as const

/**
 * Asymmetric (attack / release) smoothing, applied per frame:
 *
 *   rising  → smoothed += (raw - smoothed) * ATTACK
 *   falling → smoothed += (raw - smoothed) * RELEASE
 *
 * Fast ATTACK means a hit lands on-screen the same frame you hear it; slow
 * RELEASE keeps the decay smooth instead of strobing. This is the main lever
 * for "the visuals lag the music" — raise ATTACK toward 1 to remove lag.
 */
export const SMOOTHING_ATTACK = 0.85
export const SMOOTHING_RELEASE = 0.22

/**
 * Per-band make-up gain applied to the raw 0–1 average before smoothing, then
 * soft-clipped back into 0–1. Real music rarely pins any band near 1.0, so a
 * little gain keeps the visuals lively. Treble carries the least energy.
 */
export const BAND_GAIN = {
  bass: 1.5,
  mid: 1.9,
  treble: 2.8,
} as const

/**
 * Contrast curve exponent applied after gain (`x ** BAND_CURVE`). Values below 1
 * lift quiet detail; above 1 would crush it. 0.75 gives a gentle lift.
 */
export const BAND_CURVE = 0.75
