'use client'
// app/social/trends/page.jsx — trend detection feed (Module 10 UI).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const KIND = {
  viral: { label: 'ไวรัล', icon: '🚀', color: '#2563EB' },
  emerging_topic: { label: 'หัวข้อมาแรง', icon: '📈', color: '#7c3aed' },
  neg_surge: { label: 'กระแสลบ', icon: '⚠️', color: '#dc2626' },
  competitor_campaign: { label: 'แคมเปญคู่แข่ง', icon: '🥊', color: '#b45309' },
}

export default function TrendsPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load(t, recompute) {
    const res = await fetch('/api/social/trends', { method: recompute ? 'POST' : 'GET', headers: { Authorization: `Bearer ${t}` } })
    const json = await res.json()
    setRows(json.trends || [])
  }
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setToken(data.session.access_token); load(data.session.access_token, false)
    })
  }, [router])

  async function recompute() { setBusy(true); await load(token, true); setBusy(false) }

  return (
    <div className="tr-root">
      <style>{CSS}</style>
      <div className="tr-wrap">
        <button className="tr-back" onClick={() => router.push('/social')}>← Dashboard</button>
        <div className="tr-head">
          <div><h1 className="tr-title">Trend Detection</h1><p className="tr-sub">โพสต์ไวรัล หัวข้อมาแรง และกระแสเชิงลบ</p></div>
          <button className="tr-btn" onClick={recompute} disabled={busy || !token}>{busy ? 'กำลังคำนวณ...' : '↻ คำนวณใหม่'}</button>
        </div>

        {!rows && <div className="tr-state">⏳ กำลังโหลด...</div>}
        {rows && rows.length === 0 && <div className="tr-state">ยังไม่พบเทรนด์ — ต้องมีโพสต์/คอมเมนต์มากพอ แล้วกดคำนวณใหม่</div>}
        {rows && rows.map((t) => {
          const k = KIND[t.kind] || { label: t.kind, icon: '•', color: '#64748b' }
          return (
            <div key={t.id} className="tr-card">
              <div className="tr-icon" style={{ background: k.color + '18', color: k.color }}>{k.icon}</div>
              <div className="tr-body">
                <div className="tr-kind" style={{ color: k.color }}>{k.label}</div>
                <div className="tr-text">{t.title}</div>
              </div>
              <div className="tr-score" style={{ color: k.color }}>{Math.round(t.score)}<span>คะแนน</span></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .tr-root { min-height:100vh; background:#f6f8fb; font-family:'Inter',sans-serif; color:#0f172a; padding:28px 16px; }
  .tr-wrap { max-width:680px; margin:0 auto; }
  .tr-back { background:none; border:none; color:#2563EB; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; padding:0; margin-bottom:10px; }
  .tr-head { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
  .tr-title { font-size:22px; font-weight:800; margin:0; letter-spacing:-.4px; }
  .tr-sub { font-size:12.5px; color:#94a3b8; margin:4px 0 0; }
  .tr-btn { padding:9px 16px; background:#fff; color:#2563EB; border:1.5px solid #dbe6ff; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }
  .tr-btn:disabled { opacity:.55; }
  .tr-state { padding:40px; text-align:center; color:#94a3b8; font-size:13px; }
  .tr-card { display:flex; align-items:center; gap:14px; background:#fff; border:1px solid #eef2f7; border-radius:14px; padding:16px; margin-bottom:10px; box-shadow:0 1px 2px rgba(15,23,42,.04); }
  .tr-icon { width:42px; height:42px; flex:0 0 42px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:19px; }
  .tr-body { flex:1; min-width:0; }
  .tr-kind { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.4px; }
  .tr-text { font-size:14px; font-weight:600; color:#0f172a; margin-top:2px; }
  .tr-score { text-align:center; font-size:22px; font-weight:800; }
  .tr-score span { display:block; font-size:9px; color:#94a3b8; font-weight:600; }
`
