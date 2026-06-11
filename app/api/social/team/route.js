// app/api/social/team/route.js — org members + role management (Phase 4).
// GET → members of caller's org. POST → update a member's role (admins only).
import { resolveOrg, logActivity } from '../../../lib/social/server'

const ROLES = new Set(['super_admin', 'org_admin', 'analyst', 'viewer'])
const isAdmin = (r) => r === 'super_admin' || r === 'org_admin'

export async function GET(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  const { data } = await ctx.db.from('users')
    .select('id, email, full_name, role, created_at').eq('organization_id', ctx.orgId).order('created_at', { ascending: true })
  return Response.json({ members: data || [], myRole: ctx.role, myId: ctx.user.id })
}

export async function POST(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  if (!isAdmin(ctx.role)) return Response.json({ error: 'เฉพาะผู้ดูแล (admin) เท่านั้น' }, { status: 403 })

  const { userId, role } = await request.json().catch(() => ({}))
  if (!userId || !ROLES.has(role)) return Response.json({ error: 'userId และ role ที่ถูกต้องจำเป็น' }, { status: 400 })
  if (userId === ctx.user.id) return Response.json({ error: 'เปลี่ยน role ของตัวเองไม่ได้' }, { status: 400 })
  // only super_admin may grant super_admin
  if (role === 'super_admin' && ctx.role !== 'super_admin') return Response.json({ error: 'เฉพาะ super admin' }, { status: 403 })

  const { error } = await ctx.db.from('users').update({ role }).eq('id', userId).eq('organization_id', ctx.orgId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  await logActivity(ctx.db, ctx.orgId, ctx.user.id, 'role_change', { userId, role })
  return Response.json({ ok: true })
}
