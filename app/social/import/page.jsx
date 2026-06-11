'use client'
// app/social/import/page.jsx — manual / CSV ingestion UI (Phase 1).
// Builds normalized RawPageData and posts it to /api/social/ingest, then can
// trigger the OpenAI sentiment job via /api/social/analyze.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const SAMPLE = {
  posts: [
    {
      content: 'เปิดตัวคอลเลกชันใหม่ ลด 30% เฉพาะสัปดาห์นี้!',
      postedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      likeCount: 540, shareCount: 88,
      comments: [
        { author: 'user1', content: 'สวยมากกก อยากได้เลย 😍' },
        { author: 'user2', content: 'ราคาแพงไปนิดนะคะ' },
        { author: 'user3', content: 'ส่งของช้ามาก รอเป็นอาทิตย์' },
      ],
    },
    {
      content: 'รีวิวจากลูกค้าจริง ขอบคุณที่ไว้วางใจครับ',
      postedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      likeCount: 210, shareCount: 12,
      comments: [
        { author: 'user4', content: 'บริการดีมากครับ ประทับใจ' },
        { author: 'user5', content: 'คุณภาพไม่เหมือนในรูปเลย ผิดหวัง' },
      ],
    },
  ],
}

// tiny CSV parser (handles simple double-quoted fields). Columns: post,comment[,like]
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (!lines.length) return []
  const split = (line) => {
    const out = []; let cur = '', q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') q = false; else cur += ch }
      else if (ch === '"') q = true
      else if (ch === ',') { out.push(cur); cur = '' }
      else cur += ch
    }
    out.push(cur); return out
  }
  const header = split(lines[0]).map((h) => h.trim().toLowerCase())
  const pi = header.indexOf('post'), ci = header.indexOf('comment'), li = header.indexOf('like')
  const start = pi >= 0 || ci >= 0 ? 1 : 0
  const cols = start ? { post: pi, comment: ci, like: li } : { post: 0, comment: 1, like: 2 }
  const byPost = new Map()
  for (let r = start; r < lines.length; r++) {
    const f = split(lines[r])
    const postText = (f[cols.post] || '').trim() || 'โพสต์ (ไม่ระบุ)'
    const commentText = (f[cols.comment] || '').trim()
    if (!byPost.has(postText)) byPost.set(postText, { content: postText, comments: [] })
    if (commentText) byPost.get(postText).comments.push({ content: commentText, likeCount: Number(f[cols.like]) || 0 })
  }
  return [...byPost.values()]
}

export default function ImportPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [mode, setMode] = useState('json') // json | csv
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('')
  const [isOwn, setIsOwn] = useState(true)
  const [json, setJson] = useState('')
  const [csvPosts, setCsvPosts] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setToken(data.session.access_token)
    })
  }, [router])

  function buildPosts() {
    if (mode === 'csv') return csvPosts || []
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : parsed.posts || []
  }

  async function handleImport() {
    setMsg(null); setAnalyzed(null)
    if (!name.trim() || !url.trim()) { setMsg({ type: 'err', text: 'กรอกชื่อเพจและ URL ก่อน' }); return }
    let posts
    try { posts = buildPosts() } catch { setMsg({ type: 'err', text: 'JSON ไม่ถูกต้อง' }); return }
    if (!posts.length) { setMsg({ type: 'err', text: 'ไม่มีข้อมูลโพสต์ให้นำเข้า' }); return }

    setBusy(true)
    try {
      const res = await fetch('/api/social/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ page: { name, url, category, isOwnBrand: isOwn }, posts }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'นำเข้าไม่สำเร็จ')
      setMsg({ type: 'ok', text: `นำเข้าสำเร็จ: ${data.counts.posts} โพสต์ · ${data.counts.comments} คอมเมนต์` })
    } catch (e) { setMsg({ type: 'err', text: String(e.message || e) }) }
    finally { setBusy(false) }
  }

  async function handleAnalyze() {
    setAnalyzing(true); setAnalyzed(null)
    try {
      let total = 0
      for (let i = 0; i < 10; i++) { // process several batches of 30
        const res = await fetch('/api/social/analyze', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'วิเคราะห์ไม่สำเร็จ')
        total += data.analyzed || 0
        if (!data.pulled || data.pulled < 30) break
      }
      setAnalyzed({ type: 'ok', text: `วิเคราะห์ sentiment แล้ว ${total} คอมเมนต์ — กลับไปดู Dashboard ได้เลย` })
    } catch (e) { setAnalyzed({ type: 'err', text: String(e.message || e) }) }
    finally { setAnalyzing(false) }
  }

  return (
    <div className="im-root">
      <style>{CSS}</style>
      <div className="im-wrap">
        <div className="im-top">
          <button className="im-back" onClick={() => router.push('/social')}>← Dashboard</button>
          <h1 className="im-title">นำเข้าข้อมูลเพจ (Manual / CSV)</h1>
          <p className="im-sub">ใช้ข้อมูลที่คุณมีสิทธิ์ใช้เท่านั้น · ระบบไม่ดึงข้อมูลจาก Facebook โดยตรง</p>
        </div>

        {/* Page meta */}
        <div className="im-card">
          <div className="im-grid">
            <label>ชื่อเพจ<input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น แบรนด์ของเรา" /></label>
            <label>URL เพจ<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://facebook.com/..." /></label>
            <label>หมวดหมู่<input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="เช่น Retail" /></label>
            <label className="im-check"><input type="checkbox" checked={isOwn} onChange={(e) => setIsOwn(e.target.checked)} /> เป็นแบรนด์ของเรา (ไม่ใช่คู่แข่ง)</label>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="im-tabs">
          <button className={mode === 'json' ? 'on' : ''} onClick={() => setMode('json')}>วาง JSON</button>
          <button className={mode === 'csv' ? 'on' : ''} onClick={() => setMode('csv')}>อัปโหลด CSV</button>
        </div>

        {mode === 'json' ? (
          <div className="im-card">
            <div className="im-row">
              <span className="im-hint">รูปแบบ: {'{ posts: [{ content, postedAt, likeCount, comments:[{author, content}] }] }'}</span>
              <button className="im-mini" onClick={() => setJson(JSON.stringify(SAMPLE, null, 2))}>โหลดตัวอย่าง</button>
            </div>
            <textarea className="im-textarea" value={json} onChange={(e) => setJson(e.target.value)} placeholder='{ "posts": [ ... ] }' rows={14} />
          </div>
        ) : (
          <div className="im-card">
            <div className="im-hint">CSV header: <code>post,comment,like</code> — แต่ละแถวคือ 1 คอมเมนต์ จับกลุ่มตามข้อความโพสต์</div>
            <input type="file" accept=".csv,text/csv" className="im-file" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return
              const text = await f.text()
              const posts = parseCsv(text)
              setCsvPosts(posts)
              setMsg({ type: 'ok', text: `อ่าน CSV ได้ ${posts.length} โพสต์ · ${posts.reduce((s, p) => s + p.comments.length, 0)} คอมเมนต์` })
            }} />
          </div>
        )}

        {msg && <div className={`im-msg ${msg.type}`}>{msg.type === 'ok' ? '✅' : '⚠️'} {msg.text}</div>}

        <div className="im-actions">
          <button className="im-btn" disabled={busy || !token} onClick={handleImport}>{busy ? 'กำลังนำเข้า...' : 'นำเข้าข้อมูล'}</button>
          <button className="im-btn ghost" disabled={analyzing || !token} onClick={handleAnalyze}>{analyzing ? 'AI กำลังวิเคราะห์...' : '🤖 วิเคราะห์ Sentiment ด้วย AI'}</button>
        </div>
        {analyzed && <div className={`im-msg ${analyzed.type}`}>{analyzed.type === 'ok' ? '✅' : '⚠️'} {analyzed.text}</div>}
      </div>
    </div>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .im-root { min-height:100vh; background:#f6f8fb; font-family:'Inter',sans-serif; color:#0f172a; padding:28px 16px; }
  .im-wrap { max-width:760px; margin:0 auto; }
  .im-top { margin-bottom:18px; }
  .im-back { background:none; border:none; color:#2563EB; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; padding:0; margin-bottom:10px; }
  .im-title { font-size:22px; font-weight:800; margin:0; letter-spacing:-.4px; }
  .im-sub { font-size:12.5px; color:#94a3b8; margin:4px 0 0; }
  .im-card { background:#fff; border:1px solid #eef2f7; border-radius:14px; padding:18px; margin-bottom:14px; box-shadow:0 1px 2px rgba(15,23,42,.04); }
  .im-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .im-grid label { display:flex; flex-direction:column; font-size:12px; font-weight:600; color:#475569; gap:6px; }
  .im-grid input[type=text], .im-grid input:not([type]) { padding:9px 11px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:13px; font-family:inherit; outline:none; }
  .im-grid input:focus { border-color:#2563EB; }
  .im-check { flex-direction:row !important; align-items:center; gap:8px !important; grid-column:1/-1; }
  .im-tabs { display:flex; gap:8px; margin-bottom:14px; }
  .im-tabs button { padding:8px 16px; border:1px solid #e2e8f0; background:#fff; border-radius:9px; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; font-family:inherit; }
  .im-tabs button.on { background:#2563EB; color:#fff; border-color:#2563EB; }
  .im-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:12px; }
  .im-hint { font-size:11.5px; color:#94a3b8; }
  .im-hint code { background:#f1f5f9; padding:1px 6px; border-radius:5px; color:#475569; }
  .im-mini { font-size:11.5px; font-weight:600; color:#2563EB; background:#eff4ff; border:1px solid #dbe6ff; border-radius:7px; padding:5px 10px; cursor:pointer; font-family:inherit; white-space:nowrap; }
  .im-textarea { width:100%; box-sizing:border-box; border:1.5px solid #e2e8f0; border-radius:9px; padding:11px; font-family:ui-monospace,monospace; font-size:12px; outline:none; resize:vertical; }
  .im-textarea:focus { border-color:#2563EB; }
  .im-file { font-size:13px; }
  .im-msg { padding:10px 14px; border-radius:10px; font-size:12.5px; font-weight:500; margin-bottom:14px; }
  .im-msg.ok { background:rgba(16,185,129,.08); border:1px solid rgba(16,185,129,.2); color:#059669; }
  .im-msg.err { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); color:#dc2626; }
  .im-actions { display:flex; gap:12px; flex-wrap:wrap; }
  .im-btn { padding:12px 22px; background:#2563EB; color:#fff; border:none; border-radius:11px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; box-shadow:0 4px 14px rgba(37,99,235,.3); }
  .im-btn:disabled { opacity:.55; cursor:default; }
  .im-btn.ghost { background:#fff; color:#2563EB; border:1.5px solid #dbe6ff; box-shadow:none; }
  @media (max-width:600px) { .im-grid { grid-template-columns:1fr; } }
`
