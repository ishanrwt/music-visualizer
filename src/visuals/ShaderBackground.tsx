import { useEffect, useRef } from 'react'
import {
  Color,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three'
import { FrequencyAnalyser } from '../audio/FrequencyAnalyser.ts'
import { extractPalette, PALETTE_SIZE } from './extractPalette.ts'
import { fragmentShader, vertexShader } from './shaders.ts'
import type { VisualParams } from './visualParams.ts'
import { DEFAULT_PARAMS } from './visualParams.ts'

type ShaderBackgroundProps = {
  albumArtUrl: string
  analyserNode: AnalyserNode | null
  params: VisualParams
}

/**
 * The field is a full-screen background behind grain and UI, so it does not
 * need native resolution. Rendering below native and letting CSS upscale is a
 * large GPU win on integrated graphics. 1.0 = native.
 */
const RENDER_SCALE = 0.75
const MIN_RENDER_SCALE = 0.55

const FALLBACK_COLORS: [number, number, number][] = [
  [0.09, 0.09, 0.16],
  [0.24, 0.13, 0.36],
  [0.55, 0.18, 0.42],
  [0.16, 0.42, 0.55],
  [0.82, 0.62, 0.35],
]

export function ShaderBackground({
  albumArtUrl,
  analyserNode,
  params,
}: ShaderBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const analyserRef = useRef<FrequencyAnalyser | null>(null)

  // Live palette (eased each frame) and the target it eases toward.
  const colorsRef = useRef(
    FALLBACK_COLORS.map(([r, g, b]) => new Color(r, g, b)),
  )
  const targetsRef = useRef(
    FALLBACK_COLORS.map(([r, g, b]) => new Color(r, g, b)),
  )
  const paramsRef = useRef<VisualParams>(params)

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  useEffect(() => {
    if (!analyserNode) {
      analyserRef.current = null
      return
    }
    // The render tick calls analyser.update() itself — bands are read in the
    // same frame they are drawn (no separate loop, one less frame of latency).
    analyserRef.current = new FrequencyAnalyser(analyserNode)
    return () => {
      analyserRef.current = null
    }
  }, [analyserNode])

  useEffect(() => {
    let cancelled = false
    void extractPalette(albumArtUrl).then((palette) => {
      if (cancelled) {
        return
      }
      for (let i = 0; i < PALETTE_SIZE; i++) {
        const c = palette.colors[i] ?? { r: 0.1, g: 0.1, b: 0.15 }
        targetsRef.current[i]?.setRGB(c.r, c.g, c.b)
      }
    })
    return () => {
      cancelled = true
    }
  }, [albumArtUrl])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const renderer = new WebGLRenderer({ antialias: false, alpha: false })
    renderer.setPixelRatio(1)
    renderer.setSize(
      Math.round(window.innerWidth * RENDER_SCALE),
      Math.round(window.innerHeight * RENDER_SCALE),
      false,
    )
    const canvas = renderer.domElement
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    container.appendChild(canvas)

    const scene = new Scene()
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const geometry = new PlaneGeometry(2, 2)

    const colors = colorsRef.current

    const uniforms = {
      uTime: { value: 0 },
      uFlowTime: { value: 0 },
      uResolution: {
        value: new Vector2(window.innerWidth, window.innerHeight),
      },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uLevel: { value: 0 },
      uBeat: { value: 0 },
      uBeatAge: { value: 10 },
      uHit: { value: 0 },
      uC0: { value: colors[0] },
      uC1: { value: colors[1] },
      uC2: { value: colors[2] },
      uC3: { value: colors[3] },
      uC4: { value: colors[4] },
      uPaletteShift: { value: 0 },
      uHueShift: { value: 0 },
      uColorSpread: { value: DEFAULT_PARAMS.colorSpread },
      uMode: { value: DEFAULT_PARAMS.mode },
      uWarp: { value: DEFAULT_PARAMS.warp },
      uChaos: { value: DEFAULT_PARAMS.chaos },
      uScale: { value: DEFAULT_PARAMS.scale },
      uDetail: { value: DEFAULT_PARAMS.detail },
      uTexture: { value: DEFAULT_PARAMS.texture },
      uBrightness: { value: DEFAULT_PARAMS.brightness },
      uContrast: { value: DEFAULT_PARAMS.contrast },
      uSaturation: { value: DEFAULT_PARAMS.saturation },
      uVignette: { value: DEFAULT_PARAMS.vignette },
      uGrain: { value: DEFAULT_PARAMS.grain },
      uChroma: { value: DEFAULT_PARAMS.chroma },
      uGlow: { value: DEFAULT_PARAMS.glow },
    }

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    })
    const mesh = new Mesh(geometry, material)
    scene.add(mesh)

    let rafId = 0
    let prevTime = performance.now()
    const startedAt = prevTime
    let flowTime = 0
    let hueAccum = 0
    let sectionBright = 0.25
    let paletteScroll = 0
    let beatAge = 10

    // Adaptive resolution: if the GPU can't keep up, keep dropping the internal
    // render size so the page stays responsive instead of locking the machine.
    let renderScale = RENDER_SCALE
    let avgFrameMs = 16
    let sinceAdjust = 0

    const tick = () => {
      const now = performance.now()
      const rawDt = (now - prevTime) / 1000
      const dt = Math.min(rawDt, 0.1)
      prevTime = now

      avgFrameMs += (Math.min(rawDt * 1000, 100) - avgFrameMs) * 0.1
      sinceAdjust += 1
      if (sinceAdjust > 90 && avgFrameMs > 26 && renderScale > MIN_RENDER_SCALE) {
        renderScale = Math.max(MIN_RENDER_SCALE, renderScale - 0.1)
        renderer.setSize(
          Math.round(window.innerWidth * renderScale),
          Math.round(window.innerHeight * renderScale),
          false,
        )
        sinceAdjust = 0
        avgFrameMs = 16
      }

      const p = paramsRef.current
      const bands = analyserRef.current?.update() ?? {
        bass: 0,
        mid: 0,
        treble: 0,
        level: 0,
        beat: 0,
        hit: 0,
        centroid: 0.25,
      }

      // Ease the palette toward the current album's colors (~0.4 s).
      const k = 1 - Math.pow(0.02, dt)
      for (let i = 0; i < colors.length; i++) {
        colors[i]?.lerp(targetsRef.current[i]!, k)
      }

      const bass = Math.min(1.2, bands.bass * p.bassReact)
      const mid = Math.min(1.2, bands.mid * p.midReact)
      const treble = Math.min(1.2, bands.treble * p.trebleReact)
      const beat = Math.min(1.4, bands.beat * p.beatReact)
      const hit = Math.min(1.3, bands.hit * p.hitReact)

      // Age of the last strong bass hit — drives an expanding shockwave ring.
      if (beat > 0.55 && beatAge > 0.12) {
        beatAge = 0
      }
      beatAge += dt

      // Flow clock, integrated so audio-driven speed never snaps the phase.
      const flowRate =
        0.1 +
        p.flow * 0.35 +
        (mid * 0.22 + treble * 0.3) * p.flow +
        beat * 0.4
      flowTime += dt * flowRate

      // Section brightness — a ~1.2 s follower of the spectral centroid.
      // Makes a chorus look different from a verse without a laggy settle.
      const sectionK = 1 - Math.pow(0.5, dt / 1.2)
      sectionBright += (bands.centroid - sectionBright) * sectionK

      // Continuous slow hue rotation, faster in bright / energetic sections.
      hueAccum +=
        dt * p.colorCycle * (0.05 + sectionBright * 0.22 + bands.level * 0.12)
      paletteScroll += dt * p.colorCycle * 0.03

      uniforms.uTime.value = (now - startedAt) / 1000
      uniforms.uFlowTime.value = flowTime
      uniforms.uBass.value = bass
      uniforms.uMid.value = mid
      uniforms.uTreble.value = treble
      uniforms.uLevel.value = bands.level
      uniforms.uBeat.value = beat
      uniforms.uBeatAge.value = beatAge
      uniforms.uHit.value = hit

      uniforms.uPaletteShift.value = sectionBright * 0.45 + paletteScroll
      uniforms.uHueShift.value = hueAccum
      uniforms.uColorSpread.value = p.colorSpread

      uniforms.uMode.value = p.mode
      uniforms.uWarp.value = p.warp
      uniforms.uChaos.value = p.chaos
      uniforms.uScale.value = p.scale
      uniforms.uDetail.value = p.detail
      uniforms.uTexture.value = p.texture
      uniforms.uBrightness.value = p.brightness
      uniforms.uContrast.value = p.contrast
      uniforms.uSaturation.value = p.saturation
      uniforms.uVignette.value = p.vignette
      uniforms.uGrain.value = p.grain
      uniforms.uChroma.value = p.chroma
      uniforms.uGlow.value = p.glow

      renderer.render(scene, camera)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    const onResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      renderer.setSize(
        Math.round(width * renderScale),
        Math.round(height * renderScale),
        false,
      )
      uniforms.uResolution.value.set(width, height)
    }
    window.addEventListener('resize', onResize)

    // Don't burn the GPU on a hidden tab.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId)
      } else {
        prevTime = performance.now()
        rafId = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}
