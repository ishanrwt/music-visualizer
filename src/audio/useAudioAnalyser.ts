import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FrequencyAnalyser,
  type FrequencyBands,
} from './FrequencyAnalyser.ts'

const SILENT_BANDS: FrequencyBands = {
  bass: 0,
  mid: 0,
  treble: 0,
  level: 0,
  beat: 0,
  centroid: 0.25,
}

/**
 * Starts a FrequencyAnalyser against the given AnalyserNode and mirrors its
 * snapshot into React state for debug UI.
 *
 * For a non-React consumer (Phase 2 Three.js loop), call `getBands()` — it
 * reads the same mutable snapshot the RAF loop writes, with no setState.
 */
export function useAudioAnalyser(analyserNode: AnalyserNode | null) {
  const instanceRef = useRef<FrequencyAnalyser | null>(null)
  const [bands, setBands] = useState<FrequencyBands>(SILENT_BANDS)

  const getBands = useCallback((): FrequencyBands => {
    return instanceRef.current?.getBands() ?? SILENT_BANDS
  }, [])

  useEffect(() => {
    if (!analyserNode) {
      instanceRef.current = null
      return
    }

    const analyser = new FrequencyAnalyser(analyserNode)
    instanceRef.current = analyser
    analyser.start()

    let rafId = 0
    const tick = () => {
      const snapshot = analyser.getBands()
      setBands({
        bass: snapshot.bass,
        mid: snapshot.mid,
        treble: snapshot.treble,
        level: snapshot.level,
        beat: snapshot.beat,
        centroid: snapshot.centroid,
      })
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      analyser.stop()
      instanceRef.current = null
    }
  }, [analyserNode])

  return { bands: analyserNode ? bands : SILENT_BANDS, getBands }
}
