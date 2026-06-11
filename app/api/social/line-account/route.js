// app/api/social/line-account/route.js — register/update the org's LINE target.
// GET  → current line_accounts for caller's org. POST → upsert one.
import { resolveOrg } from '../../../lib/social/server'

export async function GET(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  const { data } = await ctx.db.from('line_accounts').select('*').eq('organization_id', ctx.orgId)
  return Response.json({ accounts: data || [] })
}

export async function POST(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  const body = await request.json().catch(() => ({}))
  const target = (body.lineUserId || body.lineGroupId || '').trim()
  if (!target) return Response.json({ error: 'lineUserId or lineGroupId required' }, { status: 400 })

  // one row per target; replace the org's existing rows for simplicity in Phase 1
  await ctx.db.from('line_accounts').delete().eq('organization_id', ctx.orgId)
  const { data, error } = await ctx.db.from('line_accounts').insert({
    organization_id: ctx.orgId,
    line_user_id: body.lineGroupId ? null : target,
    line_group_id: body.lineGroupId ? target : null,
    display_name: body.displayName || null,
    notify_daily: body.notifyDaily !== false,
    notify_alerts: body.notifyAlerts !== false,
  }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, account: data })
}
