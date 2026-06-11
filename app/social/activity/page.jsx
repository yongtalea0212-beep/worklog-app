'use client'
// app/social/activity/page.jsx — recent activity log viewer (Phase 4).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const ICON = { ingest: '📥', analyze: '🤖', ai_summary: '📋', ai_recommend: '💡', ai_crisis: '🚨', role_change: '👤' }
const LABEL = {
  ingest: 'นำเข้าข้อมูล', analyze: 'วิเคราะห์ sentiment', ai_summary: 'สร้างสรุปผู้บริหาร',
  ai_recommend: 'ขอคำแนะนำการตลาด', ai_crisis: 'ตรวจวิกฤต', role_change: 'เปลี่ยน role',
}
const ago = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return 'เมื่อสักครู่'
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`
  if (s < 86400) return `${Math.floor(s / 3600)} ชม.ที่แล้ว`
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

export default function ActivityPage() {
  const router = useRouter()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const res = await fetch('/api/social/activity', { headers: { Authorization: `Bearer ${data.session.access_token}` } })
      const json = await res.json()
      setRows(json.items || [])
    })
  }, [router])

  return (
    <div className="ac-root">
      <style>{CSS}</style>
      <div className="ac-wrap">
        <button className="ac-back" onClick={() => router.push('/social')}>← Dashboard</button>
        <h1 className="ac-title">Activity Log</h1>
        <p className="ac-sub">บันทึกการทำงานล่าสุดในองค์กร</p>

        {!rows && <div className="ac-state">⏳ กำลังโหลด...</div>}
        {rows && rows.length === 0 && <div className="ac-state">ยังไม่มีกิจกรรม — ลองนำเข้าข้อมูลหรือวิเคราะห์</div>}
        {rows && rows.map((a) => {
          const meta = a.action === 'ingest' ? `${a.meta?.posts || 0} โพสต์ · ${a.meta?.comments || 0} คอมเมนต์`
            : a.action === 'analyze' ? `${a.meta?.analyzed || 0} คอมเมนต์`
            : a.action === 'role_change' ? `→ ${a.meta?.role}` : ''
          return (
            <div key={a.id} className="ac-row">
              <span className="ac-ic">{ICON[a.action] || '•'}</span>
              <div className="ac-body">
                <div className="ac-act">{LABEL[a.action] || a.action} {meta && <span className="ac-meta">· {meta}</span>}</div>
                <div className="ac-actor">{a.actor}</div>
              </div>
              <span className="ac-time">{ago(a.createdAt)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .ac-root { min-height:100vh; background:#f6f8fb; font-family:'Inter',sans-serif; color:#0f172a; padding:28px 16px; }
  .ac-wrap { max-width:620px; margin:0 auto; }
  .ac-back { background:none; border:none; color:#2563EB; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; padding:0; margin-bottom:10px; }
  .ac-title { font-size:22px; font-weight:800; margin:0; letter-spacing:-.4px; }
  .ac-sub { font-size:12.5px; color:#94a3b8; margin:4px 0 16px; }
  .ac-state { padding:36px; text-align:center; color:#94a3b8; font-size:13px; }
  .ac-row { display:flex; align-items:center; gap:13px; background:#fff; border:1px solid #eef2f7; border-radius:12px; padding:13px 15px; margin-bottom:8px; box-shadow:0 1px 2px rgba(15,23,42,.04); }
  .ac-ic { font-size:18px; width:24px; text-align:center; }
  .ac-body { flex:1; min-width:0; }
  .ac-act { font-size:13.5px; font-weight:600; }
  .ac-meta { color:#94a3b8; font-weight:500; font-size:12.5px; }
  .ac-actor { font-size:11.5px; color:#94a3b8; margin-top:1px; }
  .ac-time { font-size:11.5px; color:#cbd5e1; white-space:nowrap; }
`
