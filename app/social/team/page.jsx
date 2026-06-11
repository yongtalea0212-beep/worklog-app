'use client'
// app/social/team/page.jsx — org members + role management (Phase 4).
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const ROLES = [['org_admin', 'Org Admin'], ['analyst', 'Analyst'], ['viewer', 'Viewer']]
const ROLE_LABEL = { super_admin: 'Super Admin', org_admin: 'Org Admin', analyst: 'Analyst', viewer: 'Viewer' }

export default function TeamPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async (t) => {
    const res = await fetch('/api/social/team', { headers: { Authorization: `Bearer ${t}` } })
    setData(await res.json())
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setToken(data.session.access_token); load(data.session.access_token)
    })
  }, [router, load])

  async function changeRole(userId, role) {
    setMsg('')
    const res = await fetch('/api/social/team', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId, role }) })
    const json = await res.json()
    if (!res.ok) setMsg(json.error || 'failed'); else { setMsg('อัปเดต role แล้ว'); load(token) }
  }

  const canEdit = data && (data.myRole === 'org_admin' || data.myRole === 'super_admin')

  return (
    <div className="tm-root">
      <style>{CSS}</style>
      <div className="tm-wrap">
        <button className="tm-back" onClick={() => router.push('/social')}>← Dashboard</button>
        <h1 className="tm-title">Team & Roles</h1>
        <p className="tm-sub">จัดการสมาชิกในองค์กรและสิทธิ์การเข้าถึง{!canEdit && ' · (ดูได้อย่างเดียว — ต้องเป็น admin จึงแก้ได้)'}</p>
        {msg && <div className="tm-msg">{msg}</div>}

        {!data && <div className="tm-state">⏳ กำลังโหลด...</div>}
        {data && (
          <div className="tm-card">
            <table className="tm-table">
              <thead><tr><th>สมาชิก</th><th>อีเมล</th><th>Role</th></tr></thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.full_name || '—'} {m.id === data.myId && <span className="tm-you">คุณ</span>}</td>
                    <td className="tm-email">{m.email}</td>
                    <td>
                      {canEdit && m.id !== data.myId && m.role !== 'super_admin' ? (
                        <select className="tm-sel" value={m.role} onChange={(e) => changeRole(m.id, e.target.value)}>
                          {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      ) : <span className={`tm-role r-${m.role}`}>{ROLE_LABEL[m.role] || m.role}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .tm-root { min-height:100vh; background:#f6f8fb; font-family:'Inter',sans-serif; color:#0f172a; padding:28px 16px; }
  .tm-wrap { max-width:680px; margin:0 auto; }
  .tm-back { background:none; border:none; color:#2563EB; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; padding:0; margin-bottom:10px; }
  .tm-title { font-size:22px; font-weight:800; margin:0; letter-spacing:-.4px; }
  .tm-sub { font-size:12.5px; color:#94a3b8; margin:4px 0 16px; }
  .tm-msg { font-size:12.5px; color:#059669; margin-bottom:12px; }
  .tm-state { padding:36px; text-align:center; color:#94a3b8; font-size:13px; }
  .tm-card { background:#fff; border:1px solid #eef2f7; border-radius:14px; overflow:hidden; box-shadow:0 1px 2px rgba(15,23,42,.04); }
  .tm-table { width:100%; border-collapse:collapse; font-size:13px; }
  .tm-table th { text-align:left; padding:12px 14px; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; border-bottom:1px solid #eef2f7; }
  .tm-table td { padding:12px 14px; border-bottom:1px solid #f6f8fb; }
  .tm-email { color:#64748b; }
  .tm-you { font-size:10px; background:#eff4ff; color:#2563EB; padding:2px 7px; border-radius:6px; font-weight:700; margin-left:4px; }
  .tm-sel { padding:6px 10px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:12.5px; font-family:inherit; background:#fff; cursor:pointer; }
  .tm-role { font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:7px; background:#f1f5f9; color:#475569; }
  .tm-role.r-super_admin { background:#ede9fe; color:#7c3aed; }
  .tm-role.r-org_admin { background:#eff4ff; color:#2563EB; }
`
