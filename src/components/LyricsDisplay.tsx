import { useEffect, useState } from 'react'
import { findLyricIndex, type LyricLine } from '../lyrics/parseLrc.ts'

type LyricsDisplayProps = {
  lines: LyricLine[]
  audioElement: HTMLAudioElement | null
}

/**
 * Teleprompter-style current/prev/next line, tracking audioElement.currentTime.
 * Polls via rAF but only calls setState when the line index actually changes,
 * so this doesn't re-render 60x/second like the shader loop does.
 */
export function LyricsDisplay({ lines, audioElement }: LyricsDisplayProps) {
  // Tagged with the `lines` array it was computed against, so a track change
  // (a new `lines` reference) is reflected immediately during render — no
  // stale index briefly applied to the wrong track's lyrics.
  const [found, setFound] = useState<{ lines: LyricLine[]; index: number }>({
    lines,
    index: -1,
  })

  useEffect(() => {
    if (!audioElement || lines.length === 0) {
      return
    }
    let rafId = 0
    const tick = () => {
      const index = findLyricIndex(lines, audioElement.currentTime)
      setFound((prev) =>
        prev.lines === lines && prev.index === index
          ? prev
          : { lines, index },
      )
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [audioElement, lines])

  const index = found.lines === lines ? found.index : -1

  if (lines.length === 0 || index < 0) {
    return null
  }

  const prev = lines[index - 1]?.text
  const current = lines[index]?.text
  const next = lines[index + 1]?.text

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-10 z-10 flex flex-col items-center gap-2 px-6 text-center">
      {prev ? (
        <p className="max-w-2xl truncate text-sm text-white/30">{prev}</p>
      ) : null}
      <p
        key={index}
        className="max-w-3xl text-2xl font-medium text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] sm:text-3xl"
      >
        {current}
      </p>
      {next ? (
        <p className="max-w-2xl truncate text-sm text-white/30">{next}</p>
      ) : null}
    </div>
  )
}
