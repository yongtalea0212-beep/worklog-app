// Generates StayScape brand assets into public/ (+ favicon.ico) using sharp.
// Run: node scripts/make-brand.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUB = join(__dirname, '..', 'public')
const APP = join(__dirname, '..', 'app')

// ── The StayScape "S" mark on a rounded tile (brand purple→cyan) ──
function iconSVG({ bg = true } = {}) {
  // Angular seven-segment-style "S" ribbon.
  const sPath = 'M362,150 L160,150 L160,256 L362,256 L362,362 L160,362'
  return `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#EEF2FF"/><stop offset="1" stop-color="#DCE7FF"/>
      </linearGradient>
      <linearGradient id="smark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7C75FF"/><stop offset="0.5" stop-color="#6C63FF"/><stop offset="1" stop-color="#22D3EE"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.35" r="0.7">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.9"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${bg ? `<rect width="512" height="512" rx="112" fill="url(#tile)"/>
    <ellipse cx="256" cy="170" rx="240" ry="150" fill="url(#glow)"/>` : ''}
    <path d="${sPath}" fill="none" stroke="url(#smark)" stroke-width="56" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${sPath}" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" opacity="0.45"/>
  </svg>`
}

// ── OG image: 1200×630 brand banner with logo + wordmark ──
function ogSVG() {
  const sPath = 'M362,150 L160,150 L160,256 L362,256 L362,362 L160,362'
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6C63FF"/><stop offset="0.55" stop-color="#8E84FF"/><stop offset="1" stop-color="#06B6D4"/>
      </linearGradient>
      <linearGradient id="smark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#A8C4FF"/><stop offset="0.5" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9F7FF"/>
      </linearGradient>
      <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.08"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <circle cx="120" cy="90" r="150" fill="#FFFFFF" opacity="0.07"/>
    <circle cx="1080" cy="560" r="200" fill="#FFFFFF" opacity="0.06"/>
    <!-- logo tile -->
    <g transform="translate(150,175) scale(0.56)">
      <rect width="512" height="512" rx="112" fill="url(#tile)" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="3"/>
      <path d="${sPath}" fill="none" stroke="url(#smark)" stroke-width="56" stroke-linejoin="round" stroke-linecap="round"/>
    </g>
    <!-- wordmark -->
    <text x="490" y="300" font-family="DejaVu Sans, Arial, sans-serif" font-size="104" font-weight="700" fill="#FFFFFF">StayScape</text>
    <text x="494" y="372" font-family="DejaVu Sans, Arial, sans-serif" font-size="40" font-weight="400" fill="#E8E0FF">AI Work Management Platform</text>
    <rect x="494" y="404" width="120" height="6" rx="3" fill="#22D3EE"/>
  </svg>`
}

function icoFromPng(pngBuf, size) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4)
  const entry = Buffer.alloc(16)
  entry.writeUInt8(size >= 256 ? 0 : size, 0); entry.writeUInt8(size >= 256 ? 0 : size, 1)
  entry.writeUInt8(0, 2); entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngBuf.length, 8); entry.writeUInt32LE(22, 12)
  return Buffer.concat([header, entry, pngBuf])
}

const icon = Buffer.from(iconSVG())
const png = (size) => sharp(icon).resize(size, size).png()

// App Router file conventions → Next auto-generates <link> tags (no duplication).
await png(512).toFile(join(APP, 'icon.png'))         // /icon  (+ favicon fallback)
await png(180).toFile(join(APP, 'apple-icon.png'))   // /apple-icon (apple-touch-icon)
const fav64 = await png(64).toBuffer()
writeFileSync(join(APP, 'favicon.ico'), icoFromPng(fav64, 64)) // /favicon.ico

// public/ assets referenced by manifest.json + OG meta (fixed, scrapable URLs).
await png(192).toFile(join(PUB, 'icon-192.png'))
await png(512).toFile(join(PUB, 'icon-512.png'))
await sharp(Buffer.from(ogSVG())).jpeg({ quality: 90 }).toFile(join(PUB, 'og-image.jpg'))

console.log('✅ brand assets: app/{favicon.ico,icon.png,apple-icon.png} + public/{icon-192,icon-512,og-image.jpg}')
