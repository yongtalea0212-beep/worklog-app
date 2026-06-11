// app/api/social/ai/route.js — AI Business Summary, Recommendations, Crisis.
// POST ?kind=summary|recommend|crisis  (Modules 7 & 13).
// Builds an org analytics context, runs the matching OpenAI prompt, and (for
// crisis) records a critical alert so it surfaces in the dashboard/LINE digest.
import { resolveOrg, logActivity } from '../../../lib/social/server'
import { openaiJson } from '../../../lib/social/openai'
import {
  SYSTEM_ANALYST, executiveSummaryPrompt, recommendationPrompt, crisisPrompt,
} from '../../../lib/social/prompts'

async function buildContext(db, orgId) {
  const count = async (t) => (await db.from(t).select('id', { count: 'exact', head: true }).eq('organization_id', orgId)).count || 0
  const [pages, posts, comments] = await Promise.all([count('tracked_pages'), count('posts'), count('comments')])

  const { data: sents } = await db.from('sentiments').select('sentiment, category, emotion').eq('organization_id', orgId)
  const total = sents?.length || 0
  const by = (k, v) => sents?.filter((s) => s[k] === v).length || 0
  const cats = {}; for (const s of sents || []) cats[s.category] = (cats[s.category] || 0) + 1

  // representative comments by sentiment (sample, capped to control tokens)
  const sample = async (label) => {
    const { data } = await db.from('comments')
      .select('content, sentiments!inner(sentiment)')
      .eq('organization_id', orgId).eq('sentiments.sentiment', label).limit(12)
    return (data || []).map((c) => c.content).filter(Boolean)
  }
  const [posComments, negComments] = await Promise.all([sample('positive'), sample('negative')])

  const { data: top } = await db.from('posts')
    .select('content, like_count, comment_count, share_count, content_category')
    .eq('organization_id', orgId).order('like_count', { ascending: false }).limit(8)
  const { data: comps } = await db.from('competitors').select('label, rank_score').eq('organization_id', orgId).order('rank_score', { ascending: false })
  const { data: trends } = await db.from('trends').select('kind, title, score').eq('organization_id', orgId).order('score', { ascending: false }).limit(6)

  return {
    totals: { pages, posts, comments, analyzedComments: total },
    sentiment: { positivePct: total ? Math.round((by('sentiment', 'positive') / total) * 100) : 0,
      negativePct: total ? Math.round((by('sentiment', 'negative') / total) * 100) : 0 },
    categories: cats,
    samplePositive: posComments, sampleNegative: negComments,
    topPosts: (top || []).map((p) => ({ content: (p.content || '').slice(0, 80), engagement: Number(p.like_count) + Number(p.comment_count) + Number(p.share_count), category: p.content_category })),
    competitors: (comps || []).map((c) => ({ name: c.label, score: Math.round(Number(c.rank_score)) })),
    trends: trends || [],
  }
}

export async function POST(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  const { db, orgId, user } = ctx
  const kind = new URL(request.url).searchParams.get('kind') || 'summary'

  if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })

  const context = await buildContext(db, orgId)
  if (!context.totals.analyzedComments && kind !== 'recommend')
    return Response.json({ error: 'ยังไม่มีคอมเมนต์ที่วิเคราะห์แล้ว — นำเข้าข้อมูลและรันวิเคราะห์ก่อน' }, { status: 400 })

  try {
    let result
    if (kind === 'recommend') {
      result = await openaiJson(SYSTEM_ANALYST, recommendationPrompt(context))
    } else if (kind === 'crisis') {
      result = await openaiJson(SYSTEM_ANALYST, crisisPrompt({ negativePct: context.sentiment.negativePct, sampleNegative: context.sampleNegative, trends: context.trends }))
      if (result?.is_crisis) {
        await db.from('alerts').insert({
          organization_id: orgId, severity: result.severity === 'critical' ? 'critical' : 'warning', status: 'open',
          title: 'AI ตรวจพบสัญญาณวิกฤต', message: result.summary || result.reason || '', context: { source: 'ai_crisis' },
        })
      }
    } else {
      const period = new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
      result = await openaiJson(SYSTEM_ANALYST, executiveSummaryPrompt(period, context))
    }
    await logActivity(db, orgId, user.id, `ai_${kind}`, {})
    return Response.json({ ok: true, kind, result })
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 })
  }
}
