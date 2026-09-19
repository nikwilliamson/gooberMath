// Generates the PWA icons with no image dependencies: raw RGBA -> zlib -> PNG.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size)
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const dist = (x, y, cx, cy) => Math.hypot(x - cx, y - cy)

const goober = (x, y, S) => {
  const u = S / 512
  const cx = 256 * u, cy = 286 * u, R = 156 * u
  // rounded-square navy backdrop
  const pad = 26 * u, r = 96 * u
  const inX = Math.min(Math.max(x, pad + r), S - pad - r)
  const inY = Math.min(Math.max(y, pad + r), S - pad - r)
  const outside = dist(x, y, inX, inY) > r
  if (x < pad || y < pad || x > S - pad || y > S - pad || outside) return [0, 0, 0, 0]

  let col = mix([31, 58, 105], [12, 27, 51], y / S)

  const d = dist(x, y, cx, cy)
  if (d < R) {
    const shade = Math.min(1, dist(x, y, cx - 50 * u, cy - 60 * u) / (R * 1.5))
    col = mix([122, 200, 255], [37, 92, 200], shade)
    if (y < cy - 60 * u) col = mix([255, 176, 80], [242, 115, 31], (cy - 60 * u - y) / (R * 0.8)) // cap
    if (y > cy - 66 * u && y < cy - 54 * u && Math.abs(x - cx) < R * 0.92) col = [22, 35, 61] // cap brim line
  }
  // eyes
  for (const ex of [cx - 52 * u, cx + 52 * u]) {
    const ed = dist(x, y, ex, cy + 10 * u)
    if (ed < 40 * u) col = [255, 255, 255]
    if (ed < 38 * u && dist(x, y, ex + 4 * u, cy + 16 * u) < 19 * u) col = [22, 35, 61]
  }
  // smile
  const md = dist(x, y, cx, cy + 34 * u)
  if (md > 44 * u && md < 62 * u && y > cy + 46 * u) col = [110, 26, 52]
  // outline
  if (d > R - 6 * u && d < R) col = [22, 35, 61]
  return [...col, 255]
}

mkdirSync('public', { recursive: true })
for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, png(size, goober))
  console.log(`public/icon-${size}.png`)
}
