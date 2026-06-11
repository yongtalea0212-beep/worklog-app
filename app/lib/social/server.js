// app/lib/social/server.js — server-only helpers for Social Insight AI routes.
// Service-role Supabase client + caller→org resolution. Never import client-side.
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function admin() {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Supabase service role not configured')
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
}

// Resolve the caller from their bearer token and return { db, user, orgId }.
// Throws { status, message } on failure so routes can map to a Response.
export async function resolveOrg(request) {
  const authz = request.headers.get('authorization') || ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null
  if (!token) throw { status: 401, message: 'missing token' }

  const db = admin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) throw { status: 401, message: 'invalid session' }

  const { data: profile } = await db.from('users').select('organization_id, role').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) throw { status: 409, message: 'no organization — open the dashboard first to onboard' }

  return { db, user, orgId, role: profile?.role || 'viewer' }
}

// Best-effort product analytics. Never throws into the request path.
export async function logActivity(db, orgId, userId, action, meta = {}) {
  try { await db.from('activity_logs').insert({ organization_id: orgId, user_id: userId || null, action, meta }) }
  catch { /* non-fatal */ }
}

// Stable, non-reversible author tag (never store raw commenter PII).
export function hashAuthor(name) {
  const s = String(name || 'anon')
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return 'a' + h.toString(36)
}
