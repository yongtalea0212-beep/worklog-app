'use client'
// app/social/keywords/page.jsx — keyword listening (Module 8 UI).
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function KeywordsPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [rows, setRows] = useState(null)
  const [term, setTerm] = useState('')
  const [msg, setMsg] = useState('')
  const [scanning, setScanning] = useState(false)

  const load = useCallback(async (t) => {
    const res = await fetch('/api/social/keywords', { headers: { Authorization: `Bearer ${t}` } })
    const json = await res.json()
    setRows(json.keywords || [])
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setToken(data.session.access_token); load(data.session.access_token)
    })
  }, [router, load])

  async function add() {
    if (!term.trim()) return
    await fetch('/api/social/keywords', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ term: term.trim() }) })
    setTerm(''); load(token)
  }
  async function del(id) {
    await fetch('/api/social/keywords', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, delete: true }) })
    load(token)
  }
  async function scan() {
    setScanning(true); setMsg('')
    const res = await fetch('/api/social/keywords/scan', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    setMsg(res.ok ? `สแกนแล้ว พบ ${json.matched} การกล่าวถึง` : (json.error || 'scan failed'))
    setScanning(false); load(token)
  }

  return (
    <div className="kw-root">
      <style>{CSS}</style>
      <div className="kw-wrap">
        <button className="kw-back" onClick={() => router.push('/social')}>← Dashboard</button>
        <h1 className="kw-title">Keyword Listening</h1>
        <p className="kw-sub">ติดตามแบรนด์ สินค้า แคมเปญ — ดูจำนวนการกล่าวถึงและ sentiment</p>

        <div className="kw-add">
          <input value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="เพิ่มคำ เช่น โปรโมชั่น, ชื่อแบรนด์" />
          <button className="kw-btn" onClick={add}>+ เพิ่ม</button>
          <button className="kw-btn ghost" onClick={scan} disabled={scanning}>{scanning ? 'กำลังสแกน...' : '🔍 สแกนใหม่'}</button>
        </div>
        {msg && <div className="kw-msg">{msg}</div>}

        {!rows && <div className="kw-state">⏳ กำลังโหลด...</div>}
        {rows && rows.length === 0 && <div className="kw-state">ยังไม่มี keyword — เพิ่มด้านบนแล้วกดสแกน</div>}
        {rows && rows.map((k) => {
          const max = Math.max(1, k.positive, k.neutral, k.negative)
          return (
            <div key={k.id} className="kw-card">
              <div className="kw-head">
                <span className="kw-term">#{k.term}</span>
                <span className="kw-total">{k.total} mentions</span>
                <button className="kw-del" onClick={() => del(k.id)}>ลบ</button>
              </div>
              <div className="kw-bars">
                <span className="kw-b pos" style={{ width: `${(k.positive / max) * 100}%` }} title={`บวก ${k.positive}`} />
                <span className="kw-b neu" style={{ width: `${(k.neutral / max) * 100}%` }} title={`กลาง ${k.neutral}`} />
                <span className="kw-b neg" style={{ width: `${(k.negative / max) * 100}%` }} title={`ลบ ${k.negative}`} />
              </div>
              <div className="kw-legend"><span className="pos">บวก {k.positive}</span><span className="neu">กลาง {k.neutral}</span><span className="neg">ลบ {k.negative}</span></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .kw-root { min-height:100vh; background:#f6f8fb; font-family:'Inter',sans-serif; color:#0f172a; padding:28px 16px; }
  .kw-wrap { max-width:680px; margin:0 auto; }
  .kw-back { background:none; border:none; color:#2563EB; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; padding:0; margin-bottom:10px; }
  .kw-title { font-size:22px; font-weight:800; margin:0; letter-spacing:-.4px; }
  .kw-sub { font-size:12.5px; color:#94a3b8; margin:4px 0 16px; }
  .kw-add { display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
  .kw-add input { flex:1; min-width:160px; padding:10px 12px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:13px; font-family:inherit; outline:none; }
  .kw-add input:focus { border-color:#2563EB; }
  .kw-btn { padding:10px 16px; background:#2563EB; color:#fff; border:none; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }
  .kw-btn.ghost { background:#fff; color:#2563EB; border:1.5px solid #dbe6ff; }
  .kw-btn:disabled { opacity:.55; }
  .kw-msg { font-size:12.5px; color:#059669; margin-bottom:12px; }
  .kw-state { padding:36px; text-align:center; color:#94a3b8; font-size:13px; }
  .kw-card { background:#fff; border:1px solid #eef2f7; border-radius:12px; padding:14px 16px; margin-bottom:10px; box-shadow:0 1px 2px rgba(15,23,42,.04); }
  .kw-head { display:flex; align-items:center; gap:10px; }
  .kw-term { font-weight:700; color:#1d4ed8; font-size:14px; }
  .kw-total { font-size:12px; color:#94a3b8; margin-left:auto; }
  .kw-del { background:none; border:none; color:#cbd5e1; font-size:12px; cursor:pointer; font-family:inherit; }
  .kw-del:hover { color:#dc2626; }
  .kw-bars { display:flex; gap:3px; height:8px; margin:10px 0 6px; }
  .kw-b { border-radius:3px; min-width:2px; }
  .kw-b.pos { background:#16a34a; } .kw-b.neu { background:#cbd5e1; } .kw-b.neg { background:#dc2626; }
  .kw-legend { display:flex; gap:14px; font-size:11px; font-weight:600; }
  .kw-legend .pos { color:#16a34a; } .kw-legend .neu { color:#94a3b8; } .kw-legend .neg { color:#dc2626; }
`
