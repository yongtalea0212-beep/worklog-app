'use client'
// app/social/insights/page.jsx — AI Business Summary + Recommendations + Crisis (Modules 7,13).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function List({ title, items, color = '#0f172a' }) {
  if (!items?.length) return null
  return (
    <div className="in-block">
      <div className="in-block-t" style={{ color }}>{title}</div>
      <ul className="in-list">{items.map((x, i) => <li key={i}>{typeof x === 'string' ? x : (x.name ? `${x.name} — ${x.angle || ''} ${x.kpi ? `(KPI: ${x.kpi})` : ''}` : JSON.stringify(x))}</li>)}</ul>
    </div>
  )
}

export default function InsightsPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [busy, setBusy] = useState('')
  const [summary, setSummary] = useState(null)
  const [recommend, setRecommend] = useState(null)
  const [crisis, setCrisis] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setToken(data.session.access_token)
    })
  }, [router])

  async function run(kind, set) {
    setBusy(kind); setErr('')
    try {
      const res = await fetch(`/api/social/ai?kind=${kind}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'failed')
      set(json.result)
    } catch (e) { setErr(String(e.message || e)) }
    finally { setBusy('') }
  }

  return (
    <div className="in-root">
      <style>{CSS}</style>
      <div className="in-wrap">
        <button className="in-back" onClick={() => router.push('/social')}>← Dashboard</button>
        <h1 className="in-title">AI Business Insights</h1>
        <p className="in-sub">สรุปผู้บริหาร คำแนะนำการตลาด และตรวจจับวิกฤต ด้วย AI</p>

        <div className="in-actions">
          <button className="in-btn" disabled={!token || busy} onClick={() => run('summary', setSummary)}>{busy === 'summary' ? 'กำลังคิด...' : '📋 สรุปผู้บริหาร'}</button>
          <button className="in-btn" disabled={!token || busy} onClick={() => run('recommend', setRecommend)}>{busy === 'recommend' ? 'กำลังคิด...' : '💡 คำแนะนำการตลาด'}</button>
          <button className="in-btn warn" disabled={!token || busy} onClick={() => run('crisis', setCrisis)}>{busy === 'crisis' ? 'กำลังตรวจ...' : '🚨 ตรวจวิกฤต'}</button>
        </div>
        {err && <div className="in-err">⚠️ {err}</div>}

        {crisis && (
          <div className={`in-crisis ${crisis.is_crisis ? 'on' : 'ok'}`}>
            <div className="in-crisis-h">{crisis.is_crisis ? `🚨 พบสัญญาณวิกฤต (${crisis.severity})` : '✅ ยังไม่พบวิกฤต'}</div>
            {crisis.summary && <div className="in-crisis-b">{crisis.summary}</div>}
            {crisis.suggested_response && <div className="in-crisis-r"><b>แนวทางตอบ:</b> {crisis.suggested_response}</div>}
          </div>
        )}

        {summary && (
          <div className="in-card">
            <div className="in-headline">{summary.headline}</div>
            <List title="✅ Feedback เชิงบวกเด่น" items={summary.top_positive} color="#16a34a" />
            <List title="⚠️ Feedback เชิงลบเด่น" items={summary.top_negative} color="#dc2626" />
            <List title="😣 Pain Points ของลูกค้า" items={summary.pain_points} color="#b45309" />
            <List title="🙋 ฟีเจอร์ที่ถูกขอบ่อย" items={summary.requested_features} color="#2563EB" />
            <List title="🚀 โอกาสทางธุรกิจ" items={summary.opportunities} color="#7c3aed" />
            <List title="🛑 ความเสี่ยง" items={summary.risks} color="#dc2626" />
            {summary.one_line_recommendation && <div className="in-oneline">💬 {summary.one_line_recommendation}</div>}
          </div>
        )}

        {recommend && (
          <div className="in-card">
            <div className="in-headline">💡 คำแนะนำการตลาด</div>
            <div className="in-kv">
              {recommend.best_content_type && <span><b>คอนเทนต์ที่ควรทำ:</b> {recommend.best_content_type}</span>}
              {recommend.best_posting_time && <span><b>เวลาโพสต์ที่ดี:</b> {recommend.best_posting_time}</span>}
            </div>
            <List title="🔥 หัวข้อมาแรง" items={recommend.trending_topics} color="#2563EB" />
            <List title="📣 แคมเปญแนะนำ" items={recommend.suggested_campaigns} color="#7c3aed" />
            <List title="✍️ ไอเดียคอนเทนต์" items={recommend.content_ideas} color="#0f172a" />
            <List title="🔑 keyword แนะนำ" items={recommend.suggested_keywords} color="#1d4ed8" />
            <List title="🛑 คำเตือนความเสี่ยง" items={recommend.risk_warnings} color="#dc2626" />
          </div>
        )}
      </div>
    </div>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .in-root { min-height:100vh; background:#f6f8fb; font-family:'Inter',sans-serif; color:#0f172a; padding:28px 16px; }
  .in-wrap { max-width:720px; margin:0 auto; }
  .in-back { background:none; border:none; color:#2563EB; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; padding:0; margin-bottom:10px; }
  .in-title { font-size:22px; font-weight:800; margin:0; letter-spacing:-.4px; }
  .in-sub { font-size:12.5px; color:#94a3b8; margin:4px 0 16px; }
  .in-actions { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
  .in-btn { padding:11px 18px; background:#2563EB; color:#fff; border:none; border-radius:10px; font-size:13.5px; font-weight:700; cursor:pointer; font-family:inherit; box-shadow:0 4px 14px rgba(37,99,235,.25); }
  .in-btn.warn { background:#dc2626; box-shadow:0 4px 14px rgba(220,38,38,.25); }
  .in-btn:disabled { opacity:.55; cursor:default; }
  .in-err { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); color:#dc2626; border-radius:10px; padding:10px 14px; font-size:12.5px; margin-bottom:14px; }
  .in-card { background:#fff; border:1px solid #eef2f7; border-radius:16px; padding:20px; margin-bottom:14px; box-shadow:0 1px 2px rgba(15,23,42,.04); }
  .in-headline { font-size:16px; font-weight:800; margin-bottom:12px; }
  .in-block { margin-bottom:14px; }
  .in-block-t { font-size:13px; font-weight:700; margin-bottom:5px; }
  .in-list { margin:0; padding-left:18px; }
  .in-list li { font-size:13px; color:#334155; line-height:1.7; }
  .in-oneline { margin-top:12px; padding:12px 14px; background:#eff4ff; border-radius:10px; font-size:13.5px; font-weight:600; color:#1d4ed8; }
  .in-kv { display:flex; flex-direction:column; gap:6px; font-size:13px; color:#334155; margin-bottom:12px; }
  .in-crisis { border-radius:14px; padding:16px; margin-bottom:14px; }
  .in-crisis.on { background:#fef2f2; border:1px solid #fecaca; }
  .in-crisis.ok { background:#f0fdf4; border:1px solid #bbf7d0; }
  .in-crisis-h { font-weight:800; font-size:14px; }
  .in-crisis-b { font-size:13px; color:#475569; margin-top:6px; }
  .in-crisis-r { font-size:13px; color:#0f172a; margin-top:8px; }
`
