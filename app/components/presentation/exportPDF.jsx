"use client"
// Production PDF export of the slide deck. Renders each slide as a 16:9
// landscape page using IBM Plex Sans Thai (bundled in /public/fonts) so Thai
// glyphs render correctly with no missing characters or overlap.
import { Document, Page, Text, View, Font, pdf } from '@react-pdf/renderer'
import { safeFileName } from './shared'

let fontsReady = false
function ensureFonts() {
  if (fontsReady) return
  Font.register({
    family: 'IBMPlexSansThai',
    fonts: [
      { src: '/fonts/IBMPlexSansThai-Regular.ttf', fontWeight: 400 },
      { src: '/fonts/IBMPlexSansThai-Medium.ttf', fontWeight: 500 },
      { src: '/fonts/IBMPlexSansThai-SemiBold.ttf', fontWeight: 600 },
      { src: '/fonts/IBMPlexSansThai-Bold.ttf', fontWeight: 700 },
    ],
  })
  // Thai has no inter-word hyphenation — keep words intact to avoid broken glyphs.
  Font.registerHyphenationCallback(word => [word])
  fontsReady = true
}

const F = 'IBMPlexSansThai'
const W = 960
const H = 540

function hx(c) { return '#' + String(c || '').replace('#', '') }

function SlidePage({ slide, theme, index, total, meta }) {
  const isDark = theme.dark
  const bg = hx(theme.bg)
  const acc = hx(theme.accent)
  const txt = isDark ? '#F1F5F9' : '#1E293B'
  const txt2 = isDark ? '#CBD5E1' : '#64748B'
  const txt3 = isDark ? '#64748B' : '#94A3B8'
  const card = isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF'
  const cardBd = isDark ? 'rgba(255,255,255,0.14)' : '#E5E7EB'

  const page = { fontFamily: F, backgroundColor: bg, position: 'relative', padding: 48 }
  const pager = { position: 'absolute', bottom: 18, right: 26, fontSize: 9, color: txt3 }
  const eyebrow = { fontSize: 10, fontWeight: 700, color: acc, letterSpacing: 2, marginBottom: 8 }
  const heading = { fontSize: 26, fontWeight: 700, color: txt, marginBottom: 16 }

  const pagerEl = <Text style={pager}>{index + 1} / {total}</Text>

  if (slide.type === 'cover' || slide.type === 'closing') {
    return (
      <Page size={[W, H]} style={[page, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 11, fontWeight: 700, color: acc, letterSpacing: 4, marginBottom: 18 }}>
          {(slide.eyebrow || meta.brand || 'WORKLOG AI').toUpperCase()}
        </Text>
        <Text style={{ fontSize: 40, fontWeight: 700, color: txt, marginBottom: 14, textAlign: 'center' }}>
          {slide.title || meta.title}
        </Text>
        <Text style={{ fontSize: 16, color: txt2, marginBottom: 28, textAlign: 'center' }}>
          {slide.subtitle || meta.periodLabel || ''}
        </Text>
        {slide.type === 'cover' && (
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {(slide.stats || []).slice(0, 4).map((s, i) => (
              <View key={i} style={{ backgroundColor: card, border: `1px solid ${cardBd}`, borderRadius: 12, padding: '14px 22px', alignItems: 'center', minWidth: 110 }}>
                <Text style={{ fontSize: 26, fontWeight: 700, color: acc }}>{String(s.value)}</Text>
                <Text style={{ fontSize: 10, color: txt3, marginTop: 4 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}
        {pagerEl}
      </Page>
    )
  }

  if (slide.type === 'summary') {
    return (
      <Page size={[W, H]} style={[page, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ ...eyebrow, textAlign: 'center' }}>{(slide.eyebrow || slide.section || 'SUMMARY').toUpperCase()}</Text>
        <Text style={{ fontSize: 28, fontWeight: 700, color: txt, marginBottom: 16, textAlign: 'center' }}>{slide.title}</Text>
        {slide.body ? <Text style={{ fontSize: 13, color: txt2, lineHeight: 1.7, textAlign: 'center', maxWidth: 640, marginBottom: 22 }}>{slide.body}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 720 }}>
          {(slide.badges || []).slice(0, 6).map((b, i) => (
            <Text key={i} style={{ fontSize: 11, fontWeight: 700, color: acc, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(108,99,255,0.08)', border: `1px solid ${acc}`, borderRadius: 16, padding: '6px 14px' }}>{b}</Text>
          ))}
        </View>
        {pagerEl}
      </Page>
    )
  }

  if (slide.type === 'stats') {
    const stats = (slide.stats || []).slice(0, 6)
    return (
      <Page size={[W, H]} style={page}>
        <Text style={eyebrow}>{(slide.eyebrow || slide.section || 'KPI').toUpperCase()}</Text>
        <Text style={heading}>{slide.title}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {stats.map((s, i) => (
            <View key={i} style={{ width: (W - 96 - 28) / 3, backgroundColor: card, border: `1px solid ${s.color ? hx(s.color) : cardBd}`, borderRadius: 12, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: 700, color: txt3, marginBottom: 6, textTransform: 'uppercase' }}>{s.label}</Text>
              <Text style={{ fontSize: 30, fontWeight: 700, color: s.color ? hx(s.color) : acc }}>{String(s.value)}</Text>
              {s.sub ? <Text style={{ fontSize: 9, color: txt3, marginTop: 4 }}>{s.sub}</Text> : null}
            </View>
          ))}
        </View>
        {pagerEl}
      </Page>
    )
  }

  if (slide.type === 'chart') {
    const bars = (slide.bars || []).slice(0, 6)
    const maxV = Math.max(...bars.map(b => Number(b.value) || 0), 1)
    return (
      <Page size={[W, H]} style={page}>
        <Text style={eyebrow}>{(slide.eyebrow || slide.section || 'ANALYTICS').toUpperCase()}</Text>
        <Text style={heading}>{slide.title}</Text>
        <View style={{ gap: 14 }}>
          {bars.map((b, i) => (
            <View key={i}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: txt }}>{b.label}</Text>
                <Text style={{ fontSize: 12, fontWeight: 700, color: acc }}>{String(b.value)}{b.unit || ''}</Text>
              </View>
              <View style={{ height: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(108,99,255,0.12)', borderRadius: 5 }}>
                <View style={{ height: 10, width: `${Math.round(Math.min((Number(b.value) || 0) / maxV, 1) * 100)}%`, backgroundColor: acc, borderRadius: 5 }} />
              </View>
            </View>
          ))}
        </View>
        {pagerEl}
      </Page>
    )
  }

  if (slide.type === 'timeline') {
    const events = (slide.events || []).slice(0, 6)
    return (
      <Page size={[W, H]} style={page}>
        <Text style={eyebrow}>{(slide.eyebrow || slide.section || 'TIMELINE').toUpperCase()}</Text>
        <Text style={heading}>{slide.title}</Text>
        <View style={{ gap: 10 }}>
          {events.map((e, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(108,99,255,0.1)', border: `1px solid ${acc}`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: acc }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: card, border: `1px solid ${cardBd}`, borderRadius: 8, padding: '8px 12px' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, fontWeight: 700, color: txt }}>{e.title}</Text>
                  {e.date ? <Text style={{ fontSize: 10, color: acc }}>{e.date}</Text> : null}
                </View>
                {e.desc ? <Text style={{ fontSize: 10, color: txt2, marginTop: 2 }}>{e.desc}</Text> : null}
              </View>
            </View>
          ))}
        </View>
        {pagerEl}
      </Page>
    )
  }

  if (slide.type === 'two_col') {
    const cols = (slide.cols || []).slice(0, 2)
    return (
      <Page size={[W, H]} style={page}>
        <Text style={eyebrow}>{(slide.eyebrow || slide.section || 'OVERVIEW').toUpperCase()}</Text>
        <Text style={heading}>{slide.title}</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {cols.map((col, ci) => (
            <View key={ci} style={{ flex: 1, backgroundColor: card, border: `1px solid ${cardBd}`, borderRadius: 12, padding: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: 700, color: acc, marginBottom: 10 }}>{col.heading}</Text>
              {(col.points || []).slice(0, 6).map((p, pi) => (
                <View key={pi} style={{ flexDirection: 'row', gap: 7, marginBottom: 7 }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: acc, marginTop: 5 }} />
                  <Text style={{ fontSize: 11, color: txt, lineHeight: 1.5, flex: 1 }}>{p}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        {pagerEl}
      </Page>
    )
  }

  // content (achievements / insights / recommendations) + default
  const pts = (slide.points || []).slice(0, 6)
  return (
    <Page size={[W, H]} style={page}>
      <Text style={eyebrow}>{(slide.eyebrow || slide.section || 'CONTENT').toUpperCase()}</Text>
      <Text style={heading}>{slide.title}</Text>
      {slide.subtitle ? <Text style={{ fontSize: 13, color: txt2, marginBottom: 14 }}>{slide.subtitle}</Text> : null}
      <View style={{ gap: 9 }}>
        {pts.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: card, border: `1px solid ${cardBd}`, borderRadius: 9, padding: '10px 14px' }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: acc }} />
            <Text style={{ fontSize: 12, color: txt, lineHeight: 1.5, flex: 1 }}>{p}</Text>
          </View>
        ))}
      </View>
      {pagerEl}
    </Page>
  )
}

function DeckDocument({ slides, theme, meta }) {
  return (
    <Document title={meta.title} author={meta.brand || 'StayScape'}>
      {slides.map((slide, i) => (
        <SlidePage key={i} slide={slide} theme={theme} index={i} total={slides.length} meta={meta} />
      ))}
    </Document>
  )
}

export async function exportToPDF(slides, theme, meta = {}) {
  ensureFonts()
  const blob = await pdf(<DeckDocument slides={slides} theme={theme} meta={meta} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeFileName(meta.title) + '.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
