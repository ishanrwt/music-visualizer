import { useEffect, useState } from 'react'
import { CommandPalette } from './components/CommandPalette.tsx'
import { CoverOverlay } from './components/CoverOverlay.tsx'
import { LyricsDisplay } from './components/LyricsDisplay.tsx'
import { PlayerPanel } from './components/PlayerPanel.tsx'
import { useAudioEngine } from './audio/useAudioEngine.ts'
import { useLyrics } from './lyrics/useLyrics.ts'
import { ShaderBackground } from './visuals/ShaderBackground.tsx'
import {
  DEFAULT_PARAMS,
  loadParams,
  saveParams,
  type VisualParams,
} from './visuals/visualParams.ts'

function App() {
  const {
    tracks,
    currentTrack,
    isPlaying,
    analyserNode,
    audioElement,
    error,
    toggle,
    selectTrack,
  } = useAudioEngine()

  const lyricLines = useLyrics(currentTrack.lyricsUrl)
  const [params, setParams] = useState<VisualParams>(loadParams)

  useEffect(() => {
    saveParams(params)
  }, [params])

  return (
    <main className="relative min-h-svh overflow-hidden text-zinc-100">
      <ShaderBackground
        albumArtUrl={currentTrack.albumArtUrl}
        analyserNode={analyserNode}
        params={params}
      />

      <CoverOverlay track={currentTrack} amount={params.coverOverlay} />

      <PlayerPanel
        tracks={tracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        error={error}
        onSelectTrack={selectTrack}
        onToggle={toggle}
      />

      <CommandPalette
        params={params}
        onChange={setParams}
        onReset={() => setParams({ ...DEFAULT_PARAMS })}
        analyserNode={analyserNode}
      />

      <LyricsDisplay lines={lyricLines} audioElement={audioElement} />
    </main>
  )
}

export default App
