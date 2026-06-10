// Generates the StayScape LINE rich menu image → public/richmenu.png (2500×1686).
// Run: node scripts/make-richmenu.mjs   (needs IBM Plex Sans Thai registered via fc-cache)
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUB = join(__dirname, '..', 'public')
const TH = "'IBM Plex Sans Thai','DejaVu Sans',sans-serif"

const logoB64 = readFileSync(join(PUB, 'brand-logo.png')).toString('base64')

// Simple white line-icons (no emoji — server-side emoji rendering is unreliable).
const ICON = {
  today:  '<rect x="-26" y="-22" width="52" height="48" rx="8"/><rect x="-26" y="-22" width="52" height="16" rx="8" opacity="0.0"/><line x1="-14" y1="-30" x2="-14" y2="-14"/><line x1="14" y1="-30" x2="14" y2="-14"/><line x1="-26" y1="-6" x2="26" y2="-6"/>',
  pending:'<line x1="-6" y1="-18" x2="26" y2="-18"/><line x1="-6" y1="0" x2="26" y2="0"/><line x1="-6" y1="18" x2="26" y2="18"/><circle cx="-20" cy="-18" r="4"/><circle cx="-20" cy="0" r="4"/><circle cx="-20" cy="18" r="4"/>',
  dash:   '<rect x="-26" y="-4" width="14" height="30" rx="3"/><rect x="-6" y="-20" width="14" height="46" rx="3"/><rect x="14" y="-12" width="14" height="38" rx="3"/>',
  report: '<polyline points="-26,18 -8,-4 6,8 26,-20" fill="none"/><polyline points="14,-20 26,-20 26,-8" fill="none"/>',
  add:    '<line x1="0" y1="-24" x2="0" y2="24"/><line x1="-24" y1="0" x2="24" y2="0"/>',
  help:   '<path d="M-14,-8 a14,14 0 1 1 18,16 c-4,3 -4,4 -4,10" fill="none"/><circle cx="0" cy="26" r="3.5"/>',
}

function cell(x, y, w, h, icon, label) {
  const cx = x + w / 2, top = y
  return `
    <g>
      <rect x="${x + 24}" y="${top + 24}" width="${w - 48}" height="${h - 48}" rx="34" fill="#FFFFFF" fill-opacity="0.16" stroke="#FFFFFF" stroke-opacity="0.30" stroke-width="2"/>
      <g transform="translate(${cx} ${top + h * 0.40})" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="#FFFFFF">${ICON[icon]}</g>
      <text x="${cx}" y="${top + h * 0.78}" font-family="${TH}" font-size="62" font-weight="700" fill="#FFFFFF" text-anchor="middle">${label}</text>
    </g>`
}

const svg = `<svg width="2500" height="1686" viewBox="0 0 2500 1686" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6C63FF"/><stop offset="0.55" stop-color="#8E84FF"/><stop offset="1" stop-color="#06B6D4"/>
    </linearGradient>
    <clipPath id="logoClip"><circle cx="500" cy="520" r="150"/></clipPath>
  </defs>
  <rect width="2500" height="1686" fill="url(#bg)"/>
  <circle cx="160" cy="120" r="220" fill="#FFFFFF" opacity="0.06"/>
  <circle cx="2400" cy="1560" r="280" fill="#FFFFFF" opacity="0.05"/>

  <!-- Left brand banner (tap → open app) -->
  <circle cx="500" cy="520" r="158" fill="#FFFFFF" opacity="0.18"/>
  <image x="350" y="370" width="300" height="300" clip-path="url(#logoClip)" xlink:href="data:image/png;base64,${logoB64}"/>
  <text x="500" y="820" font-family="${TH}" font-size="120" font-weight="700" fill="#FFFFFF" text-anchor="middle">StayScape</text>
  <text x="500" y="930" font-family="${TH}" font-size="52" font-weight="400" fill="#EDE9FF" text-anchor="middle">บันทึกงานง่ายๆ</text>
  <text x="500" y="1000" font-family="${TH}" font-size="52" font-weight="400" fill="#EDE9FF" text-anchor="middle">แค่พิมพ์บอกในไลน์</text>
  <g transform="translate(500 1180)">
    <rect x="-180" y="-46" width="360" height="92" rx="46" fill="#FFFFFF"/>
    <text x="0" y="16" font-family="${TH}" font-size="46" font-weight="700" fill="#6C63FF" text-anchor="middle">แตะเพื่อเปิดแอป</text>
  </g>

  <!-- divider -->
  <line x1="1000" y1="120" x2="1000" y2="1566" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="2"/>

  <!-- Right grid 2×3 -->
  ${cell(1000, 0,    750, 562, 'today',   'งานวันนี้')}
  ${cell(1750, 0,    750, 562, 'pending', 'งานค้าง')}
  ${cell(1000, 562,  750, 562, 'dash',    'แดชบอร์ด')}
  ${cell(1750, 562,  750, 562, 'report',  'รายงาน')}
  ${cell(1000, 1124, 750, 562, 'add',     'เพิ่มงาน')}
  ${cell(1750, 1124, 750, 562, 'help',    'วิธีใช้')}
</svg>`

await sharp(Buffer.from(svg)).png().toFile(join(PUB, 'richmenu.png'))
console.log('✅ wrote public/richmenu.png (2500×1686)')
