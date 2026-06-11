// app/api/social/reports/route.js — executive report export (Module 14).
// GET ?format=xlsx|pdf → streams a download for the caller's org.
// Excel via exceljs; PDF via @react-pdf/renderer with the bundled Thai font.
import path from 'node:path'
import { resolveOrg } from '../../../lib/social/server'

export const runtime = 'nodejs'

async function buildData(db, orgId) {
  const count = async (t) => (await db.from(t).select('id', { count: 'exact', head: true }).eq('organization_id', orgId)).count || 0
  const [pages, posts, comments] = await Promise.all([count('tracked_pages'), count('posts'), count('comments')])

  const { data: org } = await db.from('organizations').select('name').eq('id', orgId).single()
  const { data: sents } = await db.from('sentiments').select('sentiment, category').eq('organization_id', orgId)
  const total = sents?.length || 0
  const tally = (key, val) => sents?.filter((s) => s[key] === val).length || 0
  const sentiment = { positive: tally('sentiment', 'positive'), neutral: tally('sentiment', 'neutral'), negative: tally('sentiment', 'negative') }
  const cats = {}
  for (const s of sents || []) cats[s.category] = (cats[s.category] || 0) + 1

  const { data: top } = await db.from('posts')
    .select('content, like_count, comment_count, share_count, tracked_pages(name)')
    .eq('organization_id', orgId).order('like_count', { ascending: false }).limit(5)
  const topPosts = (top || []).map((p) => ({
    page: p.tracked_pages?.name || '-', content: (p.content || '').slice(0, 60),
    likes: p.like_count, comments: p.comment_count, shares: p.share_count,
    engagement: Number(p.like_count) + Number(p.comment_count) + Number(p.share_count),
  }))

  const { data: comps } = await db.from('competitors').select('label, rank_score').eq('organization_id', orgId).order('rank_score', { ascending: false })

  const pct = (n) => (total ? Math.round((n / total) * 100) : 0)
  return {
    org: org?.name || 'Organization', generatedAt: new Date(),
    kpis: { pages, posts, comments, positivePct: pct(sentiment.positive), negativePct: pct(sentiment.negative), neutralPct: pct(sentiment.neutral) },
    sentiment, cats, topPosts,
    competitors: (comps || []).map((c) => ({ name: c.label || '-', score: Math.round(Number(c.rank_score)) })),
  }
}

async function buildXlsx(d) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Social Insight AI'

  const s1 = wb.addWorksheet('สรุป')
  s1.columns = [{ header: 'ตัวชี้วัด', key: 'k', width: 28 }, { header: 'ค่า', key: 'v', width: 18 }]
  s1.addRows([
    { k: 'องค์กร', v: d.org },
    { k: 'สร้างเมื่อ', v: d.generatedAt.toLocaleString('th-TH') },
    { k: 'เพจที่ติดตาม', v: d.kpis.pages },
    { k: 'โพสต์ที่เก็บ', v: d.kpis.posts },
    { k: 'คอมเมนต์', v: d.kpis.comments },
    { k: 'Positive (%)', v: d.kpis.positivePct },
    { k: 'Neutral (%)', v: d.kpis.neutralPct },
    { k: 'Negative (%)', v: d.kpis.negativePct },
  ])
  s1.getRow(1).font = { bold: true }

  const s2 = wb.addWorksheet('Top Posts')
  s2.columns = [
    { header: 'เพจ', key: 'page', width: 22 }, { header: 'เนื้อหา', key: 'content', width: 50 },
    { header: 'Likes', key: 'likes', width: 10 }, { header: 'Comments', key: 'comments', width: 12 },
    { header: 'Shares', key: 'shares', width: 10 }, { header: 'Engagement', key: 'engagement', width: 13 },
  ]
  s2.addRows(d.topPosts); s2.getRow(1).font = { bold: true }

  const s3 = wb.addWorksheet('Sentiment & หมวด')
  s3.columns = [{ header: 'ประเภท', key: 'k', width: 22 }, { header: 'จำนวน', key: 'v', width: 12 }]
  s3.addRows([
    { k: 'Positive', v: d.sentiment.positive }, { k: 'Neutral', v: d.sentiment.neutral }, { k: 'Negative', v: d.sentiment.negative },
    ...Object.entries(d.cats).map(([k, v]) => ({ k: `หมวด: ${k}`, v })),
  ])
  s3.getRow(1).font = { bold: true }

  return Buffer.from(await wb.xlsx.writeBuffer())
}

async function buildPdf(d) {
  const React = (await import('react')).default
  const { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } = await import('@react-pdf/renderer')
  const fdir = path.join(process.cwd(), 'public', 'fonts')
  Font.register({ family: 'Thai', fonts: [
    { src: path.join(fdir, 'IBMPlexSansThai-Regular.ttf') },
    { src: path.join(fdir, 'IBMPlexSansThai-Bold.ttf'), fontWeight: 'bold' },
  ] })
  const st = StyleSheet.create({
    page: { padding: 36, fontFamily: 'Thai', fontSize: 10, color: '#0f172a' },
    h1: { fontSize: 18, fontWeight: 'bold', color: '#2563EB' },
    sub: { fontSize: 9, color: '#94a3b8', marginBottom: 14 },
    section: { fontSize: 12, fontWeight: 'bold', marginTop: 16, marginBottom: 6 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottom: '1px solid #eef2f7' },
    kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    kpi: { width: '31%', padding: 10, backgroundColor: '#f6f8fb', borderRadius: 6, marginBottom: 8 },
    kpiV: { fontSize: 16, fontWeight: 'bold', color: '#2563EB' },
    kpiL: { fontSize: 8, color: '#64748b' },
  })
  const E = React.createElement
  const kpi = (label, val) => E(View, { style: st.kpi }, E(Text, { style: st.kpiV }, String(val)), E(Text, { style: st.kpiL }, label))
  const line = (a, b) => E(View, { style: st.row }, E(Text, null, a), E(Text, { style: { fontWeight: 'bold' } }, String(b)))

  const doc = E(Document, null, E(Page, { size: 'A4', style: st.page },
    E(Text, { style: st.h1 }, 'Social Insight AI — รายงานสรุป'),
    E(Text, { style: st.sub }, `${d.org} · สร้างเมื่อ ${d.generatedAt.toLocaleString('th-TH')}`),
    E(View, { style: st.kpiRow },
      kpi('เพจที่ติดตาม', d.kpis.pages), kpi('โพสต์', d.kpis.posts), kpi('คอมเมนต์', d.kpis.comments),
      kpi('Positive %', d.kpis.positivePct), kpi('Neutral %', d.kpis.neutralPct), kpi('Negative %', d.kpis.negativePct)),
    E(Text, { style: st.section }, 'Top Posts'),
    ...d.topPosts.map((p) => line(`${p.page}: ${p.content}`, `⚡${p.engagement}`)),
    E(Text, { style: st.section }, 'Sentiment'),
    line('Positive', d.sentiment.positive), line('Neutral', d.sentiment.neutral), line('Negative', d.sentiment.negative),
    E(Text, { style: st.section }, 'Competitor Ranking'),
    ...(d.competitors.length ? d.competitors.map((c) => line(c.name, c.score)) : [E(Text, { style: st.kpiL }, 'ยังไม่มีข้อมูลคู่แข่ง')]),
  ))
  return await renderToBuffer(doc)
}

async function buildPptx(d) {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'W', width: 10, height: 5.63 }); pptx.layout = 'W'
  const FONT = 'IBM Plex Sans Thai'

  const cover = pptx.addSlide(); cover.background = { color: '2563EB' }
  cover.addText('Social Insight AI', { x: 0.6, y: 1.8, w: 8.8, fontFace: FONT, fontSize: 40, bold: true, color: 'FFFFFF' })
  cover.addText(`รายงานสรุป · ${d.org}`, { x: 0.6, y: 2.9, w: 8.8, fontFace: FONT, fontSize: 18, color: 'DBEAFE' })
  cover.addText(d.generatedAt.toLocaleString('th-TH'), { x: 0.6, y: 3.5, w: 8.8, fontFace: FONT, fontSize: 12, color: 'BFDBFE' })

  const kpiSlide = pptx.addSlide()
  kpiSlide.addText('ตัวชี้วัดหลัก', { x: 0.5, y: 0.3, fontFace: FONT, fontSize: 24, bold: true, color: '2563EB' })
  const kpis = [['เพจ', d.kpis.pages], ['โพสต์', d.kpis.posts], ['คอมเมนต์', d.kpis.comments],
    ['Positive %', d.kpis.positivePct], ['Neutral %', d.kpis.neutralPct], ['Negative %', d.kpis.negativePct]]
  kpis.forEach(([label, val], i) => {
    const x = 0.5 + (i % 3) * 3.1, y = 1.2 + Math.floor(i / 3) * 1.9
    kpiSlide.addShape(pptx.ShapeType.roundRect, { x, y, w: 2.9, h: 1.6, fill: { color: 'F6F8FB' }, line: { color: 'EEF2F7' }, rectRadius: 0.1 })
    kpiSlide.addText(String(val), { x, y: y + 0.2, w: 2.9, align: 'center', fontFace: FONT, fontSize: 30, bold: true, color: '2563EB' })
    kpiSlide.addText(label, { x, y: y + 1.0, w: 2.9, align: 'center', fontFace: FONT, fontSize: 12, color: '64748B' })
  })

  const topSlide = pptx.addSlide()
  topSlide.addText('Top Posts', { x: 0.5, y: 0.3, fontFace: FONT, fontSize: 24, bold: true, color: '2563EB' })
  const rows = [[{ text: 'เพจ', options: { bold: true } }, { text: 'เนื้อหา', options: { bold: true } }, { text: 'Engagement', options: { bold: true } }],
    ...d.topPosts.map((p) => [p.page, p.content, String(p.engagement)])]
  topSlide.addTable(rows, { x: 0.5, y: 1.0, w: 9, fontFace: FONT, fontSize: 11, border: { type: 'solid', color: 'EEF2F7' }, color: '0F172A' })

  return Buffer.from(await pptx.write({ outputType: 'nodebuffer' }))
}

export async function GET(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  const format = new URL(request.url).searchParams.get('format') || 'pdf'
  const data = await buildData(ctx.db, ctx.orgId)
  const stamp = new Date().toISOString().slice(0, 10)

  try {
    if (format === 'xlsx') {
      const buf = await buildXlsx(data)
      return new Response(buf, { headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="social-insight-${stamp}.xlsx"`,
      } })
    }
    if (format === 'pptx') {
      const buf = await buildPptx(data)
      return new Response(buf, { headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="social-insight-${stamp}.pptx"`,
      } })
    }
    const buf = await buildPdf(data)
    return new Response(buf, { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="social-insight-${stamp}.pdf"`,
    } })
  } catch (e) {
    return Response.json({ error: 'report generation failed: ' + String(e.message || e) }, { status: 500 })
  }
}
