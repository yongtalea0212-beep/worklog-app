"use client"
import {
  Document, Page, Text, View, StyleSheet, Font, pdf
} from '@react-pdf/renderer'

// ─────────────────────────────────────────
// REGISTER IBM PLEX SANS THAI
// ─────────────────────────────────────────
Font.register({
  family: 'IBMPlexSansThai',
  fonts: [
    { src: '/fonts/IBMPlexSansThai-Regular.ttf',  fontWeight: 400 },
    { src: '/fonts/IBMPlexSansThai-Medium.ttf',   fontWeight: 500 },
    { src: '/fonts/IBMPlexSansThai-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/IBMPlexSansThai-Bold.ttf',     fontWeight: 700 },
  ],
})

Font.registerHyphenationCallback(word => [word])

// ─────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────
const F = 'IBMPlexSansThai'
const ACCENT   = '#6C63FF'
const ACCENT2  = '#06B6D4'
const GREEN    = '#10B981'
const AMBER    = '#F59E0B'
const TEXT     = '#1a1a2e'
const TEXT2    = '#6b7099'
const TEXT3    = '#9ca3af'
const BG       = '#FAFBFF'
const BG2      = '#FFFFFF'
const BORDER   = '#E5E7EB'
const SURFACE  = 'rgba(108,99,255,0.04)'

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const S = StyleSheet.create({

  // ── Pages ──
  coverPage: { fontFamily: F, backgroundColor: '#F0EFFF', padding: 0 },
  page: {
    fontFamily: F, fontSize: 11, color: TEXT,
    backgroundColor: BG,
    paddingTop: 44, paddingBottom: 60, paddingHorizontal: 48,
  },

  // ── Cover header ──
  coverHeader: {
    backgroundColor: ACCENT,
    paddingTop: 52, paddingBottom: 40, paddingHorizontal: 48,
  },
  coverEyebrow: {
    fontSize: 8, fontFamily: F, fontWeight: 500,
    color: 'rgba(255,255,255,0.7)', letterSpacing: 2.5,
    marginBottom: 14,
  },
  coverTitle: {
    fontSize: 32, fontFamily: F, fontWeight: 700,
    color: '#FFFFFF', lineHeight: 1.2, marginBottom: 6,
  },
  coverSub: {
    fontSize: 13, fontFamily: F, fontWeight: 400,
    color: 'rgba(255,255,255,0.75)', marginBottom: 30,
  },
  coverStats: { flexDirection: 'row', gap: 10 },
  coverStatCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 10, padding: 14,
  },
  coverStatNum: {
    fontSize: 26, fontFamily: F, fontWeight: 700,
    color: '#FFFFFF', marginBottom: 3,
  },
  coverStatLabel: {
    fontSize: 9, fontFamily: F, fontWeight: 400,
    color: 'rgba(255,255,255,0.65)',
  },

  // ── Cover body ──
  coverBody: { padding: 40 },

  // ── Section label ──
  secLabel: {
    fontSize: 8, fontFamily: F, fontWeight: 700,
    color: TEXT3, letterSpacing: 1.4, marginBottom: 10,
  },

  // ── KPI grid ──
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 26 },
  kpiCard: {
    width: '47%', backgroundColor: BG2,
    borderRadius: 10, padding: 14,
    borderLeft: '3px solid ' + ACCENT,
  },
  kpiLabel: {
    fontSize: 8, fontFamily: F, fontWeight: 600,
    color: TEXT3, letterSpacing: 0.8, marginBottom: 5,
  },
  kpiVal: {
    fontSize: 20, fontFamily: F, fontWeight: 700,
    marginBottom: 3,
  },
  kpiChange: { fontSize: 9, fontFamily: F, color: GREEN },

  // ── Category bars ──
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  catDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, flexShrink: 0 },
  catLabel: { fontSize: 10, fontFamily: F, color: TEXT2, flex: 1 },
  catTrack: {
    width: 110, height: 5, backgroundColor: BORDER,
    borderRadius: 3, marginHorizontal: 8,
  },
  catFill: { height: 5, borderRadius: 3 },
  catCount: {
    fontSize: 10, fontFamily: F, color: TEXT3, width: 18, textAlign: 'right',
  },

  // ── Page header ──
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 22, paddingBottom: 12, borderBottom: '1px solid ' + BORDER,
  },
  pageTitle: { fontSize: 17, fontFamily: F, fontWeight: 700, color: TEXT },
  pageMeta:  { fontSize: 9, fontFamily: F, color: TEXT3, letterSpacing: 0.5 },

  // ── Date divider ──
  dateDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 6 },
  dateLine:    { height: 1, flex: 1, backgroundColor: BORDER },
  dateLabel:   {
    fontSize: 9, fontFamily: F, fontWeight: 600,
    color: TEXT3, marginHorizontal: 10, letterSpacing: 0.5,
  },

  // ── Log card ──
  logCard: {
    backgroundColor: BG2, borderRadius: 10,
    padding: 13, marginBottom: 8, position: 'relative',
  },
  logAccentBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, borderRadius: 10,
  },
  logInner:  { paddingLeft: 11 },
  logTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  logTitle:  {
    fontSize: 12, fontFamily: F, fontWeight: 600,
    color: TEXT, flex: 1, marginRight: 8,
  },
  logRight:  { alignItems: 'flex-end' },
  logHours:  { fontSize: 10, fontFamily: F, fontWeight: 700, marginBottom: 2 },
  logDone:   { fontSize: 8, fontFamily: F, color: GREEN },
  logBadge:  {
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 7, paddingVertical: 2, marginBottom: 5,
  },
  logBadgeTxt: { fontSize: 8, fontFamily: F, fontWeight: 600 },
  logDesc:   {
    fontSize: 10, fontFamily: F, color: TEXT2,
    lineHeight: 1.6, marginBottom: 4,
  },
  tagsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  tag: {
    fontSize: 8, fontFamily: F, color: ACCENT,
    backgroundColor: 'rgba(108,99,255,0.1)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
  },

  // ── Summary row ──
  sumRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sumCard: {
    flex: 1, backgroundColor: BG2,
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  sumNum:   { fontSize: 19, fontFamily: F, fontWeight: 700, marginBottom: 3 },
  sumLabel: {
    fontSize: 8, fontFamily: F, color: TEXT3,
    letterSpacing: 0.5, textAlign: 'center',
  },

  // ── AI box ──
  aiBox: {
    backgroundColor: SURFACE, borderRadius: 12,
    padding: 16, border: '1px solid rgba(108,99,255,0.18)',
    marginBottom: 16,
  },
  aiLabel: {
    fontSize: 8, fontFamily: F, fontWeight: 700,
    color: ACCENT, letterSpacing: 1.2, marginBottom: 8,
  },
  aiText:  { fontSize: 11, fontFamily: F, color: TEXT, lineHeight: 1.85 },
  aiHint:  { fontSize: 11, fontFamily: F, color: TEXT3, lineHeight: 1.6 },

  // ── Timeline ──
  tlItem: { flexDirection: 'row', marginBottom: 9, alignItems: 'flex-start' },
  tlDot:  {
    width: 8, height: 8, borderRadius: 4,
    marginTop: 3, marginRight: 10, flexShrink: 0,
  },
  tlTitle: { fontSize: 11, fontFamily: F, fontWeight: 600, color: TEXT, marginBottom: 2 },
  tlMeta:  { fontSize: 9, fontFamily: F, color: TEXT3 },

  // ── Divider ──
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 14 },

  // ── Note box ──
  noteBox: {
    backgroundColor: BG2, borderRadius: 10,
    padding: 14, border: '1px solid ' + BORDER, marginTop: 8,
  },
  noteText: { fontSize: 10, fontFamily: F, color: TEXT2, lineHeight: 1.7 },

  // ── Footer ──
  footer: {
    position: 'absolute', bottom: 20, left: 48, right: 48,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTop: '1px solid ' + BORDER, paddingTop: 8,
  },
  footerTxt:   { fontSize: 8, fontFamily: F, color: TEXT3 },
  footerBrand: { fontSize: 8, fontFamily: F, fontWeight: 700, color: ACCENT },
})

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const CATS = [
  { id:'graphic',   label:'Graphic Design', color:'#6C63FF' },
  { id:'video',     label:'Video Editing',  color:'#06B6D4' },
  { id:'photo',     label:'Photography',    color:'#F59E0B' },
  { id:'marketing', label:'Marketing',      color:'#EF4444' },
  { id:'ai',        label:'AI Content',     color:'#8B5CF6' },
  { id:'branding',  label:'Branding',       color:'#EC4899' },
  { id:'pos',       label:'POS Design',     color:'#10B981' },
  { id:'other',     label:'อื่นๆ',          color:'#64748B' },
]

const getCat = id => CATS.find(c => c.id === id) || CATS[7]

const fmtThai = s => {
  try { return new Date(s).toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' }) }
  catch { return s }
}

const fmtShort = s => {
  try { return new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) }
  catch { return s }
}

const getMonthLabel = logs => {
  if (!logs.length) return 'Monthly Report'
  try { return new Date(logs[0].date).toLocaleDateString('th-TH', { month:'long', year:'numeric' }) }
  catch { return 'Monthly Report' }
}

function getStats(logs) {
  const total = logs.length
  const hours = logs.reduce((s, l) => s + (l.hours || 0), 0)
  const done  = logs.filter(l => l.status === 'done').length
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0
  const avgHours = total > 0 ? Math.round((hours / total) * 10) / 10 : 0
  const byCategory = {}
  logs.forEach(l => { byCategory[l.category] = (byCategory[l.category] || 0) + 1 })
  return { total, hours, done, completionRate, avgHours, byCategory }
}

// ─────────────────────────────────────────
// PAGE 1 — COVER
// ─────────────────────────────────────────
function CoverPage({ logs, monthLabel }) {
  const stats   = getStats(logs)
  const today   = new Date().toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' })
  const catData = Object.entries(stats.byCategory)
    .map(([id, count]) => ({ ...getCat(id), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  const maxCount = Math.max(...catData.map(c => c.count), 1)

  const kpis = [
    { label:'งานทั้งหมด',   value:`${stats.total} งาน`,        color: ACCENT,  change:'เดือนนี้'        },
    { label:'ชั่วโมงรวม',   value:`${stats.hours} ชม.`,        color: ACCENT2, change:'ทำงานจริง'       },
    { label:'งานเสร็จแล้ว', value:`${stats.completionRate}%`,  color: GREEN,   change:`${stats.done} จาก ${stats.total} งาน` },
    { label:'เฉลี่ยต่องาน', value:`${stats.avgHours} ชม.`,     color: AMBER,   change:'per task'        },
  ]

  return (
    <Page size="A4" style={S.coverPage}>
      {/* ── Header band ── */}
      <View style={S.coverHeader}>
        <Text style={S.coverEyebrow}>MONTHLY WORK REPORT</Text>
        <Text style={S.coverTitle}>{monthLabel}</Text>
        <Text style={S.coverSub}>สรุปผลงานประจำเดือน · สร้างโดย WorkLog AI</Text>
        <View style={S.coverStats}>
          {[
            { num:`${stats.total}`,             label:'Total Tasks'    },
            { num:`${stats.hours} ชม.`,         label:'Hours Worked'   },
            { num:`${stats.completionRate}%`,   label:'Completion Rate'},
          ].map((s, i) => (
            <View key={i} style={S.coverStatCard}>
              <Text style={S.coverStatNum}>{s.num}</Text>
              <Text style={S.coverStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Body ── */}
      <View style={S.coverBody}>
        {/* KPI */}
        <Text style={[S.secLabel, { marginBottom: 12 }]}>KEY PERFORMANCE INDICATORS</Text>
        <View style={S.kpiGrid}>
          {kpis.map((k, i) => (
            <View key={i} style={[S.kpiCard, { borderLeftColor: k.color }]}>
              <Text style={S.kpiLabel}>{k.label.toUpperCase()}</Text>
              <Text style={[S.kpiVal, { color: k.color }]}>{k.value}</Text>
              <Text style={S.kpiChange}>{k.change}</Text>
            </View>
          ))}
        </View>

        {/* Category */}
        <Text style={[S.secLabel, { marginBottom: 10 }]}>CATEGORY BREAKDOWN</Text>
        {catData.map((cat, i) => (
          <View key={i} style={S.catRow}>
            <View style={[S.catDot, { backgroundColor: cat.color }]} />
            <Text style={S.catLabel}>{cat.label}</Text>
            <View style={S.catTrack}>
              <View style={[S.catFill, {
                backgroundColor: cat.color,
                width: `${Math.round((cat.count / maxCount) * 100)}%`,
              }]} />
            </View>
            <Text style={S.catCount}>{cat.count}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={[S.footer, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
        <Text style={S.footerTxt}>สร้างเมื่อ {today}</Text>
        <Text style={S.footerBrand}>✦ WorkLog AI</Text>
        <Text style={S.footerTxt}>Page 1</Text>
      </View>
    </Page>
  )
}

// ─────────────────────────────────────────
// PAGE 2 — WORK LIST
// ─────────────────────────────────────────
function WorkListPage({ logs }) {
  const groups = {}
  logs.forEach(l => {
    if (!groups[l.date]) groups[l.date] = []
    groups[l.date].push(l)
  })
  const sorted = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <Page size="A4" style={S.page}>
      <View style={S.pageHeader}>
        <Text style={S.pageTitle}>รายการงานทั้งหมด</Text>
        <Text style={S.pageMeta}>WORK LOG · {logs.length} TASKS</Text>
      </View>

      {sorted.map(([date, dayLogs]) => (
        <View key={date} wrap={false}>
          <View style={S.dateDivider}>
            <View style={S.dateLine} />
            <Text style={S.dateLabel}>
              {fmtShort(date).toUpperCase()} · {dayLogs.length} งาน · {dayLogs.reduce((s, l) => s + l.hours, 0)} ชม.
            </Text>
            <View style={S.dateLine} />
          </View>

          {dayLogs.map((log, i) => {
            const cat = getCat(log.category)
            return (
              <View key={i} style={S.logCard} wrap={false}>
                <View style={[S.logAccentBar, { backgroundColor: cat.color }]} />
                <View style={S.logInner}>
                  <View style={S.logTop}>
                    <Text style={S.logTitle}>{log.title}</Text>
                    <View style={S.logRight}>
                      <Text style={[S.logHours, { color: cat.color }]}>{log.hours} ชม.</Text>
                      <Text style={S.logDone}>
                        {log.status === 'done' ? '✓ เสร็จแล้ว'
                          : log.status === 'in_progress' ? 'กำลังทำ' : 'ร่าง'}
                      </Text>
                    </View>
                  </View>

                  <View style={[S.logBadge, { backgroundColor: `${cat.color}18` }]}>
                    <Text style={[S.logBadgeTxt, { color: cat.color }]}>{cat.label}</Text>
                  </View>

                  {(log.aiSummary || log.description)
                    ? <Text style={S.logDesc}>{log.aiSummary || log.description}</Text>
                    : null}

                  {log.tags?.length > 0 && (
                    <View style={S.tagsRow}>
                      {log.tags.map((t, j) => <Text key={j} style={S.tag}>#{t}</Text>)}
                    </View>
                  )}
                </View>
              </View>
            )
          })}

          <View style={{ height: 6 }} />
        </View>
      ))}

      <View style={S.footer} fixed>
        <Text style={S.footerTxt}>WorkLog AI · รายการงาน</Text>
        <Text style={S.footerBrand}>✦ WorkLog AI</Text>
        <Text
          style={S.footerTxt}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  )
}

// ─────────────────────────────────────────
// PAGE 3 — AI REPORT
// ─────────────────────────────────────────
function AIReportPage({ logs, aiReport, monthLabel }) {
  const stats = getStats(logs)

  return (
    <Page size="A4" style={S.page}>
      <View style={S.pageHeader}>
        <Text style={S.pageTitle}>AI Monthly Report</Text>
        <Text style={S.pageMeta}>{monthLabel}</Text>
      </View>

      {/* Summary */}
      <View style={S.sumRow}>
        {[
          { num:`${stats.total}`,              label:'งานทั้งหมด',  color: ACCENT  },
          { num:`${stats.hours} ชม.`,          label:'ชั่วโมงรวม', color: ACCENT2 },
          { num:`${stats.completionRate}%`,    label:'งานเสร็จ',   color: GREEN   },
          { num:`${stats.avgHours} ชม.`,       label:'เฉลี่ย/งาน', color: AMBER   },
        ].map((s, i) => (
          <View key={i} style={S.sumCard}>
            <Text style={[S.sumNum, { color: s.color }]}>{s.num}</Text>
            <Text style={S.sumLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* AI Report */}
      <Text style={[S.secLabel, { marginBottom: 8 }]}>AI ANALYSIS</Text>
      <View style={S.aiBox}>
        <Text style={S.aiLabel}>✨ AI MONTHLY SUMMARY</Text>
        {aiReport
          ? <Text style={S.aiText}>{aiReport}</Text>
          : <Text style={S.aiHint}>
              กด "✨ ให้ AI สร้างรายงาน" ในแอปก่อน แล้วกด Export PDF ใหม่{'\n'}
              เพื่อให้ข้อความ AI Report ปรากฏในหน้านี้
            </Text>
        }
      </View>

      <View style={S.divider} />

      {/* Timeline */}
      <Text style={[S.secLabel, { marginBottom: 8 }]}>WORK TIMELINE</Text>
      {logs.slice(0, 14).map((log, i) => {
        const cat = getCat(log.category)
        return (
          <View key={i} style={S.tlItem} wrap={false}>
            <View style={[S.tlDot, { backgroundColor: cat.color }]} />
            <View>
              <Text style={S.tlTitle}>{log.title}</Text>
              <Text style={S.tlMeta}>{fmtShort(log.date)} · {log.hours} ชม. · {cat.label}</Text>
            </View>
          </View>
        )
      })}
      {logs.length > 14 && (
        <Text style={[S.tlMeta, { marginTop: 4 }]}>
          ...และอีก {logs.length - 14} งาน — ดูทั้งหมดในหน้า Work List
        </Text>
      )}

      <View style={S.divider} />

      {/* Generated by */}
      <View style={S.noteBox}>
        <Text style={[S.secLabel, { marginBottom: 5 }]}>GENERATED BY</Text>
        <Text style={S.noteText}>
          รายงานนี้สร้างโดย WorkLog AI อัตโนมัติ{'\n'}
          จากข้อมูลงาน {stats.total} งาน ใน {Object.keys(stats.byCategory).length} หมวดหมู่{'\n'}
          รวมชั่วโมงทำงานทั้งหมด {stats.hours} ชั่วโมง
        </Text>
      </View>

      <View style={S.footer} fixed>
        <Text style={S.footerTxt}>WorkLog AI · AI Analysis</Text>
        <Text style={S.footerBrand}>✦ WorkLog AI</Text>
        <Text
          style={S.footerTxt}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  )
}

// ─────────────────────────────────────────
// MAIN DOCUMENT
// ─────────────────────────────────────────
export function ReportPDFDocument({ logs, aiReport = '' }) {
  const monthLabel = getMonthLabel(logs)
  return (
    <Document
      title={`WorkLog AI · ${monthLabel}`}
      author="WorkLog AI"
      subject="Monthly Work Report"
      creator="WorkLog AI Platform"
    >
      <CoverPage  logs={logs} monthLabel={monthLabel} />
      <WorkListPage logs={logs} />
      <AIReportPage logs={logs} aiReport={aiReport} monthLabel={monthLabel} />
    </Document>
  )
}

// ─────────────────────────────────────────
// DOWNLOAD HELPER
// ─────────────────────────────────────────
export async function downloadReportPDF(logs, aiReport = '') {
  const { pdf }  = await import('@react-pdf/renderer')
  const React    = await import('react')

  const blob = await pdf(
    React.createElement(ReportPDFDocument, { logs, aiReport })
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url

  const month = new Date().toLocaleDateString('en-GB', {
    month: 'short', year: 'numeric',
  }).replace(' ', '-')
  a.download = `WorkLog-Report-${month}.pdf`

  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
