// app/api/social/keywords/route.js — keyword listening terms (Module 8).
// GET → terms with mention counts + sentiment breakdown.
// POST → { term } add, or { id, delete:true } remove, or { id, toggle:true }.
import { resolveOrg } from '../../../lib/social/server'

export async function GET(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  const { db, orgId } = ctx

  const { data: kws } = await db.from('keywords').select('*').eq('organization_id', orgId).order('created_at', { ascending: true })
  const { data: mentions } = await db.from('keyword_mentions').select('keyword_id, sentiment').eq('organization_id', orgId)

  const agg = new Map()
  for (const m of mentions || []) {
    const a = agg.get(m.keyword_id) || { total: 0, positive: 0, neutral: 0, negative: 0 }
    a.total++
    if (m.sentiment && a[m.sentiment] != null) a[m.sentiment]++
    agg.set(m.keyword_id, a)
  }
  const keywords = (kws || []).map((k) => ({
    id: k.id, term: k.term, kind: k.kind, isActive: k.is_active,
    ...(agg.get(k.id) || { total: 0, positive: 0, neutral: 0, negative: 0 }),
  }))
  return Response.json({ keywords })
}

export async function POST(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  const { db, orgId } = ctx
  const body = await request.json().catch(() => ({}))

  if (body.delete && body.id) {
    await db.from('keywords').delete().eq('organization_id', orgId).eq('id', body.id)
    return Response.json({ ok: true })
  }
  if (body.toggle && body.id) {
    const { data: row } = await db.from('keywords').select('is_active').eq('id', body.id).single()
    await db.from('keywords').update({ is_active: !row?.is_active }).eq('organization_id', orgId).eq('id', body.id)
    return Response.json({ ok: true })
  }
  const term = (body.term || '').trim()
  if (!term) return Response.json({ error: 'term required' }, { status: 400 })
  const { data, error } = await db.from('keywords')
    .upsert({ organization_id: orgId, term, kind: body.kind || 'custom' }, { onConflict: 'organization_id,term' })
    .select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, keyword: data })
}
