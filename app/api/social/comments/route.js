// app/api/social/comments/route.js — comments + AI analysis for the comments list.
import { resolveOrg } from '../../../lib/social/server'

export async function GET(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }

  const { data, error } = await ctx.db.from('comments')
    .select('id, content, like_count, commented_at, analyzed, sentiments(sentiment, emotion, category, confidence), posts(content)')
    .eq('organization_id', ctx.orgId)
    .order('commented_at', { ascending: false })
    .limit(200)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const comments = (data || []).map((c) => {
    const s = Array.isArray(c.sentiments) ? c.sentiments[0] : c.sentiments
    return {
      id: c.id, content: c.content, likeCount: c.like_count, commentedAt: c.commented_at,
      analyzed: c.analyzed, post: c.posts?.content || null,
      sentiment: s?.sentiment || null, emotion: s?.emotion || null,
      category: s?.category || null, confidence: s?.confidence || null,
    }
  })
  return Response.json({ comments })
}
