export type RGB = {
  r: number
  g: number
  b: number
}

export type Palette = {
  /** Dominant colors, ordered by hue. Always exactly PALETTE_SIZE entries. */
  colors: RGB[]
}

export const PALETTE_SIZE = 5

const SAMPLE_STEP = 6
const HUE_BINS = 24
const MIN_SATURATION = 0.06

const cache = new Map<string, Promise<Palette>>()

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load album art: ${url}`))
    image.src = url
  })
}

function rgbToHsv(r: number, g: number, b: number): {
  h: number
  s: number
  v: number
} {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d) % 6
    } else if (max === g) {
      h = (b - r) / d + 2
    } else {
      h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) {
      h += 360
    }
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  return { r: r + m, g: g + m, b: b + m }
}

const FALLBACK: RGB[] = [
  { r: 0.09, g: 0.09, b: 0.16 },
  { r: 0.24, g: 0.13, b: 0.36 },
  { r: 0.55, g: 0.18, b: 0.42 },
  { r: 0.16, g: 0.42, b: 0.55 },
  { r: 0.82, g: 0.62, b: 0.35 },
]

async function extractPaletteUncached(imageUrl: string): Promise<Palette> {
  const image = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Could not create 2D canvas context')
  }

  context.drawImage(image, 0, 0)
  const { data } = context.getImageData(0, 0, width, height)

  const bins = Array.from({ length: HUE_BINS }, () => ({
    weight: 0,
    r: 0,
    g: 0,
    b: 0,
    count: 0,
  }))

  const stride = SAMPLE_STEP * 4
  for (let i = 0; i < data.length; i += stride) {
    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    const a = data[i + 3] ?? 0
    if (a < 16) {
      continue
    }

    const hsv = rgbToHsv(r / 255, g / 255, b / 255)
    if (hsv.s < MIN_SATURATION) {
      continue
    }

    const binIndex = Math.min(
      HUE_BINS - 1,
      Math.floor((hsv.h / 360) * HUE_BINS),
    )
    const bin = bins[binIndex]
    if (!bin) {
      continue
    }
    // Favor vivid, mid-to-bright pixels.
    const weight = hsv.s * hsv.s * (0.35 + hsv.v * 0.65)
    bin.weight += weight
    bin.r += r * weight
    bin.g += g * weight
    bin.b += b * weight
    bin.count += 1
  }

  const candidates = bins
    .filter((bin) => bin.count > 0 && bin.weight > 0)
    .map((bin) => ({
      weight: bin.weight,
      color: {
        r: bin.r / bin.weight / 255,
        g: bin.g / bin.weight / 255,
        b: bin.b / bin.weight / 255,
      },
    }))
    .sort((left, right) => right.weight - left.weight)

  const chosen: RGB[] = candidates.slice(0, PALETTE_SIZE).map((c) => c.color)

  // Not enough distinct hues in the art — synthesize the rest by rotating the
  // strongest hue around the wheel and nudging brightness so the gradient still
  // has range to move through.
  if (chosen.length > 0) {
    const seed = rgbToHsv(chosen[0]!.r, chosen[0]!.g, chosen[0]!.b)
    let step = 0
    while (chosen.length < PALETTE_SIZE) {
      step += 1
      const h = (seed.h + step * 67) % 360
      const v = Math.min(1, Math.max(0.28, seed.v + (step % 2 === 0 ? 0.18 : -0.16)))
      const s = Math.min(1, Math.max(0.4, seed.s + 0.1))
      chosen.push(hsvToRgb(h, s, v))
    }
  }

  const colors = (chosen.length === PALETTE_SIZE ? chosen : FALLBACK).slice()

  // Order by hue so the gradient sweeps rather than jumps.
  colors.sort(
    (a, b) =>
      rgbToHsv(a.r, a.g, a.b).h - rgbToHsv(b.r, b.g, b.b).h,
  )

  return { colors }
}

/**
 * Extract a small ordered palette from an image URL.
 * Results are cached per URL — call `clearPaletteCache()` to force a re-run.
 */
export function extractPalette(imageUrl: string): Promise<Palette> {
  const cached = cache.get(imageUrl)
  if (cached) {
    return cached
  }
  const pending = extractPaletteUncached(imageUrl).catch(() => ({
    colors: FALLBACK.slice(),
  }))
  cache.set(imageUrl, pending)
  return pending
}

export function clearPaletteCache(): void {
  cache.clear()
}
