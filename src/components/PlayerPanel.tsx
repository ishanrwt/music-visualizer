import { useEffect, useState } from 'react'
import type { TestTrack } from '../audio/tracks.ts'
import { PlaybackControls } from './PlaybackControls.tsx'

type PlayerPanelProps = {
  tracks: TestTrack[]
  currentTrack: TestTrack
  isPlaying: boolean
  error: string | null
  onSelectTrack: (id: string) => void
  onToggle: () => void
}

/** The top-left "Music Visualizer" card — collapsible, mirroring CommandPalette. */
export function PlayerPanel({
  tracks,
  currentTrack,
  isPlaying,
  error,
  onSelectTrack,
  onToggle,
}: PlayerPanelProps) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      if (typing) {
        return
      }
      if (event.key.toLowerCase() === 'p') {
        setOpen((value) => !value)
      } else if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-6 left-6 z-20 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-xs tracking-wide text-zinc-200 backdrop-blur-md transition hover:border-white/30 hover:bg-black/75"
      >
        ▶ Player <span className="ml-1 text-zinc-500">P</span>
      </button>
    )
  }

  return (
    <div className="absolute top-6 left-6 z-10 w-72 max-w-[calc(100vw-3rem)] rounded-2xl border border-white/12 bg-zinc-950/70 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h1 className="text-sm font-medium">Music Visualizer</h1>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
        >
          Hide
        </button>
      </div>
      <p className="mb-4 text-[11px] text-zinc-500">Reactive shader background</p>
      <PlaybackControls
        tracks={tracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        error={error}
        onSelectTrack={onSelectTrack}
        onToggle={onToggle}
      />
    </div>
  )
}
