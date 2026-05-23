"use client"
import { useState, useEffect, useRef, useCallback } from 'react'

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const CATS = [
  { id:'graphic',   label:'Graphic Design', color:'#6C63FF' },
  { id:'video',     label:'Video Editing',  color:'#06B6D4' },
  { id:'photo',     label:'Photography',    color:'#F59E0B' },
  { id:'marketing', label:'Marketing',      color:'#EF4444' },
  { id:'ai',        label:'AI Content',     color:'#8B5CF6' },
  { id:'branding',  label:'Branding',       color:'#EC4899' },
  { id:'pos',       label:'POS Design',     color:'#10B981' },
  { id:'other',     label:'อื่นๆ',          color:'#64748B' },
]
const getCat = id => CATS.find(c => c.id === id) || CATS[7]

const fmtTime = s => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

const fmtDate = s => {
  try { return new Date(s).toLocaleDateString('th-TH',{day:'numeric',month:'short'}) }
  catch { return s }
}

async function callAI(prompt) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const data = await res.json()
    return data.text || ''
  } catch { return '' }
}

// ─────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────
const panelCard = {
  background: 'rgba(255,255,255,0.65)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.9)',
  borderRadius: 20,
  padding: 18,
  boxShadow: '0 4px 20px rgba(100,110,200,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
  transition: 'all 0.2s',
}
const miniCard = {
  background: 'rgba(255,255,255,0.5)',
  border: '1px solid rgba(255,255,255,0.85)',
  borderRadius: 14,
  padding: '12px 14px',
  boxShadow: '0 2px 8px rgba(100,110,200,0.06)',
}
const secLabel = {
  fontSize: 9, fontWeight: 700, color: '#9ca3af',
  letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
}
const secTitle = { fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 3 }

// ─────────────────────────────────────────
// 1. AI PRODUCTIVITY INSIGHTS
// ─────────────────────────────────────────
function AIProductivityInsights({ logs }) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const total = logs.length
  const hours = logs.reduce((s, l) => s + (l.hours || 0), 0)
  const byCategory = logs.reduce((acc, l) => {
    acc[l.category] = (acc[l.category] || 0) + 1
    return acc
  }, {})
  const topCatEntry = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
  const topCat = topCatEntry ? getCat(topCatEntry[0]) : null
  const completionRate = total > 0 ? Math.round((logs.filter(l => l.status === 'done').length / total) * 100) : 0
  const score = Math.min(100, Math.round((completionRate * 0.5) + (Math.min(hours, 40) / 40 * 30) + (Math.min(total, 20) / 20 * 20)))

  async function generate() {
    setLoading(true)
    const prompt = [
      'วิเคราะห์ผลงาน ตอบ 1 ประโยคสั้นๆ ภาษาไทย (ไม่เกิน 25 คำ) แนะนำงานถัดไปที่ควรทำ:',
      'งาน ' + total + ' ชิ้น ' + hours + ' ชม. หมวดหลัก: ' + (topCat?.label || '-'),
      'completion: ' + completionRate + '%',
    ].join('\n')
    const text = await callAI(prompt)
    setInsight(text)
    setGenerated(true)
    setLoading(false)
  }

  const scoreColor = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <div style={panelCard}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={secLabel}>AI PRODUCTIVITY INSIGHTS</div>
        <button onClick={generate} disabled={loading} style={{
          padding:'4px 11px', background:'linear-gradient(135deg,#6C63FF,#9B8FFF)',
          border:'none', borderRadius:20, fontSize:11, fontWeight:600, color:'white',
          cursor: loading ? 'default' : 'pointer', fontFamily:'inherit',
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? '⏳' : '✨ วิเคราะห์'}
        </button>
      </div>

      {/* Score + Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:16, alignItems:'center', marginBottom:14 }}>
        {/* Circular score */}
        <div style={{ position:'relative', width:72, height:72 }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="6"/>
            <circle cx="36" cy="36" r="30" fill="none" stroke={scoreColor} strokeWidth="6"
              strokeDasharray={`${Math.PI * 60 * score / 100} ${Math.PI * 60 * (1 - score / 100)}`}
              strokeLinecap="round" transform="rotate(-90 36 36)" style={{ transition:'stroke-dasharray .8s ease' }}/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontSize:16, fontWeight:700, color:scoreColor, lineHeight:1 }}>{score}</div>
            <div style={{ fontSize:8, color:'#9ca3af', marginTop:1 }}>score</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { label:'งานทั้งหมด', value:total,          unit:'งาน',  color:'#6C63FF' },
            { label:'ชั่วโมง',    value:hours,          unit:'ชม.',  color:'#06B6D4' },
            { label:'เสร็จแล้ว',  value:completionRate, unit:'%',    color:'#10B981' },
            { label:'หมวดเด่น',   value:topCat?.label||'—', unit:'', color:topCat?.color||'#9ca3af' },
          ].map((s, i) => (
            <div key={i} style={{ ...miniCard, padding:'8px 10px' }}>
              <div style={{ fontSize:9, color:'#9ca3af', marginBottom:2 }}>{s.label}</div>
              <div style={{ fontSize:13, fontWeight:700, color:s.color }}>{s.value}<span style={{ fontSize:9, color:'#9ca3af', marginLeft:2 }}>{s.unit}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Suggestion */}
      <div style={{
        background: generated ? 'linear-gradient(135deg,rgba(108,99,255,0.06),rgba(167,139,250,0.04))' : 'rgba(255,255,255,0.4)',
        border: '1px solid ' + (generated ? 'rgba(108,99,255,0.18)' : 'rgba(200,210,240,0.4)'),
        borderRadius: 12, padding: '10px 13px',
      }}>
        <div style={{ fontSize:9, fontWeight:700, color:'#6C63FF', letterSpacing:1, marginBottom:4 }}>NEXT ACTION</div>
        <div style={{ fontSize:12, color: generated ? '#1a1a2e' : '#9ca3af', lineHeight:1.6 }}>
          {loading ? '✨ AI กำลังวิเคราะห์...' : insight || 'กด "✨ วิเคราะห์" เพื่อให้ AI แนะนำงานถัดไปที่ควรทำ'}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// 2. FOCUS TIMER
// ─────────────────────────────────────────
function FocusTimer({ onSessionComplete }) {
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState('focus') // focus | break
  const [sessions, setSessions] = useState(0)
  const [customMin, setCustomMin] = useState(25)
  const intervalRef = useRef(null)

  const PRESETS = [
    { label:'25 นาที', min:25 },
    { label:'45 นาที', min:45 },
    { label:'60 นาที', min:60 },
  ]

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            if (mode === 'focus') {
              setSessions(n => n + 1)
              onSessionComplete?.()
              setMode('break')
              return 5 * 60
            } else {
              setMode('focus')
              return customMin * 60
            }
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, mode, customMin])

  function reset() { setRunning(false); setSeconds(customMin * 60) }
  function setPreset(min) { setCustomMin(min); setSeconds(min * 60); setRunning(false) }

  const total = mode === 'focus' ? customMin * 60 : 5 * 60
  const progress = ((total - seconds) / total) * 100
  const isFocus = mode === 'focus'
  const accentColor = isFocus ? '#6C63FF' : '#10B981'

  return (
    <div style={panelCard}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={secLabel}>FOCUS TIMER</div>
        <div style={{ display:'flex', gap:4 }}>
          {Array.from({ length: Math.min(sessions, 4) }).map((_, i) => (
            <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#6C63FF' }}/>
          ))}
          {Array.from({ length: Math.max(0, 4 - sessions) }).map((_, i) => (
            <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'rgba(108,99,255,0.15)' }}/>
          ))}
        </div>
      </div>

      {/* Mode badge */}
      <div style={{ textAlign:'center', marginBottom:10 }}>
        <span style={{
          background: isFocus ? 'rgba(108,99,255,0.1)' : 'rgba(16,185,129,0.1)',
          color: accentColor, fontSize:10, fontWeight:700,
          padding:'3px 12px', borderRadius:20, letterSpacing:0.5,
        }}>
          {isFocus ? '🎯 Deep Focus' : '☕ Break Time'}
        </span>
      </div>

      {/* Circular timer */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:14 }}>
        <div style={{ position:'relative', width:100, height:100 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="7"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke={accentColor} strokeWidth="7"
              strokeDasharray={`${Math.PI * 84 * progress / 100} ${Math.PI * 84}`}
              strokeLinecap="round" transform="rotate(-90 50 50)"
              style={{ transition:'stroke-dasharray .5s linear' }}/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontSize:20, fontWeight:700, color:accentColor, fontVariantNumeric:'tabular-nums' }}>{fmtTime(seconds)}</div>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div style={{ display:'flex', gap:5, justifyContent:'center', marginBottom:12 }}>
        {PRESETS.map(p => (
          <button key={p.min} onClick={() => setPreset(p.min)} style={{
            padding:'3px 10px', borderRadius:20,
            background: customMin === p.min ? accentColor + '15' : 'rgba(255,255,255,0.5)',
            border: '1px solid ' + (customMin === p.min ? accentColor + '40' : 'rgba(200,210,240,0.5)'),
            color: customMin === p.min ? accentColor : '#9ca3af',
            fontSize:10, fontWeight: customMin === p.min ? 700 : 400,
            cursor:'pointer', fontFamily:'inherit',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
        <button onClick={reset} style={{ padding:'7px 16px', background:'rgba(255,255,255,0.6)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:9, fontSize:12, color:'#9ca3af', cursor:'pointer', fontFamily:'inherit' }}>↺ รีเซ็ต</button>
        <button onClick={() => setRunning(r => !r)} style={{
          padding:'7px 22px',
          background: running ? 'rgba(239,68,68,0.1)' : 'linear-gradient(135deg,' + accentColor + ',#9B8FFF)',
          border: running ? '1px solid rgba(239,68,68,0.25)' : 'none',
          borderRadius:9, fontSize:12, fontWeight:600,
          color: running ? '#EF4444' : 'white',
          cursor:'pointer', fontFamily:'inherit',
          boxShadow: running ? 'none' : '0 4px 12px ' + accentColor + '40',
        }}>
          {running ? '⏸ หยุด' : '▶ เริ่ม'}
        </button>
      </div>

      {sessions > 0 && (
        <div style={{ textAlign:'center', marginTop:10, fontSize:11, color:'#6C63FF', fontWeight:600 }}>
          🔥 {sessions} session{sessions > 1 ? 's' : ''} วันนี้
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// 3. WEEKLY GOAL TRACKER
// ─────────────────────────────────────────
function WeeklyGoalTracker({ logs }) {
  const [goals, setGoals] = useState([
    { id:1, label:'งานทั้งหมด',    target:10, unit:'งาน', color:'#6C63FF' },
    { id:2, label:'ชั่วโมงรวม',    target:40, unit:'ชม.', color:'#06B6D4' },
    { id:3, label:'งานที่เสร็จ',   target:8,  unit:'งาน', color:'#10B981' },
    { id:4, label:'หมวดหมู่ที่ทำ', target:4,  unit:'ประเภท', color:'#F59E0B' },
  ])
  const [editing, setEditing] = useState(null)

  // Compute actuals from logs (last 7 days)
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
  const recent = logs.filter(l => new Date(l.date) >= cutoff)
  const actuals = {
    1: recent.length,
    2: Math.round(recent.reduce((s, l) => s + (l.hours || 0), 0) * 10) / 10,
    3: recent.filter(l => l.status === 'done').length,
    4: new Set(recent.map(l => l.category)).size,
  }

  return (
    <div style={panelCard}>
      <div style={secLabel}>WEEKLY GOALS · 7 วันล่าสุด</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {goals.map(g => {
          const actual = actuals[g.id] || 0
          const pct = Math.min(Math.round((actual / g.target) * 100), 100)
          const done = pct >= 100
          return (
            <div key={g.id}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#1a1a2e', display:'flex', alignItems:'center', gap:6 }}>
                  {done && <span>✅</span>}
                  {g.label}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:12, fontWeight:700, color: g.color }}>
                    {actual}<span style={{ fontSize:10, color:'#9ca3af', fontWeight:400 }}>/{g.target} {g.unit}</span>
                  </span>
                  <span style={{
                    fontSize:10, fontWeight:700,
                    color: done ? '#10B981' : pct >= 60 ? '#F59E0B' : '#9ca3af',
                    background: done ? 'rgba(16,185,129,0.1)' : pct >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.04)',
                    padding:'1px 6px', borderRadius:20,
                  }}>{pct}%</span>
                </div>
              </div>
              <div style={{ height:6, background:'rgba(0,0,0,0.06)', borderRadius:3, overflow:'hidden' }}>
                <div style={{
                  height:'100%', width: pct + '%',
                  background: done ? '#10B981' : g.color,
                  borderRadius:3, transition:'width .6s cubic-bezier(.4,0,.2,1)',
                }}/>
              </div>
            </div>
          )
        })}
      </div>

      {/* Overall */}
      <div style={{ marginTop:12, ...miniCard, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, color:'#9ca3af', marginBottom:2 }}>ความสำเร็จโดยรวม</div>
          <div style={{ fontSize:15, fontWeight:700, color:'#6C63FF' }}>
            {Math.round(Object.values(goals).reduce((s, g) => s + Math.min((actuals[g.id] || 0) / g.target * 100, 100), 0) / goals.length)}%
          </div>
        </div>
        <div style={{ fontSize:28 }}>
          {Object.values(actuals).filter((v, i) => v >= goals[i]?.target).length >= goals.length ? '🏆' :
           Object.values(actuals).filter((v, i) => v >= goals[i]?.target).length >= 2 ? '💪' : '🎯'}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// 4. SMART ACTIVITY FEED
// ─────────────────────────────────────────
function SmartActivityFeed({ logs }) {
  const recent = [...logs]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)

  const feedItems = recent.map(log => {
    const cat = getCat(log.category)
    return {
      icon: log.status === 'done' ? '✅' : '🔄',
      title: log.title,
      meta: fmtDate(log.date) + ' · ' + log.hours + ' ชม.',
      color: cat.color,
      label: cat.label,
      status: log.status,
    }
  })

  return (
    <div style={panelCard}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={secLabel}>SMART ACTIVITY FEED</div>
        <div style={{ fontSize:10, color:'#9ca3af' }}>{logs.length} งานทั้งหมด</div>
      </div>

      {feedItems.length === 0 ? (
        <div style={{ textAlign:'center', padding:'16px 0', color:'#9ca3af', fontSize:12 }}>
          ยังไม่มีงาน เริ่มบันทึกงานแรกได้เลย
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {feedItems.map((item, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'flex-start', gap:10,
              padding:'8px 0',
              borderBottom: i < feedItems.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
              position:'relative',
            }}>
              {/* Timeline dot */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:22, flexShrink:0, marginTop:3 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:item.color, flexShrink:0 }}/>
                {i < feedItems.length - 1 && <div style={{ width:1, height:20, background:'rgba(0,0,0,0.06)', marginTop:3 }}/>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#1a1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                  <span style={{ background:item.color+'15', color:item.color, fontSize:9, fontWeight:600, padding:'1px 6px', borderRadius:20 }}>{item.label}</span>
                  <span style={{ fontSize:10, color:'#9ca3af' }}>{item.meta}</span>
                </div>
              </div>
              <div style={{ fontSize:13, flexShrink:0, marginTop:2 }}>{item.icon}</div>
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginTop:12 }}>
        {[
          { label:'เสร็จแล้ว', value:logs.filter(l=>l.status==='done').length,        color:'#10B981' },
          { label:'กำลังทำ',  value:logs.filter(l=>l.status==='in_progress').length,   color:'#F59E0B' },
          { label:'ร่าง',     value:logs.filter(l=>l.status==='draft').length,          color:'#9ca3af' },
        ].map((s, i) => (
          <div key={i} style={{ ...miniCard, textAlign:'center', padding:'7px 6px' }}>
            <div style={{ fontSize:15, fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:9, color:'#9ca3af' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// 5. AI RECOMMENDATIONS
// ─────────────────────────────────────────
function AIRecommendations({ logs }) {
  const [recs, setRecs] = useState(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    const stats = {
      total: logs.length,
      hours: logs.reduce((s, l) => s + (l.hours || 0), 0),
      cats: [...new Set(logs.map(l => l.category))].map(id => getCat(id).label),
      recent: logs.slice(0, 3).map(l => l.title).join(', '),
    }
    const prompt = [
      'ให้คำแนะนำ 3 ข้อสำหรับนักสร้างสรรค์ ภาษาไทย กระชับ (ไม่เกิน 15 คำต่อข้อ):',
      'งาน: ' + stats.total + ' ชิ้น ' + stats.hours + ' ชม.',
      'หมวดที่ทำ: ' + stats.cats.join(', '),
      'งานล่าสุด: ' + stats.recent,
      '',
      'ตอบ JSON array: ["คำแนะนำ 1","คำแนะนำ 2","คำแนะนำ 3"]',
    ].join('\n')
    try {
      const text = await callAI(prompt)
      const clean = text.replace(/```json|```/g, '').trim()
      setRecs(JSON.parse(clean))
    } catch {
      setRecs(['เพิ่มงานใหม่ให้ครบทุกวัน', 'ลองหมวดงานใหม่ที่ยังไม่เคยทำ', 'สร้างรายงานสรุปเดือนนี้'])
    }
    setLoading(false)
  }

  const icons = ['💡', '🎯', '⚡']
  const colors = ['#6C63FF', '#10B981', '#F59E0B']

  return (
    <div style={panelCard}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={secLabel}>AI RECOMMENDATIONS</div>
        <button onClick={generate} disabled={loading} style={{
          padding:'4px 11px', background:'linear-gradient(135deg,#6C63FF,#9B8FFF)',
          border:'none', borderRadius:20, fontSize:11, fontWeight:600, color:'white',
          cursor: loading ? 'default' : 'pointer', fontFamily:'inherit',
          opacity: loading ? 0.7 : 1,
        }}>{loading ? '⏳' : '✨ สร้าง'}</button>
      </div>

      {!recs && !loading && (
        <div style={{ textAlign:'center', padding:'12px 0' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🤖</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginBottom:12, lineHeight:1.6 }}>
            AI จะวิเคราะห์ pattern การทำงาน<br/>และแนะนำ action items ที่มีประโยชน์
          </div>
          <button onClick={generate} style={{
            padding:'7px 18px', background:'linear-gradient(135deg,#6C63FF,#9B8FFF)',
            border:'none', borderRadius:9, fontSize:12, fontWeight:600, color:'white',
            cursor:'pointer', fontFamily:'inherit',
          }}>🤖 ขอคำแนะนำจาก AI</button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign:'center', padding:'16px 0' }}>
          <div style={{ fontSize:20, marginBottom:6 }}>⏳</div>
          <div style={{ fontSize:12, color:'#6C63FF' }}>AI กำลังวิเคราะห์...</div>
        </div>
      )}

      {recs && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {recs.map((rec, i) => (
            <div key={i} style={{
              ...miniCard,
              display:'flex', alignItems:'flex-start', gap:10,
              borderLeft: '3px solid ' + colors[i],
              padding:'10px 12px',
            }}>
              <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{icons[i]}</span>
              <div style={{ fontSize:12, color:'#1a1a2e', lineHeight:1.6, fontWeight:500 }}>{rec}</div>
            </div>
          ))}
          <button onClick={() => setRecs(null)} style={{
            padding:'5px', background:'none', border:'none',
            fontSize:11, color:'#9ca3af', cursor:'pointer', fontFamily:'inherit', textAlign:'center',
          }}>สร้างใหม่ →</button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// MAIN — SMART PRODUCTIVITY PANEL
// ─────────────────────────────────────────
export default function SmartProductivityPanel({ logs, onReport }) {
  const [focusSessions, setFocusSessions] = useState(0)
  const [activeTab, setActiveTab] = useState('insights')

  const tabs = [
    { id:'insights',   label:'🎯 Insights'    },
    { id:'focus',      label:'⏱ Focus'        },
    { id:'goals',      label:'📊 Goals'       },
    { id:'feed',       label:'📋 Feed'        },
    { id:'ai',         label:'🤖 AI Recs'     },
  ]

  return (
    <div>
      {/* Tab header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom:14, flexWrap:'wrap', gap:8,
      }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e' }}>Smart Productivity</div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding:'5px 11px', borderRadius:20,
              border: '1px solid ' + (activeTab === t.id ? 'rgba(108,99,255,0.3)' : 'rgba(200,210,240,0.5)'),
              background: activeTab === t.id ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.5)',
              color: activeTab === t.id ? '#6C63FF' : '#9ca3af',
              fontSize:11, fontWeight: activeTab === t.id ? 700 : 400,
              cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'insights' && <AIProductivityInsights logs={logs} />}
      {activeTab === 'focus'    && <FocusTimer onSessionComplete={() => setFocusSessions(s => s + 1)} />}
      {activeTab === 'goals'    && <WeeklyGoalTracker logs={logs} />}
      {activeTab === 'feed'     && <SmartActivityFeed logs={logs} />}
      {activeTab === 'ai'       && <AIRecommendations logs={logs} />}

      {/* Quick action footer */}
      <div style={{
        display:'flex', gap:8, marginTop:12, flexWrap:'wrap',
      }}>
        <button onClick={onReport} style={{
          flex:1, padding:'9px', textAlign:'center',
          background:'linear-gradient(135deg,rgba(108,99,255,0.1),rgba(167,139,250,0.06))',
          border:'1px solid rgba(108,99,255,0.18)', borderRadius:12,
          fontSize:12, fontWeight:600, color:'#6C63FF', cursor:'pointer', fontFamily:'inherit',
        }}>✨ สร้างรายงาน AI</button>
        <div style={{
          flex:1, padding:'9px', textAlign:'center',
          background:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.85)',
          borderRadius:12, fontSize:12, color:'#9ca3af',
        }}>
          🔥 {focusSessions} focus sessions
        </div>
      </div>
    </div>
  )
}
