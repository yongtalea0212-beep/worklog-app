// Generates the WorkLog AI mascot PNGs into public/ using sharp.
// Run: node scripts/make-mascot.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUB = join(__dirname, '..', 'public')

// ── Reusable mascot face (a friendly purple assistant-bot) ──────────────
// cx/cy = head centre, s = scale (1 = 288px head). Returns SVG markup.
function face(cx, cy, s = 1) {
  const t = `translate(${cx} ${cy}) scale(${s}) translate(-256 -256)`
  return `<g transform="${t}">
    <!-- antenna -->
    <rect x="248" y="60" width="16" height="58" rx="8" fill="#9B8FFF"/>
    <circle cx="256" cy="54" r="21" fill="#22D3EE"/>
    <circle cx="249" cy="47" r="6" fill="#EAFEFF"/>
    <!-- ears / pods -->
    <rect x="86"  y="222" width="34" height="86" rx="17" fill="#5B53E8"/>
    <rect x="392" y="222" width="34" height="86" rx="17" fill="#5B53E8"/>
    <rect x="92"  y="242" width="22" height="46" rx="11" fill="#22D3EE"/>
    <rect x="398" y="242" width="22" height="46" rx="11" fill="#22D3EE"/>
    <!-- head -->
    <rect x="112" y="118" width="288" height="276" rx="78" fill="url(#body)"/>
    <rect x="142" y="134" width="228" height="58" rx="29" fill="#FFFFFF" opacity="0.14"/>
    <!-- visor -->
    <rect x="150" y="180" width="212" height="150" rx="56" fill="url(#visor)"/>
    <rect x="168" y="192" width="176" height="28" rx="14" fill="#FFFFFF" opacity="0.06"/>
    <!-- eyes -->
    <ellipse cx="212" cy="254" rx="26" ry="31" fill="url(#eye)"/>
    <ellipse cx="300" cy="254" rx="26" ry="31" fill="url(#eye)"/>
    <circle cx="204" cy="244" r="8" fill="#EAFEFF"/>
    <circle cx="292" cy="244" r="8" fill="#EAFEFF"/>
    <!-- smile -->
    <path d="M214 298 Q256 324 298 298" stroke="#22D3EE" stroke-width="11" stroke-linecap="round" fill="none"/>
    <!-- cheeks -->
    <circle cx="170" cy="296" r="13" fill="#FF8FB1" opacity="0.55"/>
    <circle cx="342" cy="296" r="13" fill="#FF8FB1" opacity="0.55"/>
  </g>`
}

const DEFS = `<defs>
  <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7C75FF"/><stop offset="1" stop-color="#5B53E8"/>
  </linearGradient>
  <linearGradient id="visor" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0B1020"/><stop offset="1" stop-color="#1A2240"/>
  </linearGradient>
  <radialGradient id="eye" cx="0.5" cy="0.4" r="0.75">
    <stop offset="0" stop-color="#A8F0FF"/><stop offset="0.5" stop-color="#22D3EE"/><stop offset="1" stop-color="#06B6D4"/>
  </radialGradient>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6C63FF"/><stop offset="1" stop-color="#8E84FF"/>
  </linearGradient>
  <filter id="cardShadow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#1A1147" flood-opacity="0.25"/>
  </filter>
</defs>`

function star(cx, cy, r, fill, op = 1) {
  const r2 = r * 0.38
  const p = []
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI / 4) * i - Math.PI / 2
    const rad = i % 2 === 0 ? r : r2
    p.push(`${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`)
  }
  return `<polygon points="${p.join(' ')}" fill="${fill}" opacity="${op}"/>`
}

// ── 1) Face-only (transparent) → circular avatars in card headers ──────
const faceSvg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  ${DEFS}
  <ellipse cx="256" cy="452" rx="118" ry="20" fill="#5B53E8" opacity="0.16"/>
  ${face(256, 250, 1)}
</svg>`

// ── 2) Hero banner → welcome / weekly card hero ────────────────────────
const heroSvg = `<svg width="1040" height="540" viewBox="0 0 1040 540" xmlns="http://www.w3.org/2000/svg">
  ${DEFS}
  <rect width="1040" height="540" fill="url(#bg)"/>
  <!-- bokeh -->
  <circle cx="120" cy="90"  r="120" fill="#FFFFFF" opacity="0.07"/>
  <circle cx="980" cy="470" r="160" fill="#FFFFFF" opacity="0.06"/>
  <circle cx="900" cy="80"  r="60"  fill="#FFFFFF" opacity="0.07"/>
  <!-- sparkles -->
  ${star(700, 120, 22, '#FFFFFF', 0.9)}
  ${star(640, 220, 12, '#C9F7FF', 0.9)}
  ${star(940, 250, 16, '#FFFFFF', 0.8)}
  <!-- mascot -->
  ${face(320, 270, 0.92)}
  <!-- floating checklist card -->
  <g filter="url(#cardShadow)">
    <rect x="600" y="150" width="320" height="250" rx="34" fill="#FFFFFF"/>
  </g>
  <rect x="600" y="150" width="320" height="64" rx="34" fill="#F0EEFF"/>
  <rect x="600" y="188" width="320" height="26" fill="#F0EEFF"/>
  <circle cx="640" cy="182" r="12" fill="#6C63FF"/>
  <rect x="666" y="172" width="150" height="20" rx="10" fill="#C7BFFF"/>
  ${[0, 1, 2].map((i) => {
    const y = 252 + i * 50
    const done = i === 0
    return `<rect x="628" y="${y - 18}" width="34" height="34" rx="9" fill="${done ? '#10B981' : '#EDEAFF'}"/>
      ${done ? `<path d="M636 ${y - 1} l6 7 l12 -14" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` : ''}
      <rect x="680" y="${y - 12}" width="${i === 1 ? 180 : 150}" height="20" rx="10" fill="#E7E3FF"/>`
  }).join('')}
</svg>`

await sharp(Buffer.from(faceSvg)).png().toFile(join(PUB, 'mascot-face.png'))
await sharp(Buffer.from(heroSvg)).png().toFile(join(PUB, 'mascot-hero.png'))
console.log('✅ wrote public/mascot-face.png + public/mascot-hero.png')
