// app/api/social/bootstrap/route.js
// Social Insight AI — Phase 1 bootstrap + KPI endpoint.
//
// Responsibilities (service-role, bypasses RLS):
//   1. Verify the caller from their Supabase access token.
//   2. Ensure a public.users row + an organization (multi-tenant onboarding).
//   3. If the org is empty, seed a small DEMO dataset so the dashboard is alive.
//   4. Return KPI snapshot + chart series scoped to the caller's org.
//
// No Facebook tokens or Insights are ever touched — demo rows stand in for the
// pluggable ingestion adapter (see app/lib/social/ingestion.ts).
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
}

const DAY = 86400000
const iso = (d) => new Date(d).toISOString()
const slugify = (s) => (s || 'org').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'org'
const rnd = (min, max) => Math.floor(min + Math.random() * (max - min + 1))

// ── DEMO ingestion: stands in for a compliant adapter until one is wired ──
async function seedDemo(db, orgId) {
  const now = Date.now()
  const pages = [
    { name: 'แบรนด์ของเรา (Demo)', url: 'https://facebook.com/our-brand-demo', category: 'Retail', followers: 48200, own: true },
    { name: 'คู่แข่ง A (Demo)',     url: 'https://facebook.com/competitor-a-demo', category: 'Retail', followers: 71500, own: false },
    { name: 'คู่แข่ง B (Demo)',     url: 'https://facebook.com/competitor-b-demo', category: 'Retail', followers: 33900, own: false },
  ]
  const { data: pageRows } = await db.from('tracked_pages').insert(
    pages.map((p) => ({
      organization_id: orgId, name: p.name, url: p.url, category: p.category,
      follower_count: p.followers, is_own_brand: p.own, ingest_source: 'manual',
      last_synced_at: iso(now),
    }))
  ).select()

  const own = pageRows.find((p) => p.is_own_brand) || pageRows[0]
  const samples = [
    'สินค้าใหม่สวยมากกก อยากได้เลย 😍', 'ราคาแพงไปนิดนะคะ ลดได้อีกไหม',
    'ส่งของช้ามาก รอเป็นอาทิตย์ 😤', 'บริการดีมากครับ ประทับใจ',
    'โปรโมชั่นนี้คุ้มสุดๆ', 'คุณภาพไม่เหมือนในรูปเลย ผิดหวัง',
    'แอดมินตอบเร็วดีค่ะ', 'อยากให้มีสีอื่นเพิ่มอีก', 'ของหมดตลอดเลย เติมสต็อกหน่อย',
    'ใช้แล้วดีจริง แนะนำเลย', 'แพ็คเกจสวยมาก ของไม่เสียหาย', 'ราคาโอเคเมื่อเทียบกับคุณภาพ',
  ]
  const cats = ['product', 'price', 'delivery', 'service', 'promotion', 'quality']
  const allPosts = []
  for (const pg of pageRows) {
    const count = pg.is_own_brand ? 14 : rnd(8, 12)
    for (let i = 0; i < count; i++) {
      const posted = now - rnd(0, 29) * DAY - rnd(0, 23) * 3600000
      const likes = rnd(20, 1200), comments = rnd(0, 80), shares = rnd(0, 120)
      allPosts.push({
        organization_id: orgId, page_id: pg.id,
        content: `[Demo] โพสต์ #${i + 1} ของ ${pg.name}`,
        permalink: pg.url, posted_at: iso(posted),
        like_count: likes, comment_count: comments, share_count: shares,
        reaction_counts: { love: rnd(0, 200), haha: rnd(0, 50), wow: rnd(0, 30) },
        content_category: cats[rnd(0, cats.length - 1)],
        _isOwn: pg.is_own_brand,
      })
    }
  }
  const { data: postRows } = await db.from('posts')
    .insert(allPosts.map(({ _isOwn, ...p }) => p)).select()

  // comments + sentiments on OWN-brand posts only
  const ownPostRows = postRows.filter((p) => p.page_id === own.id)
  const commentInserts = []
  for (const post of ownPostRows) {
    const n = rnd(2, 6)
    for (let i = 0; i < n; i++) {
      commentInserts.push({
        organization_id: orgId, post_id: post.id,
        author_hash: 'demo-' + rnd(1000, 9999),
        content: samples[rnd(0, samples.length - 1)],
        like_count: rnd(0, 40),
        commented_at: post.posted_at, analyzed: true,
      })
    }
  }
  const { data: commentRows } = await db.from('comments').insert(commentInserts).select()

  // crude sentiment heuristic for the demo seed
  const POS = ['สวย', 'ดี', 'คุ้ม', 'ประทับใจ', 'เร็ว', 'แนะนำ', 'โอเค', 'อยากได้']
  const NEG = ['แพง', 'ช้า', 'ผิดหวัง', 'ไม่เหมือน', 'หมด']
  const sentInserts = commentRows.map((c) => {
    const t = c.content || ''
    let sentiment = 'neutral', emotion = 'neutral'
    if (NEG.some((w) => t.includes(w))) { sentiment = 'negative'; emotion = t.includes('ช้า') ? 'frustrated' : 'angry' }
    else if (POS.some((w) => t.includes(w))) { sentiment = 'positive'; emotion = t.includes('😍') || t.includes('อยากได้') ? 'excited' : 'happy' }
    const category = t.includes('ราคา') || t.includes('แพง') ? 'price'
      : t.includes('ส่ง') || t.includes('ช้า') ? 'delivery'
      : t.includes('บริการ') || t.includes('แอดมิน') ? 'service'
      : t.includes('โปร') ? 'promotion'
      : t.includes('คุณภาพ') || t.includes('เหมือน') ? 'quality' : 'product'
    return {
      organization_id: orgId, comment_id: c.id, sentiment, emotion, category,
      confidence: 0.7 + Math.random() * 0.25, model: 'demo-seed',
    }
  })
  if (sentInserts.length) await db.from('sentiments').insert(sentInserts)

  // daily engagement rollups for own page (last 14 days)
  const stats = []
  for (let d = 13; d >= 0; d--) {
    const day = new Date(now - d * DAY).toISOString().split('T')[0]
    const dayPosts = ownPostRows.filter((p) => p.posted_at.split('T')[0] === day)
    const likes = dayPosts.reduce((s, p) => s + p.like_count, 0)
    const comments = dayPosts.reduce((s, p) => s + p.comment_count, 0)
    const shares = dayPosts.reduce((s, p) => s + p.share_count, 0)
    stats.push({
      organization_id: orgId, page_id: own.id, stat_date: day,
      posts_count: dayPosts.length, likes_total: likes, comments_total: comments,
      shares_total: shares, follower_count: own.follower_count,
      engagement_rate: own.follower_count ? Number(((likes + comments + shares) / own.follower_count).toFixed(4)) : 0,
    })
  }
  await db.from('engagement_stats').insert(stats)

  // competitors + ranking score
  const comp = pageRows.filter((p) => !p.is_own_brand)
  await db.from('competitors').insert(comp.map((p) => ({
    organization_id: orgId, page_id: p.id, label: p.name,
    rank_score: rnd(40, 95), last_ranked_at: iso(now),
  })))

  // keywords + trends + a sample alert
  await db.from('keywords').insert(
    ['แบรนด์ของเรา', 'โปรโมชั่น', 'ส่งของ', 'รีวิว'].map((term, i) => ({
      organization_id: orgId, term, kind: i === 0 ? 'brand' : 'custom',
    }))
  )
  await db.from('trends').insert([
    { organization_id: orgId, kind: 'viral', title: 'โพสต์โปรโมชั่นยอดพุ่ง', score: 87, details: {} },
    { organization_id: orgId, kind: 'neg_surge', title: 'คอมเมนต์เรื่องส่งของช้าเพิ่มขึ้น', score: 64, details: {} },
  ])
  await db.from('alerts').insert([{
    organization_id: orgId, severity: 'warning', status: 'open',
    title: 'Negative sentiment เรื่อง “ส่งของ” สูงขึ้น',
    message: 'สัดส่วนคอมเมนต์เชิงลบหมวด delivery เกินเกณฑ์ที่ตั้งไว้',
  }])
}

async function computeKpis(db, orgId) {
  const count = async (table) =>
    (await db.from(table).select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)).count || 0

  const [trackedPages, postsCollected, commentsCollected] = await Promise.all([
    count('tracked_pages'), count('posts'), count('comments'),
  ])

  const { data: sents } = await db.from('sentiments').select('sentiment').eq('organization_id', orgId)
  const total = sents?.length || 0
  const pos = sents?.filter((s) => s.sentiment === 'positive').length || 0
  const neg = sents?.filter((s) => s.sentiment === 'negative').length || 0
  const neu = total - pos - neg
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0)

  const { data: kw } = await db.from('keywords').select('term').eq('organization_id', orgId).limit(8)
  const { data: comps } = await db.from('competitors')
    .select('label, rank_score').eq('organization_id', orgId).order('rank_score', { ascending: false })

  // chart: engagement over time (own page rollups)
  const { data: stats } = await db.from('engagement_stats')
    .select('stat_date, likes_total, comments_total, shares_total')
    .eq('organization_id', orgId).order('stat_date', { ascending: true })
  const engagementSeries = (stats || []).map((s) => ({
    date: s.stat_date.slice(5),
    engagement: Number(s.likes_total) + Number(s.comments_total) + Number(s.shares_total),
  }))

  // chart: top posts
  const { data: top } = await db.from('posts')
    .select('content, like_count, comment_count, share_count')
    .eq('organization_id', orgId)
    .order('like_count', { ascending: false }).limit(5)
  const topPosts = (top || []).map((p) => ({
    name: (p.content || '').slice(0, 22),
    score: Number(p.like_count) + Number(p.comment_count) + Number(p.share_count),
  }))

  return {
    kpis: {
      trackedPages, postsCollected, commentsCollected,
      positivePct: pct(pos), negativePct: pct(neg),
      trendingKeywords: (kw || []).map((k) => k.term),
      competitorRanking: (comps || []).map((c) => ({ page: c.label, score: Number(c.rank_score) })),
    },
    charts: {
      engagementSeries,
      sentimentSplit: [
        { name: 'Positive', value: pos }, { name: 'Neutral', value: neu }, { name: 'Negative', value: neg },
      ],
      topPosts,
    },
  }
}

export async function POST(request) {
  if (!SUPABASE_URL || !SERVICE_KEY)
    return Response.json({ error: 'Supabase service role not configured' }, { status: 500 })

  const authz = request.headers.get('authorization') || ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null
  if (!token) return Response.json({ error: 'missing token' }, { status: 401 })

  const db = admin()
  const { data: { user }, error: uerr } = await db.auth.getUser(token)
  if (uerr || !user) return Response.json({ error: 'invalid session' }, { status: 401 })

  // 1) ensure profile row
  await db.from('users').upsert(
    { id: user.id, email: user.email, full_name: user.user_metadata?.full_name || user.user_metadata?.display_name || null },
    { onConflict: 'id' }
  )

  // 2) ensure organization
  let { data: profile } = await db.from('users').select('organization_id, role').eq('id', user.id).single()
  let orgId = profile?.organization_id
  if (!orgId) {
    const base = slugify(user.email?.split('@')[0])
    const { data: org } = await db.from('organizations')
      .insert({ name: (user.email?.split('@')[0] || 'My') + ' Workspace', slug: `${base}-${rnd(1000, 9999)}`, plan: 'growth' })
      .select().single()
    orgId = org.id
    await db.from('users').update({ organization_id: orgId, role: 'org_admin' }).eq('id', user.id)
  }

  // 3) seed demo data once, if org is empty
  const { count: pageCount } = await db.from('tracked_pages')
    .select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
  if (!pageCount) {
    try { await seedDemo(db, orgId) } catch (e) { /* non-fatal: dashboard still renders zeros */ }
  }

  // 4) KPIs + charts
  const result = await computeKpis(db, orgId)
  return Response.json({ orgId, ...result })
}
