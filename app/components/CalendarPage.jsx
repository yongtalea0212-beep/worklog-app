"use client"
import { useState, useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts'

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
// Local calendar date (YYYY-MM-DD) — uses the browser's timezone, NOT UTC, so
// "today" is correct in Thailand even past midnight (toISOString would be UTC).
const ymd = (d = new Date()) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
const CATS = [
  { id:'graphic',   label:'Graphic Design', color:'#6C63FF', bg:'rgba(108,99,255,0.1)',  icon:'🎨' },
  { id:'video',     label:'Video Editing',  color:'#06B6D4', bg:'rgba(6,182,212,0.1)',   icon:'🎬' },
  { id:'photo',     label:'Photography',    color:'#F59E0B', bg:'rgba(245,158,11,0.1)',  icon:'📷' },
  { id:'marketing', label:'Marketing',      color:'#EF4444', bg:'rgba(239,68,68,0.1)',   icon:'📢' },
  { id:'ai',        label:'AI Content',     color:'#8B5CF6', bg:'rgba(139,92,246,0.1)',  icon:'🤖' },
  { id:'branding',  label:'Branding',       color:'#EC4899', bg:'rgba(236,72,153,0.1)',  icon:'✨' },
  { id:'pos',       label:'POS Design',     color:'#10B981', bg:'rgba(16,185,129,0.1)',  icon:'🏪' },
  { id:'other',     label:'อื่นๆ',          color:'#64748B', bg:'rgba(100,116,139,0.1)', icon:'📌' },
]

const getCat = id => CATS.find(c => c.id === id) || CATS[7]

const fmtDate = s => {
  try { return new Date(s).toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' }) }
  catch { return s || '' }
}

// Safe getter — prevents undefined.trim() crashes
const safe = (v, fallback = '') => (v == null ? fallback : String(v))

// ─────────────────────────────────────────
// DEADLINE HEATMAP (§7) — urgency from days-until-due
// ─────────────────────────────────────────
const PRIORITIES = [
  { id:'low',    label:'ต่ำ',  color:'#10B981' },
  { id:'medium', label:'กลาง', color:'#F59E0B' },
  { id:'high',   label:'สูง',  color:'#EF4444' },
]
const STATUSES = [
  { id:'draft',       label:'📝 ร่าง',     color:'#9ca3af' },
  { id:'in_progress', label:'🔄 กำลังทำ',  color:'#F59E0B' },
  { id:'done',        label:'✅ เสร็จแล้ว', color:'#10B981' },
]

function deadlineInfo(dueDate) {
  if (!dueDate) return null
  const d = new Date(dueDate); if (isNaN(d)) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(d); due.setHours(0,0,0,0)
  const days = Math.round((due - today) / 86400000)
  if (days < 0)  return { days, level:'overdue', color:'#991B1B', emoji:'⚠️', label:`เลยกำหนด ${-days} วัน` }
  if (days === 0) return { days, level:'today',  color:'#8B5CF6', emoji:'🟣', label:'ครบกำหนดวันนี้' }
  if (days < 3)  return { days, level:'urgent', color:'#EF4444', emoji:'🔴', label:`อีก ${days} วัน` }
  if (days <= 7) return { days, level:'soon',   color:'#F59E0B', emoji:'🟠', label:`อีก ${days} วัน` }
  return            { days, level:'ok',     color:'#10B981', emoji:'🟢', label:`อีก ${days} วัน` }
}
// FullCalendar event className for the urgency left-stripe
const deadlineClass = dueDate => {
  const i = deadlineInfo(dueDate)
  return i && i.level !== 'ok' ? ['dl-' + i.level] : []
}

// ─────────────────────────────────────────
// AI PLAN MY DAY (§6) — order by urgency, pack into free slots
// ─────────────────────────────────────────
const pad2 = n => String(n).padStart(2, '0')
const fmtHM = d => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
const sameLocalDay = (a, b) => {
  const x = new Date(a), y = new Date(b)
  return x.getFullYear()===y.getFullYear() && x.getMonth()===y.getMonth() && x.getDate()===y.getDate()
}

// Deterministic priority order: overdue/nearest deadline → priority → longer first
function planOrder(tasks) {
  const rank = { high:0, medium:1, low:2 }
  return [...tasks].sort((a,b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
    const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
    if (da !== db) return da - db
    const ra = rank[a.priority] ?? 1, rb = rank[b.priority] ?? 1
    if (ra !== rb) return ra - rb
    return hrsOf(b) - hrsOf(a)
  })
}

// First-fit pack into the day's free gaps (avoids existing scheduled blocks)
function packDay(ordered, dayDate, busy, startHour = 9, endHour = 18) {
  const dayStart = new Date(dayDate); dayStart.setHours(startHour,0,0,0)
  const dayEnd   = new Date(dayDate); dayEnd.setHours(endHour,0,0,0)
  const ivs = busy
    .map(b => ({ s: Math.max(new Date(b.s).getTime(), dayStart.getTime()), e: Math.min(new Date(b.e).getTime(), dayEnd.getTime()) }))
    .filter(b => b.e > b.s).sort((a,b) => a.s - b.s)
  let cursor = dayStart.getTime()
  const gaps = []
  for (const iv of ivs) { if (iv.s > cursor) gaps.push({ s: cursor, e: iv.s }); cursor = Math.max(cursor, iv.e) }
  if (cursor < dayEnd.getTime()) gaps.push({ s: cursor, e: dayEnd.getTime() })

  const placed = [], unplaced = []
  for (const t of ordered) {
    const durMs = Math.max(0.5, hrsOf(t) || 1) * 3600000
    let ok = false
    for (const g of gaps) {
      if (g.e - g.s >= durMs) {
        placed.push({ id:t.id, title:t.title, category:t.category, startAt:new Date(g.s).toISOString(), endAt:new Date(g.s+durMs).toISOString() })
        g.s += durMs; ok = true; break
      }
    }
    if (!ok) unplaced.push(t)
  }
  return { placed, unplaced }
}

// ─────────────────────────────────────────
// CSS
// ─────────────────────────────────────────
const CAL_CSS = `
.fc {
  font-family: 'Inter', sans-serif;
  --fc-border-color: rgba(200,205,230,0.35);
  --fc-today-bg-color: rgba(108,99,255,0.05);
  --fc-event-border-color: transparent;
}
.fc .fc-toolbar { gap: 8px; flex-wrap: wrap; margin-bottom: 18px !important; }
.fc .fc-toolbar-title { font-size: 17px !important; font-weight: 700 !important; color: #1a1a2e !important; letter-spacing: -.3px; }
.fc .fc-button {
  border-radius: 10px !important; padding: 7px 15px !important;
  font-size: 13px !important; font-weight: 500 !important;
  box-shadow: 0 2px 8px rgba(100,110,200,0.07) !important; transition: all .15s !important;
}
.fc .fc-button:hover { transform: translateY(-1px); }
.fc .fc-button-primary:not(.fc-button-active):not(:disabled) {
  color: #6b7099 !important;
  background: rgba(255,255,255,0.65) !important;
  border-color: rgba(255,255,255,0.88) !important;
}
.fc .fc-button-primary.fc-button-active {
  background: rgba(108,99,255,0.12) !important;
  border-color: rgba(108,99,255,0.28) !important;
  color: #6C63FF !important; font-weight: 700 !important;
}
.fc .fc-today-button {
  background: linear-gradient(135deg,#6C63FF,#9B8FFF) !important;
  border-color: transparent !important; color: white !important;
  font-weight: 700 !important; box-shadow: 0 4px 12px rgba(108,99,255,0.32) !important;
}
.fc .fc-col-header-cell {
  background: rgba(255,255,255,0.45) !important;
  border-color: rgba(200,205,230,0.35) !important; padding: 9px 0 !important;
}
.fc .fc-col-header-cell-cushion {
  font-size: 12px !important; font-weight: 700 !important; color: #9ca3af !important;
  text-decoration: none !important; text-transform: uppercase !important; letter-spacing: .5px !important;
}
.fc .fc-daygrid-day { background: rgba(255,255,255,0.28) !important; transition: background .15s; }
.fc .fc-daygrid-day:hover { background: rgba(255,255,255,0.52) !important; cursor: pointer; }
.fc .fc-day-today { background: rgba(108,99,255,0.06) !important; }
.fc .fc-daygrid-day-number {
  font-size: 13px !important; font-weight: 500 !important; color: #4a5568 !important;
  text-decoration: none !important; padding: 7px 9px !important;
}
.fc .fc-day-today .fc-daygrid-day-number { color: #6C63FF !important; font-weight: 800 !important; }
.fc .fc-day-other .fc-daygrid-day-number { color: #d1d5db !important; }
.fc .fc-event {
  border-radius: 7px !important; padding: 3px 7px !important;
  font-size: 12px !important; font-weight: 500 !important;
  border: none !important; cursor: pointer !important;
  transition: all .15s !important; margin-bottom: 2px !important;
}
.fc .fc-event:hover { transform: translateY(-1px) !important; filter: brightness(1.06) !important; box-shadow: 0 3px 10px rgba(0,0,0,0.14) !important; }
.fc .fc-daygrid-more-link {
  font-size: 11px !important; font-weight: 700 !important; color: #6C63FF !important;
  background: rgba(108,99,255,0.09) !important; border-radius: 20px !important; padding: 2px 8px !important;
}
.fc .fc-popover {
  background: rgba(255,255,255,0.95) !important;
  backdrop-filter: blur(20px) !important; border: 1px solid rgba(255,255,255,0.92) !important;
  border-radius: 14px !important; box-shadow: 0 8px 32px rgba(100,110,200,0.16) !important;
}
.fc .fc-popover-header {
  background: rgba(108,99,255,0.06) !important; border-radius: 14px 14px 0 0 !important;
  padding: 9px 14px !important; font-size: 13px !important; font-weight: 700 !important; color: #1a1a2e !important;
}
.fc-scroller::-webkit-scrollbar { width: 4px; }
.fc-scroller::-webkit-scrollbar-thumb { background: rgba(108,99,255,0.2); border-radius: 4px; }
@keyframes cal-fade { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
@keyframes cal-slide { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
/* Deadline heatmap stripe on calendar events (§7) */
.fc .fc-event.dl-overdue { box-shadow: inset 4px 0 0 #991B1B !important; }
.fc .fc-event.dl-today   { box-shadow: inset 4px 0 0 #8B5CF6 !important; }
.fc .fc-event.dl-urgent  { box-shadow: inset 4px 0 0 #EF4444 !important; }
.fc .fc-event.dl-soon    { box-shadow: inset 4px 0 0 #F59E0B !important; }
@keyframes ts-drawer { from{transform:translateX(100%)} to{transform:translateX(0)} }
@keyframes ts-sheet  { from{transform:translateY(100%)} to{transform:translateY(0)} }
@keyframes ts-fade   { from{opacity:0} to{opacity:1} }

/* More-link popover: always on top, scrollable, never overlaps the page below */
.fc .fc-popover { z-index: 140 !important; max-height: 60vh; overflow-y: auto; border-radius: 14px !important; box-shadow: 0 12px 40px rgba(60,70,130,0.28) !important; border: 1px solid rgba(255,255,255,0.95) !important; }
.fc .fc-popover-body { padding: 8px !important; }
/* Easier-to-tap day cells & events */
.fc .fc-daygrid-day-frame { min-height: 70px; }
.fc .fc-daygrid-day-number { padding: 6px 9px !important; cursor: pointer; }
.fc .fc-daygrid-event { padding: 3px 6px !important; }
.fc .fc-daygrid-more-link { font-weight: 700; }
.fc .fc-timegrid-event { min-height: 24px; }

/* Mobile: keep FullCalendar's own toolbar (prev/next/today + title) readable */
@media (max-width: 820px) {
  .fc .fc-toolbar.fc-header-toolbar { flex-direction: column; align-items: stretch; gap: 10px; margin-bottom: 12px !important; }
  .fc .fc-toolbar-chunk { display: flex; justify-content: center; }
  .fc .fc-toolbar-title { font-size: 16px !important; text-align: center; }
  .fc .fc-button { padding: 8px 14px !important; font-size: 13px !important; }
  .fc .fc-col-header-cell-cushion { font-size: 11px !important; }
  .fc .fc-daygrid-day-number { font-size: 13px !important; font-weight: 700; }
  .fc .fc-daygrid-day-frame { min-height: 56px; }
  .fc .fc-daygrid-event { font-size: 11px !important; }
  .fc .fc-popover { left: 8px !important; right: 8px !important; width: auto !important; max-width: none !important; }
}
`

// ─────────────────────────────────────────
// TASK DETAIL SIDEBAR (§12) — slide-in drawer (desktop) / bottom sheet (mobile)
// with inline edit of status · priority · deadline (heatmap §7)
// ─────────────────────────────────────────
function fmtTimeRange(startAt, endAt) {
  if (!startAt) return null
  const opt = { hour:'2-digit', minute:'2-digit' }
  try {
    const s = new Date(startAt).toLocaleTimeString('th-TH', opt)
    const e = endAt ? new Date(endAt).toLocaleTimeString('th-TH', opt) : ''
    const dur = endAt ? Math.round((new Date(endAt) - new Date(startAt)) / 36e5 * 10) / 10 : null
    return `${s}${e ? ' – ' + e : ''}${dur ? `  (${dur} ชม.)` : ''}`
  } catch { return null }
}

function TaskSidebar({ event, onClose, onEdit, onDelete, onUnschedule, onPatch, isMobile }) {
  const props = event?.extendedProps || {}
  const id = props.id
  const [imgIndex, setImgIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  // Local mirrors for instant feedback on inline edits.
  const [status, setStatus] = useState(safe(props.status, 'draft'))
  const [priority, setPriority] = useState(safe(props.priority, 'medium'))
  const [dueDate, setDueDate] = useState(props.dueDate || '')

  const imageUrls = Array.isArray(props.imageUrls) ? props.imageUrls : []

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { if (fullscreen) setFullscreen(false); else onClose() }
      if (e.key === 'ArrowRight') setImgIndex(i => Math.min(i + 1, imageUrls.length - 1))
      if (e.key === 'ArrowLeft')  setImgIndex(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen, onClose, imageUrls.length])

  if (!event) return null

  const title      = safe(event.title || props.title, 'ไม่มีชื่อ')
  const category   = safe(props.category, 'other')
  const hours      = props.hours || 0
  const tags       = Array.isArray(props.tags) ? props.tags : []
  const aiSummary  = safe(props.aiSummary, '')
  const description= safe(props.description, '')
  const date       = safe(props.date || event.startStr, '')
  const cat        = getCat(category)
  const hasImages  = imageUrls.length > 0
  const isScheduled = !!props.startAt
  const timeRange  = fmtTimeRange(props.startAt, props.endAt)
  const dl         = deadlineInfo(dueDate)

  const patch = (p) => { if (id != null) onPatch?.(id, p) }
  function pickStatus(s)   { setStatus(s);   patch({ status: s }) }
  function pickPriority(p) { setPriority(p); patch({ priority: p }) }
  function pickDue(v)      { setDueDate(v);  patch({ dueDate: v || null }) }

  function handleEdit() {
    onEdit({
      id, title, description, aiSummary, category,
      hours: Number(hours) || 0, status, tags,
      date: date ? date.split('T')[0] : ymd(),
      imageUrls, imageCount: imageUrls.length,
      startAt: props.startAt || null, endAt: props.endAt || null,
      dueDate: dueDate || null, priority,
    })
    onClose()
  }

  // ── Fullscreen image viewer ──
  if (fullscreen && hasImages) {
    return (
      <div onClick={() => setFullscreen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', zIndex:400, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
        <img src={imageUrls[imgIndex]} alt={title} style={{ maxWidth:'92vw', maxHeight:'80vh', borderRadius:16, objectFit:'contain', boxShadow:'0 32px 80px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()} />
        <div style={{ display:'flex', gap:10, marginTop:16, alignItems:'center' }}>
          {imageUrls.length > 1 && (
            <>
              <button onClick={e=>{e.stopPropagation();setImgIndex(i=>Math.max(i-1,0))}} disabled={imgIndex===0} style={{ width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',color:'white',cursor:imgIndex===0?'default':'pointer',fontSize:16,opacity:imgIndex===0?.3:1 }}>←</button>
              <span style={{ color:'rgba(255,255,255,0.6)', fontSize:13 }}>{imgIndex+1} / {imageUrls.length}</span>
              <button onClick={e=>{e.stopPropagation();setImgIndex(i=>Math.min(i+1,imageUrls.length-1))}} disabled={imgIndex===imageUrls.length-1} style={{ width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',color:'white',cursor:imgIndex===imageUrls.length-1?'default':'pointer',fontSize:16,opacity:imgIndex===imageUrls.length-1?.3:1 }}>→</button>
            </>
          )}
          <button onClick={() => setFullscreen(false)} style={{ padding:'7px 18px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:10,color:'white',fontSize:13,cursor:'pointer',fontFamily:'inherit',marginLeft:8 }}>ปิด</button>
        </div>
      </div>
    )
  }

  // Responsive container: right drawer (desktop) / bottom sheet (mobile)
  const overlayStyle = {
    position:'fixed', inset:0, background:'rgba(40,50,90,0.28)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
    zIndex:200, display:'flex',
    justifyContent: isMobile ? 'center' : 'flex-end',
    alignItems: isMobile ? 'flex-end' : 'stretch',
    animation:'ts-fade .18s ease',
  }
  const panelStyle = {
    background:'rgba(255,255,255,0.96)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
    border:'1px solid rgba(255,255,255,0.99)', overflowY:'auto', fontFamily:'inherit',
    boxShadow:'-12px 0 48px rgba(60,70,130,0.18)',
    ...(isMobile
      ? { width:'100%', maxHeight:'92dvh', borderRadius:'24px 24px 0 0', animation:'ts-sheet .26s cubic-bezier(.2,.8,.2,1)' }
      : { width:'min(460px,100%)', height:'100dvh', borderRadius:'24px 0 0 24px', animation:'ts-drawer .26s cubic-bezier(.2,.8,.2,1)' }),
  }

  const segBtn = (active, color) => ({
    flex:1, padding:'8px 6px', borderRadius:9, fontSize:12, fontWeight:active?700:500, cursor:'pointer',
    fontFamily:'inherit', transition:'all .12s',
    border:'1px solid '+(active?color:'rgba(200,210,240,0.6)'),
    background: active ? color+'18' : 'rgba(255,255,255,0.6)',
    color: active ? color : '#6b7099',
  })

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={panelStyle}>

        {/* Hero image */}
        {hasImages && (
          <div style={{ position:'relative', height:200, background:cat.bg, overflow:'hidden', cursor:'zoom-in' }} onClick={() => setFullscreen(true)}>
            <img src={imageUrls[imgIndex]} alt={title} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:70, background:'linear-gradient(transparent,rgba(0,0,0,0.35))' }}/>
            <span style={{ position:'absolute', bottom:10, left:14, fontSize:11, color:'#fff', background:'rgba(0,0,0,0.35)', padding:'2px 8px', borderRadius:20 }}>🔍 คลิกเพื่อขยาย{imageUrls.length>1?` · ${imgIndex+1}/${imageUrls.length}`:''}</span>
          </div>
        )}

        <div style={{ padding:'18px 20px 24px' }}>
          {/* Top bar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#9ca3af', letterSpacing:1 }}>รายละเอียดงาน</span>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'rgba(0,0,0,0.04)', border:'none', fontSize:18, cursor:'pointer', color:'#6b7099' }}>×</button>
          </div>

          {/* Chips */}
          <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:10 }}>
            <span style={{ background:cat.bg, color:cat.color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{cat.icon} {cat.label}</span>
            {dl && <span style={{ background:dl.color+'18', color:dl.color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{dl.emoji} {dl.label}</span>}
          </div>

          {/* Title + time */}
          <div style={{ fontSize:19, fontWeight:700, color:'#1a1a2e', lineHeight:1.3, marginBottom:6 }}>{title}</div>
          <div style={{ fontSize:12.5, color:'#9ca3af', marginBottom:4 }}>📅 {fmtDate(date)}</div>
          {timeRange
            ? <div style={{ fontSize:12.5, color:cat.color, fontWeight:600, marginBottom:16 }}>🕐 {timeRange}</div>
            : <div style={{ fontSize:12.5, color:'#9ca3af', marginBottom:16 }}>🕐 ยังไม่จัดเวลา</div>}

          {/* Inline editors */}
          <div style={{ background:'rgba(248,249,255,0.7)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:14, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', letterSpacing:.5, marginBottom:7 }}>สถานะ</div>
            <div style={{ display:'flex', gap:6, marginBottom:13 }}>
              {STATUSES.map(s => <button key={s.id} onClick={()=>pickStatus(s.id)} style={segBtn(status===s.id, s.color)}>{s.label}</button>)}
            </div>
            <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', letterSpacing:.5, marginBottom:7 }}>ความสำคัญ (Priority)</div>
            <div style={{ display:'flex', gap:6, marginBottom:13 }}>
              {PRIORITIES.map(p => <button key={p.id} onClick={()=>pickPriority(p.id)} style={segBtn(priority===p.id, p.color)}>{p.label}</button>)}
            </div>
            <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', letterSpacing:.5, marginBottom:7 }}>กำหนดส่ง (Deadline)</div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="date" value={dueDate || ''} onChange={e=>pickDue(e.target.value)} style={{ flex:1, padding:'8px 10px', background:'rgba(255,255,255,0.8)', border:'1px solid rgba(200,210,240,0.6)', borderRadius:9, fontSize:13, color:'#1a1a2e', fontFamily:'inherit', outline:'none' }} />
              {dueDate && <button onClick={()=>pickDue('')} style={{ padding:'8px 12px', background:'rgba(255,255,255,0.6)', border:'1px solid rgba(200,210,240,0.6)', borderRadius:9, fontSize:12, color:'#9ca3af', cursor:'pointer', fontFamily:'inherit' }}>ล้าง</button>}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
            {[
              { label:'ชั่วโมง', value:`${hours}`, color:cat.color },
              { label:'ไฟล์แนบ', value:`${imageUrls.length}`, color:'#6C63FF' },
              { label:'แท็ก', value:`${tags.length}`, color:'#8B5CF6' },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.6)', border:'1px solid rgba(200,210,240,0.4)', borderRadius:11, padding:'9px 8px', textAlign:'center' }}>
                <div style={{ fontSize:18, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'#9ca3af', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Attachments */}
          {hasImages && (
            <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:2 }}>
              {imageUrls.map((url,i) => (
                <div key={i} onClick={()=>{setImgIndex(i);setFullscreen(true)}} style={{ width:54, height:54, borderRadius:9, overflow:'hidden', border:'2px solid '+(i===imgIndex?cat.color:'rgba(200,210,240,0.5)'), cursor:'pointer', flexShrink:0 }}>
                  <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
                </div>
              ))}
            </div>
          )}

          {/* AI summary / description */}
          {aiSummary && (
            <div style={{ background:'linear-gradient(135deg,rgba(108,99,255,0.07),rgba(167,139,250,0.04))', border:'1px solid rgba(108,99,255,0.16)', borderRadius:13, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'#6C63FF', letterSpacing:1, marginBottom:5 }}>✨ AI SUMMARY</div>
              <div style={{ fontSize:13, color:'#4a5568', lineHeight:1.7 }}>{aiSummary}</div>
            </div>
          )}
          {!aiSummary && description && (
            <div style={{ background:'rgba(255,255,255,0.55)', border:'1px solid rgba(200,210,240,0.4)', borderRadius:13, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'#9ca3af', letterSpacing:1, marginBottom:5 }}>DESCRIPTION</div>
              <div style={{ fontSize:13, color:'#4a5568', lineHeight:1.7 }}>{description}</div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:16 }}>
              {tags.map((t,i) => <span key={i} style={{ background:'rgba(108,99,255,0.09)', border:'1px solid rgba(108,99,255,0.18)', color:'#6C63FF', fontSize:11, fontWeight:500, padding:'3px 9px', borderRadius:20 }}>#{t}</span>)}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', paddingTop:14, borderTop:'1px solid rgba(0,0,0,0.06)' }}>
            <button onClick={() => { onDelete(id); onClose() }} style={{ padding:'9px 16px', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:11, fontSize:13, color:'#EF4444', cursor:'pointer', fontFamily:'inherit' }}>ลบ</button>
            {isScheduled && onUnschedule && (
              <button onClick={() => onUnschedule(id)} style={{ padding:'9px 16px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:11, fontSize:13, color:'#F59E0B', cursor:'pointer', fontFamily:'inherit' }}>↩ ยกเลิกเวลา</button>
            )}
            <button onClick={handleEdit} style={{ flex:1, minWidth:120, padding:'9px 16px', background:'linear-gradient(135deg,#6C63FF,#9B8FFF)', border:'none', borderRadius:11, fontSize:13, fontWeight:700, color:'white', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 12px rgba(108,99,255,0.32)' }}>✏️ แก้ไขแบบเต็ม</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// QUICK ADD MODAL
// ─────────────────────────────────────────
function QuickAddModal({ date, onClose, onAdd }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('graphic')
  const [hours, setHours] = useState(2)
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleAdd() {
    const t = (title || '').trim()
    if (!t) return
    onAdd({ title: t, category, hours, date, status:'done', tags:[], imageUrls:[] })
    onClose()
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(80,90,180,0.18)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20, animation:'cal-fade .15s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:'rgba(255,255,255,0.94)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)', border:'1px solid rgba(255,255,255,0.99)', borderRadius:24, maxWidth:380, width:'100%', padding:26, boxShadow:'0 20px 60px rgba(80,90,180,0.22)', animation:'cal-slide .2s ease' }}>
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e', marginBottom:2 }}>เพิ่มงานด่วน</div>
          <div style={{ fontSize:12, color:'#9ca3af' }}>{fmtDate(date)}</div>
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#9ca3af', marginBottom:6, letterSpacing:.5, textTransform:'uppercase' }}>ชื่องาน *</label>
          <input
            ref={inputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="เช่น ออกแบบโปสเตอร์..."
            style={{ width:'100%', padding:'10px 13px', background:'rgba(255,255,255,0.65)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:10, fontSize:14, color:'#1a1a2e', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
          />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#9ca3af', marginBottom:6, letterSpacing:.5, textTransform:'uppercase' }}>หมวดหมู่</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ width:'100%', padding:'9px 10px', background:'rgba(255,255,255,0.65)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:10, fontSize:13, color:'#1a1a2e', fontFamily:'inherit', outline:'none' }}>
              {CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#9ca3af', marginBottom:6, letterSpacing:.5, textTransform:'uppercase' }}>เวลา (ชม.)</label>
            <select value={hours} onChange={e => setHours(parseFloat(e.target.value))} style={{ width:'100%', padding:'9px 10px', background:'rgba(255,255,255,0.65)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:10, fontSize:13, color:'#1a1a2e', fontFamily:'inherit', outline:'none' }}>
              {[0.5,1,1.5,2,3,4,5,6,8].map(h => <option key={h} value={h}>{h} ชม.</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 20px', background:'rgba(255,255,255,0.65)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:10, fontSize:13, color:'#6b7099', cursor:'pointer', fontFamily:'inherit' }}>ยกเลิก</button>
          <button onClick={handleAdd} disabled={!(title||'').trim()} style={{ padding:'9px 22px', background:(title||'').trim()?'linear-gradient(135deg,#6C63FF,#9B8FFF)':'rgba(200,210,240,0.4)', border:'none', borderRadius:10, fontSize:13, fontWeight:700, color:(title||'').trim()?'white':'#9ca3af', cursor:(title||'').trim()?'pointer':'default', fontFamily:'inherit' }}>บันทึก →</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// STATS ROW — workload / planning KPIs (§17)
// ─────────────────────────────────────────
const round1 = v => Math.round(v * 10) / 10
const hrsOf = l => Number(l.hours || l.hours_spent || 0)

function CalendarStats({ logs }) {
  const today = ymd()
  const scheduled = logs.filter(l => l.startAt)
  const done      = logs.filter(l => l.status === 'done')
  const unsched   = logs.filter(l => !l.startAt && l.status !== 'done')
  const plannedH  = round1(scheduled.reduce((s,l) => s + hrsOf(l), 0))
  const loggedH   = round1(done.reduce((s,l) => s + hrsOf(l), 0))
  const todayH    = round1(scheduled.filter(l => ymd(new Date(l.startAt)) === today).reduce((s,l)=>s+hrsOf(l),0))

  const health = todayH <= 6
    ? { label:'🟢 พอดี',     color:'#10B981' }
    : todayH <= 9
    ? { label:'🟠 แน่น',     color:'#F59E0B' }
    : { label:'🔴 หนักเกิน', color:'#EF4444' }

  const cards = [
    { icon:'🗓', label:'จัดเวลาแล้ว',  value:scheduled.length, unit:'งาน', color:'#6C63FF' },
    { icon:'✅', label:'เสร็จแล้ว',     value:done.length,      unit:'งาน', color:'#10B981' },
    { icon:'📥', label:'ยังไม่จัดเวลา', value:unsched.length,   unit:'งาน', color:'#F59E0B' },
    { icon:'📐', label:'ชม.ที่วางแผน',  value:plannedH,         unit:'ชม.', color:'#06B6D4' },
    { icon:'⏱', label:'ชม.ที่ทำจริง',  value:loggedH,          unit:'ชม.', color:'#8B5CF6' },
    { icon:'⚖️', label:`โหลดวันนี้ (${todayH}ชม.)`, value:health.label, unit:'', color:health.color },
  ]

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:18 }}>
      {cards.map((s,i) => (
        <div key={i} style={{ background:'rgba(255,255,255,0.68)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.92)', borderRadius:16, padding:'14px 16px', boxShadow:'0 2px 12px rgba(100,110,200,0.08)' }}>
          <div style={{ fontSize:12, color:'#9ca3af', marginBottom:6, fontWeight:500 }}>{s.icon} {s.label}</div>
          <div style={{ fontSize:20, fontWeight:700, color:s.color, lineHeight:1.1 }}>
            {s.value}
            {s.unit && <span style={{ fontSize:13, fontWeight:400, color:'#9ca3af', marginLeft:3 }}>{s.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────
// RESOURCE + ANALYTICS (§8, §14) — this-week utilization & insights
// ─────────────────────────────────────────
function startOfWeek(d) {
  const x = new Date(d); const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setHours(0,0,0,0); x.setDate(x.getDate() - day); return x
}
function CalendarAnalytics({ logs }) {
  const all = logs || []
  const wkStart = startOfWeek(new Date())
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate() + 7)
  const inWeek = l => { const d = new Date(l.date); return d >= wkStart && d < wkEnd }
  const week = all.filter(inWeek)

  const plannedH   = round1(week.reduce((s,l) => s + hrsOf(l), 0))
  const completedH = round1(week.filter(l => l.status === 'done').reduce((s,l) => s + hrsOf(l), 0))
  const remainingH = round1(Math.max(0, plannedH - completedH))
  const util       = plannedH ? Math.round(completedH / plannedH * 100) : 0

  // per-day hours (Mon–Sun)
  const DOW = ['จ','อ','พ','พฤ','ศ','ส','อา']
  const days = DOW.map((label,i) => {
    const d = new Date(wkStart); d.setDate(d.getDate() + i)
    const key = ymd(d)
    const hours = round1(week.filter(l => l.date === key).reduce((s,l) => s + hrsOf(l), 0))
    return { label, hours }
  })
  const maxDay = days.reduce((m,d) => d.hours > m.hours ? d : m, days[0])

  // insights
  const catCount = {}
  for (const l of all) catCount[l.category] = (catCount[l.category] || 0) + 1
  const topCatId = Object.entries(catCount).sort((a,b) => b[1]-a[1])[0]?.[0]
  const topCat = topCatId ? getCat(topCatId) : null
  const workDays = days.filter(d => d.hours > 0).length
  const avgDaily = workDays ? round1(plannedH / workDays) : 0
  const total = week.length, doneN = week.filter(l => l.status === 'done').length
  const completionRate = total ? Math.round(doneN / total * 100) : 0
  const today = ymd()
  const overdue = all.filter(l => l.status !== 'done' && l.dueDate && l.dueDate < today).length

  const insights = [
    { label:'หมวดเด่น',        value: topCat ? `${topCat.icon} ${topCat.label}` : '—', color: topCat?.color || '#9ca3af' },
    { label:'เฉลี่ย/วัน',      value: `${avgDaily} ชม.`,         color:'#06B6D4' },
    { label:'วันที่ทำงานสูงสุด', value: maxDay.hours ? `${maxDay.label} (${maxDay.hours}ชม.)` : '—', color:'#6C63FF' },
    { label:'อัตราเสร็จ',      value: `${completionRate}%`,      color:'#10B981' },
    { label:'งานเลยกำหนด',     value: `${overdue}`,              color: overdue ? '#EF4444' : '#9ca3af' },
  ]

  return (
    <div style={{ marginTop:18, background:'rgba(255,255,255,0.58)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.92)', borderRadius:20, padding:18, boxShadow:'0 8px 32px rgba(100,110,200,0.08)' }}>
      <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:14 }}>📊 ภาพรวมสัปดาห์นี้</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16 }}>

        {/* Resource utilization (§8) */}
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            {[
              { label:'ชม.ที่วางแผน', value:plannedH,   color:'#6C63FF' },
              { label:'ทำเสร็จแล้ว',  value:completedH, color:'#10B981' },
              { label:'คงเหลือ',     value:remainingH, color:'#F59E0B' },
              { label:'Utilization', value:util+'%',   color:'#06B6D4' },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.7)', border:'1px solid rgba(200,210,240,0.4)', borderRadius:11, padding:'9px 11px' }}>
                <div style={{ fontSize:17, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'#9ca3af', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ height:8, background:'#EEF0FA', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:8, width:`${Math.min(100,util)}%`, background:'linear-gradient(90deg,#6C63FF,#9B8FFF)', borderRadius:4 }} />
          </div>
        </div>

        {/* Daily hours chart (§14) */}
        <div>
          <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, marginBottom:6 }}>ชั่วโมงต่อวัน</div>
          <div style={{ height:120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top:4, right:4, bottom:0, left:-26 }}>
                <XAxis dataKey="label" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill:'rgba(108,99,255,0.06)' }} formatter={v => [`${v} ชม.`, 'รวม']} labelStyle={{ fontSize:12 }} contentStyle={{ borderRadius:10, fontSize:12, border:'1px solid #E8E0FF' }} />
                <Bar dataKey="hours" radius={[5,5,0,0]}>
                  {days.map((d,i) => <Cell key={i} fill={d.label===maxDay.label && d.hours>0 ? '#6C63FF' : '#C7C3F5'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights (§14) */}
        <div style={{ display:'flex', flexDirection:'column', gap:7, justifyContent:'center' }}>
          {insights.map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:12.5 }}>
              <span style={{ color:'#9ca3af' }}>{s.label}</span>
              <span style={{ fontWeight:700, color:s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// UNSCHEDULED TASKS PANEL (§1) — drag onto the timeline
// ─────────────────────────────────────────
function UnscheduledPanel({ tasks, panelRef, isMobile }) {
  return (
    <div style={{ width: isMobile ? '100%' : 240, flexShrink:0 }}>
      <div style={{ position: isMobile ? 'static' : 'sticky', top:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>📥 งานที่ยังไม่จัดเวลา</span>
          <span style={{ fontSize:11, fontWeight:700, color:'#6C63FF', background:'rgba(108,99,255,0.1)', borderRadius:20, padding:'1px 8px' }}>{tasks.length}</span>
        </div>
        <div
          ref={panelRef}
          style={ isMobile
            ? { display:'flex', flexDirection:'row', gap:8, overflowX:'auto', paddingBottom:6, WebkitOverflowScrolling:'touch' }
            : { display:'flex', flexDirection:'column', gap:7, maxHeight:560, overflowY:'auto', paddingRight:4 } }
        >
          {tasks.length === 0 && (
            <div style={{ fontSize:12, color:'#9ca3af', textAlign:'center', padding:'18px 8px', border:'1px dashed rgba(200,210,240,0.7)', borderRadius:12, width:'100%' }}>
              ทุกงานถูกจัดเวลาแล้ว 🎉
            </div>
          )}
          {tasks.map(t => {
            const cat = getCat(t.category || 'other')
            return (
              <div
                key={t.id}
                className="unsched-item"
                data-id={t.id}
                data-title={safe(t.title, 'งาน')}
                data-color={cat.color}
                data-hours={hrsOf(t) || 1}
                title="ลากไปวางบนตารางเวลาเพื่อจัดเวลา"
                style={{
                  cursor:'grab', background:'rgba(255,255,255,0.9)', borderLeft:`3px solid ${cat.color}`,
                  border:'1px solid rgba(200,210,240,0.55)', borderLeftWidth:3, borderRadius:10,
                  padding:'8px 10px', boxShadow:'0 1px 4px rgba(100,110,200,0.06)',
                  ...(isMobile ? { minWidth:180, flexShrink:0 } : {}),
                }}
              >
                <div style={{ fontSize:12.5, fontWeight:600, color:'#1a1a2e', lineHeight:1.3, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{safe(t.title,'งาน')}</div>
                <div style={{ fontSize:10.5, color:'#9ca3af', display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                  <span>{cat.icon} {cat.label}</span>
                  <span>· {hrsOf(t) || 1} ชม.</span>
                  {(() => { const dl = deadlineInfo(t.dueDate); return dl ? <span style={{ color:dl.color, fontWeight:700 }}>· {dl.emoji} {dl.label}</span> : null })()}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:10, lineHeight:1.5 }}>
          💡 {isMobile ? 'แตะค้างที่การ์ดแล้วลากลงบนตารางเวลา' : 'ลากการ์ดไปวางบนตารางเวลาเพื่อจัดเวลา'}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// LEGEND
// ─────────────────────────────────────────
function CategoryLegend({ logs }) {
  const used = [...new Set(logs.map(l => l.category))]
  if (!used.length) return null
  return (
    <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:16 }}>
      {CATS.filter(c => used.includes(c.id)).map(cat => (
        <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.88)', borderRadius:20, padding:'5px 12px', boxShadow:'0 1px 4px rgba(100,110,200,0.06)' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:cat.color }}/>
          <span style={{ fontSize:12, color:'#4a5568', fontWeight:500 }}>{cat.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────
// AI PLAN PREVIEW MODAL (§6)
// ─────────────────────────────────────────
function PlanPreviewModal({ plan, onAccept, onClose, isMobile }) {
  if (!plan) return null
  const { loading, none, date, placed = [], unplaced = [], strategy } = plan
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(40,50,90,0.28)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', zIndex:220, display:'flex', alignItems:isMobile?'flex-end':'center', justifyContent:'center', padding:isMobile?0:20, animation:'ts-fade .18s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'rgba(255,255,255,0.97)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)', border:'1px solid rgba(255,255,255,0.99)', width: isMobile?'100%':'min(480px,100%)', maxHeight:'88vh', overflowY:'auto', borderRadius: isMobile?'24px 24px 0 0':24, boxShadow:'0 24px 64px rgba(60,70,130,0.22)', padding:22, animation:(isMobile?'ts-sheet':'cal-slide')+' .24s ease' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>🤖 AI จัดตารางให้</div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'rgba(0,0,0,0.04)', border:'none', fontSize:18, cursor:'pointer', color:'#6b7099' }}>×</button>
        </div>
        {date && <div style={{ fontSize:12.5, color:'#9ca3af', marginBottom:14 }}>{fmtDate(date)} · เวลาทำงาน 09:00–18:00</div>}

        {loading && <div style={{ padding:'30px 0', textAlign:'center', color:'#6C63FF', fontSize:14 }}>⏳ กำลังวิเคราะห์และจัดตาราง...</div>}

        {none && <div style={{ padding:'24px 0', textAlign:'center', color:'#9ca3af', fontSize:14 }}>ไม่มีงานที่ยังไม่จัดเวลาสำหรับวันนี้ 🎉</div>}

        {!loading && !none && (
          <>
            {strategy && (
              <div style={{ background:'linear-gradient(135deg,rgba(108,99,255,0.08),rgba(167,139,250,0.05))', border:'1px solid rgba(108,99,255,0.16)', borderRadius:12, padding:'10px 13px', marginBottom:14, fontSize:12.5, color:'#4a5568', lineHeight:1.6 }}>
                ✨ {strategy}
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:14 }}>
              {placed.map((p,i) => {
                const cat = getCat(p.category || 'other')
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.8)', borderLeft:`3px solid ${cat.color}`, border:'1px solid rgba(200,210,240,0.5)', borderLeftWidth:3, borderRadius:10, padding:'9px 11px' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:cat.color, minWidth:96 }}>{fmtHM(new Date(p.startAt))}–{fmtHM(new Date(p.endAt))}</div>
                    <div style={{ fontSize:13, color:'#1a1a2e', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.icon} {p.title}</div>
                  </div>
                )
              })}
              {placed.length === 0 && <div style={{ fontSize:13, color:'#9ca3af', textAlign:'center', padding:'12px 0' }}>ไม่มีช่องเวลาว่างพอในวันนี้</div>}
            </div>
            {unplaced.length > 0 && (
              <div style={{ fontSize:12, color:'#F59E0B', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, padding:'8px 11px', marginBottom:14 }}>
                ⚠️ จัดไม่ลง {unplaced.length} งาน (เวลาไม่พอ) — ยังอยู่ในรายการที่ยังไม่จัดเวลา
              </div>
            )}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={onClose} style={{ padding:'9px 18px', background:'rgba(255,255,255,0.65)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:11, fontSize:13, color:'#6b7099', cursor:'pointer', fontFamily:'inherit' }}>ยกเลิก</button>
              <button onClick={onAccept} disabled={!placed.length} style={{ padding:'9px 22px', background: placed.length?'linear-gradient(135deg,#6C63FF,#9B8FFF)':'rgba(200,210,240,0.5)', border:'none', borderRadius:11, fontSize:13, fontWeight:700, color: placed.length?'white':'#9ca3af', cursor: placed.length?'pointer':'default', fontFamily:'inherit', boxShadow: placed.length?'0 4px 12px rgba(108,99,255,0.32)':'none' }}>✓ ใช้ตารางนี้</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// MAIN CALENDAR PAGE
// ─────────────────────────────────────────
export default function CalendarPage({ logs, onAddLog, onEditLog, onDeleteLog, onReschedule, onPatch }) {
  const initialMobile = typeof window !== 'undefined' && window.innerWidth <= 820
  const [detailEvent, setDetailEvent] = useState(null)
  const [quickAddDate, setQuickAddDate] = useState(null)
  const [view, setView] = useState(initialMobile ? 'timeGridDay' : 'timeGridWeek')
  const [isMobile, setIsMobile] = useState(initialMobile)
  const calendarRef = useRef()
  const panelRef = useRef()

  // Track viewport so the panel + calendar can stack on small screens.
  // Initial value comes from initialMobile (render-time); the listener only
  // reacts to later resizes (no synchronous setState in the effect).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)')
    const onChange = e => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const [planPreview, setPlanPreview] = useState(null)
  const touch = useRef({ x:0, y:0, skip:false })

  // §15 mobile swipe → prev/next period (ignores swipes that start on a
  // draggable event/card so it doesn't fight drag-to-reschedule).
  function onTouchStart(e) {
    if (!isMobile) return
    const t = e.touches[0]
    touch.current = { x:t.clientX, y:t.clientY, skip: !!(e.target.closest && e.target.closest('.fc-event, .unsched-item')) }
  }
  function onTouchEnd(e) {
    if (!isMobile || touch.current.skip) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x, dy = t.clientY - touch.current.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const api = calendarRef.current?.getApi()
      if (dx < 0) api?.next(); else api?.prev()
    }
  }

  const reschedule = onReschedule || (() => {})
  const showPanel = view !== 'dayGridMonth'

  // §6 AI Plan My Day — order unscheduled tasks (AI + heuristics) and pack
  // them into the viewed day's free slots; preview before applying.
  async function aiPlanDay() {
    const api = calendarRef.current?.getApi()
    const target = api ? api.getDate() : new Date()
    const todo = (logs || []).filter(l => !l.startAt && l.status !== 'done')
    if (!todo.length) { setPlanPreview({ none: true }); return }
    setPlanPreview({ loading: true })

    const dayStr = `${target.getFullYear()}-${pad2(target.getMonth()+1)}-${pad2(target.getDate())}`
    const busy = (logs || [])
      .filter(l => l.startAt && sameLocalDay(l.startAt, target))
      .map(l => ({ s: l.startAt, e: l.endAt || new Date(new Date(l.startAt).getTime() + (hrsOf(l)||1)*3600000).toISOString() }))

    // Order via AI (smart prioritization); fall back to heuristic order.
    let ordered = planOrder(todo)
    let strategy = 'เรียงตามกำหนดส่งและความสำคัญ แล้วจัดลงช่องเวลาว่าง'
    try {
      const prompt = `จัดลำดับความสำคัญของงานสำหรับวันที่ ${dayStr} (ทำงาน 09:00–18:00) เรียงจากควรทำก่อน→หลัง พิจารณา: งานเลยกำหนด, ใกล้ deadline, priority สูง, เวลาที่ใช้\nงาน:\n${todo.map(t => `- id:${t.id} | ${safe(t.title,'งาน')} | ${hrsOf(t)||1}ชม | priority:${t.priority||'medium'} | due:${t.dueDate||'-'}`).join('\n')}\nตอบ JSON เท่านั้น: {"order":[id เรียงตามลำดับ],"strategy":"กลยุทธ์สั้นๆ 1 ประโยคภาษาไทย"}`
      const res = await fetch('/api/claude', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt, system:'ตอบ JSON เท่านั้น ห้าม markdown', max_tokens:700 }) })
      const { text } = await res.json()
      const s = text.indexOf('{'), e = text.lastIndexOf('}')
      const j = JSON.parse(text.slice(s, e+1))
      if (Array.isArray(j.order)) {
        const byId = new Map(todo.map(t => [String(t.id), t]))
        const seen = new Set()
        const fromAI = j.order.map(id => byId.get(String(id))).filter(Boolean)
        fromAI.forEach(t => seen.add(String(t.id)))
        ordered = [...fromAI, ...todo.filter(t => !seen.has(String(t.id)))] // append any missed
      }
      if (j.strategy) strategy = String(j.strategy)
    } catch { /* heuristic order already set */ }

    const { placed, unplaced } = packDay(ordered, target, busy, 9, 18)
    setPlanPreview({ date: dayStr, placed, unplaced, strategy })
  }

  async function acceptPlan() {
    const items = planPreview?.placed || []
    for (const p of items) await reschedule(p.id, { startAt: p.startAt, endAt: p.endAt })
    setPlanPreview(null)
  }

  // Tasks with no scheduled time → the Unscheduled panel (skip completed ones)
  const unscheduledTasks = (logs || []).filter(l => !l.startAt && l.status !== 'done')

  // Convert logs → FullCalendar events.
  // Scheduled (start_at) → real timed block; the rest → all-day (month only).
  const events = (logs || []).map(log => {
    const cat = getCat(log.category || 'other')
    const scheduled = !!log.startAt
    return {
      id: String(log.id),
      title: safe(log.title, 'ไม่มีชื่อ'),
      ...(scheduled
        ? { start: log.startAt, end: log.endAt || undefined, allDay: false }
        : { start: log.date, allDay: true }),
      backgroundColor: cat.color,
      borderColor: 'transparent',
      textColor: '#ffffff',
      classNames: deadlineClass(log.dueDate),
      extendedProps: {
        id:          log.id,
        title:       safe(log.title, 'ไม่มีชื่อ'),
        category:    safe(log.category, 'other'),
        hours:       log.hours || log.hours_spent || 0,
        status:      safe(log.status, 'done'),
        tags:        Array.isArray(log.tags) ? log.tags : [],
        description: safe(log.description, ''),
        aiSummary:   safe(log.aiSummary || log.ai_summary, ''),
        imageUrls:   Array.isArray(log.imageUrls) ? log.imageUrls : (Array.isArray(log.image_urls) ? log.image_urls : []),
        date:        safe(log.date, ''),
        startAt:     log.startAt || null,
        endAt:       log.endAt || null,
        dueDate:     log.dueDate || null,
        priority:    log.priority || 'medium',
      },
    }
  })

  // Make the Unscheduled panel cards draggable onto the timeline.
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const d = new Draggable(el, {
      itemSelector: '.unsched-item',
      eventData: itemEl => ({
        title: itemEl.dataset.title,
        duration: { hours: parseFloat(itemEl.dataset.hours) || 1 },
        backgroundColor: itemEl.dataset.color,
        borderColor: 'transparent',
        textColor: '#ffffff',
        extendedProps: { logId: itemEl.dataset.id },
      }),
    })
    return () => d.destroy()
  }, [view, unscheduledTasks.length])

  function handleEventClick(info) {
    const e = info.event
    setDetailEvent({ title: safe(e.title, 'ไม่มีชื่อ'), startStr: e.startStr, extendedProps: e.extendedProps || {} })
  }

  function handleDateClick(info) { setQuickAddDate(info.dateStr) }

  function handleQuickAdd(data) {
    onAddLog({ ...data, title: safe(data.title, ''), imageUrls: data.imageUrls || [] })
  }

  // Drag/resize an existing block → save new time in place.
  function handleEventDrop(info) {
    const e = info.event
    if (e.allDay) reschedule(e.extendedProps.id, { date: e.startStr })           // moved between days (month)
    else reschedule(e.extendedProps.id, { startAt: e.start?.toISOString() || null, endAt: e.end?.toISOString() || null })
  }
  function handleEventResize(info) {
    const e = info.event
    reschedule(e.extendedProps.id, { startAt: e.start?.toISOString() || null, endAt: e.end?.toISOString() || null })
  }
  // Dropped a card from the Unscheduled panel onto the grid.
  function handleEventReceive(info) {
    const e = info.event
    const logId = e.extendedProps.logId
    const start = e.start
    const end = e.end || new Date(start.getTime() + 60 * 60 * 1000)
    reschedule(logId, { startAt: start.toISOString(), endAt: end.toISOString() })
    info.event.remove() // state will re-render it as a real scheduled event
  }

  function handleEdit(editData) {
    onEditLog({
      id:          editData.id,
      title:       safe(editData.title, ''),
      description: safe(editData.description, ''),
      aiSummary:   safe(editData.aiSummary, ''),
      category:    safe(editData.category, 'other'),
      hours:       Number(editData.hours) || 0,
      status:      safe(editData.status, 'done'),
      tags:        Array.isArray(editData.tags) ? editData.tags : [],
      date:        safe(editData.date, ymd()),
      imageUrls:   Array.isArray(editData.imageUrls) ? editData.imageUrls : [],
      imageCount:  (editData.imageUrls || []).length,
      // Preserve scheduling so editing via the form doesn't unschedule the task.
      startAt:     editData.startAt || null,
      endAt:       editData.endAt || null,
      dueDate:     editData.dueDate || null,
      priority:    editData.priority || 'medium',
    })
  }

  return (
    <>
      <style>{CAL_CSS}</style>

      {/* Page header */}
      <div style={{ marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:700, color:'#1a1a2e' }}>Calendar</div>
            <div style={{ fontSize:13, color:'#9ca3af', marginTop:2 }}>วางแผนงานแบบ time-blocking · ลากงานมาวางบนตารางเวลา</div>
          </div>
          {!isMobile && showPanel && (
            <button onClick={aiPlanDay} disabled={!!planPreview?.loading} style={{ padding:'9px 18px', borderRadius:12, fontSize:13, fontWeight:700, border:'1px solid rgba(108,99,255,0.3)', background:'rgba(108,99,255,0.1)', color:'#6C63FF', cursor:'pointer', fontFamily:'inherit' }}>🤖 จัดตารางให้</button>
          )}
        </div>

        {/* View toggle — responsive segmented control (full-width on mobile) */}
        <div style={{ display:'flex', gap:10, marginTop:14, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ display:'flex', gap:4, flex: isMobile ? '1 1 100%' : '0 0 auto', background:'rgba(255,255,255,0.55)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:14, padding:4 }}>
            {[
              { key:'dayGridMonth', label:'เดือน' },
              { key:'timeGridWeek', label:'สัปดาห์' },
              { key:'timeGridDay',  label:'วัน' },
            ].map(v => (
              <button key={v.key} onClick={() => { setView(v.key); calendarRef.current?.getApi().changeView(v.key) }} style={{
                flex:1, padding:'10px 16px', borderRadius:10, fontSize:14, fontWeight: view===v.key?700:600,
                border:'none', whiteSpace:'nowrap', minWidth: isMobile ? 0 : 78,
                background: view===v.key ? 'linear-gradient(135deg,#6C63FF,#9B8FFF)' : 'transparent',
                color: view===v.key ? '#fff' : '#6b7099',
                cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
                boxShadow: view===v.key ? '0 2px 8px rgba(108,99,255,0.3)' : 'none',
              }}>{v.label}</button>
            ))}
          </div>
          {isMobile && showPanel && (
            <button onClick={aiPlanDay} disabled={!!planPreview?.loading} style={{ flex:'1 1 100%', padding:'12px', borderRadius:12, fontSize:14, fontWeight:700, border:'1px solid rgba(108,99,255,0.3)', background:'rgba(108,99,255,0.1)', color:'#6C63FF', cursor:'pointer', fontFamily:'inherit' }}>🤖 จัดตารางให้</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <CalendarStats logs={logs || []} />

      {/* Legend */}
      <CategoryLegend logs={logs || []} />

      {/* Unscheduled panel (week/day) + Calendar */}
      <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:16, alignItems:'stretch' }}>
        {showPanel && <UnscheduledPanel tasks={unscheduledTasks} panelRef={panelRef} isMobile={isMobile} />}
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ flex:1, minWidth:0, background:'rgba(255,255,255,0.58)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.92)', borderRadius:24, padding: isMobile ? 12 : 22, boxShadow:'0 8px 32px rgba(100,110,200,0.1)' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={initialMobile ? 'timeGridDay' : 'timeGridWeek'}
            locale="th"
            headerToolbar={{ left:'prev,next today', center:'title', right:'' }}
            events={events}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            editable={true}
            eventResizableFromStart={true}
            droppable={true}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventReceive={handleEventReceive}
            allDaySlot={true}
            allDayText={'ทั้งวัน'}
            navLinks={true}
            navLinkDayClick={(date) => { setView('timeGridDay'); calendarRef.current?.getApi().changeView('timeGridDay', date) }}
            moreLinkClick={(arg) => { setView('timeGridDay'); calendarRef.current?.getApi().changeView('timeGridDay', arg.date); return 'none' }}
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            nowIndicator={true}
            scrollTime="08:00:00"
            expandRows={true}
            dayMaxEvents={3}
            height="auto"
            aspectRatio={isMobile ? 0.8 : 1.5}
            firstDay={1}
            buttonText={{ today:'วันนี้', month:'เดือน', week:'สัปดาห์', day:'วัน' }}
            moreLinkContent={args => '+'+args.num+' งาน'}
          />
        </div>
      </div>

      {/* Hint */}
      <div style={{ marginTop:12, fontSize:12, color:'#9ca3af', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
        <span>🖱 ลากงานมาวางบนตารางเพื่อจัดเวลา</span>
        <span>·</span>
        <span>ลาก/ปรับขอบเพื่อเปลี่ยนเวลา (บันทึกอัตโนมัติ)</span>
        <span>·</span>
        <span>กดที่งานเพื่อดูรายละเอียด</span>
      </div>

      {/* Resource utilization + analytics (§8, §14) */}
      <CalendarAnalytics logs={logs || []} />

      {/* Task detail sidebar */}
      {detailEvent && (
        <TaskSidebar
          event={detailEvent}
          isMobile={isMobile}
          onClose={() => setDetailEvent(null)}
          onEdit={handleEdit}
          onDelete={id => { onDeleteLog(id); setDetailEvent(null) }}
          onUnschedule={id => { reschedule(id, { startAt:null, endAt:null }); setDetailEvent(null) }}
          onPatch={onPatch}
        />
      )}

      {quickAddDate && (
        <QuickAddModal
          date={quickAddDate}
          onClose={() => setQuickAddDate(null)}
          onAdd={handleQuickAdd}
        />
      )}

      {planPreview && (
        <PlanPreviewModal
          plan={planPreview}
          isMobile={isMobile}
          onAccept={acceptPlan}
          onClose={() => setPlanPreview(null)}
        />
      )}
    </>
  )
}
