// Genera iconos PNG sencillos (fondo verde azulado y una "H" blanca) sin dependencias externas.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, maskable) {
  const bg = [15, 118, 110], fg = [255, 255, 255]
  const raw = Buffer.alloc((size * 3 + 1) * size)
  // "H": zona segura central (maskable usa 60 %, normal 70 %)
  const box = size * (maskable ? 0.3 : 0.35)
  const c = size / 2, t = size * 0.09
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const inBox = Math.abs(x - c) <= box && Math.abs(y - c) <= box
      const stem = Math.abs(x - c) >= box - t
      const bar = Math.abs(y - c) <= t / 2
      let col = bg
      if (inBox && (stem || bar)) col = fg
      if (!maskable) {
        // esquinas redondeadas
        const r = size * 0.18, dx = Math.max(0, r - Math.min(x, size - 1 - x)), dy = Math.max(0, r - Math.min(y, size - 1 - y))
        if (dx * dx + dy * dy > r * r) col = [255, 255, 255]
      }
      const o = y * (size * 3 + 1) + 1 + x * 3
      raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
writeFileSync('public/icons/icon-192.png', png(192, false))
writeFileSync('public/icons/icon-512.png', png(512, false))
writeFileSync('public/icons/maskable-512.png', png(512, true))
writeFileSync('public/icons/apple-touch-icon.png', png(180, false))
console.log('Iconos generados')
