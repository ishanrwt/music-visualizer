import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const SIZE = 256

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([length, typeBuf, data, crc])
}

function writePng(filePath, getPixel) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const raw = Buffer.alloc((SIZE * 3 + 1) * SIZE)
  for (let y = 0; y < SIZE; y++) {
    const row = y * (SIZE * 3 + 1)
    raw[row] = 0
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b] = getPixel(x / (SIZE - 1), y / (SIZE - 1))
      const i = row + 1 + x * 3
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, png)
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t)
}

function gradient(c1, c2) {
  return (u, v) => {
    const t = u * 0.65 + v * 0.35
    return [
      lerp(c1[0], c2[0], t),
      lerp(c1[1], c2[1], t),
      lerp(c1[2], c2[2], t),
    ]
  }
}

const outDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/albums',
)

writePng(path.join(outDir, 'e85.png'), gradient([20, 8, 36], [236, 92, 28]))
writePng(path.join(outDir, 'stateside.png'), gradient([232, 64, 148], [48, 72, 196]))
writePng(path.join(outDir, 'stronger.png'), gradient([240, 168, 32], [28, 24, 72]))
writePng(path.join(outDir, 'walk-it-talk-it.png'), gradient([16, 48, 40], [212, 168, 64]))
writePng(path.join(outDir, 'bass-drone.png'), gradient([92, 12, 18], [220, 96, 28]))
writePng(path.join(outDir, 'full-spectrum.png'), gradient([12, 140, 148], [196, 36, 168]))

console.log(`Wrote album art to ${outDir}`)
