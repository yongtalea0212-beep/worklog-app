'use client'
// app/social/page.jsx — Social Insight AI executive dashboard (Phase 1).
// Clean white / soft gray / blue-accent SaaS shell, KPI cards + Recharts.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', live: true },
  { key: 'pages', label: 'Pages', icon: '📄' },
  { key: 'posts', label: 'Posts', icon: '📝' },
  { key: 'comments', label: 'Comments', icon: '💬' },
  { key: 'analytics', label: 'Analytics', icon: '📈' },
  { key: 'keywords', label: 'Keywords', icon: '🔑' },
  { key: 'competitors', label: 'Competitors', icon: '🥊' },
  { key: 'trends', label: 'Trends', icon: '🔥' },
  { key: 'reports', label: 'Reports', icon: '📑' },
  { key: 'alerts', label: 'Alerts', icon: '🔔' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
]

const NAV_ROUTES = {
  pages: '/social/import',
  posts: '/social/posts',
  comments: '/social/comments',
  keywords: '/social/keywords',
  competitors: '/social/competitors',
  trends: '/social/trends',
  reports: '/social/reports',
  settings: '/social/settings',
}

const BLUE = '#2563EB'
const SENT_COLORS = { Positive: '#16a34a', Neutral: '#94a3b8', Negative: '#dc2626' }

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="si-card si-kpi">
      <div className="si-kpi-label">{label}</div>
      <div className="si-kpi-value" style={accent ? { color: accent } : undefined}>{value}</div>
      {sub && <div className="si-kpi-sub">{sub}</div>}
    </div>
  )
}

export default function SocialDashboard() {
  const router = useRouter()
  const [state, setState] = useState('loading') // loading | error | ready
  const [data, setData] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      try {
        const res = await fetch('/api/social/bootstrap', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const json = await res.json()
        if (!mounted) return
        if (!res.ok) { setErrMsg(json.error || 'load failed'); setState('error'); return }
        setData(json); setState('ready')
      } catch (e) {
        if (mounted) { setErrMsg(String(e)); setState('error') }
      }
    })()
    return () => { mounted = false }
  }, [router])

  const k = data?.kpis
  const c = data?.charts
  const fmt = (n) => (n ?? 0).toLocaleString()

  return (
    <div className="si-root">
      <style>{CSS}</style>

      {/* Sidebar */}
      <aside className="si-sidebar">
        <div className="si-brand">
          <div className="si-brand-mark">SI</div>
          <div>
            <div className="si-brand-name">Social Insight AI</div>
            <div className="si-brand-sub">Public FB Analytics</div>
          </div>
        </div>
        <nav className="si-nav">
          {NAV.map((n) => {
            const href = NAV_ROUTES[n.key]
            const clickable = n.live || href
            return (
              <div key={n.key}
                className={`si-nav-item ${n.live ? 'active' : clickable ? 'link' : 'soon'}`}
                onClick={href ? () => router.push(href) : undefined}>
                <span className="si-nav-icon">{n.icon}</span>
                <span>{n.label}</span>
                {!clickable && <span className="si-soon">เร็วๆ นี้</span>}
              </div>
            )
          })}
        </nav>
        <button className="si-signout" onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }}>
          ออกจากระบบ
        </button>
      </aside>

      {/* Main */}
      <main className="si-main">
        <header className="si-header">
          <div>
            <h1 className="si-title">Executive Dashboard</h1>
            <p className="si-subtitle">ภาพรวมการวิเคราะห์เพจสาธารณะ · ข้อมูลตัวอย่าง (Demo)</p>
          </div>
          <div className="si-header-actions">
            <span className="si-banner">🔒 ใช้เฉพาะข้อมูลสาธารณะ · ไม่ต้องเป็นแอดมินเพจ</span>
            <button className="si-import-btn" onClick={() => router.push('/social/import')}>+ นำเข้าข้อมูล</button>
          </div>
        </header>

        {state === 'loading' && <div className="si-state">⏳ กำลังโหลดข้อมูล...</div>}
        {state === 'error' && <div className="si-state si-err">⚠️ {errMsg}</div>}

        {state === 'ready' && (
          <>
            {/* KPI grid */}
            <section className="si-kpi-grid">
              <KpiCard label="Tracked Pages" value={fmt(k.trackedPages)} sub="เพจที่ติดตาม" />
              <KpiCard label="Posts Collected" value={fmt(k.postsCollected)} sub="โพสต์ที่เก็บ" />
              <KpiCard label="Comments Collected" value={fmt(k.commentsCollected)} sub="คอมเมนต์ที่เก็บ" />
              <KpiCard label="Positive Sentiment" value={`${k.positivePct}%`} sub="ความรู้สึกบวก" accent="#16a34a" />
              <KpiCard label="Negative Sentiment" value={`${k.negativePct}%`} sub="ความรู้สึกลบ" accent="#dc2626" />
              <KpiCard label="Trending Keywords" value={fmt(k.trendingKeywords.length)} sub={k.trendingKeywords.slice(0, 3).join(' · ') || '—'} accent={BLUE} />
            </section>

            {/* Charts row */}
            <section className="si-grid-2">
              <div className="si-card">
                <div className="si-card-title">Engagement Over Time</div>
                <div className="si-card-hint">Likes + Comments + Shares (เพจของเรา, 14 วัน)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={c.engagementSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eng" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={BLUE} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip />
                    <Area type="monotone" dataKey="engagement" stroke={BLUE} strokeWidth={2} fill="url(#eng)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="si-card">
                <div className="si-card-title">Sentiment Split</div>
                <div className="si-card-hint">สัดส่วนความรู้สึกจากคอมเมนต์</div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={c.sentimentSplit} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                      {c.sentimentSplit.map((s) => <Cell key={s.name} fill={SENT_COLORS[s.name]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="si-legend">
                  {c.sentimentSplit.map((s) => (
                    <span key={s.name}><i style={{ background: SENT_COLORS[s.name] }} />{s.name} ({s.value})</span>
                  ))}
                </div>
              </div>
            </section>

            <section className="si-grid-2">
              <div className="si-card">
                <div className="si-card-title">Top Posts</div>
                <div className="si-card-hint">โพสต์ที่มี engagement สูงสุด</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={c.topPosts} layout="vertical" margin={{ top: 10, right: 16, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="score" fill={BLUE} radius={[0, 6, 6, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="si-card">
                <div className="si-card-title">Competitor Ranking</div>
                <div className="si-card-hint">คะแนนรวมจาก public engagement</div>
                <div className="si-rank">
                  {k.competitorRanking.length === 0 && <div className="si-card-hint">ยังไม่มีคู่แข่ง</div>}
                  {k.competitorRanking.map((c2, i) => (
                    <div key={c2.page} className="si-rank-row">
                      <span className="si-rank-no">{i + 1}</span>
                      <span className="si-rank-name">{c2.page}</span>
                      <div className="si-rank-bar"><div style={{ width: `${Math.min(100, c2.score)}%` }} /></div>
                      <span className="si-rank-score">{Math.round(c2.score)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Trending keywords chips */}
            <section className="si-card">
              <div className="si-card-title">Trending Keywords</div>
              <div className="si-chips">
                {k.trendingKeywords.length === 0 && <span className="si-card-hint">ยังไม่มี keyword</span>}
                {k.trendingKeywords.map((t) => <span key={t} className="si-chip">#{t}</span>)}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .si-root { display:flex; min-height:100vh; background:#f6f8fb; font-family:'Inter',sans-serif; color:#0f172a; }
  .si-sidebar { width:248px; background:#fff; border-right:1px solid #eef2f7; padding:22px 16px; display:flex; flex-direction:column; position:sticky; top:0; height:100vh; }
  .si-brand { display:flex; align-items:center; gap:11px; margin-bottom:26px; padding:0 6px; }
  .si-brand-mark { width:40px; height:40px; border-radius:11px; background:linear-gradient(135deg,#2563EB,#60a5fa); color:#fff; font-weight:800; font-size:15px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(37,99,235,.35); }
  .si-brand-name { font-weight:800; font-size:15px; letter-spacing:-.3px; }
  .si-brand-sub { font-size:11px; color:#94a3b8; }
  .si-nav { display:flex; flex-direction:column; gap:2px; flex:1; }
  .si-nav-item { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:10px; font-size:13.5px; font-weight:500; color:#475569; cursor:pointer; }
  .si-nav-item.active { background:#eff4ff; color:#2563EB; font-weight:700; }
  .si-nav-item.soon { color:#94a3b8; cursor:default; }
  .si-nav-item.soon:hover { background:#f8fafc; }
  .si-nav-item.link { color:#475569; cursor:pointer; }
  .si-nav-item.link:hover { background:#f1f5f9; }
  .si-header-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .si-import-btn { background:#2563EB; color:#fff; border:none; border-radius:10px; padding:9px 16px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; box-shadow:0 4px 14px rgba(37,99,235,.3); }
  .si-nav-icon { font-size:15px; width:18px; text-align:center; }
  .si-soon { margin-left:auto; font-size:9.5px; background:#f1f5f9; color:#94a3b8; padding:2px 6px; border-radius:6px; font-weight:600; }
  .si-signout { margin-top:12px; padding:10px; border:1px solid #eef2f7; background:#fff; border-radius:10px; font-size:13px; color:#64748b; cursor:pointer; font-family:inherit; font-weight:600; }
  .si-signout:hover { background:#f8fafc; }
  .si-main { flex:1; padding:28px 32px; max-width:1280px; }
  .si-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
  .si-title { font-size:24px; font-weight:800; letter-spacing:-.5px; margin:0; }
  .si-subtitle { font-size:13px; color:#94a3b8; margin:4px 0 0; }
  .si-banner { font-size:12px; font-weight:600; color:#1d4ed8; background:#eff4ff; border:1px solid #dbe6ff; padding:8px 13px; border-radius:10px; text-decoration:none; }
  .si-state { padding:60px; text-align:center; color:#94a3b8; font-size:14px; }
  .si-err { color:#dc2626; }
  .si-card { background:#fff; border:1px solid #eef2f7; border-radius:16px; padding:20px; box-shadow:0 1px 2px rgba(15,23,42,.04); }
  .si-kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; margin-bottom:18px; }
  .si-kpi { padding:18px; }
  .si-kpi-label { font-size:12px; font-weight:600; color:#94a3b8; }
  .si-kpi-value { font-size:30px; font-weight:800; letter-spacing:-1px; margin-top:6px; }
  .si-kpi-sub { font-size:11.5px; color:#94a3b8; margin-top:4px; }
  .si-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px; }
  .si-card-title { font-size:15px; font-weight:700; }
  .si-card-hint { font-size:11.5px; color:#94a3b8; margin:2px 0 12px; }
  .si-legend { display:flex; gap:16px; justify-content:center; font-size:12px; color:#64748b; margin-top:6px; }
  .si-legend i { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:6px; vertical-align:middle; }
  .si-rank { display:flex; flex-direction:column; gap:14px; margin-top:6px; }
  .si-rank-row { display:flex; align-items:center; gap:12px; }
  .si-rank-no { width:22px; height:22px; border-radius:7px; background:#eff4ff; color:#2563EB; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .si-rank-name { font-size:13px; font-weight:600; width:130px; }
  .si-rank-bar { flex:1; height:8px; background:#f1f5f9; border-radius:6px; overflow:hidden; }
  .si-rank-bar div { height:100%; background:linear-gradient(90deg,#2563EB,#60a5fa); border-radius:6px; }
  .si-rank-score { font-size:13px; font-weight:700; color:#2563EB; width:34px; text-align:right; }
  .si-chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
  .si-chip { font-size:12.5px; font-weight:600; color:#1d4ed8; background:#eff4ff; border:1px solid #dbe6ff; padding:6px 12px; border-radius:999px; }
  @media (max-width:900px) {
    .si-sidebar { display:none; }
    .si-grid-2 { grid-template-columns:1fr; }
    .si-main { padding:20px 16px; }
  }
`
