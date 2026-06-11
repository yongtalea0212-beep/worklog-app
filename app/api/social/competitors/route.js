// app/api/social/competitors/route.js — competitor ranking computed from real
// public engagement (Module 9). GET returns the comparison and refreshes the
// stored competitors.rank_score so the dashboard ranking stays in sync.
import { resolveOrg } from '../../../lib/social/server'

const DAY = 86400000

export async function GET(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  const { db, orgId } = ctx

  const { data: pages } = await db.from('tracked_pages')
    .select('id, name, is_own_brand, follower_count').eq('organization_id', orgId)
  if (!pages?.length) return Response.json({ pages: [] })

  const { data: posts } = await db.from('posts')
    .select('page_id, like_count, comment_count, share_count, posted_at').eq('organization_id', orgId)

  const byPage = new Map(pages.map((p) => [p.id, { posts: [], dates: new Set() }]))
  for (const p of posts || []) {
    const b = byPage.get(p.page_id); if (!b) continue
    b.posts.push(Number(p.like_count) + Number(p.comment_count) + Number(p.share_count))
    if (p.posted_at) b.dates.add(p.posted_at.slice(0, 10))
  }

  const rows = pages.map((pg) => {
    const b = byPage.get(pg.id)
    const n = b.posts.length
    const totalEng = b.posts.reduce((s, e) => s + e, 0)
    const avgEng = n ? totalEng / n : 0
    // posting frequency = posts per week across active span (min 1 week)
    const days = b.dates.size ? Math.max(7, (Date.now() - Date.parse([...b.dates].sort()[0])) / DAY) : 7
    const freq = n ? Number((n / (days / 7)).toFixed(1)) : 0
    return {
      id: pg.id, name: pg.name, isOwn: pg.is_own_brand, followers: pg.follower_count,
      posts: n, totalEngagement: totalEng, avgEngagement: Math.round(avgEng), frequency: freq,
    }
  })

  // score 0-100 relative to the strongest avg engagement
  const maxAvg = Math.max(1, ...rows.map((r) => r.avgEngagement))
  rows.forEach((r) => { r.score = Math.round((r.avgEngagement / maxAvg) * 100) })
  rows.sort((a, b) => b.score - a.score)

  // refresh stored competitor scores (non-own pages)
  for (const r of rows.filter((x) => !x.isOwn)) {
    await db.from('competitors').update({ rank_score: r.score, last_ranked_at: new Date().toISOString() })
      .eq('organization_id', orgId).eq('page_id', r.id)
  }
  return Response.json({ pages: rows })
}
