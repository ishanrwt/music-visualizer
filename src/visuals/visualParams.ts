/**
 * Every knob the on-screen command palette exposes. These are pushed straight
 * into shader uniforms each frame (see ShaderBackground), so ranges here match
 * what the fragment shader in shaders.ts expects.
 */
export type VisualParams = {
  /** Index into VISUAL_MODES — selects the base field in the fragment shader. */
  mode: number

  // -- Field shape --------------------------------------------------------
  /** Domain-warp strength. 0 = clean noise, high = churny liquid. */
  warp: number
  /** Iterative fold / turbulence amount — the chaos lever. */
  chaos: number
  /** Base spatial frequency of the field. */
  scale: number
  /** Global animation speed multiplier. */
  flow: number
  /** Weight of the fine fractal octaves (adds crispness / texture). */
  detail: number
  /** Fine surface detail that blooms with the music (0 = smooth even when loud). */
  texture: number

  // -- Audio reactivity (multipliers on the analyser bands) --------------
  bassReact: number
  midReact: number
  trebleReact: number
  /** How hard bass onsets pulse the whole frame. */
  beatReact: number
  /** How strongly "mechanical" high-band hits (clicks / snares) crack the frame. */
  hitReact: number

  // -- Color ----------------------------------------------------------
  brightness: number
  contrast: number
  saturation: number
  /** How much of the 5-color palette is spread across the field at once. */
  colorSpread: number
  /** How fast the palette hue-cycles as the song moves between sections. */
  colorCycle: number

  // -- Post ------------------------------------------------------------
  /** Edge darkening. */
  vignette: number
  /** Animated film grain amount. */
  grain: number
  /** Treble-driven chromatic aberration. */
  chroma: number
  /** Bass-driven center bloom. */
  glow: number
  /** Presence of the zoomed, blurred album-cover background behind the waves (0 = flat dark). */
  coverAmount: number
  /** How legible the album cover stays in the waves (0 = fully liquified, 1 = only rippled). */
  coverFocus: number
  /** Opacity of a crisp, undistorted album-cover card floating on top of everything (0 = hidden). */
  coverOverlay: number
}

export type VisualMode = {
  id: string
  label: string
  hint: string
}

/** Order matters — array index is the `uMode` value in the shader. */
export const VISUAL_MODES: VisualMode[] = [
  { id: 'lava', label: 'Lava Lamp', hint: 'Big folded blobs drifting through the palette' },
  { id: 'nebula', label: 'Nebula', hint: 'Billowing turbulence' },
  { id: 'plasma', label: 'Plasma', hint: 'Interference over chaos' },
  { id: 'ridge', label: 'Ridgeline', hint: 'Sharp carved veins' },
  { id: 'kaleido', label: 'Kaleidoscope', hint: 'Six-fold mirror symmetry' },
  { id: 'tunnel', label: 'Tunnel', hint: 'Rings receding into the distance' },
  { id: 'cells', label: 'Cells', hint: 'Animated Voronoi mosaic' },
  { id: 'contours', label: 'Contours', hint: 'Stepped topographic map' },
  { id: 'marble', label: 'Marble', hint: 'Turbulent veined stone' },
]

export const DEFAULT_PARAMS: VisualParams = {
  mode: 0,
  warp: 0.55,
  chaos: 0.55,
  scale: 1.25,
  flow: 0.9,
  detail: 0.7,
  texture: 0.65,
  bassReact: 1.15,
  midReact: 1.15,
  trebleReact: 1.2,
  beatReact: 1.35,
  hitReact: 1,
  brightness: 1.05,
  contrast: 1.22,
  saturation: 1.3,
  colorSpread: 0.6,
  colorCycle: 0,
  vignette: 0.35,
  grain: 0.05,
  chroma: 0.45,
  glow: 0.5,
  coverAmount: 0.9,
  coverFocus: 0.55,
  coverOverlay: 0.92,
}

export type VisualPreset = {
  id: string
  label: string
  params: VisualParams
}

export const VISUAL_PRESETS: VisualPreset[] = [
  {
    id: 'default',
    label: 'Default',
    params: DEFAULT_PARAMS,
  },
  {
    id: 'calm',
    label: 'Calm Drift',
    params: {
      ...DEFAULT_PARAMS,
      mode: 1,
      warp: 0.35,
      chaos: 0.25,
      scale: 0.9,
      flow: 0.6,
      detail: 0.4,
      texture: 0.3,
      bassReact: 0.8,
      midReact: 0.9,
      trebleReact: 0.7,
      beatReact: 0.5,
      hitReact: 0.5,
      contrast: 1.1,
      saturation: 1.15,
      colorSpread: 0.4,
      colorCycle: 0.6,
      vignette: 0.5,
      chroma: 0.2,
      glow: 0.35,
    },
  },
  {
    id: 'club',
    label: 'Club',
    params: {
      ...DEFAULT_PARAMS,
      mode: 0,
      warp: 0.8,
      chaos: 0.8,
      scale: 1.5,
      flow: 1.5,
      detail: 0.8,
      texture: 0.9,
      bassReact: 1.7,
      midReact: 1.3,
      trebleReact: 1.6,
      beatReact: 1.8,
      hitReact: 1.4,
      brightness: 1.12,
      contrast: 1.35,
      saturation: 1.5,
      colorSpread: 0.75,
      colorCycle: 1.3,
      vignette: 0.3,
      chroma: 0.7,
      glow: 0.9,
    },
  },
  {
    id: 'psy',
    label: 'Psychedelia',
    params: {
      ...DEFAULT_PARAMS,
      mode: 2,
      warp: 1.0,
      chaos: 1.0,
      scale: 1.7,
      flow: 1.2,
      detail: 0.9,
      texture: 1.0,
      bassReact: 1.3,
      midReact: 1.6,
      trebleReact: 1.7,
      beatReact: 1.3,
      contrast: 1.4,
      saturation: 1.75,
      colorSpread: 1.0,
      colorCycle: 1.8,
      vignette: 0.2,
      grain: 0.04,
      chroma: 0.9,
      glow: 0.55,
    },
  },
  {
    id: 'ink',
    label: 'Ink & Veins',
    params: {
      ...DEFAULT_PARAMS,
      mode: 3,
      warp: 0.7,
      chaos: 0.7,
      scale: 1.4,
      flow: 0.95,
      detail: 0.8,
      texture: 0.85,
      bassReact: 1.2,
      midReact: 1.1,
      trebleReact: 1.4,
      beatReact: 1.4,
      hitReact: 1.5,
      brightness: 1.0,
      contrast: 1.5,
      saturation: 1.1,
      colorSpread: 0.5,
      colorCycle: 0.8,
      vignette: 0.5,
      grain: 0.08,
      chroma: 0.35,
      glow: 0.4,
    },
  },
]

export type SliderSpec = {
  key: keyof Omit<VisualParams, 'mode'>
  label: string
  min: number
  max: number
  step: number
  group: 'Field' | 'Audio' | 'Color' | 'Post'
}

export const SLIDERS: SliderSpec[] = [
  { key: 'chaos', label: 'Chaos', min: 0, max: 1.2, step: 0.01, group: 'Field' },
  { key: 'warp', label: 'Warp', min: 0, max: 1.5, step: 0.01, group: 'Field' },
  { key: 'scale', label: 'Scale', min: 0.3, max: 3, step: 0.01, group: 'Field' },
  { key: 'flow', label: 'Flow speed', min: 0, max: 2.5, step: 0.01, group: 'Field' },
  { key: 'detail', label: 'Detail', min: 0, max: 1, step: 0.01, group: 'Field' },
  { key: 'texture', label: 'Texture (music)', min: 0, max: 1.5, step: 0.01, group: 'Field' },

  { key: 'bassReact', label: 'Bass', min: 0, max: 2, step: 0.01, group: 'Audio' },
  { key: 'midReact', label: 'Mid', min: 0, max: 2, step: 0.01, group: 'Audio' },
  { key: 'trebleReact', label: 'Treble', min: 0, max: 2, step: 0.01, group: 'Audio' },
  { key: 'beatReact', label: 'Beat punch', min: 0, max: 2, step: 0.01, group: 'Audio' },
  { key: 'hitReact', label: 'Mechanical hit', min: 0, max: 2, step: 0.01, group: 'Audio' },

  { key: 'brightness', label: 'Brightness', min: 0.3, max: 1.8, step: 0.01, group: 'Color' },
  { key: 'contrast', label: 'Contrast', min: 0.5, max: 2, step: 0.01, group: 'Color' },
  { key: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.01, group: 'Color' },
  { key: 'colorSpread', label: 'Color spread', min: 0, max: 1.4, step: 0.01, group: 'Color' },
  { key: 'colorCycle', label: 'Color cycle', min: 0, max: 2.5, step: 0.01, group: 'Color' },

  { key: 'vignette', label: 'Vignette', min: 0, max: 1, step: 0.01, group: 'Post' },
  { key: 'grain', label: 'Grain', min: 0, max: 0.3, step: 0.005, group: 'Post' },
  { key: 'chroma', label: 'Chroma split', min: 0, max: 1, step: 0.01, group: 'Post' },
  { key: 'glow', label: 'Bass glow', min: 0, max: 1, step: 0.01, group: 'Post' },
  { key: 'coverAmount', label: 'Cover background', min: 0, max: 1, step: 0.01, group: 'Post' },
  { key: 'coverFocus', label: 'Cover clarity', min: 0, max: 1, step: 0.01, group: 'Post' },
  { key: 'coverOverlay', label: 'Cover overlay', min: 0, max: 1, step: 0.01, group: 'Post' },
]

// Bumped on each field/color model change so old stored values don't mismap.
const STORAGE_KEY = 'music-visual:params:v5'

export function loadParams(): VisualParams {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_PARAMS }
    }
    const parsed = JSON.parse(raw) as Partial<VisualParams>
    // Merge so a stored file missing a newly-added key still works.
    return { ...DEFAULT_PARAMS, ...parsed }
  } catch {
    return { ...DEFAULT_PARAMS }
  }
}

export function saveParams(params: VisualParams): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params))
  } catch {
    // Storage unavailable (private mode etc.) — non-fatal.
  }
}
