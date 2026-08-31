import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { FrequencyAnalyser } from '../audio/FrequencyAnalyser.ts'
import {
  SLIDERS,
  VISUAL_MODES,
  VISUAL_PRESETS,
  type SliderSpec,
  type VisualParams,
} from '../visuals/visualParams.ts'

type CommandPaletteProps = {
  params: VisualParams
  onChange: (next: VisualParams) => void
  onReset: () => void
  analyserNode: AnalyserNode | null
}

const GROUP_ORDER: SliderSpec['group'][] = ['Field', 'Audio', 'Color', 'Post']

export function CommandPalette({
  params,
  onChange,
  onReset,
  analyserNode,
}: CommandPaletteProps) {
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
      if (event.key.toLowerCase() === 'c') {
        setOpen((value) => !value)
      } else if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      items: SLIDERS.filter((slider) => slider.group === group),
    }))
  }, [])

  const set = (key: keyof VisualParams, value: number) => {
    onChange({ ...params, [key]: value })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-6 right-6 z-20 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-xs tracking-wide text-zinc-200 backdrop-blur-md transition hover:border-white/30 hover:bg-black/75"
      >
        ⌘ Effects <span className="ml-1 text-zinc-500">C</span>
      </button>
    )
  }

  return (
    <div className="fixed top-6 right-6 z-20 flex max-h-[calc(100svh-3rem)] w-72 flex-col overflow-hidden rounded-2xl border border-white/12 bg-zinc-950/70 text-zinc-200 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Visual controls</span>
          <span className="text-[11px] text-zinc-500">
            Press <kbd className="rounded bg-white/10 px-1">C</kbd> to toggle
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
        >
          Hide
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <BandMeters analyserNode={analyserNode} />

        <SectionLabel>Effect</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {VISUAL_MODES.map((mode, index) => (
            <button
              key={mode.id}
              type="button"
              title={mode.hint}
              onClick={() => set('mode', index)}
              className={`rounded-lg border px-2 py-2 text-left text-xs transition ${
                params.mode === index
                  ? 'border-white/40 bg-white/15 text-white'
                  : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
              }`}
            >
              <span className="block font-medium">{mode.label}</span>
              <span className="block text-[10px] text-zinc-500">{mode.hint}</span>
            </button>
          ))}
        </div>

        <SectionLabel>Presets</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {VISUAL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange({ ...preset.params })}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-300 transition hover:border-white/25 hover:text-white"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {grouped.map(({ group, items }) => (
          <div key={group}>
            <SectionLabel>{group}</SectionLabel>
            <div className="flex flex-col gap-3">
              {items.map((slider) => (
                <Slider
                  key={slider.key}
                  spec={slider}
                  value={params[slider.key]}
                  onChange={(value) => set(slider.key, value)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(JSON.stringify(params, null, 2))
          }}
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] py-2 text-xs text-zinc-300 transition hover:border-white/25 hover:text-white"
        >
          Copy values
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] py-2 text-xs text-zinc-300 transition hover:border-white/25 hover:text-white"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 mb-2 text-[10px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
      {children}
    </p>
  )
}

function Slider({
  spec,
  value,
  onChange,
}: {
  spec: SliderSpec
  value: number
  onChange: (value: number) => void
}) {
  const pct = ((value - spec.min) / (spec.max - spec.min)) * 100

  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="flex items-center justify-between">
        <span className="text-zinc-300">{spec.label}</span>
        <span className="tabular-nums text-zinc-500">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
        style={{
          background: `linear-gradient(to right, rgba(255,255,255,0.75) ${pct}%, rgba(255,255,255,0.12) ${pct}%)`,
        }}
      />
    </label>
  )
}

function BandMeters({ analyserNode }: { analyserNode: AnalyserNode | null }) {
  const bassRef = useRef<HTMLDivElement>(null)
  const midRef = useRef<HTMLDivElement>(null)
  const trebleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!analyserNode) {
      for (const ref of [bassRef, midRef, trebleRef]) {
        if (ref.current) {
          ref.current.style.transform = 'scaleX(0)'
        }
      }
      return
    }

    const analyser = new FrequencyAnalyser(analyserNode)
    let rafId = 0
    const tick = () => {
      const bands = analyser.update()
      if (bassRef.current) {
        bassRef.current.style.transform = `scaleX(${Math.min(1, bands.bass)})`
      }
      if (midRef.current) {
        midRef.current.style.transform = `scaleX(${Math.min(1, bands.mid)})`
      }
      if (trebleRef.current) {
        trebleRef.current.style.transform = `scaleX(${Math.min(1, bands.treble)})`
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [analyserNode])

  const rows: [string, RefObject<HTMLDivElement | null>][] = [
    ['Bass', bassRef],
    ['Mid', midRef],
    ['Treble', trebleRef],
  ]

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(([label, ref]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-10 text-[10px] text-zinc-500">{label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              ref={ref}
              className="h-full origin-left rounded-full bg-white/70"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
