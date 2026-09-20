export type LyricLine = {
  /** Seconds from the start of the track. */
  time: number
  text: string
}

const TIME_TAG = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g

/**
 * Parse standard LRC ("[mm:ss.xx]lyric line") text into sorted, timed lines.
 * A line with multiple time tags (rare, but valid LRC) is repeated at each time.
 * Unparseable / metadata-only lines (`[ar:]`, `[ti:]`, plain text with no tag)
 * are silently skipped.
 */
export function parseLrc(raw: string): LyricLine[] {
  const lines: LyricLine[] = []

  for (const rawLine of raw.split(/\r?\n/)) {
    const matches = [...rawLine.matchAll(TIME_TAG)]
    if (matches.length === 0) {
      continue
    }
    const text = rawLine.replace(TIME_TAG, '').trim()
    if (!text) {
      continue
    }
    for (const match of matches) {
      const minutes = Number(match[1])
      const seconds = Number(match[2])
      const frac = match[3] ? Number(`0.${match[3]}`) : 0
      if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
        continue
      }
      lines.push({ time: minutes * 60 + seconds + frac, text })
    }
  }

  return lines.sort((a, b) => a.time - b.time)
}

/**
 * Index of the last line whose time is <= `t`, or -1 before the first line.
 * Binary search — cheap enough to call every animation frame.
 */
export function findLyricIndex(lines: LyricLine[], t: number): number {
  let lo = 0
  let hi = lines.length - 1
  let result = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid]!.time <= t) {
      result = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return result
}
