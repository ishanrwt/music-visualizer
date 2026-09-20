import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioEngine } from './AudioEngine.ts'
import { TEST_TRACKS, type TestTrack } from './tracks.ts'

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null)
  const [currentTrackId, setCurrentTrackId] = useState(TEST_TRACKS[0]!.id)
  const [isPlaying, setIsPlaying] = useState(false)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  if (engineRef.current === null) {
    engineRef.current = new AudioEngine()
  }

  const currentTrack =
    TEST_TRACKS.find((track) => track.id === currentTrackId) ?? TEST_TRACKS[0]!

  const playTrack = useCallback(async (track: TestTrack) => {
    const engine = engineRef.current
    if (!engine) {
      return
    }
    try {
      await engine.play(track.url)
      setError(null)
      setAnalyserNode(engine.getAnalyser())
      setAudioElement(engine.getAudioElement())
      setIsPlaying(true)
    } catch (cause) {
      setIsPlaying(false)
      const message =
        cause instanceof Error ? cause.message : 'Playback failed'
      setError(message)
    }
  }, [])

  const play = useCallback(() => {
    void playTrack(currentTrack)
  }, [currentTrack, playTrack])

  const pause = useCallback(() => {
    engineRef.current?.pause()
    setIsPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, pause, play])

  const selectTrack = useCallback(
    (id: string) => {
      const track = TEST_TRACKS.find((item) => item.id === id)
      if (!track) {
        return
      }
      setCurrentTrackId(id)
      if (isPlaying) {
        void playTrack(track)
      }
    },
    [isPlaying, playTrack],
  )

  useEffect(() => {
    const audio = engineRef.current?.getAudioElement()
    if (!audio) {
      return
    }
    const onEnded = () => setIsPlaying(false)
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [analyserNode])

  useEffect(() => {
    return () => {
      void engineRef.current?.close()
    }
  }, [])

  return {
    tracks: TEST_TRACKS,
    currentTrack,
    isPlaying,
    analyserNode,
    audioElement,
    error,
    toggle,
    selectTrack,
  }
}
