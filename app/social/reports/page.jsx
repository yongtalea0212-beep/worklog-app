'use client'
// app/social/reports/page.jsx — export executive reports (Module 14 UI).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function ReportsPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setToken(data.session.access_token)
    })
  }, [router])

  async function download(format) {
    setBusy(format); setMsg(null)
    try {
      const res = await fetch(`/api/social/reports?format=${format}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'export failed') }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `social-insight-${new Date().toISOString().slice(0, 10)}.${format}`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setMsg({ type: 'ok', text: `ดาวน์โหลด ${format.toUpperCase()} แล้ว` })
    } catch (e) { setMsg({ type: 'err', text: String(e.message || e) }) }
    finally { setBusy('') }
  }

  return (
    <div className="rp-root">
      <style>{CSS}</style>
      <div className="rp-wrap">
        <button className="rp-back" onClick={() => router.push('/social')}>← Dashboard</button>
        <h1 className="rp-title">Report Generator</h1>
        <p className="rp-sub">ส่งออกรายงานสรุปผู้บริหาร — KPI, sentiment, top posts, คู่แข่ง</p>

        <div className="rp-grid">
          <button className="rp-opt" disabled={!token || busy} onClick={() => download('pdf')}>
            <div className="rp-ic" style={{ background: '#fee2e2', color: '#dc2626' }}>📄</div>
            <div className="rp-name">PDF</div>
            <div className="rp-d">รายงานสวยพร้อมส่ง (ฟอนต์ไทย)</div>
            {busy === 'pdf' && <div className="rp-load">กำลังสร้าง...</div>}
          </button>
          <button className="rp-opt" disabled={!token || busy} onClick={() => download('xlsx')}>
            <div className="rp-ic" style={{ background: '#dcfce7', color: '#16a34a' }}>📊</div>
            <div className="rp-name">Excel</div>
            <div className="rp-d">ข้อมูลดิบ 3 ชีต วิเคราะห์ต่อได้</div>
            {busy === 'xlsx' && <div className="rp-load">กำลังสร้าง...</div>}
          </button>
        </div>

        {msg && <div className={`rp-msg ${msg.type}`}>{msg.type === 'ok' ? '✅' : '⚠️'} {msg.text}</div>}
        <p className="rp-note">PowerPoint + การส่งออกตามกำหนดเวลา (scheduled) จะมาใน Phase 3</p>
      </div>
    </div>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .rp-root { min-height:100vh; background:#f6f8fb; font-family:'Inter',sans-serif; color:#0f172a; padding:28px 16px; }
  .rp-wrap { max-width:600px; margin:0 auto; }
  .rp-back { background:none; border:none; color:#2563EB; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; padding:0; margin-bottom:10px; }
  .rp-title { font-size:22px; font-weight:800; margin:0; letter-spacing:-.4px; }
  .rp-sub { font-size:12.5px; color:#94a3b8; margin:4px 0 18px; }
  .rp-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .rp-opt { background:#fff; border:1px solid #eef2f7; border-radius:16px; padding:22px; text-align:left; cursor:pointer; font-family:inherit; box-shadow:0 1px 2px rgba(15,23,42,.04); transition:.15s; }
  .rp-opt:hover:not(:disabled) { border-color:#2563EB; transform:translateY(-2px); box-shadow:0 8px 24px rgba(37,99,235,.12); }
  .rp-opt:disabled { opacity:.6; cursor:default; }
  .rp-ic { width:48px; height:48px; border-radius:13px; display:flex; align-items:center; justify-content:center; font-size:24px; margin-bottom:12px; }
  .rp-name { font-size:17px; font-weight:800; }
  .rp-d { font-size:12px; color:#94a3b8; margin-top:3px; }
  .rp-load { font-size:11.5px; color:#2563EB; font-weight:700; margin-top:8px; }
  .rp-msg { padding:10px 14px; border-radius:10px; font-size:12.5px; font-weight:500; margin-top:16px; }
  .rp-msg.ok { background:rgba(16,185,129,.08); border:1px solid rgba(16,185,129,.2); color:#059669; }
  .rp-msg.err { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); color:#dc2626; }
  .rp-note { font-size:11px; color:#94a3b8; margin-top:18px; }
  @media (max-width:480px){ .rp-grid { grid-template-columns:1fr; } }
`
