import { useEffect, useState } from 'react'
import { CommandPalette } from './components/CommandPalette.tsx'
import { PlaybackControls } from './components/PlaybackControls.tsx'
import { useAudioEngine } from './audio/useAudioEngine.ts'
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
    error,
    toggle,
    selectTrack,
  } = useAudioEngine()

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

      <div className="absolute top-6 left-6 z-10 w-72 max-w-[calc(100vw-3rem)] rounded-2xl border border-white/12 bg-zinc-950/70 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <h1 className="text-sm font-medium">Music Visualizer</h1>
        <p className="mb-4 text-[11px] text-zinc-500">Reactive shader background</p>
        <PlaybackControls
          tracks={tracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          error={error}
          onSelectTrack={selectTrack}
          onToggle={toggle}
        />
      </div>

      <CommandPalette
        params={params}
        onChange={setParams}
        onReset={() => setParams({ ...DEFAULT_PARAMS })}
        analyserNode={analyserNode}
      />
    </main>
  )
}

export default App
