'use client'
// app/social/comments/page.jsx — comment intelligence list (per-comment AI results).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const SENT = {
  positive: { label: 'บวก', bg: '#dcfce7', fg: '#16a34a' },
  neutral: { label: 'กลาง', bg: '#f1f5f9', fg: '#64748b' },
  negative: { label: 'ลบ', bg: '#fee2e2', fg: '#dc2626' },
}
const EMO = { happy: '😊', excited: '🤩', angry: '😡', frustrated: '😤', neutral: '😐' }
const FILTERS = [['all', 'ทั้งหมด'], ['positive', 'บวก'], ['neutral', 'กลาง'], ['negative', 'ลบ']]

export default function CommentsPage() {
  const router = useRouter()
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const res = await fetch('/api/social/comments', { headers: { Authorization: `Bearer ${data.session.access_token}` } })
      const json = await res.json()
      if (!res.ok) { setErr(json.error || 'load failed'); return }
      setRows(json.comments)
    })
  }, [router])

  const filtered = (rows || []).filter((r) => filter === 'all' || r.sentiment === filter)
  const counts = { positive: 0, neutral: 0, negative: 0, analyzed: 0 }
  ;(rows || []).forEach((r) => { if (r.sentiment) { counts[r.sentiment]++; counts.analyzed++ } })

  return (
    <div className="cm-root">
      <style>{CSS}</style>
      <div className="cm-wrap">
        <button className="cm-back" onClick={() => router.push('/social')}>← Dashboard</button>
        <h1 className="cm-title">Comment Intelligence</h1>
        <p className="cm-sub">ผลวิเคราะห์รายคอมเมนต์ด้วย AI · {counts.analyzed} วิเคราะห์แล้ว · บวก {counts.positive} / กลาง {counts.neutral} / ลบ {counts.negative}</p>

        <div className="cm-filters">
          {FILTERS.map(([k, l]) => (
            <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>

        {err && <div className="cm-err">⚠️ {err}</div>}
        {!rows && !err && <div className="cm-state">⏳ กำลังโหลด...</div>}
        {rows && filtered.length === 0 && <div className="cm-state">ยังไม่มีคอมเมนต์ — ลองนำเข้าข้อมูลแล้ววิเคราะห์ที่หน้า Import</div>}

        {rows && filtered.length > 0 && (
          <div className="cm-card">
            <table className="cm-table">
              <thead><tr><th>คอมเมนต์</th><th>Sentiment</th><th>อารมณ์</th><th>หมวด</th><th>👍</th></tr></thead>
              <tbody>
                {filtered.map((r) => {
                  const s = r.sentiment ? SENT[r.sentiment] : null
                  return (
                    <tr key={r.id}>
                      <td className="cm-text">
                        <div>{r.content}</div>
                        {r.post && <div className="cm-post">บนโพสต์: {r.post.slice(0, 40)}</div>}
                      </td>
                      <td>{s ? <span className="cm-badge" style={{ background: s.bg, color: s.fg }}>{s.label}</span> : <span className="cm-pending">รอวิเคราะห์</span>}</td>
                      <td className="cm-emo">{r.emotion ? `${EMO[r.emotion] || ''} ${r.emotion}` : '—'}</td>
                      <td>{r.category ? <span className="cm-cat">{r.category}</span> : '—'}</td>
                      <td className="cm-num">{r.likeCount || 0}</td>
                    </tr>
                  )
                })}
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
  .cm-root { min-height:100vh; background:#f6f8fb; font-family:'Inter',sans-serif; color:#0f172a; padding:28px 16px; }
  .cm-wrap { max-width:920px; margin:0 auto; }
  .cm-back { background:none; border:none; color:#2563EB; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; padding:0; margin-bottom:10px; }
  .cm-title { font-size:22px; font-weight:800; margin:0; letter-spacing:-.4px; }
  .cm-sub { font-size:12.5px; color:#94a3b8; margin:4px 0 16px; }
  .cm-filters { display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
  .cm-filters button { padding:7px 15px; border:1px solid #e2e8f0; background:#fff; border-radius:9px; font-size:12.5px; font-weight:600; color:#64748b; cursor:pointer; font-family:inherit; }
  .cm-filters button.on { background:#2563EB; color:#fff; border-color:#2563EB; }
  .cm-card { background:#fff; border:1px solid #eef2f7; border-radius:14px; overflow:hidden; box-shadow:0 1px 2px rgba(15,23,42,.04); }
  .cm-table { width:100%; border-collapse:collapse; font-size:13px; }
  .cm-table th { text-align:left; padding:12px 14px; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; border-bottom:1px solid #eef2f7; }
  .cm-table td { padding:12px 14px; border-bottom:1px solid #f6f8fb; vertical-align:top; }
  .cm-text > div:first-child { color:#0f172a; }
  .cm-post { font-size:11px; color:#94a3b8; margin-top:3px; }
  .cm-badge { font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:999px; white-space:nowrap; }
  .cm-pending { font-size:11px; color:#cbd5e1; }
  .cm-emo { white-space:nowrap; color:#475569; font-size:12px; }
  .cm-cat { font-size:11.5px; background:#eff4ff; color:#1d4ed8; padding:2px 9px; border-radius:7px; font-weight:600; }
  .cm-num { text-align:center; color:#64748b; font-weight:600; }
  .cm-state, .cm-err { padding:40px; text-align:center; color:#94a3b8; font-size:13px; }
  .cm-err { color:#dc2626; }
  @media (max-width:600px){ .cm-emo, .cm-table th:nth-child(3), .cm-table td:nth-child(3){ display:none; } }
`
