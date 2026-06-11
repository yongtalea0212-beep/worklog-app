// app/api/social/analyze/route.js — AI sentiment job (Module 6).
//   POST (Bearer user token) → analyze the caller's org pending comments.
//   GET  (x-cron-secret)     → analyze a global batch (Vercel Cron).
// Uses OpenAI strict-JSON; persists sentiments and flags comments analyzed.
import { admin, resolveOrg } from '../../../lib/social/server'
import { openaiJson } from '../../../lib/social/openai'
import { SYSTEM_ANALYST, sentimentPrompt } from '../../../lib/social/prompts'

const BATCH = 30
const SENT = new Set(['positive', 'neutral', 'negative'])
const EMO = new Set(['happy', 'angry', 'frustrated', 'excited', 'neutral'])
const CAT = new Set(['product', 'price', 'delivery', 'service', 'promotion', 'quality', 'other'])
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

async function analyzeBatch(db, orgId /* optional */) {
  let q = db.from('comments').select('id, organization_id, content')
    .eq('analyzed', false).not('content', 'is', null).limit(BATCH)
  if (orgId) q = q.eq('organization_id', orgId)
  const { data: pending, error } = await q
  if (error) throw new Error(error.message)
  if (!pending?.length) return { analyzed: 0 }

  const batch = pending.map((c) => ({ id: c.id, text: c.content }))
  const out = await openaiJson(SYSTEM_ANALYST, sentimentPrompt(batch))
  const results = Array.isArray(out?.results) ? out.results : []
  const orgById = new Map(pending.map((c) => [c.id, c.organization_id]))

  const rows = []
  for (const r of results) {
    if (!orgById.has(r.id)) continue
    rows.push({
      organization_id: orgById.get(r.id), comment_id: r.id,
      sentiment: SENT.has(r.sentiment) ? r.sentiment : 'neutral',
      emotion: EMO.has(r.emotion) ? r.emotion : 'neutral',
      category: CAT.has(r.category) ? r.category : 'other',
      confidence: typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : null,
      model: MODEL,
    })
  }
  if (rows.length) {
    const { error: sErr } = await db.from('sentiments').upsert(rows, { onConflict: 'comment_id' })
    if (sErr) throw new Error(sErr.message)
  }
  // mark every pulled comment analyzed (even if the model skipped it) to avoid loops
  await db.from('comments').update({ analyzed: true }).in('id', pending.map((c) => c.id))
  return { analyzed: rows.length, pulled: pending.length }
}

export async function POST(request) {
  let ctx
  try { ctx = await resolveOrg(request) }
  catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  try {
    const result = await analyzeBatch(ctx.db, ctx.orgId)
    return Response.json({ ok: true, ...result })
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 })
  }
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET || ''
  if (secret && request.headers.get('x-cron-secret') !== secret)
    return Response.json({ error: 'forbidden' }, { status: 403 })
  try {
    const result = await analyzeBatch(admin())
    return Response.json({ ok: true, ...result })
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 })
  }
}
