"use client"
import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const DEFAULT_CATS_WW = [
  { id:'graphic',   label:'Graphic Design', icon:'🎨', color:'#6C63FF', bg:'rgba(108,99,255,0.1)' },
  { id:'video',     label:'Video Editing',  icon:'🎬', color:'#06B6D4', bg:'rgba(6,182,212,0.1)' },
  { id:'photo',     label:'Photography',    icon:'📸', color:'#F59E0B', bg:'rgba(245,158,11,0.1)' },
  { id:'marketing', label:'Marketing',      icon:'📢', color:'#EF4444', bg:'rgba(239,68,68,0.1)' },
  { id:'ai',        label:'AI Content',     icon:'🤖', color:'#8B5CF6', bg:'rgba(139,92,246,0.1)' },
  { id:'branding',  label:'Branding',       icon:'✨', color:'#EC4899', bg:'rgba(236,72,153,0.1)' },
  { id:'pos',       label:'POS Design',     icon:'🏪', color:'#10B981', bg:'rgba(16,185,129,0.1)' },
  { id:'other',     label:'อื่นๆ',          icon:'📌', color:'#64748B', bg:'rgba(100,116,139,0.1)' },
]
const CATS = (() => {
  try {
    const s = typeof window !== 'undefined' ? localStorage.getItem('stayscape_categories') : null
    if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) return p }
  } catch {}
  return DEFAULT_CATS_WW
})()
const getCat = id => CATS.find(c => c.id === id) || CATS[7]
const HOURS_OPT = [0.5,1,1.5,2,3,4,5,6,8]
const today = () => new Date().toISOString().split('T')[0]
const fmtTimer = s => {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

async function callAI(prompt) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const data = await res.json()
    return data.text || ''
  } catch { return '' }
}

async function sendLineNotify(log, trigger) {
  try {
    const userId = localStorage.getItem('line_user_id') || ''
    if (!userId) return
    await fetch('/api/line/webhook', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log, userId, trigger }),
    })
  } catch {}
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const CSS = `
.ww { font-family: 'Inter', sans-serif; }
.ww-glass {
  background: rgba(255,255,255,0.68);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.92);
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(100,110,200,0.09), inset 0 1px 0 rgba(255,255,255,0.85);
}
.ww-input {
  width: 100%; background: rgba(255,255,255,0.55);
  border: 1px solid rgba(200,210,240,0.5); border-radius: 12px;
  padding: 10px 14px; font-size: 13px; color: #1a1a2e;
  font-family: inherit; outline: none; transition: all .15s; box-sizing: border-box;
}
.ww-input:focus {
  border-color: rgba(108,99,255,0.45);
  background: rgba(255,255,255,0.85);
  box-shadow: 0 0 0 3px rgba(108,99,255,0.1);
}
.ww-textarea { min-height: 120px; resize: vertical; line-height: 1.7; }
.ww-btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 20px; background: linear-gradient(135deg,#6C63FF,#9B8FFF);
  border: none; border-radius: 11px; font-size: 13px; font-weight: 600; color: white;
  cursor: pointer; font-family: inherit;
  box-shadow: 0 4px 14px rgba(108,99,255,0.3); transition: all .15s;
}
.ww-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(108,99,255,0.4); }
.ww-btn-primary:disabled { opacity: 0.5; cursor: default; transform: none; }
.ww-btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; background: rgba(255,255,255,0.6);
  border: 1px solid rgba(200,210,240,0.5); border-radius: 11px;
  font-size: 12px; font-weight: 500; color: #6b7099;
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.ww-btn-ghost:hover { background: rgba(255,255,255,0.85); color: #1a1a2e; }
.ww-label {
  display: block; font-size: 10px; font-weight: 700;
  color: #9ca3af; letter-spacing: 1px; margin-bottom: 7px; text-transform: uppercase;
}
.ww-tag {
  display: inline-flex; align-items: center; gap: 3px;
  background: rgba(108,99,255,0.1); border: 1px solid rgba(108,99,255,0.2);
  color: #6C63FF; font-size: 11px; font-weight: 500;
  padding: 3px 9px; border-radius: 20px;
}
.ww-mini {
  background: rgba(255,255,255,0.5);
  border: 1px solid rgba(255,255,255,0.85);
  border-radius: 12px; padding: 11px 13px;
}
.ww-ai-box {
  background: linear-gradient(135deg,rgba(108,99,255,0.07),rgba(167,139,250,0.04));
  border: 1px solid rgba(108,99,255,0.2); border-radius: 14px;
  padding: 14px 16px; margin-top: 12px;
}
.ww-ai-lbl {
  font-size: 9px; font-weight: 700; color: #6C63FF;
  letter-spacing: 1.2px; margin-bottom: 7px; text-transform: uppercase;
}
.ww-drop {
  border: 2px dashed rgba(108,99,255,0.3); border-radius: 14px; padding: 20px;
  text-align: center; background: rgba(108,99,255,0.03); cursor: pointer; transition: all .2s;
}
.ww-drop:hover, .ww-drop.drag {
  border-color: rgba(108,99,255,0.6); background: rgba(108,99,255,0.07);
}
.ww-prog {
  height: 4px; background: rgba(108,99,255,0.12);
  border-radius: 2px; overflow: hidden; margin-top: 6px;
}
.ww-prog-fill {
  height: 100%; background: linear-gradient(90deg,#6C63FF,#9B8FFF);
  border-radius: 2px; transition: width .3s ease;
}
@keyframes ww-slide { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes ww-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes ww-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
.ww-spin { animation: ww-spin 1.2s linear infinite; display: inline-block; }
.ww-pulse { animation: ww-pulse 1.5s ease-in-out infinite; }

/* ── Mobile ── */
@media (max-width: 768px) {
  .ww-2col { grid-template-columns: 1fr !important; }
  .ww-title-row { grid-template-columns: 1fr !important; }
  .ww-header { flex-direction: column; align-items: flex-start !important; }
  .ww-header-btns { width: 100%; display: flex; gap: 8px; }
  .ww-header-btns button { flex: 1; justify-content: center; }
  .ww-ai-panel-sticky { position: static !important; }
  .ww-status-row { grid-template-columns: 1fr !important; }
}
`

// ─────────────────────────────────────────
// LIVE TIMER
// ─────────────────────────────────────────
// Status config
const STATUS_CONFIG = {
  done:        { label:'✅ เสร็จแล้ว',  color:'#10B981', bg:'rgba(16,185,129,0.12)',  border:'rgba(16,185,129,0.35)',  dot:'#10B981' },
  in_progress: { label:'🔄 กำลังทำ',   color:'#F59E0B', bg:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.35)',  dot:'#F59E0B' },
  draft:       { label:'📝 ร่าง',       color:'#6C63FF', bg:'rgba(108,99,255,0.10)',  border:'rgba(108,99,255,0.28)',  dot:'#6C63FF' },
}

// Keywords that trigger status change
const STATUS_KEYWORDS = {
  done:        ['เสร็จแล้ว','เสร็จ','done','complete','ส่งแล้ว','ปิดงาน','เรียบร้อย','ครบ'],
  in_progress: ['กำลังทำ','กำลัง','doing','inprogress','ยังทำ','ติดอยู่','กำลังแก้'],
  draft:       ['ร่าง','draft','แพลน','plan','ยังไม่ได้ทำ','ค้างไว้','รอ','hold'],
}

function detectStatusFromText(text) {
  const t = text.toLowerCase()
  for (const [status, words] of Object.entries(STATUS_KEYWORDS)) {
    if (words.some(w => t.includes(w))) return status
  }
  return null
}

// Smart Status Selector with indicator
function StatusSelector({ value, onChange, timerRunning }) {
  const statuses = ['done','in_progress','draft']
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {/* Current status badge */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        background: STATUS_CONFIG[value].bg,
        border: '1.5px solid ' + STATUS_CONFIG[value].border,
        borderRadius:12, padding:'10px 14px', marginBottom:4,
      }}>
        <div style={{
          width:8, height:8, borderRadius:'50%',
          background: STATUS_CONFIG[value].dot,
          boxShadow: '0 0 0 3px ' + STATUS_CONFIG[value].dot + '30',
          animation: value==='in_progress' ? 'ww-pulse 1.5s infinite' : 'none',
          flexShrink:0,
        }}/>
        <span style={{ fontSize:13, fontWeight:700, color: STATUS_CONFIG[value].color }}>
          {STATUS_CONFIG[value].label}
        </span>
        {timerRunning && (
          <span style={{ marginLeft:'auto', fontSize:10, color:'#F59E0B', fontWeight:600, background:'rgba(245,158,11,0.1)', padding:'2px 8px', borderRadius:20 }}>
            ⏱ กำลังจับเวลา
          </span>
        )}
      </div>
      {/* Selector buttons */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
        {statuses.map(s => {
          const cfg = STATUS_CONFIG[s]
          const active = value === s
          return (
            <button key={s} onClick={() => onChange(s)} style={{
              padding:'9px 6px', border:'1.5px solid',
              borderRadius:10, fontSize:12, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit', textAlign:'center',
              transition:'all .15s',
              borderColor: active ? cfg.border : 'rgba(200,210,240,0.4)',
              background:  active ? cfg.bg    : 'rgba(255,255,255,0.4)',
              color:       active ? cfg.color : '#9ca3af',
              transform:   active ? 'scale(1.03)' : 'scale(1)',
            }}>
              {s==='done' ? '✅ เสร็จ' : s==='in_progress' ? '🔄 กำลังทำ' : '📝 ร่าง'}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LiveTimer({ onHoursChange, onStart, onStop }) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed * 1000
      intervalRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startRef.current) / 1000)
        setElapsed(s)
        onHoursChange(Math.round((s / 3600) * 10) / 10)
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  function toggle() {
    const next = !running
    setRunning(next)
    if (next) onStart?.()
    else onStop?.()
  }

  function reset() { setRunning(false); setElapsed(0); onHoursChange(0) }

  const progress = Math.min((elapsed / (8 * 3600)) * 100, 100)
  const color = running ? '#10B981' : elapsed > 0 ? '#6C63FF' : '#9ca3af'

  return (
    <div className="ww-mini" style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ position:'relative', width:52, height:52, flexShrink:0 }}>
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4"/>
          <circle cx="26" cy="26" r="22" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${Math.PI*44*progress/100} ${Math.PI*44}`}
            strokeLinecap="round" transform="rotate(-90 26 26)"
            style={{ transition:'stroke-dasharray .5s' }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {running
            ? <div className="ww-pulse" style={{ width:8, height:8, borderRadius:'50%', background:'#10B981' }}/>
            : <span style={{ fontSize:14 }}>⏱</span>
          }
        </div>
      </div>

      <div style={{ flex:1 }}>
        <div style={{ fontSize:22, fontWeight:700, color, fontVariantNumeric:'tabular-nums', lineHeight:1 }}>
          {fmtTimer(elapsed)}
        </div>
        <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>
          {running ? '🟢 กำลังนับเวลา...' : elapsed > 0 ? '⏸ หยุดชั่วคราว' : 'กดเพื่อเริ่มนับ'}
        </div>
        <div className="ww-prog"><div className="ww-prog-fill" style={{ width:progress+'%', background:color }}/></div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        <button onClick={toggle} style={{
          width:44, height:44, border:'none', borderRadius:12,
          fontSize:18, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
          background: running ? 'rgba(239,68,68,0.12)' : 'linear-gradient(135deg,#6C63FF,#9B8FFF)',
          color: running ? '#EF4444' : 'white',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: running ? 'none' : '0 4px 12px rgba(108,99,255,0.35)',
          transition:'all .15s',
        }}>{running ? '⏸' : '▶'}</button>
        {elapsed > 0 && (
          <button onClick={reset} style={{
            width:44, height:28, borderRadius:8, fontSize:11, cursor:'pointer', fontFamily:'inherit',
            border:'1px solid rgba(200,210,240,0.5)', background:'rgba(255,255,255,0.5)', color:'#9ca3af',
          }}>↺</button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// VOICE INPUT
// ─────────────────────────────────────────
function VoiceInput({ onText }) {
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition))
  const recRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.lang = 'th-TH'; r.continuous = false; r.interimResults = true
    r.onresult = e => onText(Array.from(e.results).map(r => r[0].transcript).join(''))
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recRef.current = r
  }, [])

  if (!supported) return null

  function toggle() {
    if (!recRef.current) return
    if (listening) { recRef.current.stop(); setListening(false) }
    else { recRef.current.start(); setListening(true) }
  }

  return (
    <button onClick={toggle} title="Voice Input" style={{
      width:36, height:36, borderRadius:10, border:'none', flexShrink:0,
      background: listening ? 'linear-gradient(135deg,#EF4444,#F87171)' : 'rgba(108,99,255,0.1)',
      color: listening ? 'white' : '#6C63FF', fontSize:15,
      cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
      boxShadow: listening ? '0 0 0 6px rgba(239,68,68,0.15)' : 'none', transition:'all .2s',
    }}>
      <span className={listening ? 'ww-pulse' : ''}>🎤</span>
    </button>
  )
}

// ─────────────────────────────────────────
// AI SIDEBAR PANEL
// ─────────────────────────────────────────
function AIPanel({ form, onApplySummary, onApplyCategory, onApplyTags }) {
  const [summary, setSummary] = useState('')
  const [tags, setTags] = useState([])
  const [suggestedCat, setSuggestedCat] = useState(null)
  const [loadS, setLoadS] = useState(false)
  const [loadT, setLoadT] = useState(false)
  const [loadC, setLoadC] = useState(false)
  const [tip, setTip] = useState('')

  useEffect(() => {
    callAI('ให้ productivity tip สั้นๆ 1 ประโยค ภาษาไทย สำหรับนักสร้างสรรค์').then(t => setTip(t.trim()))
  }, [])

  async function genSummary() {
    if (!form.description?.trim()) return
    setLoadS(true)
    const text = await callAI(
      'สรุปงานนี้เป็นภาษาไทยระดับมืออาชีพ 1-2 ประโยค เน้นผลลัพธ์: "' + form.description + '" หมวด: ' + getCat(form.category).label
    )
    setSummary(text.trim())
    setLoadS(false)
  }

  async function genTags() {
    if (!form.title?.trim() && !form.description?.trim()) return
    setLoadT(true)
    const text = await callAI(
      'สร้าง tags ภาษาอังกฤษสั้นๆ 3-5 คำสำหรับงานนี้:\nชื่อ: ' + form.title +
      '\nรายละเอียด: ' + (form.description || '') +
      '\nตอบ JSON array เท่านั้น เช่น ["design","poster","branding"]'
    )
    try { setTags(JSON.parse(text.replace(/```json|```/g, '').trim())) }
    catch { setTags([]) }
    setLoadT(false)
  }

  async function autoCategory() {
    if (!form.title?.trim()) return
    setLoadC(true)
    const text = await callAI(
      'จากชื่องาน "' + form.title + '" เลือกหมวดจาก: graphic,video,photo,marketing,ai,branding,pos,other\nตอบแค่ id เดียว ไม่มีอะไรเพิ่ม'
    )
    const cat = CATS.find(c => c.id === text.trim().toLowerCase())
    if (cat) setSuggestedCat(cat)
    setLoadC(false)
  }

  // Completeness score
  const checks = [
    !!form.title?.trim(),
    !!form.description?.trim(),
    !!form.aiSummary?.trim(),
    form.category !== 'other',
    (form.imageUrls?.length || 0) > 0,
    (form.tags?.length || 0) > 0,
  ]
  const score = Math.round(checks.filter(Boolean).length / checks.length * 100)
  const scoreColor = score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#9ca3af'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Daily Tip */}
      {tip && (
        <div style={{ background:'linear-gradient(135deg,rgba(108,99,255,0.08),rgba(167,139,250,0.05))', border:'1px solid rgba(108,99,255,0.15)', borderRadius:14, padding:'11px 14px' }}>
          <div style={{ fontSize:9, fontWeight:700, color:'#6C63FF', letterSpacing:1, marginBottom:5 }}>💡 TIP OF THE DAY</div>
          <div style={{ fontSize:12, color:'#1a1a2e', lineHeight:1.6 }}>{tip}</div>
        </div>
      )}

      {/* AI Summary */}
      <div className="ww-mini">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#1a1a2e' }}>✨ AI สรุปงาน</div>
          <button onClick={genSummary} disabled={loadS || !form.description?.trim()} className="ww-btn-primary" style={{ padding:'5px 11px', fontSize:11 }}>
            {loadS ? <span className="ww-spin">⏳</span> : 'สรุป'}
          </button>
        </div>
        {summary ? (
          <div>
            <div style={{ fontSize:12, color:'#6b7099', lineHeight:1.65, marginBottom:8 }}>{summary}</div>
            <button onClick={() => { onApplySummary(summary); setSummary('') }} style={{ padding:'4px 11px', background:'rgba(108,99,255,0.1)', border:'1px solid rgba(108,99,255,0.2)', borderRadius:8, fontSize:11, color:'#6C63FF', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
              ใช้งาน →
            </button>
          </div>
        ) : (
          <div style={{ fontSize:11, color:'#9ca3af' }}>พิมพ์รายละเอียดแล้วกด "สรุป"</div>
        )}
      </div>

      {/* Auto Category */}
      <div className="ww-mini">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#1a1a2e' }}>🏷️ AI จัดหมวด</div>
          <button onClick={autoCategory} disabled={loadC || !form.title?.trim()} className="ww-btn-primary" style={{ padding:'5px 11px', fontSize:11 }}>
            {loadC ? <span className="ww-spin">⏳</span> : 'วิเคราะห์'}
          </button>
        </div>
        {suggestedCat ? (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ background:suggestedCat.bg, color:suggestedCat.color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
              {suggestedCat.icon} {suggestedCat.label}
            </span>
            <button onClick={() => { onApplyCategory(suggestedCat.id); setSuggestedCat(null) }} style={{ padding:'3px 10px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:8, fontSize:11, color:'#10B981', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
              ใช้งาน
            </button>
          </div>
        ) : (
          <div style={{ fontSize:11, color:'#9ca3af' }}>AI แนะนำหมวดหมู่จากชื่องาน</div>
        )}
      </div>

      {/* AI Tags */}
      <div className="ww-mini">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#1a1a2e' }}>🔖 AI แนะนำ Tags</div>
          <button onClick={genTags} disabled={loadT || (!form.title?.trim() && !form.description?.trim())} className="ww-btn-primary" style={{ padding:'5px 11px', fontSize:11 }}>
            {loadT ? <span className="ww-spin">⏳</span> : 'สร้าง'}
          </button>
        </div>
        {tags.length > 0 ? (
          <div>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
              {tags.map((t,i) => <span key={i} className="ww-tag">#{t}</span>)}
            </div>
            <button onClick={() => { onApplyTags(tags); setTags([]) }} style={{ padding:'4px 11px', background:'rgba(108,99,255,0.1)', border:'1px solid rgba(108,99,255,0.2)', borderRadius:8, fontSize:11, color:'#6C63FF', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
              ใช้งานทั้งหมด →
            </button>
          </div>
        ) : (
          <div style={{ fontSize:11, color:'#9ca3af' }}>AI สร้าง tags อัตโนมัติ</div>
        )}
      </div>

      {/* Completeness Score */}
      <div className="ww-mini">
        <div style={{ fontSize:11, fontWeight:600, color:'#1a1a2e', marginBottom:10 }}>📊 ความสมบูรณ์ของงาน</div>
        {[
          { label:'มีชื่องาน',     done: !!form.title?.trim()          },
          { label:'มีรายละเอียด', done: !!form.description?.trim()    },
          { label:'มี AI Summary', done: !!form.aiSummary?.trim()      },
          { label:'มีหมวดหมู่',   done: form.category !== 'other'     },
          { label:'มีรูปภาพ',     done: (form.imageUrls?.length||0)>0 },
          { label:'มีแท็ก',       done: (form.tags?.length||0)>0      },
        ].map((s,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
            <div style={{
              width:14, height:14, borderRadius:4, flexShrink:0,
              background: s.done ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.05)',
              border: '1px solid ' + (s.done ? 'rgba(16,185,129,0.3)' : 'rgba(0,0,0,0.08)'),
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {s.done && <span style={{ fontSize:8, color:'#10B981' }}>✓</span>}
            </div>
            <span style={{ fontSize:11, color:s.done?'#1a1a2e':'#9ca3af', fontWeight:s.done?500:400 }}>{s.label}</span>
          </div>
        ))}
        <div style={{ marginTop:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:10, color:'#9ca3af' }}>คะแนน</span>
            <span style={{ fontSize:11, fontWeight:700, color:scoreColor }}>{score}%</span>
          </div>
          <div className="ww-prog">
            <div className="ww-prog-fill" style={{ width:score+'%', background:scoreColor }}/>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// MAIN — รับ onUpload จาก parent แทนการ import supabase
// ─────────────────────────────────────────
export default function SmartWorklogWorkspace({ initial, onSave, onCancel, onUploadFiles }) {
  const [form, setForm] = useState(initial || {
    title: '', description: '', aiSummary: '',
    category: 'graphic', hours: 2, status: 'done',
    tags: [], date: today(), imageUrls: [], imageCount: 0,
  })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [autoSaved, setAutoSaved] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [statusHint, setStatusHint] = useState(null)
  const [lineUserId, setLineUserId] = useState('')
  const [lineDisplayName, setLineDisplayName] = useState('')
  const [linePictureUrl, setLinePictureUrl] = useState('')
  const [showLineSetup, setShowLineSetup] = useState(false)
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-save draft
  useEffect(() => {
    const t = setTimeout(() => {
      if (form.title || form.description) {
        try { localStorage.setItem('worklog_draft', JSON.stringify(form)) } catch {}
        setAutoSaved(true)
        setTimeout(() => setAutoSaved(false), 2000)
      }
    }, 2000)
    return () => clearTimeout(t)
  }, [form])

  // Load draft on mount
  useEffect(() => {
    if (!initial) {
      try {
        const d = JSON.parse(localStorage.getItem('worklog_draft') || 'null')
        if (d?.title) setForm(f => ({ ...f, ...d }))
      } catch {}
    }
    const saved = localStorage.getItem('line_user_id') || ''
    const savedName = localStorage.getItem('line_display_name') || ''
    const savedPic  = localStorage.getItem('line_picture_url') || ''
    setLineUserId(saved)
    setLineDisplayName(savedName)
    setLinePictureUrl(savedPic)
  }, [])

  // Handle file upload — ถ้า parent ส่ง onUploadFiles มา ใช้ supabase upload
  // ถ้าไม่มี ใช้ local object URL แทน
  async function handleFiles(files) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
    if (!arr.length) return

    if (onUploadFiles) {
      setUploading(true)
      setUploadProgress(0)
      const urls = await onUploadFiles(arr, form.category, (p) => setUploadProgress(p))
      setForm(f => ({ ...f, imageUrls: [...(f.imageUrls || []), ...urls], imageCount: (f.imageUrls?.length || 0) + urls.length }))
      setUploading(false)
      setUploadProgress(0)
    } else {
      // Fallback: local preview
      const urls = arr.map(f => URL.createObjectURL(f))
      setForm(f => ({ ...f, imageUrls: [...(f.imageUrls || []), ...urls], imageCount: (f.imageUrls?.length || 0) + urls.length }))
    }
  }

  function addTag() {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t])
    setTagInput('')
  }

  async function handleSave() {
    if (!(form.title || '').trim()) return
    setSaving(true)
    try { localStorage.removeItem('worklog_draft') } catch {}
    await onSave(form)
    sendLineNotify(form, 'save')
    setSaving(false)
  }

  const cat = getCat(form.category)
  const wordCount = (form.description || '').split(/\s+/).filter(Boolean).length

  return (
    <>
      <style>{CSS}</style>
      <div className="ww" style={{ animation:'ww-slide .3s ease' }}>

        {/* ── Page Header ── */}
        <div className="ww-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:'#1a1a2e', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              {initial ? 'แก้ไขงาน' : 'บันทึกงานใหม่'}
              <span style={{ background:cat.bg, color:cat.color, fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:20 }}>
                {cat.icon} {cat.label}
              </span>
            </div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:2, display:'flex', alignItems:'center', gap:8 }}>
              กรอกสั้นๆ แล้วให้ AI ช่วยสรุป
              {autoSaved && <span style={{ color:'#10B981', fontSize:11, fontWeight:500 }}>✓ Auto-saved</span>}
            </div>
          </div>
          <div className="ww-header-btns" style={{ display:'flex', gap:8 }}>
            <button onClick={onCancel} className="ww-btn-ghost">ยกเลิก</button>
            <button onClick={handleSave} disabled={!(form.title || '').trim() || saving} className="ww-btn-primary">
              {saving ? '⏳ กำลังบันทึก...' : '✓ บันทึกงาน'}
            </button>
          </div>
        </div>

        {/* ── 2-Column Layout ── */}
        <div className="ww-2col" style={{ display:'grid', gridTemplateColumns:'1fr 290px', gap:16, alignItems:'start' }}>

          {/* ── LEFT: Editor ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Title + Date */}
            <div className="ww-glass" style={{ padding:20 }}>
              <div className="ww-title-row" style={{ display:'grid', gridTemplateColumns:'1fr 150px', gap:12, marginBottom:14 }}>
                <div>
                  <label className="ww-label">ชื่องาน *</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <input className="ww-input" style={{ fontSize:15, fontWeight:500, padding:'11px 14px' }}
                      placeholder="เช่น ออกแบบโปสเตอร์ Hear Go..."
                      value={form.title}
                      onChange={e => set('title', e.target.value)}/>
                    <VoiceInput onText={t => set('title', t)}/>
                  </div>
                </div>
                <div>
                  <label className="ww-label">วันที่</label>
                  <input className="ww-input" type="date" value={form.date} onChange={e => set('date', e.target.value)}/>
                </div>
              </div>

              {/* Description */}
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <label className="ww-label" style={{ margin:0 }}>รายละเอียด</label>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:10, color:'#9ca3af' }}>{wordCount} คำ</span>
                    <VoiceInput onText={t => set('description', form.description ? form.description + ' ' + t : t)}/>
                  </div>
                </div>
                <textarea className="ww-input ww-textarea" style={{ minHeight:130 }}
                  placeholder="พิมพ์รายละเอียดสั้นๆ ก็ได้ เช่น ทำโมชั่นโฆษณา แก้สีวิดีโอ เพิ่มข้อความ..."
                  value={form.description}
                  onChange={e => {
                    set('description', e.target.value)
                    const detected = detectStatusFromText(e.target.value)
                    if (detected && detected !== form.status) setStatusHint(detected)
                    else setStatusHint(null)
                  }}/>
                {statusHint && (
                  <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8, background: STATUS_CONFIG[statusHint].bg, border:'1px solid '+STATUS_CONFIG[statusHint].border, borderRadius:10, padding:'7px 12px' }}>
                    <span style={{ fontSize:11, color: STATUS_CONFIG[statusHint].color, fontWeight:600 }}>
                      🔍 ตรวจพบ: {STATUS_CONFIG[statusHint].label}
                    </span>
                    <button onClick={() => { set('status', statusHint); setStatusHint(null) }} style={{ marginLeft:'auto', padding:'3px 10px', background: STATUS_CONFIG[statusHint].color, border:'none', borderRadius:7, fontSize:11, color:'white', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                      เปลี่ยนสถานะ
                    </button>
                    <button onClick={() => setStatusHint(null)} style={{ padding:'3px 8px', background:'transparent', border:'none', fontSize:12, color:'#9ca3af', cursor:'pointer' }}>×</button>
                  </div>
                )}
              </div>

              {/* AI Summary result */}
              {form.aiSummary && (
                <div className="ww-ai-box">
                  <div className="ww-ai-lbl">✨ AI Summary</div>
                  <div style={{ fontSize:13, color:'#1a1a2e', lineHeight:1.7 }}>{form.aiSummary}</div>
                  <button onClick={() => set('aiSummary', '')} style={{ fontSize:10, color:'#9ca3af', background:'none', border:'none', cursor:'pointer', marginTop:4 }}>× ลบ</button>
                </div>
              )}
            </div>

            {/* Status + Hours + Timer */}
            <div className="ww-glass" style={{ padding:20 }}>
              <label className="ww-label">สถานะงาน</label>
              <StatusSelector
                value={form.status}
                onChange={v => {
                  set('status', v)
                  sendLineNotify({ ...form, status: v }, 'status_change')
                }}
                timerRunning={timerRunning}
              />

              <div style={{ marginTop:16 }}>
                <label className="ww-label">เวลาที่ใช้</label>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {HOURS_OPT.map(h => (
                    <button key={h} onClick={() => set('hours', h)} style={{
                      padding:'6px 10px', borderRadius:8, border:'1.5px solid', fontSize:12,
                      cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
                      borderColor: form.hours===h ? 'rgba(108,99,255,0.45)' : 'rgba(200,210,240,0.4)',
                      background:  form.hours===h ? 'rgba(108,99,255,0.12)' : 'rgba(255,255,255,0.4)',
                      color:       form.hours===h ? '#6C63FF' : '#9ca3af',
                      fontWeight:  form.hours===h ? 700 : 400,
                      transform:   form.hours===h ? 'scale(1.05)' : 'scale(1)',
                    }}>{h}h</button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop:16 }}>
                <label className="ww-label">⏱ LIVE TIMER</label>
                <LiveTimer
                  onHoursChange={h => { if (h > 0) set('hours', Math.max(0.5, parseFloat(h.toFixed(1)))) }}
                  onStart={() => {
                    setTimerRunning(true)
                    if (form.status !== 'in_progress') set('status', 'in_progress')
                    sendLineNotify({ ...form, status: 'in_progress' }, 'timer_start')
                  }}
                  onStop={() => setTimerRunning(false)}
                />
              </div>
            </div>

            {/* Category Picker */}
            <div className="ww-glass" style={{ padding:20 }}>
              <label className="ww-label">หมวดหมู่</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {CATS.map(c => (
                  <button key={c.id} onClick={() => set('category', c.id)} style={{
                    display:'flex', alignItems:'center', gap:7, padding:'8px 12px',
                    border:'1.5px solid', borderRadius:12, cursor:'pointer', fontFamily:'inherit',
                    fontSize:12, fontWeight:500, textAlign:'left', width:'100%', transition:'all .15s',
                    borderColor: form.category===c.id ? c.color+'60' : 'rgba(200,210,240,0.4)',
                    background:  form.category===c.id ? c.bg : 'rgba(255,255,255,0.4)',
                    color:       form.category===c.id ? c.color : '#6b7099',
                  }}>
                    <span style={{ fontSize:14 }}>{c.icon}</span>
                    <span>{c.label}</span>
                    {form.category===c.id && <span style={{ marginLeft:'auto', fontSize:11 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Media Upload */}
            <div className="ww-glass" style={{ padding:20 }}>
              <label className="ww-label">
                รูปภาพ / วิดีโอ
                {uploading && <span style={{ color:'#6C63FF', marginLeft:8 }}>กำลังอัปโหลด {uploadProgress}%</span>}
              </label>
              <div className={'ww-drop' + (dragging ? ' drag' : '')}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                onClick={() => !uploading && fileRef.current?.click()}
                style={{ padding:16, opacity:uploading?0.7:1, cursor:uploading?'default':'pointer' }}>
                <div style={{ fontSize:24, marginBottom:5 }}>{uploading ? '⏳' : '📎'}</div>
                <div style={{ fontSize:12, color:'#6b7099', marginBottom:3 }}>
                  {uploading ? 'กำลังอัปโหลดไปยัง Gallery...' : 'ลากไฟล์มาวาง หรือคลิกเลือก'}
                </div>
                <div style={{ fontSize:11, color:'#9ca3af' }}>JPG · PNG · MP4 — บันทึกใน Gallery อัตโนมัติ</div>
                {uploading && (
                  <div className="ww-prog" style={{ maxWidth:160, margin:'8px auto 0' }}>
                    <div className="ww-prog-fill" style={{ width:uploadProgress+'%' }}/>
                  </div>
                )}
                <input ref={fileRef} type="file" multiple accept="image/*,video/*"
                  style={{ display:'none' }} onChange={e => handleFiles(e.target.files)}/>
              </div>

              {/* Thumbnails */}
              {form.imageUrls?.length > 0 && (
                <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:10 }}>
                  {form.imageUrls.map((url, i) => (
                    <div key={i} style={{ position:'relative', width:60, height:60, borderRadius:10, overflow:'hidden', border:'1px solid rgba(200,210,240,0.5)', flexShrink:0 }}>
                      <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      <button onClick={() => set('imageUrls', form.imageUrls.filter((_,j) => j!==i))}
                        style={{ position:'absolute', top:2, right:2, width:16, height:16, borderRadius:'50%', background:'rgba(239,68,68,0.85)', border:'none', color:'white', fontSize:9, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
                        ×
                      </button>
                    </div>
                  ))}
                  <div onClick={() => fileRef.current?.click()}
                    style={{ width:60, height:60, borderRadius:10, border:'2px dashed rgba(108,99,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:20, color:'#9ca3af' }}>
                    +
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="ww-glass" style={{ padding:20 }}>
              <label className="ww-label">แท็ก</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginBottom:8 }}>
                {form.tags.map(t => (
                  <span key={t} className="ww-tag">
                    #{t}
                    <span onClick={() => set('tags', form.tags.filter(x => x!==t))}
                      style={{ cursor:'pointer', opacity:.6, marginLeft:2, fontSize:12 }}>×</span>
                  </span>
                ))}
              </div>
              <div style={{ display:'flex', gap:7 }}>
                <input className="ww-input" style={{ flex:1 }}
                  placeholder="พิมพ์แท็ก แล้วกด Enter..."
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); addTag() } }}/>
                <button onClick={addTag} className="ww-btn-ghost" style={{ fontSize:12 }}>+ เพิ่ม</button>
              </div>
            </div>

            {/* Line Notify Setup — LIFF version */}
            <div className="ww-glass" style={{ padding:16 }}>
              {/* Header row */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {/* Avatar or icon */}
                {linePictureUrl
                  ? <img src={linePictureUrl} alt="" style={{ width:36, height:36, borderRadius:'50%', border:'2px solid rgba(6,199,85,0.35)', flexShrink:0 }}/>
                  : <div style={{ width:36, height:36, borderRadius:10, background:'#06C755', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>💬</div>
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#1a1a2e' }}>
                    {lineDisplayName || 'Line Notify'}
                  </div>
                  <div style={{ fontSize:10, color: lineUserId ? '#10B981' : '#9ca3af' }}>
                    {lineUserId ? '✅ เชื่อมต่อแล้ว — แจ้งเตือนทุก action' : 'กดเชื่อมต่อเพื่อรับการแจ้งเตือน'}
                  </div>
                </div>
                {lineUserId
                  ? <button onClick={() => {
                      localStorage.removeItem('line_user_id')
                      localStorage.removeItem('line_display_name')
                      localStorage.removeItem('line_picture_url')
                      setLineUserId(''); setLineDisplayName(''); setLinePictureUrl('')
                    }} style={{
                      padding:'5px 10px', borderRadius:8,
                      border:'1px solid rgba(239,68,68,0.25)',
                      background:'rgba(239,68,68,0.06)',
                      color:'#EF4444', fontSize:11, fontWeight:600,
                      cursor:'pointer', fontFamily:'inherit', flexShrink:0,
                    }}>ยกเลิก</button>
                  : <a href={`https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID || ''}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display:'inline-flex', alignItems:'center', gap:5,
                        padding:'7px 14px', borderRadius:8,
                        background:'#06C755', color:'white',
                        fontSize:12, fontWeight:700,
                        textDecoration:'none', flexShrink:0,
                        boxShadow:'0 3px 10px rgba(6,199,85,0.3)',
                      }}>
                      💬 เชื่อมต่อ Line
                    </a>
                }
              </div>

              {/* Manual fallback — toggle */}
              <div style={{ marginTop:10 }}>
                <button onClick={() => setShowLineSetup(s=>!s)} style={{
                  background:'none', border:'none', fontSize:10,
                  color:'#9ca3af', cursor:'pointer', fontFamily:'inherit',
                  textDecoration:'underline', padding:0,
                }}>
                  {showLineSetup ? 'ซ่อน' : 'ใส่ User ID เอง (manual)'}
                </button>
                {showLineSetup && (
                  <div style={{ marginTop:8, display:'flex', gap:7 }}>
                    <input className="ww-input" style={{ flex:1, fontSize:12 }}
                      placeholder="วาง Line User ID..."
                      defaultValue={lineUserId}
                      id="line-user-id-input"
                    />
                    <button onClick={() => {
                      const val = document.getElementById('line-user-id-input').value.trim()
                      if (val) { localStorage.setItem('line_user_id', val); setLineUserId(val) }
                      setShowLineSetup(false)
                    }} className="ww-btn-primary" style={{ padding:'8px 14px', fontSize:12 }}>
                      บันทึก
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Save */}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingBottom:8 }}>
              <button onClick={onCancel} className="ww-btn-ghost">ยกเลิก</button>
              <button onClick={handleSave} disabled={!(form.title || '').trim() || saving} className="ww-btn-primary" style={{ padding:'10px 28px', fontSize:14 }}>
                {saving ? 'กำลังบันทึก...' : '✓ บันทึกงาน'}
              </button>
            </div>
          </div>

          {/* ── RIGHT: AI Sidebar ── */}
          <div className="ww-ai-panel-sticky" style={{ position:'sticky', top:80 }}>
            <div className="ww-glass" style={{ padding:18 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
                🤖 AI Assistant
              </div>
              <AIPanel
                form={form}
                onApplySummary={s => set('aiSummary', s)}
                onApplyCategory={c => set('category', c)}
                onApplyTags={t => set('tags', [...new Set([...form.tags, ...t])])}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
