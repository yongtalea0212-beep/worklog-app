// app/api/social/keywords/scan/route.js — match active keywords over posts/comments.
// Rebuilds keyword_mentions for the org (idempotent rescan). Pulls comment
// sentiment so keyword sentiment breakdown is available.
import { resolveOrg } from '../../../../lib/social/server'

export async function POST(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  const { db, orgId } = ctx

  const { data: kws } = await db.from('keywords').select('id, term').eq('organization_id', orgId).eq('is_active', true)
  if (!kws?.length) return Response.json({ ok: true, matched: 0, note: 'no active keywords' })

  const [{ data: posts }, { data: comments }] = await Promise.all([
    db.from('posts').select('id, content').eq('organization_id', orgId).not('content', 'is', null).limit(500),
    db.from('comments').select('id, content, sentiments(sentiment)').eq('organization_id', orgId).not('content', 'is', null).limit(2000),
  ])

  const terms = kws.map((k) => ({ id: k.id, t: k.term.toLowerCase() }))
  const rows = []
  for (const p of posts || []) {
    const c = (p.content || '').toLowerCase()
    for (const k of terms) if (c.includes(k.t)) rows.push({ organization_id: orgId, keyword_id: k.id, post_id: p.id })
  }
  for (const cm of comments || []) {
    const c = (cm.content || '').toLowerCase()
    const s = Array.isArray(cm.sentiments) ? cm.sentiments[0]?.sentiment : cm.sentiments?.sentiment
    for (const k of terms) if (c.includes(k.t)) rows.push({ organization_id: orgId, keyword_id: k.id, comment_id: cm.id, sentiment: s || null })
  }

  // rebuild: clear org mentions then insert fresh (chunked)
  await db.from('keyword_mentions').delete().eq('organization_id', orgId)
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    if (chunk.length) { const { error } = await db.from('keyword_mentions').insert(chunk); if (error) return Response.json({ error: error.message }, { status: 500 }) }
  }
  return Response.json({ ok: true, matched: rows.length })
}
