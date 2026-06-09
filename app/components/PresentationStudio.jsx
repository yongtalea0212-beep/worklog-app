"use client"
import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
import {
  THEMES, MONTHS_TH, MONTHS_EN,
  filterByMonth, availablePeriods, computeStats, periodLabel, imagesOf,
} from './presentation/shared'
import { generateSlides, regenerateSlide } from './presentation/generate'

// ─────────────────────────────────────────────────────────────
// SLIDE CANVAS — live preview renderer (memoized)
// ─────────────────────────────────────────────────────────────
const SlideCanvas = memo(function SlideCanvas({ slide, theme, index, total }) {
  if (!slide) return null
  const isDark = theme.dark
  const bg = '#' + theme.bg
  const accent = '#' + theme.accent
  const text = isDark ? '#F1F5F9' : '#1E293B'
  const text2 = isDark ? 'rgba(241,245,249,0.65)' : '#64748B'
  const text3 = isDark ? 'rgba(241,245,249,0.35)' : '#94A3B8'
  const card = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)'
  const cardBd = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(226,232,240,0.95)'

  const wrap = { width: '100%', height: '100%', background: bg, position: 'relative', overflow: 'hidden', fontFamily: 'Inter,"IBM Plex Sans Thai",system-ui,sans-serif' }
  // Plain JSX values (not components) so previews don't remount on every render.
  const orbs = (
    <>
      <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle,${accent}22,transparent)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -30, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle,${accent}18,transparent)`, pointerEvents: 'none' }} />
    </>
  )
  const pager = <div style={{ position: 'absolute', bottom: 12, right: 18, fontSize: 10, color: text3, fontWeight: 500 }}>{index + 1}/{total}</div>
  const eyebrow = (txt) => <div style={{ fontSize: 9, fontWeight: 800, color: accent, letterSpacing: 2.5, marginBottom: 8, opacity: .9, textTransform: 'uppercase' }}>{txt}</div>

  if (slide.type === 'cover') return (
    <div style={wrap}>{orbs}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40, zIndex: 1 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: accent, letterSpacing: 3, marginBottom: 14, opacity: .9 }}>{(slide.eyebrow || 'WORKLOG AI').toUpperCase()}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: text, lineHeight: 1.2, marginBottom: 12, letterSpacing: -1 }}>{slide.title}</div>
        <div style={{ fontSize: 13, color: text2, maxWidth: 380, lineHeight: 1.7, marginBottom: 24 }}>{slide.subtitle}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {(slide.stats || []).map((s, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${cardBd}`, borderRadius: 12, padding: '12px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: text3, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>{pager}
    </div>
  )

  if (slide.type === 'summary') return (
    <div style={wrap}>{orbs}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '36px 48px', zIndex: 1 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: accent, letterSpacing: 3, marginBottom: 12, opacity: .9 }}>{(slide.section || 'SUMMARY').toUpperCase()}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: text, lineHeight: 1.2, marginBottom: 12, letterSpacing: -1 }}>{slide.title}</div>
        {slide.body && <div style={{ fontSize: 12, color: text2, lineHeight: 1.8, maxWidth: 460, marginBottom: 18 }}>{slide.body}</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {(slide.badges || []).map((b, i) => (
            <div key={i} style={{ background: `${accent}18`, border: `1px solid ${accent}40`, color: accent, fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 20 }}>{b}</div>
          ))}
        </div>
      </div>{pager}
    </div>
  )

  if (slide.type === 'stats') return (
    <div style={wrap}>{orbs}
      <div style={{ position: 'relative', zIndex: 1, padding: '32px 40px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {eyebrow(slide.section || 'KPI')}
        <div style={{ fontSize: 20, fontWeight: 800, color: text, marginBottom: 18, letterSpacing: -.5 }}>{slide.title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {(slide.stats || []).slice(0, 6).map((s, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${cardBd}`, borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: text3, marginBottom: 5, fontWeight: 700, letterSpacing: .8, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color ? '#' + String(s.color).replace('#', '') : accent, lineHeight: 1 }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 9, color: text3, marginTop: 4 }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>{pager}
    </div>
  )

  if (slide.type === 'chart') {
    const bars = slide.bars || []
    const max = Math.max(...bars.map(x => Number(x.value) || 0), 1)
    return (
      <div style={wrap}>{orbs}
        <div style={{ position: 'relative', zIndex: 1, padding: '32px 40px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {eyebrow(slide.section || 'ANALYTICS')}
          <div style={{ fontSize: 20, fontWeight: 800, color: text, marginBottom: 18, letterSpacing: -.5 }}>{slide.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {bars.slice(0, 6).map((b, i) => {
              const pct = Math.min(Math.round(((Number(b.value) || 0) / max) * 100), 100)
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: text, fontWeight: 500 }}>{b.label}</span>
                    <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>{b.value}{b.unit || ''}</span>
                  </div>
                  <div style={{ height: 7, background: `${accent}1f`, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: `linear-gradient(90deg,${accent},${accent}aa)`, borderRadius: 4 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>{pager}
      </div>
    )
  }

  if (slide.type === 'timeline') return (
    <div style={wrap}>{orbs}
      <div style={{ position: 'relative', zIndex: 1, padding: '28px 38px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {eyebrow(slide.section || 'TIMELINE')}
        <div style={{ fontSize: 20, fontWeight: 800, color: text, marginBottom: 14, letterSpacing: -.5 }}>{slide.title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {(slide.events || []).slice(0, 6).map((e, i, arr) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${accent}22`, border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: accent }}>{i + 1}</div>
                {i < arr.length - 1 && <div style={{ width: 2, height: 12, background: `${accent}30`, marginTop: 2 }} />}
              </div>
              <div style={{ background: card, border: `1px solid ${cardBd}`, borderRadius: 9, padding: '7px 12px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: text }}>{e.title}</span>
                  {e.date && <span style={{ fontSize: 9, color: accent, fontWeight: 600, flexShrink: 0 }}>{e.date}</span>}
                </div>
                {e.desc && <div style={{ fontSize: 10, color: text2, marginTop: 2, lineHeight: 1.45 }}>{e.desc}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>{pager}
    </div>
  )

  if (slide.type === 'two_col') return (
    <div style={wrap}>{orbs}
      <div style={{ position: 'relative', zIndex: 1, padding: '30px 36px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {eyebrow(slide.section || 'OVERVIEW')}
        <div style={{ fontSize: 20, fontWeight: 800, color: text, marginBottom: 14, letterSpacing: -.5 }}>{slide.title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {(slide.cols || []).slice(0, 2).map((col, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${cardBd}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: .8, marginBottom: 8 }}>{col.heading}</div>
              {(col.points || []).slice(0, 6).map((p, j) => (
                <div key={j} style={{ display: 'flex', gap: 7, marginBottom: 6, alignItems: 'flex-start' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ fontSize: 10, color: text, lineHeight: 1.5 }}>{p}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>{pager}
    </div>
  )

  if (slide.type === 'closing') return (
    <div style={wrap}>{orbs}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40, zIndex: 1 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: accent, letterSpacing: 3, marginBottom: 14, opacity: .9 }}>{(slide.eyebrow || 'WORKLOG AI').toUpperCase()}</div>
        <div style={{ fontSize: 34, fontWeight: 800, color: text, lineHeight: 1.15, marginBottom: 12, letterSpacing: -1 }}>{slide.title || 'Thank You'}</div>
        {slide.subtitle && <div style={{ fontSize: 13, color: text2, maxWidth: 420, lineHeight: 1.7 }}>{slide.subtitle}</div>}
      </div>{pager}
    </div>
  )

  // content + default
  return (
    <div style={wrap}>{orbs}
      <div style={{ position: 'relative', zIndex: 1, padding: '32px 40px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {eyebrow(slide.eyebrow || slide.section || 'CONTENT')}
        <div style={{ fontSize: 20, fontWeight: 800, color: text, marginBottom: 6, letterSpacing: -.5, lineHeight: 1.2 }}>{slide.title}</div>
        {slide.subtitle && <div style={{ fontSize: 11, color: text2, marginBottom: 14, lineHeight: 1.6 }}>{slide.subtitle}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {(slide.points || []).slice(0, 6).map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', background: card, border: `1px solid ${cardBd}`, borderRadius: 10, padding: '9px 12px' }}>
              <div style={{ width: 18, height: 18, borderRadius: 6, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent }} />
              </div>
              <div style={{ fontSize: 11, color: text, lineHeight: 1.5 }}>{p}</div>
            </div>
          ))}
        </div>
      </div>{pager}
    </div>
  )
})

// ─────────────────────────────────────────────────────────────
// THUMBNAIL (memoized)
// ─────────────────────────────────────────────────────────────
const Thumb = memo(function Thumb({ slide, theme, index, total, active, busy, onClick }) {
  return (
    <button
      onClick={onClick}
      role="option"
      aria-selected={active}
      aria-label={`Slide ${index + 1}: ${slide.title || slide.section || slide.type}`}
      className="psx-thumb"
      style={{ borderColor: active ? '#6C63FF' : 'transparent' }}
    >
      <div style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: '#' + theme.bg, borderRadius: 8 }}>
        <div style={{ transform: 'scale(0.22)', transformOrigin: 'top left', width: '454%', height: '454%', pointerEvents: 'none' }}>
          <SlideCanvas slide={slide} theme={theme} index={index} total={total} />
        </div>
        {busy && <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="psx-spin" style={{ fontSize: 16 }}>⏳</span></div>}
      </div>
      <div style={{ padding: '5px 8px', textAlign: 'left' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--psx-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slide.title || slide.section || 'Slide ' + (index + 1)}</div>
        <div style={{ fontSize: 9, color: 'var(--psx-muted)' }}>#{index + 1} · {slide.section || slide.type}</div>
      </div>
    </button>
  )
})

// ─────────────────────────────────────────────────────────────
// Small accordion section
// ─────────────────────────────────────────────────────────────
function Accordion({ title, open, onToggle, children, id }) {
  return (
    <div className="psx-acc">
      <button className="psx-acc-head" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span>{title}</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
      </button>
      {open && <div id={id} className="psx-acc-body">{children}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
export default function PresentationStudio({ logs = [], brand = 'StayScape' }) {
  const [period, setPeriod] = useState(null) // {year, month}
  const [lang, setLang] = useState('th')
  const [theme, setTheme] = useState(THEMES[0])
  const [slides, setSlides] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [regenIdx, setRegenIdx] = useState(null)
  const [exporting, setExporting] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [error, setError] = useState('')
  const [promptOpen, setPromptOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [titleTouched, setTitleTouched] = useState(false)
  const previewRef = useRef(null)

  // Available periods + sensible default (most recent month with data).
  // Derived (not effect-driven) so changing months never mixes data.
  const periods = useMemo(() => availablePeriods(logs), [logs])
  const defaultPeriod = useMemo(
    () => periods[0] || { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
    [periods],
  )
  const year = period?.year ?? defaultPeriod.year
  const month = period?.month ?? defaultPeriod.month

  // Changing the period clears the deck so a report only ever holds one month.
  const updatePeriod = useCallback((patch) => {
    setPeriod({ year, month, ...patch })
    setSlides([]); setActiveIdx(0)
  }, [year, month])

  // STRICT monthly filtering — every downstream value uses only this month.
  const monthLogs = useMemo(() => filterByMonth(logs, year, month), [logs, year, month])
  const stats = useMemo(() => computeStats(monthLogs), [monthLogs])
  const imgCount = useMemo(() => monthLogs.reduce((n, l) => n + imagesOf(l).length, 0), [monthLogs])
  const plabel = useMemo(() => periodLabel(year, month, lang), [year, month, lang])

  const yearOptions = useMemo(() => {
    const set = new Set(periods.map(p => p.year))
    set.add(new Date().getFullYear())
    return Array.from(set).sort((a, b) => b - a)
  }, [periods])

  // Default title follows the selected period until the user edits it (derived).
  const displayTitle = titleTouched ? title : `${brand} · ${plabel}`

  // Responsive: open accordions by default on desktop only.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1280px)')
    const apply = () => { setAiOpen(mq.matches); setSettingsOpen(mq.matches); setPromptOpen(mq.matches) }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const generate = useCallback(async () => {
    if (!monthLogs.length) return
    setGenerating(true); setProgress(0); setError('')
    const iv = setInterval(() => setProgress(p => Math.min(p + 6, 90)), 350)
    try {
      const result = await generateSlides({ logs: monthLogs, year, month, customPrompt: prompt, lang, brand })
      setSlides(result); setActiveIdx(0)
      setProgress(100)
    } catch (e) {
      setError(e?.message || 'Generation failed')
    } finally {
      clearInterval(iv)
      setTimeout(() => { setGenerating(false); setProgress(0) }, 400)
    }
  }, [monthLogs, year, month, prompt, lang, brand])

  const regenerateOne = useCallback(async (idx) => {
    const slide = slides[idx]
    if (!slide) return
    setRegenIdx(idx); setError('')
    try {
      const updated = await regenerateSlide({ slide, index: idx, logs: monthLogs, year, month, customPrompt: prompt, lang, brand })
      setSlides(prev => prev.map((s, i) => (i === idx ? updated : s)))
    } catch (e) {
      setError(e?.message || 'Could not regenerate this slide')
    } finally {
      setRegenIdx(null)
    }
  }, [slides, monthLogs, year, month, prompt, lang, brand])

  const doExport = useCallback(async (kind) => {
    if (!slides.length) return
    setExporting(kind); setError(''); setExportOpen(false)
    const meta = { title: displayTitle, brand, periodLabel: plabel, lang }
    try {
      if (kind === 'pptx') { const m = await import('./presentation/exportPPTX'); await m.exportToPPTX(slides, theme, meta) }
      else if (kind === 'pdf') { const m = await import('./presentation/exportPDF'); await m.exportToPDF(slides, theme, meta) }
      else if (kind === 'excel') { const m = await import('./presentation/exportExcel'); await m.exportToExcel({ logs: monthLogs, stats, meta }) }
    } catch (e) {
      setError('Export failed: ' + (e?.message || 'unknown error'))
    } finally {
      setExporting(null)
    }
  }, [slides, theme, displayTitle, brand, plabel, lang, monthLogs, stats])

  const goPrev = useCallback(() => setActiveIdx(i => Math.max(i - 1, 0)), [])
  const goNext = useCallback(() => setActiveIdx(i => Math.min(i + 1, slides.length - 1)), [slides.length])
  const onPreviewKey = useCallback((e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goNext() }
  }, [goPrev, goNext])

  const selectSlide = useCallback((i) => {
    setActiveIdx(i)
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches) {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const setTitleSafe = (v) => { setTitleTouched(true); setTitle(v) }

  // ── Period selector (shared by setup + workspace) — plain render fn ──
  const renderPeriod = (compact) => (
    <div className={'psx-period' + (compact ? ' compact' : '')}>
      <label className="psx-lbl" htmlFor="psx-month">{lang === 'th' ? 'เดือนที่รายงาน' : 'Report Period'}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <select id="psx-month" className="psx-select" value={month} onChange={e => updatePeriod({ month: +e.target.value })} aria-label="Month">
          {MONTHS_TH.map((m, i) => <option key={i} value={i + 1}>{m} ({MONTHS_EN[i]})</option>)}
        </select>
        <select className="psx-select" value={year} onChange={e => updatePeriod({ year: +e.target.value })} aria-label="Year" style={{ maxWidth: 130 }}>
          {yearOptions.map(y => <option key={y} value={y}>{y} ({y + 543})</option>)}
        </select>
      </div>
      <div className="psx-hint">{stats.total > 0
        ? (lang === 'th' ? `พบ ${stats.total} งานในเดือนนี้ · ใช้เฉพาะข้อมูลเดือนที่เลือก` : `${stats.total} tasks this month · only selected-month data is used`)
        : (lang === 'th' ? 'ไม่มีงานในเดือนนี้ — เลือกเดือนอื่น' : 'No tasks this month — pick another period')}
      </div>
    </div>
  )

  // ── SETUP SCREEN ──
  if (!slides.length) return (
    <>
      <style>{CSS}</style>
      <div className="psx" data-dark={theme.dark ? '1' : '0'}>
        <div className="psx-setup">
          <div className="psx-card psx-setup-card">
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div className="psx-logo">🎬</div>
              <h1 className="psx-h1">{lang === 'th' ? 'Monthly Report Generator' : 'Monthly Report Generator'}</h1>
              <p className="psx-sub">{lang === 'th' ? 'สร้างรายงานนำเสนอระดับผู้บริหารด้วย AI จากข้อมูลรายเดือน' : 'AI-generated executive monthly reports from your work data'}</p>
            </div>

            {renderPeriod(false)}

            <div className="psx-stats4" role="group" aria-label="Selected month summary">
              {[{ v: stats.total, l: lang === 'th' ? 'งาน' : 'Tasks', c: '#6C63FF' },
                { v: stats.hours, l: lang === 'th' ? 'ชั่วโมง' : 'Hours', c: '#06B6D4' },
                { v: stats.done, l: lang === 'th' ? 'เสร็จ' : 'Done', c: '#10B981' },
                { v: imgCount, l: lang === 'th' ? 'รูปภาพ' : 'Images', c: '#F59E0B' }].map((s, i) => (
                <div key={i} className="psx-stat">
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div className="psx-stat-l">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="psx-field">
              <label className="psx-lbl">{lang === 'th' ? 'ธีม' : 'Theme'}</label>
              <div className="psx-theme-scroll" role="radiogroup" aria-label="Theme">
                {THEMES.map(t => (
                  <button key={t.id} role="radio" aria-checked={theme.id === t.id} onClick={() => setTheme(t)}
                    className={'psx-theme-card' + (theme.id === t.id ? ' on' : '')}>
                    <div style={{ width: 38, height: 26, borderRadius: 7, background: '#' + t.bg, border: '1px solid rgba(0,0,0,.12)', position: 'relative' }}>
                      <div style={{ position: 'absolute', right: 4, bottom: 4, width: 8, height: 8, borderRadius: '50%', background: '#' + t.accent }} />
                    </div>
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="psx-field">
              <label className="psx-lbl">{lang === 'th' ? 'ภาษารายงาน' : 'Report Language'}</label>
              <div className="psx-seg">
                <button className={lang === 'th' ? 'on' : ''} onClick={() => setLang('th')}>ไทย</button>
                <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
              </div>
            </div>

            <Accordion id="psx-setup-prompt" title={(lang === 'th' ? '✨ คำสั่ง AI เพิ่มเติม (ไม่บังคับ)' : '✨ Custom AI direction (optional)')} open={promptOpen} onToggle={() => setPromptOpen(o => !o)}>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="psx-input" rows={3}
                placeholder={lang === 'th' ? 'เช่น เน้นงาน video และ branding, โทน startup pitch...' : 'e.g. emphasize video & branding, startup pitch tone...'} />
            </Accordion>

            <div className="psx-field">
              <label className="psx-lbl" htmlFor="psx-title">{lang === 'th' ? 'ชื่อรายงาน' : 'Report Title'}</label>
              <input id="psx-title" value={displayTitle} onChange={e => setTitleSafe(e.target.value)} className="psx-input" />
            </div>

            <button onClick={generate} disabled={generating || !stats.total} className="psx-btn psx-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15 }}>
              {generating ? <><span className="psx-spin">⏳</span> {lang === 'th' ? 'AI กำลังสร้าง' : 'Generating'} {progress}%</> : (lang === 'th' ? '✨ สร้างรายงาน 12 สไลด์' : '✨ Generate 12-Slide Report')}
            </button>
            {generating && <div className="psx-prog"><div className="psx-prog-fill" style={{ width: progress + '%' }} /></div>}
            {error && <div className="psx-error" role="alert">{error}</div>}
            {!stats.total && <div className="psx-hint" style={{ textAlign: 'center', marginTop: 8 }}>{lang === 'th' ? 'กรุณาเลือกเดือนที่มีงาน' : 'Select a month that has tasks'}</div>}
          </div>
        </div>
      </div>
    </>
  )

  // ── WORKSPACE ──
  const active = slides[activeIdx]
  return (
    <>
      <style>{CSS}</style>
      <div className="psx" data-dark={theme.dark ? '1' : '0'}>
        <div className="psx-workspace">

          {/* COLUMN A — Slides list */}
          <aside className="psx-col psx-col-slides" aria-label="Slides">
            <div className="psx-col-title">{lang === 'th' ? 'สไลด์' : 'Slides'} · {slides.length}</div>
            <div role="listbox" aria-label="Slide list" className="psx-thumbs">
              {slides.map((s, i) => (
                <Thumb key={i} slide={s} theme={theme} index={i} total={slides.length} active={activeIdx === i} busy={regenIdx === i} onClick={() => selectSlide(i)} />
              ))}
            </div>
          </aside>

          {/* COLUMN B — Preview */}
          <section className="psx-col psx-col-preview" aria-label="Preview" ref={previewRef}>
            <div className="psx-preview-bar">
              <button className="psx-btn psx-ghost psx-icon" onClick={goPrev} disabled={activeIdx === 0} aria-label="Previous slide">←</button>
              <div className="psx-preview-title">{displayTitle} <span style={{ color: 'var(--psx-muted)', fontWeight: 400 }}>· {activeIdx + 1}/{slides.length}</span></div>
              <button className="psx-btn psx-ghost psx-icon" onClick={goNext} disabled={activeIdx === slides.length - 1} aria-label="Next slide">→</button>
            </div>

            <div className="psx-stage" tabIndex={0} onKeyDown={onPreviewKey} role="group" aria-label={`Slide ${activeIdx + 1}: ${active?.title || ''}`}>
              <div className="psx-stage-inner" key={activeIdx + theme.id}>
                <SlideCanvas slide={active} theme={theme} index={activeIdx} total={slides.length} />
                {regenIdx === activeIdx && <div className="psx-stage-busy"><span className="psx-spin" style={{ fontSize: 26 }}>⏳</span></div>}
              </div>
            </div>

            <div className="psx-dots" role="tablist" aria-label="Slide navigation">
              {slides.map((_, i) => (
                <button key={i} role="tab" onClick={() => setActiveIdx(i)} aria-label={`Go to slide ${i + 1}`} aria-selected={i === activeIdx}
                  className={'psx-dot' + (i === activeIdx ? ' on' : '')} />
              ))}
            </div>

            <div className="psx-preview-actions">
              <button className="psx-btn psx-ghost" onClick={() => regenerateOne(activeIdx)} disabled={regenIdx !== null}>
                {regenIdx === activeIdx ? <span className="psx-spin">⏳</span> : '🔄'} {lang === 'th' ? 'สร้างสไลด์นี้ใหม่' : 'Regenerate This Slide'}
              </button>
              <div className="psx-export-wrap">
                <button className="psx-btn psx-primary" aria-haspopup="menu" aria-expanded={exportOpen} onClick={() => setExportOpen(o => !o)} disabled={!!exporting}>
                  {exporting ? <><span className="psx-spin">⏳</span> {exporting.toUpperCase()}…</> : <>📥 {lang === 'th' ? 'ส่งออก' : 'Export'} ⌄</>}
                </button>
                {exportOpen && (
                  <>
                    <div className="psx-menu-backdrop" onClick={() => setExportOpen(false)} aria-hidden="true" />
                    <div className="psx-menu" role="menu">
                      <button role="menuitem" onClick={() => doExport('pptx')}>🖥️ PowerPoint (.pptx)</button>
                      <button role="menuitem" onClick={() => doExport('pdf')}>📄 PDF (Thai fonts)</button>
                      <button role="menuitem" onClick={() => doExport('excel')}>📊 Excel (.xlsx)</button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {error && <div className="psx-error" role="alert">{error}</div>}
          </section>

          {/* COLUMN C — Settings + AI */}
          <aside className="psx-col psx-col-settings" aria-label="Settings and AI controls">
            <Accordion id="psx-settings" title={(lang === 'th' ? '⚙️ การตั้งค่ารายงาน' : '⚙️ Report Settings')} open={settingsOpen} onToggle={() => setSettingsOpen(o => !o)}>
              {renderPeriod(true)}
              <div className="psx-field">
                <label className="psx-lbl" htmlFor="psx-title2">{lang === 'th' ? 'ชื่อรายงาน' : 'Title'}</label>
                <input id="psx-title2" value={displayTitle} onChange={e => setTitleSafe(e.target.value)} className="psx-input" />
              </div>
              <div className="psx-field">
                <label className="psx-lbl">{lang === 'th' ? 'ภาษา' : 'Language'}</label>
                <div className="psx-seg">
                  <button className={lang === 'th' ? 'on' : ''} onClick={() => setLang('th')}>ไทย</button>
                  <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
                </div>
              </div>
              <div className="psx-field">
                <label className="psx-lbl">{lang === 'th' ? 'ธีม' : 'Theme'}</label>
                <div className="psx-theme-scroll">
                  {THEMES.map(t => (
                    <button key={t.id} aria-pressed={theme.id === t.id} onClick={() => setTheme(t)} className={'psx-theme-card' + (theme.id === t.id ? ' on' : '')}>
                      <div style={{ width: 34, height: 22, borderRadius: 6, background: '#' + t.bg, border: '1px solid rgba(0,0,0,.12)' }} />
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Accordion>

            <Accordion id="psx-ai" title={(lang === 'th' ? '✨ AI Controls' : '✨ AI Controls')} open={aiOpen} onToggle={() => setAiOpen(o => !o)}>
              <label className="psx-lbl">{lang === 'th' ? 'คำสั่ง AI' : 'AI direction'}</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} className="psx-input"
                placeholder={lang === 'th' ? 'ใช้กับการสร้างใหม่ทั้งหมด หรือสร้างสไลด์เดียวใหม่' : 'Applied to full or single-slide regeneration'} />
              <button className="psx-btn psx-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => regenerateOne(activeIdx)} disabled={regenIdx !== null}>
                {regenIdx === activeIdx ? <span className="psx-spin">⏳</span> : '🔄'} {lang === 'th' ? `สร้างสไลด์ #${activeIdx + 1} ใหม่` : `Regenerate Slide #${activeIdx + 1}`}
              </button>
              <button className="psx-btn psx-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={generate} disabled={generating}>
                {generating ? <><span className="psx-spin">⏳</span> {progress}%</> : (lang === 'th' ? '✨ สร้างใหม่ทั้งหมด' : '✨ Regenerate All')}
              </button>
              {generating && <div className="psx-prog"><div className="psx-prog-fill" style={{ width: progress + '%' }} /></div>}
            </Accordion>

            <div className="psx-field">
              <button className="psx-btn psx-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setSlides([]); setActiveIdx(0) }}>
                ↩ {lang === 'th' ? 'เริ่มใหม่ / เปลี่ยนเดือน' : 'Start over / change month'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// STYLES — responsive 320px → 1920px, dark-mode aware
// ─────────────────────────────────────────────────────────────
const CSS = `
.psx{--psx-accent:#6C63FF;--psx-fg:#1a1a2e;--psx-muted:#9ca3af;--psx-surface:rgba(255,255,255,.72);--psx-surface2:rgba(255,255,255,.55);--psx-border:rgba(200,210,240,.5);--psx-bg2:rgba(230,233,255,.4);font-family:Inter,'IBM Plex Sans Thai',system-ui,sans-serif;color:var(--psx-fg);height:100%;}
@media (prefers-color-scheme: dark){
  .psx{--psx-fg:#e2e8f0;--psx-muted:#64748b;--psx-surface:rgba(30,41,59,.7);--psx-surface2:rgba(30,41,59,.5);--psx-border:rgba(100,116,139,.35);--psx-bg2:rgba(15,23,42,.5);}
}
.psx *{box-sizing:border-box}
.psx-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:11px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:transform .12s,background .15s;white-space:nowrap}
.psx-btn:hover:not(:disabled){transform:translateY(-1px)}
.psx-btn:disabled{opacity:.5;cursor:default}
.psx-btn:focus-visible{outline:2px solid var(--psx-accent);outline-offset:2px}
.psx-primary{background:linear-gradient(135deg,#6C63FF,#9B8FFF);color:#fff;box-shadow:0 4px 12px rgba(108,99,255,.3)}
.psx-ghost{background:var(--psx-surface2);color:var(--psx-fg);border:1px solid var(--psx-border)}
.psx-icon{padding:7px 12px}
.psx-input{width:100%;background:var(--psx-surface2);border:1px solid var(--psx-border);border-radius:11px;padding:10px 13px;font-size:13px;color:var(--psx-fg);font-family:inherit;outline:none;resize:vertical;line-height:1.6}
.psx-input:focus{border-color:rgba(108,99,255,.5);box-shadow:0 0 0 3px rgba(108,99,255,.12)}
.psx-select{flex:1;background:var(--psx-surface2);border:1px solid var(--psx-border);border-radius:11px;padding:10px 12px;font-size:13px;color:var(--psx-fg);font-family:inherit;outline:none;cursor:pointer}
.psx-select:focus{border-color:rgba(108,99,255,.5);box-shadow:0 0 0 3px rgba(108,99,255,.12)}
.psx-lbl{display:block;font-size:10px;font-weight:700;color:var(--psx-muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:7px}
.psx-hint{font-size:11px;color:var(--psx-muted);margin-top:7px}
.psx-error{font-size:12px;color:#EF4444;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:9px 12px;margin-top:10px}
.psx-field{margin-bottom:16px}
.psx-card{background:var(--psx-surface);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--psx-border);border-radius:22px;box-shadow:0 8px 40px rgba(100,110,200,.12)}
.psx-spin{animation:psx-spin 1.1s linear infinite;display:inline-block}
@keyframes psx-spin{to{transform:rotate(360deg)}}
.psx-prog{height:4px;background:rgba(108,99,255,.14);border-radius:2px;overflow:hidden;margin-top:10px}
.psx-prog-fill{height:100%;background:linear-gradient(90deg,#6C63FF,#9B8FFF);border-radius:2px;transition:width .35s ease}

/* SETUP */
.psx-setup{display:flex;justify-content:center;padding:18px 14px 90px;min-height:60vh}
.psx-setup-card{padding:30px 24px;max-width:560px;width:100%;animation:psx-in .3s ease}
@keyframes psx-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.psx-logo{width:58px;height:58px;border-radius:17px;background:linear-gradient(135deg,#6C63FF,#A78BFA);display:flex;align-items:center;justify-content:center;font-size:27px;margin:0 auto 12px;box-shadow:0 8px 24px rgba(108,99,255,.35)}
.psx-h1{font-size:21px;font-weight:800;margin:0;letter-spacing:-.4px;color:var(--psx-fg)}
.psx-sub{font-size:13px;color:var(--psx-muted);margin:6px 0 0;line-height:1.6}
.psx-period{margin-bottom:18px}
.psx-stats4{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:18px 0}
.psx-stat{background:var(--psx-surface2);border:1px solid var(--psx-border);border-radius:14px;padding:12px 8px;text-align:center}
.psx-stat-l{font-size:11px;color:var(--psx-muted);margin-top:3px}
.psx-theme-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin}
.psx-theme-card{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:8px 11px;border-radius:12px;border:2px solid var(--psx-border);background:var(--psx-surface2);cursor:pointer;font-family:inherit;font-size:11px;font-weight:500;color:var(--psx-fg);transition:.15s}
.psx-theme-card.on{border-color:#6C63FF;background:rgba(108,99,255,.1);color:#6C63FF;font-weight:700}
.psx-theme-card:focus-visible{outline:2px solid var(--psx-accent);outline-offset:1px}
.psx-seg{display:flex;gap:6px}
.psx-seg button{flex:1;padding:9px;border-radius:10px;border:1px solid var(--psx-border);background:var(--psx-surface2);color:var(--psx-muted);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer}
.psx-seg button.on{background:rgba(108,99,255,.12);border-color:rgba(108,99,255,.4);color:#6C63FF}

/* ACCORDION */
.psx-acc{border:1px solid var(--psx-border);border-radius:14px;margin-bottom:12px;overflow:hidden;background:var(--psx-surface2)}
.psx-acc-head{width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:none;border:none;font-family:inherit;font-size:13px;font-weight:700;color:var(--psx-fg);cursor:pointer}
.psx-acc-head:focus-visible{outline:2px solid var(--psx-accent);outline-offset:-2px}
.psx-acc-body{padding:0 14px 14px}

/* WORKSPACE */
.psx-workspace{display:grid;grid-template-columns:1fr;gap:14px;padding:14px 14px 100px}
.psx-col{min-width:0}
.psx-col-title{font-size:11px;font-weight:800;color:var(--psx-muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px}
.psx-col-preview{order:1}
.psx-col-settings{order:2}
.psx-col-slides{order:3}
.psx-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.psx-thumb{display:block;width:100%;border-radius:10px;overflow:hidden;cursor:pointer;border:2px solid transparent;background:var(--psx-surface);box-shadow:0 2px 8px rgba(100,110,200,.1);padding:0;font-family:inherit;transition:transform .12s}
.psx-thumb:hover{transform:translateY(-2px)}
.psx-thumb:focus-visible{outline:2px solid var(--psx-accent);outline-offset:2px}
.psx-preview-bar{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.psx-preview-title{flex:1;text-align:center;font-size:13px;font-weight:600;color:var(--psx-fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.psx-stage{width:100%;aspect-ratio:16/9;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(100,110,200,.22);position:relative}
.psx-stage:focus-visible{outline:3px solid var(--psx-accent);outline-offset:2px}
.psx-stage-inner{width:100%;height:100%;position:relative;animation:psx-fade .25s ease}
.psx-stage-busy{position:absolute;inset:0;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center}
@keyframes psx-fade{from{opacity:.4}to{opacity:1}}
.psx-dots{display:flex;gap:5px;align-items:center;justify-content:center;flex-wrap:wrap;margin:12px 0}
.psx-dot{width:8px;height:8px;border-radius:4px;border:none;background:rgba(108,99,255,.28);cursor:pointer;padding:0;transition:.2s}
.psx-dot.on{width:22px;background:#6C63FF}
.psx-dot:focus-visible{outline:2px solid var(--psx-accent);outline-offset:2px}
.psx-preview-actions{display:flex;gap:9px;flex-wrap:wrap}
.psx-preview-actions>.psx-btn:first-child{flex:1;justify-content:center}
.psx-export-wrap{position:relative}
.psx-menu-backdrop{position:fixed;inset:0;z-index:15}
.psx-menu{position:absolute;right:0;bottom:calc(100% + 6px);background:var(--psx-surface);backdrop-filter:blur(20px);border:1px solid var(--psx-border);border-radius:12px;box-shadow:0 8px 30px rgba(100,110,200,.25);padding:6px;min-width:200px;z-index:20;display:flex;flex-direction:column;gap:2px}
.psx-menu button{text-align:left;padding:10px 12px;border-radius:9px;border:none;background:none;font-family:inherit;font-size:13px;color:var(--psx-fg);cursor:pointer}
.psx-menu button:hover{background:rgba(108,99,255,.1)}
.psx-menu button:focus-visible{outline:2px solid var(--psx-accent);outline-offset:-2px}

/* Tablet */
@media (min-width:768px){
  .psx-setup-card{padding:38px 36px}
  .psx-stats4{grid-template-columns:repeat(4,1fr)}
  .psx-workspace{max-width:840px;margin:0 auto}
}
/* Desktop 3-column */
@media (min-width:1280px){
  .psx-workspace{grid-template-columns:240px minmax(0,1fr) 320px;max-width:none;margin:0;align-items:start;height:100%;overflow:hidden}
  .psx-col-slides{order:1;overflow-y:auto;height:100%;padding-right:4px}
  .psx-col-preview{order:2;overflow-y:auto;height:100%}
  .psx-col-settings{order:3;overflow-y:auto;height:100%}
  .psx-thumbs{grid-template-columns:1fr}
  .psx-stage{max-width:760px;margin:0 auto}
}
`
