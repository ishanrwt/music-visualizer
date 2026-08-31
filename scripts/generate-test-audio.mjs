import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SAMPLE_RATE = 44100
const DURATION_SEC = 8
const NUM_SAMPLES = SAMPLE_RATE * DURATION_SEC
const ATTACK_SAMPLES = Math.floor(SAMPLE_RATE * 0.05)

function writeWav(filePath, samples) {
  const dataSize = samples.length * 2
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2)
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, buffer)
}

function envelope(i) {
  const attack = Math.min(1, i / ATTACK_SAMPLES)
  const release = Math.min(1, (NUM_SAMPLES - 1 - i) / ATTACK_SAMPLES)
  return Math.min(attack, release)
}

function sine(freq, i) {
  return Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE)
}

const bass = Array.from({ length: NUM_SAMPLES }, (_, i) => {
  return sine(110, i) * 0.6 * envelope(i)
})

const full = Array.from({ length: NUM_SAMPLES }, (_, i) => {
  const mix =
    sine(110, i) * 0.35 + sine(1000, i) * 0.3 + sine(8000, i) * 0.25
  return mix * envelope(i)
})

const outDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/audio',
)

writeWav(path.join(outDir, 'bass-drone.wav'), bass)
writeWav(path.join(outDir, 'full-spectrum.wav'), full)
console.log(`Wrote test audio to ${outDir}`)
