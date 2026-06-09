// Generates the WorkLog AI mascot PNGs (multiple poses) into public/ using sharp.
// Run: node scripts/make-mascot.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUB = join(__dirname, '..', 'public')

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

function localStar(cx, cy, r, fill, op = 1) {
  const r2 = r * 0.4
  const p = []
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI / 4) * i - Math.PI / 2
    const rad = i % 2 === 0 ? r : r2
    p.push(`${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`)
  }
  return `<polygon points="${p.join(' ')}" fill="${fill}" opacity="${op}"/>`
}

// Eyes + mouth per expression (local 512 coords inside the head group).
function features(expr) {
  if (expr === 'happy') {
    return `
      <path d="M188 260 Q212 234 236 260" stroke="#22D3EE" stroke-width="13" stroke-linecap="round" fill="none"/>
      <path d="M276 260 Q300 234 324 260" stroke="#22D3EE" stroke-width="13" stroke-linecap="round" fill="none"/>
      <path d="M212 294 L300 294 Q256 340 212 294 Z" fill="#22D3EE"/>
      <circle cx="166" cy="292" r="14" fill="#FF8FB1" opacity="0.65"/>
      <circle cx="346" cy="292" r="14" fill="#FF8FB1" opacity="0.65"/>`
  }
  if (expr === 'alert') {
    return `
      <ellipse cx="212" cy="256" rx="22" ry="26" fill="url(#eye)"/>
      <ellipse cx="300" cy="256" rx="22" ry="26" fill="url(#eye)"/>
      <circle cx="206" cy="247" r="7" fill="#EAFEFF"/>
      <circle cx="294" cy="247" r="7" fill="#EAFEFF"/>
      <ellipse cx="256" cy="306" rx="15" ry="12" fill="#22D3EE"/>
      <circle cx="172" cy="296" r="11" fill="#FF8FB1" opacity="0.45"/>
      <circle cx="340" cy="296" r="11" fill="#FF8FB1" opacity="0.45"/>`
  }
  // neutral
  return `
    <ellipse cx="212" cy="254" rx="26" ry="31" fill="url(#eye)"/>
    <ellipse cx="300" cy="254" rx="26" ry="31" fill="url(#eye)"/>
    <circle cx="204" cy="244" r="8" fill="#EAFEFF"/>
    <circle cx="292" cy="244" r="8" fill="#EAFEFF"/>
    <path d="M214 298 Q256 324 298 298" stroke="#22D3EE" stroke-width="11" stroke-linecap="round" fill="none"/>
    <circle cx="170" cy="296" r="13" fill="#FF8FB1" opacity="0.55"/>
    <circle cx="342" cy="296" r="13" fill="#FF8FB1" opacity="0.55"/>`
}

// The mascot head. cx/cy = centre, s = scale, opts.expr / opts.wave / opts.badge.
function mascot(cx, cy, s = 1, opts = {}) {
  const { expr = 'neutral', wave = false, badge = 'none' } = opts
  const tipColor = badge === 'warn' ? '#F59E0B' : '#22D3EE'
  const t = `translate(${cx} ${cy}) scale(${s}) translate(-256 -256)`
  const wavePart = wave ? `
    <g transform="rotate(18 250 372)">
      <rect x="372" y="318" width="34" height="78" rx="17" fill="#5B53E8"/>
      <circle cx="392" cy="312" r="34" fill="#7C75FF"/>
    </g>
    <path d="M444 296 q16 -6 28 -2" stroke="#C9B8FF" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M448 320 q16 2 26 10" stroke="#C9B8FF" stroke-width="7" stroke-linecap="round" fill="none"/>` : ''
  const sparkles = expr === 'happy'
    ? localStar(120, 150, 18, '#FFFFFF', 0.95) + localStar(404, 168, 14, '#C9F7FF', 0.95) + localStar(96, 300, 12, '#FFE680', 0.9)
    : ''
  const warnBadge = badge === 'warn' ? `
    <circle cx="372" cy="150" r="30" fill="#F59E0B"/>
    <rect x="367" y="134" width="10" height="22" rx="5" fill="#FFFFFF"/>
    <circle cx="372" cy="164" r="5.5" fill="#FFFFFF"/>` : ''
  return `<g transform="${t}">
    ${sparkles}
    <!-- antenna -->
    <rect x="248" y="60" width="16" height="58" rx="8" fill="#9B8FFF"/>
    <circle cx="256" cy="54" r="21" fill="${tipColor}"/>
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
    ${features(expr)}
    ${warnBadge}
    ${wavePart}
  </g>`
}

function headPng(name, opts) {
  const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    ${DEFS}
    <ellipse cx="256" cy="452" rx="118" ry="20" fill="#5B53E8" opacity="0.16"/>
    ${mascot(256, 250, 1, opts)}
  </svg>`
  return sharp(Buffer.from(svg)).png().toFile(join(PUB, name))
}

// Hero banner (mascot + floating checklist + sparkles). opts passed to mascot.
function heroPng(name, opts) {
  const svg = `<svg width="1040" height="540" viewBox="0 0 1040 540" xmlns="http://www.w3.org/2000/svg">
    ${DEFS}
    <rect width="1040" height="540" fill="url(#bg)"/>
    <circle cx="120" cy="90"  r="120" fill="#FFFFFF" opacity="0.07"/>
    <circle cx="980" cy="470" r="160" fill="#FFFFFF" opacity="0.06"/>
    <circle cx="900" cy="80"  r="60"  fill="#FFFFFF" opacity="0.07"/>
    ${localStar(700, 120, 22, '#FFFFFF', 0.9)}
    ${localStar(640, 220, 12, '#C9F7FF', 0.9)}
    ${localStar(940, 250, 16, '#FFFFFF', 0.8)}
    ${mascot(320, 270, 0.92, opts)}
    <g filter="url(#cardShadow)"><rect x="600" y="150" width="320" height="250" rx="34" fill="#FFFFFF"/></g>
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
  return sharp(Buffer.from(svg)).png().toFile(join(PUB, name))
}

await Promise.all([
  headPng('mascot-face.png',  { expr: 'neutral' }),
  headPng('mascot-happy.png', { expr: 'happy' }),
  headPng('mascot-alert.png', { expr: 'alert', badge: 'warn' }),
  headPng('mascot-wave.png',  { expr: 'neutral', wave: true }),
  heroPng('mascot-hero.png',       { expr: 'neutral' }),
  heroPng('mascot-hero-wave.png',  { expr: 'neutral', wave: true }),
])
console.log('✅ wrote mascot poses: face, happy, alert, wave + hero, hero-wave')
