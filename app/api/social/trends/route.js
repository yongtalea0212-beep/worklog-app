// app/api/social/trends/route.js — trend detection (Module 10).
// GET → stored trends (computes once if empty). POST → force recompute.
// Scoring: viral posts (engagement z-score), negative surge, emerging keyword.
import { resolveOrg } from '../../../lib/social/server'

const DAY = 86400000

async function compute(db, orgId) {
  const since = new Date(Date.now() - 21 * DAY).toISOString()
  const { data: posts } = await db.from('posts')
    .select('content, like_count, comment_count, share_count, posted_at')
    .eq('organization_id', orgId).gte('posted_at', since)

  const trends = []
  const eng = (posts || []).map((p) => ({
    text: p.content || '(โพสต์)',
    e: Number(p.like_count) + Number(p.comment_count) + Number(p.share_count),
  }))
  if (eng.length >= 3) {
    const mean = eng.reduce((s, x) => s + x.e, 0) / eng.length
    const std = Math.sqrt(eng.reduce((s, x) => s + (x.e - mean) ** 2, 0) / eng.length) || 1
    eng.filter((x) => x.e > mean + 1.5 * std)
      .sort((a, b) => b.e - a.e).slice(0, 3)
      .forEach((x) => trends.push({
        organization_id: orgId, kind: 'viral', title: `โพสต์ไวรัล: ${x.text.slice(0, 30)}`,
        score: Math.min(100, Math.round(50 + ((x.e - mean) / std) * 15)), details: { engagement: x.e },
      }))
  }

  // negative surge
  const { data: sents } = await db.from('sentiments').select('sentiment').eq('organization_id', orgId)
  const total = sents?.length || 0
  const neg = sents?.filter((s) => s.sentiment === 'negative').length || 0
  const negPct = total ? Math.round((neg / total) * 100) : 0
  if (negPct >= 25) trends.push({
    organization_id: orgId, kind: 'neg_surge', title: `คอมเมนต์เชิงลบเพิ่มขึ้น (${negPct}%)`,
    score: Math.min(100, negPct + 20), details: { negPct },
  })

  // emerging keyword
  const { data: mentions } = await db.from('keyword_mentions').select('keyword_id, keywords(term)').eq('organization_id', orgId)
  if (mentions?.length) {
    const cnt = new Map()
    for (const m of mentions) { const t = m.keywords?.term; if (t) cnt.set(t, (cnt.get(t) || 0) + 1) }
    const top = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0]
    if (top) trends.push({
      organization_id: orgId, kind: 'emerging_topic', title: `หัวข้อมาแรง: ${top[0]} (${top[1]} ครั้ง)`,
      score: Math.min(100, 40 + top[1] * 5), details: { term: top[0], count: top[1] },
    })
  }

  await db.from('trends').delete().eq('organization_id', orgId)
  if (trends.length) await db.from('trends').insert(trends)
  return trends
}

async function read(db, orgId) {
  const { data } = await db.from('trends').select('*').eq('organization_id', orgId).order('score', { ascending: false })
  return data || []
}

export async function GET(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  let trends = await read(ctx.db, ctx.orgId)
  if (!trends.length) { await compute(ctx.db, ctx.orgId); trends = await read(ctx.db, ctx.orgId) }
  return Response.json({ trends })
}

export async function POST(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  await compute(ctx.db, ctx.orgId)
  return Response.json({ trends: await read(ctx.db, ctx.orgId) })
}
