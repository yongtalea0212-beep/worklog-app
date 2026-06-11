'use client'
// app/social/posts/page.jsx — post analytics list (top posts, engagement, category).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const SORTS = [['likes', 'Likes'], ['comments', 'Comments'], ['shares', 'Shares'], ['recent', 'ล่าสุด']]
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '—')

export default function PostsPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [sort, setSort] = useState('likes')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setToken(data.session.access_token)
    })
  }, [router])

  useEffect(() => {
    if (!token) return
    setRows(null)
    fetch(`/api/social/posts?sort=${sort}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (!ok) setErr(j.error || 'load failed'); else setRows(j.posts) })
  }, [token, sort])

  return (
    <div className="po-root">
      <style>{CSS}</style>
      <div className="po-wrap">
        <button className="po-back" onClick={() => router.push('/social')}>← Dashboard</button>
        <div className="po-head">
          <div>
            <h1 className="po-title">Post Analytics</h1>
            <p className="po-sub">โพสต์สาธารณะที่เก็บ เรียงตาม engagement</p>
          </div>
          <select className="po-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map(([k, l]) => <option key={k} value={k}>เรียง: {l}</option>)}
          </select>
        </div>

        {err && <div className="po-state po-err">⚠️ {err}</div>}
        {!rows && !err && <div className="po-state">⏳ กำลังโหลด...</div>}
        {rows && rows.length === 0 && <div className="po-state">ยังไม่มีโพสต์ — นำเข้าข้อมูลที่หน้า Import</div>}

        {rows && rows.map((p, i) => (
          <div key={p.id} className="po-card">
            <div className="po-rank">{i + 1}</div>
            <div className="po-body">
              <div className="po-meta">
                <span className={`po-page ${p.isOwn ? 'own' : 'comp'}`}>{p.isOwn ? '🏠 เรา' : '🥊 คู่แข่ง'} · {p.page}</span>
                {p.category && <span className="po-cat">{p.category}</span>}
                <span className="po-date">{fmtDate(p.postedAt)}</span>
              </div>
              <div className="po-content">{p.content || '(ไม่มีข้อความ)'}</div>
              <div className="po-stats">
                <span>👍 {p.likeCount?.toLocaleString()}</span>
                <span>💬 {p.commentCount?.toLocaleString()}</span>
                <span>🔁 {p.shareCount?.toLocaleString()}</span>
                <span className="po-eng">⚡ {p.engagement?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .po-root { min-height:100vh; background:#f6f8fb; font-family:'Inter',sans-serif; color:#0f172a; padding:28px 16px; }
  .po-wrap { max-width:760px; margin:0 auto; }
  .po-back { background:none; border:none; color:#2563EB; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; padding:0; margin-bottom:10px; }
  .po-head { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
  .po-title { font-size:22px; font-weight:800; margin:0; letter-spacing:-.4px; }
  .po-sub { font-size:12.5px; color:#94a3b8; margin:4px 0 0; }
  .po-sort { padding:8px 12px; border:1px solid #e2e8f0; border-radius:9px; font-size:13px; font-family:inherit; background:#fff; color:#475569; font-weight:600; cursor:pointer; }
  .po-card { display:flex; gap:14px; background:#fff; border:1px solid #eef2f7; border-radius:14px; padding:16px; margin-bottom:10px; box-shadow:0 1px 2px rgba(15,23,42,.04); }
  .po-rank { width:26px; height:26px; flex:0 0 26px; border-radius:8px; background:#eff4ff; color:#2563EB; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; }
  .po-body { flex:1; min-width:0; }
  .po-meta { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:6px; }
  .po-page { font-size:11.5px; font-weight:700; padding:2px 9px; border-radius:7px; }
  .po-page.own { background:#dcfce7; color:#16a34a; }
  .po-page.comp { background:#fef3c7; color:#b45309; }
  .po-cat { font-size:11px; background:#eff4ff; color:#1d4ed8; padding:2px 8px; border-radius:6px; font-weight:600; }
  .po-date { font-size:11.5px; color:#94a3b8; margin-left:auto; }
  .po-content { font-size:13.5px; color:#0f172a; line-height:1.5; margin-bottom:10px; }
  .po-stats { display:flex; gap:16px; font-size:12.5px; color:#64748b; font-weight:600; }
  .po-eng { color:#2563EB; margin-left:auto; }
  .po-state, .po-err { padding:40px; text-align:center; color:#94a3b8; font-size:13px; }
  .po-err { color:#dc2626; }
`
