import { useEffect, useState } from 'react'
import { parseLrc, type LyricLine } from './parseLrc.ts'

const cache = new Map<string, Promise<LyricLine[]>>()

function loadLyrics(url: string): Promise<LyricLine[]> {
  const cached = cache.get(url)
  if (cached) {
    return cached
  }
  const pending = fetch(url)
    .then((res) => (res.ok ? res.text() : Promise.reject(new Error(url))))
    .then(parseLrc)
    .catch(() => [] as LyricLine[])
  cache.set(url, pending)
  return pending
}

/** Fetches + parses an LRC file. Returns `[]` while loading, on 404, or if `lyricsUrl` is unset. */
export function useLyrics(lyricsUrl: string | undefined): LyricLine[] {
  // Tag the result with the URL it was fetched for, so a track change is
  // reflected immediately (render derives `[]` until the new fetch resolves)
  // without an effect having to reset state synchronously.
  const [loaded, setLoaded] = useState<{
    url: string
    lines: LyricLine[]
  } | null>(null)

  useEffect(() => {
    if (!lyricsUrl) {
      return
    }
    let cancelled = false
    void loadLyrics(lyricsUrl).then((parsed) => {
      if (!cancelled) {
        setLoaded({ url: lyricsUrl, lines: parsed })
      }
    })
    return () => {
      cancelled = true
    }
  }, [lyricsUrl])

  return loaded !== null && loaded.url === lyricsUrl ? loaded.lines : []
}
