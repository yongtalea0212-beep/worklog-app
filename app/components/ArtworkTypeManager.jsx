'use client'
// Dynamic, user-managed artwork types (ประเภทชิ้นงาน).
// Stored in localStorage (same pattern as CategoryManager). Every screen looks
// types up by stable `id`, so rename / icon / color / description changes
// propagate everywhere automatically. A shared module cache + a
// 'artwork-types-changed' event keep open screens in sync without a refresh.
import { useState, useEffect } from 'react'

const LS_KEY = 'stayscape_artwork_types'

const ICON_GROUPS = {
  'ดีไซน์': ['🖼️','📃','✳️','🎨','🖌️','✏️','🧊','📱','🖥️','🌐','📐','🪧','🏷️','📑','📄','🗂️','🎭','🪄','✨','💠'],
  'วิดีโอ/โมชั่น': ['🎬','🎥','📹','🎞️','🌀','📽️','🎦','▶️','⏯️','🎙️','🎵','🎶','📺','💫','🔊','🎤','🎧','🕹️','🎪','🎡'],
  'โซเชียล': ['📘','📸','🎵','📱','💬','📢','📣','🔔','❤️','👍','🔁','#️⃣','🌐','📨','📩','🗣️','📤','🎯','🏆','🪧'],
  'ธุรกิจ': ['💼','📊','📈','📉','💰','💵','🧾','🤝','📋','📌','🗃️','🏪','🛍️','🏷️','🎁','📦','🖊️','📝','🗒️','🔖'],
  'อื่นๆ': ['📌','⭐','❤️','✅','⚠️','💡','🎉','🔑','🧩','🔥','🚀','🌟','🪅','🎈','🧠','⚙️','🔧','📎','📍','🗝️'],
}
export const PRESET_COLORS = [
  '#6C63FF','#EC4899','#06B6D4','#F59E0B','#EF4444','#10B981',
  '#8B5CF6','#F97316','#14B8A6','#3B82F6','#64748B','#0EA5E9',
]

// Defaults mirror the original fixed list, now fully editable.
export const DEFAULT_ARTWORK_TYPES = [
  { id:'banner',   label:'Banner',   icon:'🖼️', color:'#6C63FF', description:'', sort_order:0,  is_active:true },
  { id:'poster',   label:'Poster',   icon:'📃', color:'#EC4899', description:'', sort_order:1,  is_active:true },
  { id:'logo',     label:'Logo',     icon:'✳️', color:'#8B5CF6', description:'', sort_order:2,  is_active:true },
  { id:'video',    label:'Video',    icon:'🎬', color:'#06B6D4', description:'', sort_order:3,  is_active:true },
  { id:'facebook', label:'Facebook', icon:'📘', color:'#3B82F6', description:'', sort_order:4,  is_active:true },
  { id:'motion',   label:'Motion',   icon:'🌀', color:'#F59E0B', description:'', sort_order:5,  is_active:true },
  { id:'brochure', label:'Brochure', icon:'📑', color:'#14B8A6', description:'', sort_order:6,  is_active:true },
  { id:'website',  label:'Website',  icon:'🌐', color:'#10B981', description:'', sort_order:7,  is_active:true },
  { id:'ui',       label:'UI',       icon:'📱', color:'#0EA5E9', description:'', sort_order:8,  is_active:true },
  { id:'mockup',   label:'Mockup',   icon:'🧊', color:'#F97316', description:'', sort_order:9,  is_active:true },
  { id:'other',    label:'อื่นๆ',    icon:'📌', color:'#64748B', description:'', sort_order:10, is_active:true },
]

let _cache = null
export function loadArtworkTypes() {
  if (typeof window === 'undefined') return DEFAULT_ARTWORK_TYPES
  try {
    const p = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    _cache = (Array.isArray(p) && p.length) ? p : DEFAULT_ARTWORK_TYPES
  } catch { _cache = DEFAULT_ARTWORK_TYPES }
  return _cache
}
function persist(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list))
    _cache = list
    window.dispatchEvent(new Event('artwork-types-changed'))
  } catch {}
}
// Lookup by stable id — always resolves (falls back to a generic chip).
export function getArtworkType(id) {
  const list = _cache || loadArtworkTypes()
  return list.find(t => t.id === id) || { id: id || 'other', label: id || 'อื่นๆ', icon:'📌', color:'#64748B' }
}
// Active types in display order (favorites first).
export function activeArtworkTypes() {
  return (_cache || loadArtworkTypes())
    .filter(t => t.is_active !== false)
    .sort((a,b) => (b.favorite?1:0)-(a.favorite?1:0) || (a.sort_order??0)-(b.sort_order??0))
}

export function useArtworkTypes() {
  const [types, setTypes] = useState(() => (typeof window !== 'undefined' ? loadArtworkTypes() : DEFAULT_ARTWORK_TYPES))
  useEffect(() => {
    const h = () => setTypes([...loadArtworkTypes()])
    window.addEventListener('artwork-types-changed', h)
    window.addEventListener('storage', h)
    h()
    return () => { window.removeEventListener('artwork-types-changed', h); window.removeEventListener('storage', h) }
  }, [])
  const active = types.filter(t => t.is_active !== false)
    .sort((a,b) => (b.favorite?1:0)-(a.favorite?1:0) || (a.sort_order??0)-(b.sort_order??0))
  return { types, active }
}

// ── Icon Picker (emoji, searchable + grouped) ──
function IconPicker({ value, onChange }) {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('ดีไซน์')
  const all = Object.values(ICON_GROUPS).flat()
  const icons = search ? all.filter(i => i.includes(search)) : (ICON_GROUPS[group] || [])
  return (
    <div>
      <input placeholder="ค้นหา emoji... (วางอิโมจิได้)" value={search} onChange={e=>setSearch(e.target.value)}
        style={{ width:'100%', padding:'8px 12px', border:'1.5px solid rgba(108,99,255,0.2)', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', marginBottom:8, boxSizing:'border-box' }}/>
      {!search && (
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
          {Object.keys(ICON_GROUPS).map(g => (
            <button key={g} onClick={()=>setGroup(g)} style={{ padding:'3px 10px', borderRadius:20, fontSize:10, border:'1px solid', cursor:'pointer', fontFamily:'inherit', background:group===g?'rgba(108,99,255,0.1)':'transparent', borderColor:group===g?'rgba(108,99,255,0.3)':'rgba(200,210,240,0.4)', color:group===g?'#6C63FF':'#9ca3af' }}>{g}</button>
          ))}
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:4, maxHeight:170, overflowY:'auto' }}>
        {icons.map((icon,i)=>(
          <button key={i} onClick={()=>onChange(icon)} style={{ fontSize:20, padding:5, border:'none', cursor:'pointer', borderRadius:8, background:value===icon?'rgba(108,99,255,0.15)':'transparent', outline:value===icon?'2px solid rgba(108,99,255,0.4)':'none' }}>{icon}</button>
        ))}
      </div>
    </div>
  )
}

// ── Add/Edit form ──
function TypeForm({ initial, onSave, onCancel }) {
  const [label, setLabel] = useState(initial?.label || '')
  const [icon, setIcon] = useState(initial?.icon || '🖼️')
  const [color, setColor] = useState(initial?.color || '#6C63FF')
  const [description, setDescription] = useState(initial?.description || '')
  const [showIcons, setShowIcons] = useState(false)
  const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid rgba(200,210,240,0.6)', borderRadius:10, fontSize:13.5, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }
  return (
    <div style={{ paddingTop:6 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, padding:'12px 14px', background:color+'14', border:`1.5px solid ${color}35`, borderRadius:14 }}>
        <button onClick={()=>setShowIcons(s=>!s)} style={{ width:48, height:48, borderRadius:12, background:'#fff', border:`1.5px solid ${color}40`, fontSize:24, cursor:'pointer' }}>{icon}</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color }}>{label || 'ชื่อประเภท'}</div>
          <div style={{ fontSize:11, color:'#9ca3af' }}>{description || 'คลิกไอคอนเพื่อเปลี่ยน'}</div>
        </div>
      </div>
      {showIcons && <div style={{ marginBottom:14 }}><IconPicker value={icon} onChange={v=>{setIcon(v);setShowIcons(false)}}/></div>}
      <label style={{ fontSize:11, fontWeight:700, color:'#9ca3af', display:'block', marginBottom:5 }}>ชื่อประเภท *</label>
      <input style={{ ...inp, marginBottom:12 }} value={label} onChange={e=>setLabel(e.target.value)} placeholder="เช่น Facebook Ads"/>
      <label style={{ fontSize:11, fontWeight:700, color:'#9ca3af', display:'block', marginBottom:5 }}>รายละเอียด (แสดงตอนเลือกประเภท)</label>
      <textarea style={{ ...inp, marginBottom:12, minHeight:56, resize:'vertical' }} value={description} onChange={e=>setDescription(e.target.value)} placeholder="เช่น งานยิงโฆษณา Facebook · Boost Post · Artwork"/>
      <label style={{ fontSize:11, fontWeight:700, color:'#9ca3af', display:'block', marginBottom:6 }}>สี</label>
      <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:16 }}>
        {PRESET_COLORS.map(c=>(
          <button key={c} onClick={()=>setColor(c)} style={{ width:28, height:28, borderRadius:9, background:c, border:color===c?'3px solid #fff':'none', boxShadow:color===c?`0 0 0 2px ${c}`:'0 1px 3px rgba(0,0,0,0.15)', cursor:'pointer' }}/>
        ))}
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button onClick={onCancel} style={{ padding:'9px 18px', background:'rgba(0,0,0,0.04)', border:'none', borderRadius:10, fontSize:13, color:'#6b7099', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>ยกเลิก</button>
        <button onClick={()=>label.trim() && onSave({ id:initial?.id, label:label.trim(), icon, color, description:description.trim() })}
          style={{ padding:'9px 20px', background:'linear-gradient(135deg,#6C63FF,#9B8FFF)', border:'none', borderRadius:10, fontSize:13, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:label.trim()?1:.5 }}>บันทึก</button>
      </div>
    </div>
  )
}

// ── Main manager ──
export default function ArtworkTypeManager({ onClose, logs = [], onReassign }) {
  const [types, setTypes] = useState(loadArtworkTypes())
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)   // type object | 'new' | null
  const [delTarget, setDelTarget] = useState(null)
  const [delMoveTo, setDelMoveTo] = useState('__none__')

  function commit(next) {
    const withOrder = next.map((t,i)=>({ ...t, sort_order:i, updated_at:new Date().toISOString() }))
    persist(withOrder); setTypes(withOrder)
  }

  // artwork count per type id (backward compat: task w/o artworks not counted here)
  const counts = {}
  logs.forEach(l => (l.artworks||[]).forEach(a => { counts[a.type||'other'] = (counts[a.type||'other']||0)+1 }))

  function saveType(t) {
    const list = [...types]
    if (t.id) { const i = list.findIndex(x=>x.id===t.id); if (i>=0) list[i] = { ...list[i], ...t } }
    else {
      const id = t.label.toLowerCase().replace(/[^a-z0-9ก-๙]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'') + '_' + Date.now().toString(36)
      list.push({ ...t, id, is_active:true, created_at:new Date().toISOString() })
    }
    commit(list); setEditing(null)
  }
  const move = (i,dir) => { const j=i+dir; if(j<0||j>=types.length)return; const l=[...types]; [l[i],l[j]]=[l[j],l[i]]; commit(l) }
  const toggleActive = id => commit(types.map(t=>t.id===id?{...t,is_active:t.is_active===false}:t))
  const toggleFav = id => commit(types.map(t=>t.id===id?{...t,favorite:!t.favorite}:t))

  async function confirmDelete() {
    const id = delTarget.id
    const target = delMoveTo === '__none__' ? null : delMoveTo
    if ((counts[id]||0) > 0 && onReassign) await onReassign(id, target)
    commit(types.filter(t=>t.id!==id))
    setDelTarget(null); setDelMoveTo('__none__')
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(types,null,2)], { type:'application/json' })
    const url = URL.createObjectURL(blob); const a=document.createElement('a')
    a.href=url; a.download='stayscape-artwork-types.json'; a.click(); URL.revokeObjectURL(url)
  }
  function importJSON(file) {
    const r = new FileReader()
    r.onload = () => { try { const p=JSON.parse(r.result); if(Array.isArray(p)&&p.length) commit(p) } catch {} }
    r.readAsText(file)
  }

  const shown = search
    ? types.filter(t => (t.label||'').toLowerCase().includes(search.toLowerCase()) || (t.description||'').toLowerCase().includes(search.toLowerCase()))
    : types

  return (
    <div style={{ maxHeight:'82vh', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <div style={{ fontSize:18, fontWeight:800, color:'#1a1a2e' }}>🖼️ จัดการประเภทชิ้นงาน</div>
        <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'rgba(0,0,0,0.04)', border:'none', fontSize:18, cursor:'pointer', color:'#6b7099' }}>×</button>
      </div>
      <div style={{ fontSize:12, color:'#9ca3af', marginBottom:14 }}>เพิ่ม / แก้ไข / ลบ / จัดลำดับ — เปลี่ยนแล้วทุกหน้าอัปเดตทันที</div>

      {editing ? (
        <TypeForm initial={editing==='new'?null:editing} onSave={saveType} onCancel={()=>setEditing(null)}/>
      ) : delTarget ? (
        <div style={{ paddingTop:6 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:6 }}>ลบ "{delTarget.icon} {delTarget.label}"</div>
          {(counts[delTarget.id]||0) > 0 ? (
            <>
              <div style={{ fontSize:13, color:'#EF4444', marginBottom:12 }}>ประเภทนี้มีชิ้นงานอยู่ {counts[delTarget.id]} ชิ้น — จะย้ายไปไหน?</div>
              <select value={delMoveTo} onChange={e=>setDelMoveTo(e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid rgba(200,210,240,0.6)', borderRadius:10, fontSize:13.5, fontFamily:'inherit', marginBottom:16 }}>
                <option value="__none__">ไม่มีประเภท (อื่นๆ)</option>
                {types.filter(t=>t.id!==delTarget.id).map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </>
          ) : <div style={{ fontSize:13, color:'#6b7099', marginBottom:16 }}>ประเภทนี้ยังไม่มีชิ้นงาน ลบได้เลย</div>}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={()=>setDelTarget(null)} style={{ padding:'9px 18px', background:'rgba(0,0,0,0.04)', border:'none', borderRadius:10, fontSize:13, color:'#6b7099', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>ยกเลิก</button>
            <button onClick={confirmDelete} style={{ padding:'9px 20px', background:'#EF4444', border:'none', borderRadius:10, fontSize:13, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>ยืนยันลบ</button>
          </div>
        </div>
      ) : (
        <>
          <input placeholder="🔍 ค้นหาประเภท..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:'100%', padding:'9px 12px', border:'1.5px solid rgba(200,210,240,0.6)', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', marginBottom:10, boxSizing:'border-box' }}/>
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
            {shown.map((t) => {
              const i = types.findIndex(x=>x.id===t.id)
              const inactive = t.is_active === false
              return (
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', background:inactive?'rgba(0,0,0,0.02)':t.color+'0D', border:`1px solid ${inactive?'rgba(200,210,240,0.4)':t.color+'26'}`, borderRadius:12, opacity:inactive?0.55:1 }}>
                  {!search && (
                    <div style={{ display:'flex', flexDirection:'column' }}>
                      <button onClick={()=>move(i,-1)} disabled={i===0} style={{ border:'none', background:'none', cursor:i===0?'default':'pointer', color:'#c0c6d8', fontSize:10, padding:0, opacity:i===0?.3:1 }}>▲</button>
                      <button onClick={()=>move(i,1)} disabled={i===types.length-1} style={{ border:'none', background:'none', cursor:i===types.length-1?'default':'pointer', color:'#c0c6d8', fontSize:10, padding:0, opacity:i===types.length-1?.3:1 }}>▼</button>
                    </div>
                  )}
                  <div style={{ width:34, height:34, borderRadius:10, background:t.color+'1A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{t.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13.5, fontWeight:700, color:'#1a1a2e', display:'flex', alignItems:'center', gap:6 }}>
                      {t.label}
                      {(counts[t.id]||0)>0 && <span style={{ fontSize:10.5, fontWeight:700, color:t.color, background:t.color+'18', borderRadius:20, padding:'1px 8px' }}>{counts[t.id]}</span>}
                    </div>
                    {t.description && <div style={{ fontSize:11, color:'#9ca3af', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.description}</div>}
                  </div>
                  <button onClick={()=>toggleFav(t.id)} title="ปักหมุด" style={{ border:'none', background:'none', cursor:'pointer', fontSize:15, opacity:t.favorite?1:0.3 }}>📌</button>
                  <button onClick={()=>toggleActive(t.id)} title={inactive?'แสดง':'ซ่อน'} style={{ border:'none', background:'none', cursor:'pointer', fontSize:14 }}>{inactive?'🙈':'👁️'}</button>
                  <button onClick={()=>setEditing(t)} title="แก้ไข" style={{ border:'none', background:'none', cursor:'pointer', fontSize:14 }}>✏️</button>
                  <button onClick={()=>{setDelTarget(t);setDelMoveTo('__none__')}} title="ลบ" style={{ border:'none', background:'none', cursor:'pointer', fontSize:14, opacity:0.7 }}>🗑️</button>
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={()=>setEditing('new')} style={{ flex:1, minWidth:140, padding:'11px', background:'linear-gradient(135deg,#6C63FF,#9B8FFF)', border:'none', borderRadius:12, fontSize:13.5, color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>+ เพิ่มประเภทใหม่</button>
            <button onClick={exportJSON} title="Export JSON" style={{ padding:'11px 14px', background:'rgba(108,99,255,0.08)', border:'1px solid rgba(108,99,255,0.2)', borderRadius:12, fontSize:12.5, color:'#6C63FF', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>⬇ JSON</button>
            <label style={{ padding:'11px 14px', background:'rgba(108,99,255,0.08)', border:'1px solid rgba(108,99,255,0.2)', borderRadius:12, fontSize:12.5, color:'#6C63FF', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              ⬆ Import<input type="file" accept="application/json" style={{display:'none'}} onChange={e=>e.target.files[0]&&importJSON(e.target.files[0])}/>
            </label>
          </div>
        </>
      )}
    </div>
  )
}
