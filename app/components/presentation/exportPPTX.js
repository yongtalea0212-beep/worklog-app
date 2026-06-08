// Production PPTX export. Uses pptxgenjs (lazy-imported) and a Thai-capable
// font face so Thai + English render without missing glyphs in PowerPoint.
import { safeFileName } from './shared'

// Tahoma ships with both Windows and macOS Office and has full Thai coverage,
// which makes it the most reliable cross-platform face for mixed TH/EN decks.
const FONT = 'Tahoma'

export async function exportToPPTX(slides, theme, meta = {}) {
  const mod = await import('pptxgenjs')
  const PptxGenJS = mod.default || mod
  const pptx = new PptxGenJS()

  pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 })
  pptx.layout = 'WIDE'
  pptx.title = meta.title || 'Monthly Work Report'
  pptx.author = meta.brand || 'WorkLog AI'
  pptx.subject = meta.periodLabel || ''

  const W = 13.333
  const isDark = theme.dark
  const bgC = theme.bg
  const acc = theme.accent
  const txtM = isDark ? 'F1F5F9' : '1E293B'
  const txtS = isDark ? 'CBD5E1' : '64748B'
  const txtMu = isDark ? '64748B' : '94A3B8'
  const cardC = isDark ? '1E293B' : 'FFFFFF'

  const eyebrow = (s, t) => s.addText(String(t || '').toUpperCase(), {
    x: 0.8, y: 0.5, w: W - 1.6, h: 0.35, fontSize: 11, bold: true, color: acc,
    charSpacing: 3, fontFace: FONT, margin: 0,
  })
  const heading = (s, t) => s.addText(String(t || ''), {
    x: 0.8, y: 0.9, w: W - 1.6, h: 0.9, fontSize: 30, bold: true, color: txtM,
    fontFace: FONT, margin: 0,
  })

  for (let idx = 0; idx < slides.length; idx++) {
    const slide = slides[idx]
    const s = pptx.addSlide()
    s.background = { color: bgC }

    // Decorative orbs (kept subtle so text stays legible)
    s.addShape(pptx.shapes.OVAL, { x: 11.4, y: -1, w: 3.2, h: 3.2, fill: { color: acc, transparency: 84 }, line: { type: 'none' } })
    s.addShape(pptx.shapes.OVAL, { x: -0.8, y: 5.6, w: 2.4, h: 2.4, fill: { color: acc, transparency: 88 }, line: { type: 'none' } })
    s.addText(`${idx + 1} / ${slides.length}`, { x: W - 2, y: 7.0, w: 1.6, h: 0.3, fontSize: 9, color: txtMu, align: 'right', fontFace: FONT, margin: 0 })

    if (slide.type === 'cover') {
      s.addText(String(meta.brand || 'WORKLOG AI').toUpperCase(), { x: 1, y: 1.7, w: W - 2, h: 0.4, fontSize: 12, bold: true, color: acc, charSpacing: 4, align: 'center', fontFace: FONT, margin: 0 })
      s.addText(String(slide.title || meta.title || 'Monthly Work Report'), { x: 1, y: 2.3, w: W - 2, h: 1.4, fontSize: 44, bold: true, color: txtM, align: 'center', fontFace: FONT, margin: 0 })
      s.addText(String(slide.subtitle || meta.periodLabel || ''), { x: 1, y: 3.8, w: W - 2, h: 0.6, fontSize: 18, color: txtS, align: 'center', fontFace: FONT, margin: 0 })
      const stats = (slide.stats || []).slice(0, 4)
      const cW = 2.3, gap = 0.35, totalW = stats.length * (cW + gap) - gap
      const startX = (W - totalW) / 2
      stats.forEach((st, i) => {
        const cx = startX + i * (cW + gap)
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: cx, y: 4.8, w: cW, h: 1.2, rectRadius: 0.1, fill: { color: cardC, transparency: isDark ? 20 : 4 }, line: { color: acc, transparency: 70 } })
        s.addText(String(st.value), { x: cx, y: 4.95, w: cW, h: 0.6, fontSize: 28, bold: true, color: acc, align: 'center', fontFace: FONT, margin: 0 })
        s.addText(String(st.label || ''), { x: cx, y: 5.55, w: cW, h: 0.35, fontSize: 11, color: txtMu, align: 'center', fontFace: FONT, margin: 0 })
      })
    }

    else if (slide.type === 'summary') {
      eyebrow(s, slide.eyebrow || slide.section || 'Executive Summary')
      s.addText(String(slide.title || ''), { x: 0.8, y: 0.9, w: W - 1.6, h: 1, fontSize: 30, bold: true, color: txtM, align: 'center', fontFace: FONT, margin: 0 })
      if (slide.body) s.addText(String(slide.body), { x: 1.6, y: 2.1, w: W - 3.2, h: 2.4, fontSize: 15, color: txtS, align: 'center', fontFace: FONT, lineSpacingMultiple: 1.45, valign: 'top' })
      const badges = (slide.badges || []).slice(0, 5)
      const bW = 2.2, gap = 0.25, totalW = badges.length * (bW + gap) - gap
      const startX = (W - totalW) / 2
      badges.forEach((b, i) => {
        const bx = startX + i * (bW + gap)
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: bx, y: 5.6, w: bW, h: 0.6, rectRadius: 0.3, fill: { color: acc, transparency: 82 }, line: { color: acc, transparency: 55 } })
        s.addText(String(b), { x: bx, y: 5.6, w: bW, h: 0.6, fontSize: 12, bold: true, color: acc, align: 'center', valign: 'middle', fontFace: FONT, margin: 0 })
      })
    }

    else if (slide.type === 'stats') {
      eyebrow(s, slide.eyebrow || slide.section || 'KPI')
      heading(s, slide.title)
      const stats = (slide.stats || []).slice(0, 6)
      const cols = 3, cW = 3.7, cH = 1.9, gx = 0.25, gy = 0.3
      const gridW = cols * cW + (cols - 1) * gx
      const startX = (W - gridW) / 2
      stats.forEach((st, i) => {
        const col = i % cols, row = Math.floor(i / cols)
        const cx = startX + col * (cW + gx), cy = 2.1 + row * (cH + gy)
        const c = st.color ? String(st.color).replace('#', '') : acc
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: cx, y: cy, w: cW, h: cH, rectRadius: 0.1, fill: { color: cardC, transparency: isDark ? 22 : 4 }, line: { color: c, transparency: 60 } })
        s.addText(String(st.label || '').toUpperCase(), { x: cx, y: cy + 0.2, w: cW, h: 0.4, fontSize: 11, bold: true, color: txtMu, align: 'center', fontFace: FONT, margin: 0 })
        s.addText(String(st.value || ''), { x: cx, y: cy + 0.6, w: cW, h: 0.9, fontSize: 34, bold: true, color: c, align: 'center', fontFace: FONT, margin: 0 })
        if (st.sub) s.addText(String(st.sub), { x: cx, y: cy + 1.45, w: cW, h: 0.35, fontSize: 10, color: txtMu, align: 'center', fontFace: FONT, margin: 0 })
      })
    }

    else if (slide.type === 'chart') {
      eyebrow(s, slide.eyebrow || slide.section || 'Analytics')
      heading(s, slide.title)
      const bars = (slide.bars || []).slice(0, 6)
      const maxV = Math.max(...bars.map(b => Number(b.value) || 0), 1)
      const labelW = 3.2, barX = 4.2, barMaxW = W - barX - 1.6
      bars.forEach((b, i) => {
        const yy = 2.2 + i * 0.75, pct = Math.min((Number(b.value) || 0) / maxV, 1)
        s.addText(String(b.label || ''), { x: 0.8, y: yy, w: labelW, h: 0.5, fontSize: 13, color: txtM, fontFace: FONT, valign: 'middle' })
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: barX, y: yy + 0.08, w: barMaxW, h: 0.36, rectRadius: 0.18, fill: { color: acc, transparency: 86 }, line: { type: 'none' } })
        if (pct > 0) s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: barX, y: yy + 0.08, w: Math.max(barMaxW * pct, 0.1), h: 0.36, rectRadius: 0.18, fill: { color: acc }, line: { type: 'none' } })
        s.addText(String(b.value) + (b.unit || ''), { x: W - 1.5, y: yy, w: 1.3, h: 0.5, fontSize: 13, bold: true, color: acc, align: 'right', fontFace: FONT, valign: 'middle', margin: 0 })
      })
    }

    else if (slide.type === 'timeline') {
      eyebrow(s, slide.eyebrow || slide.section || 'Timeline')
      heading(s, slide.title)
      const events = (slide.events || []).slice(0, 6)
      events.forEach((ev, i) => {
        const yy = 2.1 + i * 0.82
        s.addShape(pptx.shapes.OVAL, { x: 0.8, y: yy + 0.06, w: 0.42, h: 0.42, fill: { color: acc, transparency: 15 }, line: { color: acc } })
        s.addText(String(i + 1), { x: 0.8, y: yy + 0.06, w: 0.42, h: 0.42, fontSize: 13, bold: true, color: isDark ? 'FFFFFF' : bgC, align: 'center', valign: 'middle', fontFace: FONT, margin: 0 })
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 1.45, y: yy, w: W - 2.25, h: 0.66, rectRadius: 0.08, fill: { color: cardC, transparency: isDark ? 22 : 4 }, line: { color: acc, transparency: 72 } })
        s.addText(String(ev.title || ''), { x: 1.65, y: yy + 0.02, w: 7.4, h: 0.34, fontSize: 13, bold: true, color: txtM, fontFace: FONT, valign: 'middle' })
        if (ev.date) s.addText(String(ev.date), { x: W - 3.4, y: yy + 0.02, w: 2.4, h: 0.34, fontSize: 11, color: acc, align: 'right', fontFace: FONT, valign: 'middle', margin: 0 })
        if (ev.desc) s.addText(String(ev.desc), { x: 1.65, y: yy + 0.34, w: W - 2.6, h: 0.3, fontSize: 10, color: txtS, fontFace: FONT, valign: 'middle' })
      })
    }

    else if (slide.type === 'two_col') {
      eyebrow(s, slide.eyebrow || slide.section || 'Overview')
      heading(s, slide.title)
      const cols = (slide.cols || []).slice(0, 2)
      const cW = 5.9, gap = 0.4, totalW = cols.length * cW + (cols.length - 1) * gap
      const startX = (W - totalW) / 2
      cols.forEach((col, ci) => {
        const cx = startX + ci * (cW + gap)
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: cx, y: 2.1, w: cW, h: 4.6, rectRadius: 0.1, fill: { color: cardC, transparency: isDark ? 22 : 4 }, line: { color: acc, transparency: 68 } })
        s.addText(String(col.heading || ''), { x: cx + 0.3, y: 2.3, w: cW - 0.6, h: 0.45, fontSize: 14, bold: true, color: acc, fontFace: FONT, margin: 0 })
        ;(col.points || []).slice(0, 6).forEach((p, pi) => {
          const py = 2.9 + pi * 0.6
          s.addShape(pptx.shapes.OVAL, { x: cx + 0.3, y: py + 0.1, w: 0.14, h: 0.14, fill: { color: acc }, line: { type: 'none' } })
          s.addText(String(p || ''), { x: cx + 0.6, y: py, w: cW - 0.9, h: 0.55, fontSize: 12, color: txtM, fontFace: FONT, valign: 'middle' })
        })
      })
    }

    else if (slide.type === 'content') {
      eyebrow(s, slide.eyebrow || slide.section || 'Content')
      heading(s, slide.title)
      if (slide.subtitle) s.addText(String(slide.subtitle), { x: 0.8, y: 1.8, w: W - 1.6, h: 0.45, fontSize: 14, color: txtS, fontFace: FONT, margin: 0 })
      const pts = (slide.points || []).slice(0, 6)
      const startY = slide.subtitle ? 2.4 : 2.1
      pts.forEach((p, i) => {
        const yy = startY + i * 0.72
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: yy, w: W - 1.6, h: 0.6, rectRadius: 0.08, fill: { color: cardC, transparency: isDark ? 24 : 4 }, line: { color: acc, transparency: 76 } })
        s.addShape(pptx.shapes.OVAL, { x: 1.05, y: yy + 0.22, w: 0.16, h: 0.16, fill: { color: acc }, line: { type: 'none' } })
        s.addText(String(p), { x: 1.45, y: yy, w: W - 2.3, h: 0.6, fontSize: 13, color: txtM, fontFace: FONT, valign: 'middle' })
      })
    }

    else if (slide.type === 'closing') {
      s.addText(String(slide.eyebrow || meta.brand || 'WORKLOG AI').toUpperCase(), { x: 1, y: 2.4, w: W - 2, h: 0.4, fontSize: 12, bold: true, color: acc, charSpacing: 4, align: 'center', fontFace: FONT, margin: 0 })
      s.addText(String(slide.title || 'Thank You'), { x: 1, y: 3.0, w: W - 2, h: 1.2, fontSize: 46, bold: true, color: txtM, align: 'center', fontFace: FONT, margin: 0 })
      if (slide.subtitle) s.addText(String(slide.subtitle), { x: 1.5, y: 4.4, w: W - 3, h: 0.9, fontSize: 16, color: txtS, align: 'center', fontFace: FONT, lineSpacingMultiple: 1.4 })
    }

    else {
      heading(s, slide.title)
      if (slide.subtitle || slide.body) s.addText(String(slide.subtitle || slide.body || ''), { x: 1, y: 2.2, w: W - 2, h: 2, fontSize: 15, color: txtS, align: 'center', fontFace: FONT })
    }
  }

  await pptx.writeFile({ fileName: safeFileName(meta.title) + '.pptx' })
}
