// app/api/social/line-digest/route.js — LINE daily digest + alert push (Modules 11–12).
//   POST (Bearer user token) → build digest for caller's org and push now (test).
//   GET  (x-cron-secret)     → push daily digest for every org with notify_daily,
//                              and fire alerts where negative-sentiment exceeds threshold.
// Reuses the project's LINE push convention (push API + Flex bubbles).
import { admin, resolveOrg } from '../../../lib/social/server'

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://worklog-app-virid.vercel.app'
const DEFAULT_NEG_THRESHOLD = 20 // %

async function pushLINE(to, messages) {
  if (!LINE_TOKEN || !to) return
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ to, messages }),
    })
  } catch (e) { console.error('[social push]', e?.message || e) }
}

// ── gather a compact summary for one org ──────────────────────────────────
async function orgSummary(db, orgId) {
  const count = async (t) => (await db.from(t).select('id', { count: 'exact', head: true }).eq('organization_id', orgId)).count || 0
  const [pages, posts, comments] = await Promise.all([count('tracked_pages'), count('posts'), count('comments')])

  const { data: sents } = await db.from('sentiments').select('sentiment').eq('organization_id', orgId)
  const total = sents?.length || 0
  const pos = sents?.filter((s) => s.sentiment === 'positive').length || 0
  const neg = sents?.filter((s) => s.sentiment === 'negative').length || 0
  const positivePct = total ? Math.round((pos / total) * 100) : 0
  const negativePct = total ? Math.round((neg / total) * 100) : 0

  const { data: trend } = await db.from('trends').select('title, score').eq('organization_id', orgId).order('score', { ascending: false }).limit(1)
  const { data: comp } = await db.from('competitors').select('label, rank_score').eq('organization_id', orgId).order('rank_score', { ascending: false }).limit(1)

  return { pages, posts, comments, total, positivePct, negativePct,
    topTrend: trend?.[0]?.title || null, topCompetitor: comp?.[0] || null }
}

function digestFlex(s) {
  const row = (label, value, color = '#0f172a') => ({
    type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: label, size: 'sm', color: '#64748b', flex: 5 },
      { type: 'text', text: String(value), size: 'sm', weight: 'bold', color, flex: 3, align: 'end' },
    ],
  })
  return {
    type: 'flex', altText: '📊 Social Insight — สรุปประจำวัน',
    contents: {
      type: 'bubble', size: 'mega',
      header: { type: 'box', layout: 'vertical', paddingAll: '16px', backgroundColor: '#2563EB', contents: [
        { type: 'text', text: '📊 Social Insight AI', color: '#ffffff', weight: 'bold', size: 'md' },
        { type: 'text', text: 'สรุปประจำวัน', color: '#dbeafe', size: 'xs', margin: 'xs' },
      ] },
      body: { type: 'box', layout: 'vertical', paddingAll: '16px', spacing: 'md', contents: [
        row('เพจที่ติดตาม', s.pages),
        row('โพสต์ที่เก็บ', s.posts),
        row('คอมเมนต์', s.comments),
        { type: 'separator', margin: 'sm' },
        row('Positive', `${s.positivePct}%`, '#16a34a'),
        row('Negative', `${s.negativePct}%`, '#dc2626'),
        ...(s.topTrend ? [row('เทรนด์เด่น', s.topTrend.slice(0, 22), '#2563EB')] : []),
        ...(s.topCompetitor ? [row('คู่แข่งอันดับ 1', s.topCompetitor.label?.slice(0, 18) || '-')] : []),
      ] },
      footer: { type: 'box', layout: 'vertical', paddingAll: '12px', contents: [
        { type: 'button', style: 'primary', height: 'sm', color: '#2563EB',
          action: { type: 'uri', label: 'เปิด Dashboard', uri: `${APP_URL}/social` } },
      ] },
    },
  }
}

function alertFlex(title, message, negPct) {
  return {
    type: 'flex', altText: `🔔 ${title}`,
    contents: {
      type: 'bubble', size: 'kilo',
      header: { type: 'box', layout: 'vertical', paddingAll: '14px', backgroundColor: '#dc2626', contents: [
        { type: 'text', text: '🔔 Brand Alert', color: '#ffffff', weight: 'bold', size: 'sm' },
      ] },
      body: { type: 'box', layout: 'vertical', paddingAll: '14px', spacing: 'sm', contents: [
        { type: 'text', text: title, weight: 'bold', size: 'sm', color: '#0f172a', wrap: true },
        { type: 'text', text: message, size: 'xs', color: '#64748b', wrap: true },
        { type: 'text', text: `Negative sentiment: ${negPct}%`, size: 'xs', color: '#dc2626', weight: 'bold', margin: 'sm' },
      ] },
      footer: { type: 'box', layout: 'vertical', paddingAll: '12px', contents: [
        { type: 'button', style: 'primary', height: 'sm', color: '#dc2626',
          action: { type: 'uri', label: 'ดูรายละเอียด', uri: `${APP_URL}/social/comments` } },
      ] },
    },
  }
}

const targetOf = (acc) => acc.line_group_id || acc.line_user_id

// evaluate negative-sentiment alert; create alert row + return flex if fired
async function evalAlert(db, orgId, summary) {
  if (!summary.total) return null
  const { data: rules } = await db.from('alert_rules')
    .select('threshold').eq('organization_id', orgId).eq('metric', 'neg_sentiment_pct').eq('is_active', true).limit(1)
  const threshold = rules?.[0]?.threshold ?? DEFAULT_NEG_THRESHOLD
  if (summary.negativePct <= threshold) return null

  const title = `Negative sentiment สูงผิดปกติ (${summary.negativePct}%)`
  const message = `เกินเกณฑ์ ${threshold}% — แนะนำตรวจสอบคอมเมนต์เชิงลบล่าสุด`
  await db.from('alerts').insert({ organization_id: orgId, severity: 'warning', status: 'open', title, message,
    context: { negativePct: summary.negativePct, threshold } })
  return alertFlex(title, message, summary.negativePct)
}

export async function POST(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  const { data: accounts } = await ctx.db.from('line_accounts').select('*').eq('organization_id', ctx.orgId)
  if (!accounts?.length) return Response.json({ error: 'ยังไม่ได้เชื่อม LINE — ไปที่ Settings ก่อน' }, { status: 400 })
  if (!LINE_TOKEN) return Response.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' }, { status: 500 })

  const summary = await orgSummary(ctx.db, ctx.orgId)
  const flex = digestFlex(summary)
  let sent = 0
  for (const acc of accounts) { await pushLINE(targetOf(acc), [flex]); sent++ }
  return Response.json({ ok: true, sent, summary })
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET || ''
  if (secret) {
    const h = request.headers
    if (h.get('x-cron-secret') !== secret && h.get('authorization') !== `Bearer ${secret}`)
      return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const db = admin()
  const { data: accounts } = await db.from('line_accounts').select('*')
  let digests = 0, alerts = 0
  const summaryCache = new Map()
  for (const acc of accounts || []) {
    const orgId = acc.organization_id
    if (!summaryCache.has(orgId)) summaryCache.set(orgId, await orgSummary(db, orgId))
    const summary = summaryCache.get(orgId)
    if (acc.notify_daily) { await pushLINE(targetOf(acc), [digestFlex(summary)]); digests++ }
    if (acc.notify_alerts) {
      const flex = await evalAlert(db, orgId, summary)
      if (flex) { await pushLINE(targetOf(acc), [flex]); alerts++ }
    }
  }
  return Response.json({ ok: true, digests, alerts })
}
