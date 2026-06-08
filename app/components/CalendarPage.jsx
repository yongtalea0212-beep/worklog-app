"use client"
import { useState, useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
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
`

// ─────────────────────────────────────────
// EVENT DETAIL MODAL (click event)
// ─────────────────────────────────────────
function EventDetailModal({ event, onClose, onEdit, onDelete, onUnschedule }) {
  const [imgIndex, setImgIndex] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { if (fullscreen) setFullscreen(false); else onClose() }
      if (e.key === 'ArrowRight') setImgIndex(i => Math.min(i + 1, imageUrls.length - 1))
      if (e.key === 'ArrowLeft')  setImgIndex(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen, onClose])

  if (!event) return null

  const props      = event.extendedProps || {}
  const title      = safe(event.title || props.title, 'ไม่มีชื่อ')
  const category   = safe(props.category, 'other')
  const hours      = props.hours || 0
  const status     = safe(props.status, 'done')
  const tags       = Array.isArray(props.tags) ? props.tags : []
  const imageUrls  = Array.isArray(props.imageUrls) ? props.imageUrls : []
  const aiSummary  = safe(props.aiSummary, '')
  const description= safe(props.description, '')
  const date       = safe(event.startStr || props.date, '')
  const id         = props.id

  const cat = getCat(category)
  const statusColor = status === 'done' ? '#10B981' : status === 'in_progress' ? '#F59E0B' : '#9ca3af'
  const statusLabel = status === 'done' ? '✅ เสร็จแล้ว' : status === 'in_progress' ? '🔄 กำลังทำ' : '📝 ร่าง'
  const hasImages = imageUrls.length > 0

  const isScheduled = !!props.startAt

  function handleEdit() {
    onEdit({
      id, title, description, aiSummary, category,
      hours: Number(hours) || 0, status, tags,
      date: date ? date.split('T')[0] : new Date().toISOString().split('T')[0],
      imageUrls, imageCount: imageUrls.length,
      startAt: props.startAt || null, endAt: props.endAt || null,
      dueDate: props.dueDate || null, priority: props.priority || 'medium',
    })
    onClose()
  }

  // ── Fullscreen image viewer ──
  if (fullscreen && hasImages) {
    return (
      <div
        onClick={() => setFullscreen(false)}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', zIndex:400, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}
      >
        <img
          src={imageUrls[imgIndex]}
          alt={title}
          style={{ maxWidth:'90vw', maxHeight:'80vh', borderRadius:16, objectFit:'contain', boxShadow:'0 32px 80px rgba(0,0,0,0.8)' }}
          onClick={e => e.stopPropagation()}
        />
        <div style={{ display:'flex', gap:10, marginTop:16, alignItems:'center' }}>
          {imageUrls.length > 1 && (
            <>
              <button onClick={e=>{e.stopPropagation();setImgIndex(i=>Math.max(i-1,0))}} disabled={imgIndex===0} style={{ width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',color:'white',cursor:imgIndex===0?'default':'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',opacity:imgIndex===0?.3:1 }}>←</button>
              <span style={{ color:'rgba(255,255,255,0.6)', fontSize:13 }}>{imgIndex+1} / {imageUrls.length}</span>
              <button onClick={e=>{e.stopPropagation();setImgIndex(i=>Math.min(i+1,imageUrls.length-1))}} disabled={imgIndex===imageUrls.length-1} style={{ width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',color:'white',cursor:imgIndex===imageUrls.length-1?'default':'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',opacity:imgIndex===imageUrls.length-1?.3:1 }}>→</button>
            </>
          )}
          <button onClick={() => setFullscreen(false)} style={{ padding:'7px 18px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:10,color:'white',fontSize:13,cursor:'pointer',fontFamily:'inherit',marginLeft:8 }}>ปิด</button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(80,100,200,0.2)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20, animation:'cal-fade .2s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:'rgba(255,255,255,0.92)',
        backdropFilter:'blur(48px)', WebkitBackdropFilter:'blur(48px)',
        border:'1px solid rgba(255,255,255,0.99)',
        borderRadius:28,
        maxWidth:500, width:'100%',
        maxHeight:'88vh', overflowY:'auto',
        boxShadow:'0 32px 80px rgba(80,100,200,0.25)',
        animation:'cal-slide .25s ease',
        overflow:'hidden',
      }}>

        {/* ── Main Image Preview (medium size) ── */}
        {hasImages && (
          <div
            style={{ position:'relative', height:240, background:cat.bg, overflow:'hidden', cursor:'zoom-in', flexShrink:0 }}
            onClick={() => setFullscreen(true)}
          >
            {/* Skeleton */}
            {!imgLoaded && (
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,rgba(200,205,240,0.4) 25%,rgba(200,205,240,0.7) 50%,rgba(200,205,240,0.4) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }}/>
            )}

            <img
              src={imageUrls[imgIndex]}
              alt={title}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)}
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform .3s' }}
            />

            {/* Gradient overlay bottom */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:80, background:'linear-gradient(transparent,rgba(0,0,0,0.35))' }}/>

            {/* Zoom hint */}
            <div style={{ position:'absolute', bottom:12, left:14, fontSize:11, color:'rgba(255,255,255,0.85)', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ background:'rgba(0,0,0,0.35)', padding:'2px 8px', borderRadius:20, backdropFilter:'blur(6px)' }}>🔍 คลิกเพื่อขยาย</span>
            </div>

            {/* Nav dots */}
            {imageUrls.length > 1 && (
              <div style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', display:'flex', gap:5 }}>
                {imageUrls.map((_,i) => (
                  <button key={i} onClick={e=>{e.stopPropagation();setImgIndex(i);setImgLoaded(false)}} style={{ width:i===imgIndex?22:8, height:8, borderRadius:4, border:'none', background:i===imgIndex?'white':'rgba(255,255,255,0.5)', cursor:'pointer', transition:'all .2s', padding:0 }}/>
                ))}
              </div>
            )}

            {/* Count badge */}
            {imageUrls.length > 1 && (
              <div style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(6px)', color:'white', fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20 }}>
                {imgIndex+1}/{imageUrls.length}
              </div>
            )}

            {/* Close button */}
            <button onClick={e=>{e.stopPropagation();onClose()}} style={{ position:'absolute', top:12, left:12, width:32, height:32, borderRadius:10, background:'rgba(255,255,255,0.85)', border:'none', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)', fontWeight:700, color:'#1a1a2e' }}>×</button>
          </div>
        )}

        {/* ── Thumbnail strip ── */}
        {imageUrls.length > 1 && (
          <div style={{ display:'flex', gap:6, padding:'10px 20px', background:'rgba(255,255,255,0.5)', borderBottom:'1px solid rgba(200,210,240,0.3)', overflowX:'auto' }}>
            {imageUrls.map((url,i) => (
              <div key={i} onClick={() => {setImgIndex(i);setImgLoaded(false)}} style={{ width:52, height:52, borderRadius:9, overflow:'hidden', border:'2px solid '+(i===imgIndex?'#6C63FF':'rgba(200,210,240,0.5)'), cursor:'pointer', flexShrink:0, transition:'all .15s' }}>
                <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy"/>
              </div>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        <div style={{ padding:22 }}>

          {/* Header */}
          {!hasImages && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:4 }}>
              <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9ca3af', lineHeight:1 }}>×</button>
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:10 }}>
            <span style={{ background:cat.bg, color:cat.color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{cat.icon} {cat.label}</span>
            <span style={{ background:statusColor+'15', color:statusColor, fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20 }}>{statusLabel}</span>
          </div>

          <div style={{ fontSize:19, fontWeight:700, color:'#1a1a2e', lineHeight:1.3, marginBottom:5 }}>{title}</div>
          <div style={{ fontSize:13, color:'#9ca3af', marginBottom:16 }}>{fmtDate(date)}</div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
            {[
              { label:'เวลา',      value:`${hours} ชม.`,        color:cat.color    },
              { label:'ไฟล์',     value:`${imageUrls.length}`,  color:'#6C63FF'    },
              { label:'Tags',      value:`${tags.length}`,       color:'#8B5CF6'    },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.6)', border:'1px solid rgba(200,210,240,0.4)', borderRadius:11, padding:'9px 11px', textAlign:'center' }}>
                <div style={{ fontSize:18, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'#9ca3af', marginTop:3, fontWeight:500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* AI Summary */}
          {aiSummary && (
            <div style={{ background:'linear-gradient(135deg,rgba(108,99,255,0.07),rgba(167,139,250,0.04))', border:'1px solid rgba(108,99,255,0.16)', borderRadius:13, padding:'12px 14px', marginBottom:14 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'#6C63FF', letterSpacing:1, marginBottom:5 }}>✨ AI SUMMARY</div>
              <div style={{ fontSize:13, color:'#4a5568', lineHeight:1.75 }}>{aiSummary}</div>
            </div>
          )}

          {/* Description fallback */}
          {!aiSummary && description && (
            <div style={{ background:'rgba(255,255,255,0.55)', border:'1px solid rgba(200,210,240,0.4)', borderRadius:13, padding:'12px 14px', marginBottom:14 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'#9ca3af', letterSpacing:1, marginBottom:5 }}>DESCRIPTION</div>
              <div style={{ fontSize:13, color:'#4a5568', lineHeight:1.75 }}>{description}</div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:16 }}>
              {tags.map((t,i) => (
                <span key={i} style={{ background:'rgba(108,99,255,0.09)', border:'1px solid rgba(108,99,255,0.18)', color:'#6C63FF', fontSize:11, fontWeight:500, padding:'3px 9px', borderRadius:20 }}>#{t}</span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', paddingTop:14, borderTop:'1px solid rgba(0,0,0,0.06)' }}>
            <button onClick={() => { onDelete(id); onClose() }} style={{ padding:'9px 18px', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:11, fontSize:13, color:'#EF4444', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>ลบ</button>
            {isScheduled && onUnschedule && (
              <button onClick={() => onUnschedule(id)} style={{ padding:'9px 18px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:11, fontSize:13, color:'#F59E0B', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>↩ ยกเลิกเวลา</button>
            )}
            {hasImages && (
              <button onClick={() => setFullscreen(true)} style={{ padding:'9px 18px', background:'rgba(108,99,255,0.09)', border:'1px solid rgba(108,99,255,0.2)', borderRadius:11, fontSize:13, color:'#6C63FF', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>🖼 ดูรูปเต็ม</button>
            )}
            <button onClick={handleEdit} style={{ padding:'9px 24px', background:'linear-gradient(135deg,#6C63FF,#9B8FFF)', border:'none', borderRadius:11, fontSize:13, fontWeight:700, color:'white', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 12px rgba(108,99,255,0.32)' }}>✏️ แก้ไข</button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes cal-fade{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
        @keyframes cal-slide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
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
  const today = new Date().toISOString().split('T')[0]
  const scheduled = logs.filter(l => l.startAt)
  const done      = logs.filter(l => l.status === 'done')
  const unsched   = logs.filter(l => !l.startAt && l.status !== 'done')
  const plannedH  = round1(scheduled.reduce((s,l) => s + hrsOf(l), 0))
  const loggedH   = round1(done.reduce((s,l) => s + hrsOf(l), 0))
  const todayH    = round1(scheduled.filter(l => String(l.startAt).split('T')[0] === today).reduce((s,l)=>s+hrsOf(l),0))

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
                <div style={{ fontSize:10.5, color:'#9ca3af', display:'flex', gap:6 }}>
                  <span>{cat.icon} {cat.label}</span>
                  <span>· {hrsOf(t) || 1} ชม.</span>
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
// MAIN CALENDAR PAGE
// ─────────────────────────────────────────
export default function CalendarPage({ logs, onAddLog, onEditLog, onDeleteLog, onReschedule }) {
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

  const reschedule = onReschedule || (() => {})
  const showPanel = view !== 'dayGridMonth'

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
      date:        safe(editData.date, new Date().toISOString().split('T')[0]),
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
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:'#1a1a2e' }}>Calendar</div>
          <div style={{ fontSize:13, color:'#9ca3af', marginTop:2 }}>วางแผนงานแบบ time-blocking · ลากงานมาวางบนตารางเวลา</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { key:'dayGridMonth', label:'เดือน' },
            { key:'timeGridWeek', label:'สัปดาห์' },
            { key:'timeGridDay',  label:'วัน' },
          ].map(v => (
            <button key={v.key} onClick={() => { setView(v.key); calendarRef.current?.getApi().changeView(v.key) }} style={{
              padding:'8px 16px', borderRadius:10, fontSize:13, fontWeight: view===v.key?700:500,
              border:'1px solid '+(view===v.key?'rgba(108,99,255,0.28)':'rgba(200,210,240,0.5)'),
              background: view===v.key?'rgba(108,99,255,0.12)':'rgba(255,255,255,0.65)',
              color: view===v.key?'#6C63FF':'#6b7099',
              cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
            }}>{v.label}</button>
          ))}
          <button onClick={() => onAddLog({ date: new Date().toISOString().split('T')[0], title:'', imageUrls:[] })} style={{ padding:'8px 18px', background:'linear-gradient(135deg,#6C63FF,#9B8FFF)', border:'none', borderRadius:10, fontSize:13, fontWeight:700, color:'white', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 12px rgba(108,99,255,0.3)' }}>+ เพิ่มงาน</button>
        </div>
      </div>

      {/* Stats */}
      <CalendarStats logs={logs || []} />

      {/* Legend */}
      <CategoryLegend logs={logs || []} />

      {/* Unscheduled panel (week/day) + Calendar */}
      <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:16, alignItems:'stretch' }}>
        {showPanel && <UnscheduledPanel tasks={unscheduledTasks} panelRef={panelRef} isMobile={isMobile} />}
        <div style={{ flex:1, minWidth:0, background:'rgba(255,255,255,0.58)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.92)', borderRadius:24, padding: isMobile ? 12 : 22, boxShadow:'0 8px 32px rgba(100,110,200,0.1)' }}>
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
            allDaySlot={false}
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

      {/* Modals */}
      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onEdit={handleEdit}
          onDelete={id => { onDeleteLog(id); setDetailEvent(null) }}
          onUnschedule={id => { reschedule(id, { startAt:null, endAt:null }); setDetailEvent(null) }}
        />
      )}

      {quickAddDate && (
        <QuickAddModal
          date={quickAddDate}
          onClose={() => setQuickAddDate(null)}
          onAdd={handleQuickAdd}
        />
      )}
    </>
  )
}
