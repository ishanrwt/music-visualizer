/**
 * FFT size for the AnalyserNode. Frequency resolution ≈ sampleRate / FFT_SIZE.
 * 2048 (~43 ms window at 48 kHz) gives the low end enough bins (~23 Hz each) for
 * a stable bass-energy estimate — the beat detector needs that more than it
 * needs the extra ~20 ms of time-localisation.
 */
export const FFT_SIZE = 2048

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

/**
 * Beat detector (adaptive spectral energy).
 *
 * Instantaneous bass energy is compared against its own rolling local average.
 * A beat fires when it exceeds `average × sensitivity` by a real margin, with a
 * refractory gap so one kick can't retrigger for a few frames. This adapts to
 * loud and quiet tracks alike, unlike a fixed frame-to-frame delta threshold.
 */
export const BEAT_HISTORY_FRAMES = 48
export const BEAT_MIN_GAP_FRAMES = 5
/** Base ratio over the local average that counts as an onset. */
export const BEAT_SENSITIVITY = 1.3
/** Per-frame envelope decay after a beat — lower = snappier. */
export const BEAT_DECAY = 0.85
/** Kick band in Hz for the detector — a touch wider than BASS_RANGE_HZ to catch kick body. */
export const KICK_RANGE_HZ = [30, 180] as const
