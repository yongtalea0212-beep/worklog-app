// app/api/social/activity/route.js — recent activity log for the org (Phase 4).
import { resolveOrg } from '../../../lib/social/server'

export async function GET(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  const { data } = await ctx.db.from('activity_logs')
    .select('id, action, meta, created_at, users(email, full_name)')
    .eq('organization_id', ctx.orgId).order('created_at', { ascending: false }).limit(100)
  const items = (data || []).map((a) => ({
    id: a.id, action: a.action, meta: a.meta, createdAt: a.created_at,
    actor: a.users?.full_name || a.users?.email || 'system',
  }))
  return Response.json({ items })
}
