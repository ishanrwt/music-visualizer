import type { TestTrack } from '../audio/tracks.ts'

type PlaybackControlsProps = {
  tracks: TestTrack[]
  currentTrack: TestTrack
  isPlaying: boolean
  error: string | null
  onSelectTrack: (id: string) => void
  onToggle: () => void
}

export function PlaybackControls({
  tracks,
  currentTrack,
  isPlaying,
  error,
  onSelectTrack,
  onToggle,
}: PlaybackControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-left text-xs text-zinc-400">
        Track
        <select
          className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-sm text-white outline-none focus:border-white/30"
          value={currentTrack.id}
          onChange={(event) => onSelectTrack(event.target.value)}
        >
          {tracks.map((track) => (
            <option key={track.id} value={track.id} className="bg-zinc-900">
              {track.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/15"
        onClick={onToggle}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <p className="text-[11px] text-zinc-500">
        Now playing:{' '}
        <span className="text-zinc-300">{currentTrack.name}</span>
      </p>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  )
}
