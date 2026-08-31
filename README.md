# Music Visualizer

Browser-based interactive music visualizer. **This is Phase 2 of N.**

## Phase 2 — Shader background (current)

Full-screen WebGL field tinted by album-art colors and driven by live bass / mid / treble / beat from the Phase 1 audio engine, with an on-screen command palette to switch effects and tune every parameter live.

- Play a track; `FrequencyAnalyser.getBands()` is read inside the Three.js RAF loop (not React state)
- Four selectable field modes (Aurora / Nebula / Plasma / Ridgeline) — domain-warped fBm, ridged multifractal, sine interference — in [`src/visuals/shaders.ts`](src/visuals/shaders.ts)
- fBm octaves, chromatic split, bass glow, beat flash, vignette, film-grain dithering and a filmic shoulder in the fragment `main()`
- Two dominant colors from album art via [`src/visuals/extractPalette.ts`](src/visuals/extractPalette.ts), cross-faded on track change
- **Command palette** ([`src/components/CommandPalette.tsx`](src/components/CommandPalette.tsx)) — press `C` to toggle. Effect mode, presets, and sliders for warp / scale / flow / detail, per-band reactivity, color grade, and post. Settings persist to `localStorage` (`src/visuals/visualParams.ts`).

## Phase 1 — Audio engine (done)

Web Audio graph, FFT bucketing, exponential smoothing. Constants in [`src/audio/constants.ts`](src/audio/constants.ts).

### Run

```bash
npm install
npm run generate-audio       # optional; regenerates public/audio/*.wav
npm run generate-album-art   # optional; regenerates public/albums/*.png
npm run dev
```

### Where to tune

**Audio smoothing / ranges / make-up gain** — [`src/audio/constants.ts`](src/audio/constants.ts). `BAND_GAIN` and `BAND_CURVE` shape the raw 0–1 averages; bands are tight (bass 20–160 Hz, treble 2–9 kHz) so they track transients. `beat` is a fast-decaying bass-onset envelope.

**Live, at runtime** — the command palette. Everything below has a slider.

**Defaults / ranges / presets** — [`src/visuals/visualParams.ts`](src/visuals/visualParams.ts) (`DEFAULT_PARAMS`, `SLIDERS`, `VISUAL_PRESETS`, `VISUAL_MODES`).

**Bass / mid / treble / beat → shader** — [`src/visuals/shaders.ts`](src/visuals/shaders.ts) fragment `main()`:

- `uBass` → warp amplitude and center glow
- `uTreble` → animation speed and chromatic split width
- `uMid` / `uLevel` / `uBeat` → exposure, plus a beat flash
- palette params (`uWarp`, `uScale`, `uFlow`, `uDetail`, `uContrast`, …) gate the rest

**Color extraction** — [`src/visuals/extractPalette.ts`](src/visuals/extractPalette.ts). Cached per image URL. Call `clearPaletteCache()` then reload to re-extract after changing `SAMPLE_STEP` or hue bins.

### Test assets

- Audio: [`public/audio/`](public/audio/) (listed in [`src/audio/tracks.ts`](src/audio/tracks.ts))
- Album art: [`public/albums/`](public/albums/) — `albumArtUrl` on each track entry

Drop in a real MP3 + cover: put files under `public/audio/` and `public/albums/`, then add a `TEST_TRACKS` entry.

## What's next (not built yet)

- Rive 2D character for featured albums
- Spotify login / playback fallback
- GSAP UI transitions
