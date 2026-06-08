// Server-side monthly report generator for LINE delivery (§11–13).
// Produces PDF (react-pdf, embedded Thai font) and PPTX (pptxgenjs) Buffers
// from a user's month-filtered work logs. No "use client" — server only.
import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { Document, Page, Text, View, Font, pdf } from '@react-pdf/renderer'
import { computeStats, getCat, periodLabel, hoursOf, logDate, isDone, filterByMonth } from './shared'
import { fallbackSlides } from './generate'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://worklog-app-virid.vercel.app'

// Light, print-friendly palette.
const C = { accent:'#6C63FF', accent2:'#06B6D4', green:'#10B981', amber:'#F59E0B',
  pink:'#EC4899', text:'#1a1a2e', sub:'#6b7099', muted:'#9ca3af', line:'#E5E7EB',
  bg:'#FFFFFF', soft:'#F4F3FF' }

// ── Thai font registration (fs when bundled, else HTTP from public CDN) ──
let fontsReady = false
function ensureFonts() {
  if (fontsReady) return
  const dir = path.join(process.cwd(), 'public', 'fonts')
  const local = fs.existsSync(path.join(dir, 'IBMPlexSansThai-Regular.ttf'))
  const src = f => (local ? path.join(dir, f) : `${APP_URL}/fonts/${f}`)
  Font.register({ family:'TH', fonts:[
    { src: src('IBMPlexSansThai-Regular.ttf'),  fontWeight:400 },
    { src: src('IBMPlexSansThai-Medium.ttf'),   fontWeight:500 },
    { src: src('IBMPlexSansThai-SemiBold.ttf'), fontWeight:600 },
    { src: src('IBMPlexSansThai-Bold.ttf'),     fontWeight:700 },
  ]})
  Font.registerHyphenationCallback(w => [w])
  fontsReady = true
}

// ── Shared data model ──
export function buildReportModel(logs, year, month, lang = 'th', brand = 'StayScape') {
  const monthLogs = filterByMonth(logs, year, month)
  const stats = computeStats(monthLogs)
  const slides = fallbackSlides(monthLogs, year, month, lang, brand)
  const summarySlide = slides.find(s => s.type === 'summary') || {}
  const recSlide = slides.find(s => s.section === 'Recommendations') || {}
  const tasks = [...monthLogs]
    .sort((a, b) => String(logDate(b)).localeCompare(String(logDate(a))))
    .slice(0, 16)
    .map(l => ({
      title: l.title || 'งาน', cat: getCat(l.category), hours: hoursOf(l),
      date: logDate(l) || '', done: isDone(l), status: l.status || 'draft',
    }))
  return {
    meta: { brand, lang, title: lang === 'th' ? 'รายงานสรุปผลงานประจำเดือน' : 'Monthly Work Report', periodLabel: periodLabel(year, month, lang) },
    stats,
    categories: stats.topCategories,
    summaryText: summarySlide.body || '',
    badges: summarySlide.badges || [],
    recommendations: recSlide.points || [],
    tasks,
  }
}

// ─────────────────────────────────────────
// PDF (react-pdf) — A4 portrait, embedded Thai font
// ─────────────────────────────────────────
const F = 'TH'
function statCard(label, value, color) {
  return (
    <View style={{ flex:1, backgroundColor:'rgba(108,99,255,0.06)', border:`1px solid ${C.line}`, borderRadius:10, padding:12, alignItems:'center' }}>
      <Text style={{ fontFamily:F, fontSize:18, fontWeight:700, color }}>{String(value)}</Text>
      <Text style={{ fontFamily:F, fontSize:9, color:C.muted, marginTop:3 }}>{label}</Text>
    </View>
  )
}

function ReportDoc({ model, theme }) {
  const th = model.meta.lang === 'th'
  const s = model.stats
  const maxCat = Math.max(...model.categories.map(c => c.count), 1)
  const page = { fontFamily:F, backgroundColor:C.bg, paddingTop:0, paddingBottom:40, paddingHorizontal:0, fontSize:11, color:C.text }
  const body = { paddingHorizontal:40 }
  const h2 = { fontFamily:F, fontSize:15, fontWeight:700, color:C.text, marginBottom:10, marginTop:18 }
  const accent = '#' + (theme?.accent || '6C63FF')

  return (
    <Document title={model.meta.title} author={model.meta.brand}>
      {/* Page 1 — cover + KPIs */}
      <Page size="A4" style={page}>
        <View style={{ backgroundColor:accent, paddingTop:46, paddingBottom:30, paddingHorizontal:40 }}>
          <Text style={{ fontFamily:F, fontSize:9, fontWeight:600, color:'rgba(255,255,255,0.8)', letterSpacing:2 }}>{model.meta.brand.toUpperCase()}</Text>
          <Text style={{ fontFamily:F, fontSize:26, fontWeight:700, color:'#fff', marginTop:8 }}>{model.meta.title}</Text>
          <Text style={{ fontFamily:F, fontSize:13, color:'rgba(255,255,255,0.85)', marginTop:4 }}>{model.meta.periodLabel}</Text>
        </View>
        <View style={body}>
          <View style={{ flexDirection:'row', gap:10, marginTop:-18 }}>
            {statCard(th?'งาน':'Tasks', s.total, C.accent)}
            {statCard(th?'ชั่วโมง':'Hours', s.hours, C.accent2)}
            {statCard(th?'สำเร็จ':'Done', s.completionRate+'%', C.green)}
            {statCard(th?'โปรเจกต์':'Projects', s.projects, C.pink)}
          </View>

          <Text style={h2}>{th?'ตัวชี้วัดหลัก (KPI)':'Key Metrics'}</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10 }}>
            {[[th?'งานทั้งหมด':'Total', s.total, C.accent],[th?'เสร็จแล้ว':'Completed', s.done, C.green],[th?'กำลังทำ':'In progress', s.inProgress, C.amber],[th?'ชั่วโมงรวม':'Hours', s.hours, C.accent2],[th?'เฉลี่ย/งาน':'Avg/Task', s.avgHours+'h', C.pink],[th?'วันทำงาน':'Work days', s.workDays, C.accent]].map((k,i)=>(
              <View key={i} style={{ width:'31%', backgroundColor:C.soft, borderRadius:8, padding:10 }}>
                <Text style={{ fontFamily:F, fontSize:8, color:C.muted }}>{k[0]}</Text>
                <Text style={{ fontFamily:F, fontSize:16, fontWeight:700, color:k[2], marginTop:2 }}>{String(k[1])}</Text>
              </View>
            ))}
          </View>

          <Text style={h2}>{th?'สัดส่วนตามหมวดหมู่':'Category Breakdown'}</Text>
          <View style={{ gap:8 }}>
            {model.categories.slice(0,6).map((c,i)=>(
              <View key={i}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:3 }}>
                  <Text style={{ fontFamily:F, fontSize:10, color:C.text }}>{c.label}</Text>
                  <Text style={{ fontFamily:F, fontSize:10, fontWeight:700, color:accent }}>{c.count} ({c.pct}%)</Text>
                </View>
                <View style={{ height:8, backgroundColor:'#EEF0FA', borderRadius:4 }}>
                  <View style={{ height:8, width:`${Math.round(c.count/maxCat*100)}%`, backgroundColor:accent, borderRadius:4 }} />
                </View>
              </View>
            ))}
          </View>
        </View>
        <Text style={{ position:'absolute', bottom:18, right:40, fontFamily:F, fontSize:8, color:C.muted }}>{model.meta.brand} · {model.meta.periodLabel}</Text>
      </Page>

      {/* Page 2 — summary, tasks, recommendations */}
      <Page size="A4" style={{ ...page, paddingTop:40 }}>
        <View style={body}>
          {model.summaryText ? <>
            <Text style={h2}>{th?'บทสรุปผู้บริหาร':'Executive Summary'}</Text>
            <Text style={{ fontFamily:F, fontSize:11, color:C.sub, lineHeight:1.6 }}>{model.summaryText}</Text>
          </> : null}

          <Text style={h2}>{th?'รายการงาน':'Work Log'}</Text>
          <View>
            <View style={{ flexDirection:'row', borderBottom:`1px solid ${C.line}`, paddingBottom:5 }}>
              <Text style={{ fontFamily:F, fontSize:8, color:C.muted, width:60 }}>{th?'วันที่':'Date'}</Text>
              <Text style={{ fontFamily:F, fontSize:8, color:C.muted, flex:1 }}>{th?'งาน':'Task'}</Text>
              <Text style={{ fontFamily:F, fontSize:8, color:C.muted, width:90 }}>{th?'หมวด':'Category'}</Text>
              <Text style={{ fontFamily:F, fontSize:8, color:C.muted, width:36, textAlign:'right' }}>{th?'ชม.':'Hrs'}</Text>
            </View>
            {model.tasks.map((t,i)=>(
              <View key={i} style={{ flexDirection:'row', paddingVertical:5, borderBottom:`1px solid #F1F2F8` }}>
                <Text style={{ fontFamily:F, fontSize:9, color:C.sub, width:60 }}>{String(t.date).slice(5)}</Text>
                <Text style={{ fontFamily:F, fontSize:9, color:C.text, flex:1 }}>{(t.done?'✓ ':'• ')+t.title}</Text>
                <Text style={{ fontFamily:F, fontSize:9, color:C.sub, width:90 }}>{t.cat.label}</Text>
                <Text style={{ fontFamily:F, fontSize:9, color:C.text, width:36, textAlign:'right' }}>{t.hours}</Text>
              </View>
            ))}
          </View>

          {model.recommendations.length ? <>
            <Text style={h2}>{th?'ข้อเสนอแนะ':'Recommendations'}</Text>
            {model.recommendations.slice(0,5).map((r,i)=>(
              <View key={i} style={{ flexDirection:'row', gap:6, marginBottom:5 }}>
                <View style={{ width:4, height:4, borderRadius:2, backgroundColor:accent, marginTop:5 }} />
                <Text style={{ fontFamily:F, fontSize:10, color:C.sub, flex:1, lineHeight:1.5 }}>{r}</Text>
              </View>
            ))}
          </> : null}
        </View>
        <Text style={{ position:'absolute', bottom:18, right:40, fontFamily:F, fontSize:8, color:C.muted }}>{model.meta.brand} · {model.meta.periodLabel}</Text>
      </Page>
    </Document>
  )
}

async function streamToBuffer(s) {
  if (Buffer.isBuffer(s)) return s
  const chunks = []
  for await (const c of s) chunks.push(Buffer.from(c))
  return Buffer.concat(chunks)
}

export async function renderReportPDF(model, theme) {
  ensureFonts()
  const inst = pdf(<ReportDoc model={model} theme={theme} />)
  return streamToBuffer(await inst.toBuffer())
}

// ─────────────────────────────────────────
// PPTX (pptxgenjs) — 16:9, Thai-capable font
// ─────────────────────────────────────────
const FONT = 'Tahoma'
export async function renderReportPPTX(model, theme) {
  const mod = await import('pptxgenjs')
  const PptxGenJS = mod.default || mod
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name:'W', width:13.333, height:7.5 })
  pptx.layout = 'W'
  pptx.author = model.meta.brand
  pptx.title = model.meta.title
  const W = 13.333
  const acc = (theme?.accent) || '6C63FF'
  const th = model.meta.lang === 'th'
  const s = model.stats

  const slide = () => { const x = pptx.addSlide(); x.background = { color:'FFFFFF' }; return x }
  const eyebrow = (sl, t) => sl.addText(t.toUpperCase(), { x:0.8, y:0.55, w:W-1.6, h:0.35, fontSize:11, bold:true, color:acc, charSpacing:2, fontFace:FONT })
  const heading = (sl, t) => sl.addText(t, { x:0.8, y:0.9, w:W-1.6, h:0.8, fontSize:28, bold:true, color:'1A1A2E', fontFace:FONT })

  // 1 Cover
  let sl = slide()
  sl.addShape(pptx.shapes.RECTANGLE, { x:0, y:0, w:W, h:7.5, fill:{ color:acc } })
  sl.addText(model.meta.brand.toUpperCase(), { x:1, y:2.2, w:W-2, h:0.4, fontSize:14, bold:true, color:'FFFFFF', charSpacing:3, align:'center', fontFace:FONT })
  sl.addText(model.meta.title, { x:1, y:2.8, w:W-2, h:1.2, fontSize:40, bold:true, color:'FFFFFF', align:'center', fontFace:FONT })
  sl.addText(model.meta.periodLabel, { x:1, y:4.1, w:W-2, h:0.6, fontSize:18, color:'EEEAFF', align:'center', fontFace:FONT })

  // 2 Executive summary
  sl = slide(); eyebrow(sl, th?'บทสรุปผู้บริหาร':'Executive Summary'); heading(sl, model.meta.periodLabel)
  if (model.summaryText) sl.addText(model.summaryText, { x:0.8, y:2.0, w:W-1.6, h:2.2, fontSize:15, color:'4B5563', fontFace:FONT, lineSpacingMultiple:1.4, valign:'top' })
  const badges = (model.badges||[]).slice(0,4)
  badges.forEach((b,i)=>{ const bw=2.4, gap=0.3, total=badges.length*(bw+gap)-gap, sx=(W-total)/2
    sl.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x:sx+i*(bw+gap), y:5.4, w:bw, h:0.7, rectRadius:0.35, fill:{ color:acc, transparency:84 }, line:{ color:acc, transparency:50 } })
    sl.addText(String(b), { x:sx+i*(bw+gap), y:5.4, w:bw, h:0.7, fontSize:13, bold:true, color:acc, align:'center', valign:'middle', fontFace:FONT }) })

  // 3 KPI
  sl = slide(); eyebrow(sl, 'KPI'); heading(sl, th?'ตัวชี้วัดหลัก':'Key Metrics')
  const kpis = [[th?'งานทั้งหมด':'Total', s.total,'6C63FF'],[th?'เสร็จแล้ว':'Completed', s.done,'10B981'],[th?'ชั่วโมงรวม':'Hours', s.hours,'06B6D4'],[th?'โปรเจกต์':'Projects', s.projects,'8B5CF6'],[th?'อัตราสำเร็จ':'Completion', s.completionRate+'%','F59E0B'],[th?'เฉลี่ย/งาน':'Avg/Task', s.avgHours+'h','EC4899']]
  kpis.forEach((k,i)=>{ const col=i%3, row=Math.floor(i/3), cw=3.7, ch=1.9, gx=0.25, gy=0.3, sx=(W-(3*cw+2*gx))/2
    const x=sx+col*(cw+gx), y=2.0+row*(ch+gy)
    sl.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w:cw, h:ch, rectRadius:0.1, fill:{ color:'F4F3FF' }, line:{ color:k[2], transparency:60 } })
    sl.addText(k[0].toUpperCase(), { x, y:y+0.25, w:cw, h:0.4, fontSize:11, bold:true, color:'9CA3AF', align:'center', fontFace:FONT })
    sl.addText(String(k[1]), { x, y:y+0.65, w:cw, h:0.9, fontSize:34, bold:true, color:k[2], align:'center', fontFace:FONT }) })

  // 4 Category
  sl = slide(); eyebrow(sl, th?'หมวดหมู่':'Categories'); heading(sl, th?'สัดส่วนตามหมวดหมู่':'Category Breakdown')
  const cats = model.categories.slice(0,6); const maxC = Math.max(...cats.map(c=>c.count),1)
  cats.forEach((c,i)=>{ const y=2.1+i*0.75, bx=4.2, bw=W-bx-1.6, pct=c.count/maxC
    sl.addText(c.label, { x:0.8, y, w:3.2, h:0.5, fontSize:13, color:'1A1A2E', fontFace:FONT, valign:'middle' })
    sl.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x:bx, y:y+0.08, w:bw, h:0.36, rectRadius:0.18, fill:{ color:acc, transparency:86 }, line:{ type:'none' } })
    sl.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x:bx, y:y+0.08, w:Math.max(bw*pct,0.1), h:0.36, rectRadius:0.18, fill:{ color:acc }, line:{ type:'none' } })
    sl.addText(c.count+' ('+c.pct+'%)', { x:W-1.5, y, w:1.3, h:0.5, fontSize:12, bold:true, color:acc, align:'right', fontFace:FONT, valign:'middle' }) })

  // 5 Top tasks
  sl = slide(); eyebrow(sl, th?'รายการงาน':'Work Log'); heading(sl, th?'งานเด่นประจำเดือน':'Highlighted Tasks')
  model.tasks.slice(0,8).forEach((t,i)=>{ const y=2.0+i*0.62
    sl.addText((t.done?'✓':'•'), { x:0.8, y, w:0.4, h:0.5, fontSize:14, bold:true, color:t.done?'10B981':acc, fontFace:FONT, valign:'middle' })
    sl.addText(t.title, { x:1.2, y, w:8.4, h:0.5, fontSize:13, color:'1A1A2E', fontFace:FONT, valign:'middle' })
    sl.addText(t.cat.label, { x:9.6, y, w:2.4, h:0.5, fontSize:11, color:'6B7099', fontFace:FONT, valign:'middle', align:'right' })
    sl.addText(t.hours+'h', { x:12.1, y, w:0.8, h:0.5, fontSize:12, bold:true, color:acc, fontFace:FONT, valign:'middle', align:'right' }) })

  // 6 Closing
  sl = slide()
  sl.addShape(pptx.shapes.RECTANGLE, { x:0, y:0, w:W, h:7.5, fill:{ color:acc } })
  sl.addText(th?'ขอบคุณครับ':'Thank You', { x:1, y:3.0, w:W-2, h:1.2, fontSize:44, bold:true, color:'FFFFFF', align:'center', fontFace:FONT })
  sl.addText(model.meta.brand+' · '+model.meta.periodLabel, { x:1, y:4.3, w:W-2, h:0.6, fontSize:16, color:'EEEAFF', align:'center', fontFace:FONT })

  return pptx.write({ outputType:'nodebuffer' })
}
