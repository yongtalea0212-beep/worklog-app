'use client'
// app/social/competitors/page.jsx — competitor ranking (Module 9 UI).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function CompetitorsPage() {
  const router = useRouter()
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const res = await fetch('/api/social/competitors', { headers: { Authorization: `Bearer ${data.session.access_token}` } })
      const json = await res.json()
      if (!res.ok) setErr(json.error || 'load failed'); else setRows(json.pages)
    })
  }, [router])

  return (
    <div className="cp-root">
      <style>{CSS}</style>
      <div className="cp-wrap">
        <button className="cp-back" onClick={() => router.push('/social')}>← Dashboard</button>
        <h1 className="cp-title">Competitor Intelligence</h1>
        <p className="cp-sub">จัดอันดับจาก engagement สาธารณะจริง (avg ต่อโพสต์ + ความถี่)</p>

        {err && <div className="cp-state cp-err">⚠️ {err}</div>}
        {!rows && !err && <div className="cp-state">⏳ กำลังคำนวณ...</div>}
        {rows && rows.length === 0 && <div className="cp-state">ยังไม่มีเพจ — นำเข้าข้อมูลเพจคู่แข่งที่หน้า Import</div>}

        {rows && rows.length > 0 && (
          <div className="cp-card">
            <table className="cp-table">
              <thead><tr><th>#</th><th>เพจ</th><th>โพสต์</th><th>Avg Eng.</th><th>โพสต์/สัปดาห์</th><th>คะแนน</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={r.isOwn ? 'own' : ''}>
                    <td className="cp-no">{i + 1}</td>
                    <td><span className="cp-name">{r.name}</span> {r.isOwn && <span className="cp-badge">เรา</span>}</td>
                    <td className="cp-num">{r.posts}</td>
                    <td className="cp-num">{r.avgEngagement.toLocaleString()}</td>
                    <td className="cp-num">{r.frequency}</td>
                    <td>
                      <div className="cp-scorewrap">
                        <div className="cp-bar"><div style={{ width: `${r.score}%` }} /></div>
                        <span className="cp-score">{r.score}</span>
                      </div>
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
  .cp-root { min-height:100vh; background:#f6f8fb; font-family:'Inter',sans-serif; color:#0f172a; padding:28px 16px; }
  .cp-wrap { max-width:760px; margin:0 auto; }
  .cp-back { background:none; border:none; color:#2563EB; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; padding:0; margin-bottom:10px; }
  .cp-title { font-size:22px; font-weight:800; margin:0; letter-spacing:-.4px; }
  .cp-sub { font-size:12.5px; color:#94a3b8; margin:4px 0 16px; }
  .cp-card { background:#fff; border:1px solid #eef2f7; border-radius:14px; overflow:hidden; box-shadow:0 1px 2px rgba(15,23,42,.04); }
  .cp-table { width:100%; border-collapse:collapse; font-size:13px; }
  .cp-table th { text-align:left; padding:12px 14px; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; border-bottom:1px solid #eef2f7; }
  .cp-table td { padding:12px 14px; border-bottom:1px solid #f6f8fb; }
  .cp-table tr.own { background:#f0fdf4; }
  .cp-no { color:#94a3b8; font-weight:700; }
  .cp-name { font-weight:600; }
  .cp-badge { font-size:10px; background:#dcfce7; color:#16a34a; padding:2px 7px; border-radius:6px; font-weight:700; }
  .cp-num { text-align:center; color:#475569; }
  .cp-scorewrap { display:flex; align-items:center; gap:8px; }
  .cp-bar { flex:1; height:8px; background:#f1f5f9; border-radius:6px; overflow:hidden; min-width:50px; }
  .cp-bar div { height:100%; background:linear-gradient(90deg,#2563EB,#60a5fa); }
  .cp-score { font-weight:800; color:#2563EB; width:28px; text-align:right; }
  .cp-state, .cp-err { padding:40px; text-align:center; color:#94a3b8; font-size:13px; }
  .cp-err { color:#dc2626; }
`
