import { useState } from 'react'
import type { TestTrack } from '../audio/tracks.ts'

type CoverOverlayProps = {
  track: TestTrack
  amount: number
}

/**
 * A crisp, undistorted copy of the album cover floating on top of everything
 * else — the shader's own liquified-cover effect underneath is untouched, this
 * is purely an extra layer so the actual artwork reads clearly at a glance.
 * Static (no drift, no beat pulse) — just a still, framed card.
 */
export function CoverOverlay({ track, amount }: CoverOverlayProps) {
  // Remember which track's art failed so a new track re-shows without an effect.
  const [failedId, setFailedId] = useState<string | null>(null)
  const failed = failedId === track.id
  const hidden = amount <= 0.01 || failed

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[5] grid place-items-center"
      hidden={hidden}
      aria-hidden="true"
    >
      <img
        src={track.albumArtUrl}
        alt=""
        onError={() => setFailedId(track.id)}
        className="h-[78vh] w-auto max-w-[90vw] rounded-2xl object-contain ring-1 ring-white/20"
        style={{
          opacity: amount,
          boxShadow:
            '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      />
    </div>
  )
}
