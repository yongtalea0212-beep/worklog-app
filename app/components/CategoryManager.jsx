'use client'
import { useState, useEffect } from 'react'

const ICON_GROUPS = {
  'งานสร้างสรรค์': ['🎨','✏️','🖌️','🖼️','📸','🎬','🎥','📹','🎙️','🎵','🎶','🎤','🎭','✨','💫','🌟','⭐','🔮','🪄','🎪'],
  'ธุรกิจ': ['💼','📊','📈','📉','💰','💵','💳','🏦','🤝','📋','📌','📎','🗂️','📁','📂','📝','✍️','🖊️','📏','🗃️'],
  'เทคโนโลยี': ['💻','🖥️','📱','⌨️','🖱️','📡','🔌','💡','🔦','🔋','⚡','🤖','🧠','🔬','🔭','⚙️','🔧','🔩','🛠️','🖨️'],
  'การตลาด': ['📢','📣','🔊','🌐','🗣️','💬','📨','📩','📧','📤','📥','🎯','🏆','🥇','🎗️','🏅','🪧','📰','🎖️','🔔'],
  'อื่นๆ': ['⭐','❤️','✅','❌','⚠️','💡','🎁','🎉','🎊','🎈','🎀','🪅','🧧','🕯️','🪔','🔑','🗝️','📌','📍','🏷️'],
}

const PRESET_COLORS = [
  { color:'#6C63FF', bg:'rgba(108,99,255,0.12)' },
  { color:'#06B6D4', bg:'rgba(6,182,212,0.12)' },
  { color:'#F59E0B', bg:'rgba(245,158,11,0.12)' },
  { color:'#EF4444', bg:'rgba(239,68,68,0.12)' },
  { color:'#10B981', bg:'rgba(16,185,129,0.12)' },
  { color:'#EC4899', bg:'rgba(236,72,153,0.12)' },
  { color:'#8B5CF6', bg:'rgba(139,92,246,0.12)' },
  { color:'#F97316', bg:'rgba(249,115,22,0.12)' },
  { color:'#14B8A6', bg:'rgba(20,184,166,0.12)' },
  { color:'#64748B', bg:'rgba(100,116,139,0.12)' },
]

export const DEFAULT_CATS = [
  { id:'graphic',   label:'Graphic Design', icon:'🎨', color:'#6C63FF', bg:'rgba(108,99,255,0.1)' },
  { id:'video',     label:'Video',           icon:'🎬', color:'#06B6D4', bg:'rgba(6,182,212,0.1)' },
  { id:'photo',     label:'Photography',     icon:'📸', color:'#F59E0B', bg:'rgba(245,158,11,0.1)' },
  { id:'marketing', label:'Marketing',       icon:'📢', color:'#EF4444', bg:'rgba(239,68,68,0.1)' },
  { id:'ai',        label:'AI Content',      icon:'🤖', color:'#8B5CF6', bg:'rgba(139,92,246,0.1)' },
  { id:'branding',  label:'Branding',        icon:'✨', color:'#EC4899', bg:'rgba(236,72,153,0.1)' },
  { id:'pos',       label:'POS Design',      icon:'🏪', color:'#10B981', bg:'rgba(16,185,129,0.1)' },
  { id:'other',     label:'อื่นๆ',           icon:'📌', color:'#64748B', bg:'rgba(100,116,139,0.1)' },
]

const LS_KEY = 'stayscape_categories'

function loadFromLS() {
  try {
    const s = localStorage.getItem(LS_KEY)
    if (!s) return null
    const p = JSON.parse(s)
    return Array.isArray(p) && p.length > 0 ? p : null
  } catch { return null }
}

function saveToLS(cats) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cats)) } catch {}
}

// ── Hook ─────────────────────────────────────────
export function useCategories() {
  const [cats, setCats] = useState(DEFAULT_CATS)

  useEffect(() => {
    const saved = loadFromLS()
    if (saved) setCats(saved)
  }, [])

  function reload() {
    const saved = loadFromLS()
    if (saved) setCats(saved)
    else setCats(DEFAULT_CATS)
  }

  return { cats, reload }
}

// ── Icon Picker ───────────────────────────────────
function IconPicker({ value, onChange }) {
  const [search, setSearch] = useState('')
  const [group, setGroup]   = useState('งานสร้างสรรค์')
  const all = Object.values(ICON_GROUPS).flat()
  const icons = search ? all.filter(i => i.includes(search)) : (ICON_GROUPS[group] || [])

  return (
    <div>
      <input type="text" placeholder="ค้นหา emoji..." value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width:'100%', padding:'8px 12px', border:'1.5px solid rgba(108,99,255,0.2)', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', marginBottom:8, boxSizing:'border-box' }}
      />
      {!search && (
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
          {Object.keys(ICON_GROUPS).map(g => (
            <button key={g} onClick={() => setGroup(g)} style={{ padding:'3px 10px', borderRadius:20, fontSize:10, border:'1px solid', cursor:'pointer', fontFamily:'inherit', background: group===g ? 'rgba(108,99,255,0.1)' : 'transparent', borderColor: group===g ? 'rgba(108,99,255,0.3)' : 'rgba(200,210,240,0.4)', color: group===g ? '#6C63FF' : '#9ca3af' }}>{g}</button>
          ))}
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:4, maxHeight:180, overflowY:'auto' }}>
        {icons.map((icon, i) => (
          <button key={i} onClick={() => onChange(icon)} style={{ fontSize:20, padding:5, border:'none', cursor:'pointer', borderRadius:8, background: value===icon ? 'rgba(108,99,255,0.15)' : 'transparent', outline: value===icon ? '2px solid rgba(108,99,255,0.4)' : 'none' }}>{icon}</button>
        ))}
      </div>
    </div>
  )
}

// ── Category Form ─────────────────────────────────
function CategoryForm({ initial, onSave, onCancel }) {
  const [label, setLabel]     = useState(initial?.label || '')
  const [icon, setIcon]       = useState(initial?.icon  || '🎨')
  const [color, setColor]     = useState(initial?.color || '#6C63FF')
  const [showIcons, setShowIcons] = useState(false)

  const bg = color + '20'

  function save() {
    if (!label.trim()) return
    const id = initial?.id || (label.toLowerCase().replace(/[^a-z0-9]/g,'_') + '_' + Date.now())
    const cat = { id, label: label.trim(), icon, color, bg }
    const existing = loadFromLS() || [...DEFAULT_CATS]
    const idx = existing.findIndex(c => c.id === id)
    if (idx >= 0) existing[idx] = cat; else existing.push(cat)
    saveToLS(existing)
    onSave(cat)
  }

  return (
    <div style={{ paddingTop:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, padding:'10px 14px', background:bg, border:`1.5px solid ${color}30`, borderRadius:12 }}>
        <span style={{ fontSize:26 }}>{icon}</span>
        <div style={{ fontSize:13, fontWeight:700, color }}>{label || 'ชื่อหมวดหมู่'}</div>
      </div>
      <label style={{ fontSize:12, fontWeight:600, color:'#4a5568', display:'block', marginBottom:5 }}>ชื่อหมวดหมู่ *</label>
      <input type="text" placeholder="เช่น Graphic Design..." value={label} onChange={e => setLabel(e.target.value)}
        style={{ width:'100%', padding:'9px 12px', border:'1.5px solid rgba(200,210,240,0.6)', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', marginBottom:12, boxSizing:'border-box' }}
      />
      <label style={{ fontSize:12, fontWeight:600, color:'#4a5568', display:'block', marginBottom:5 }}>ไอคอน</label>
      <button onClick={() => setShowIcons(s=>!s)} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', border:'1.5px solid rgba(200,210,240,0.5)', borderRadius:10, background:'rgba(255,255,255,0.7)', fontSize:13, cursor:'pointer', fontFamily:'inherit', marginBottom:8 }}>
        <span style={{ fontSize:18 }}>{icon}</span><span style={{ color:'#4a5568' }}>เปลี่ยนไอคอน</span><span style={{ color:'#9ca3af', fontSize:11 }}>{showIcons?'▲':'▼'}</span>
      </button>
      {showIcons && (
        <div style={{ marginBottom:12, background:'rgba(255,255,255,0.8)', border:'1px solid rgba(200,210,240,0.4)', borderRadius:12, padding:10 }}>
          <IconPicker value={icon} onChange={v => { setIcon(v); setShowIcons(false) }} />
        </div>
      )}
      <label style={{ fontSize:12, fontWeight:600, color:'#4a5568', display:'block', marginBottom:6 }}>สี</label>
      <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:14 }}>
        {PRESET_COLORS.map(p => (
          <button key={p.color} onClick={() => setColor(p.color)} style={{ width:26, height:26, borderRadius:8, background:p.color, border:'none', cursor:'pointer', outline: color===p.color ? `3px solid ${p.color}` : 'none', outlineOffset:2 }}/>
        ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onCancel} style={{ flex:1, padding:'9px', border:'1.5px solid rgba(200,210,240,0.5)', borderRadius:10, background:'rgba(255,255,255,0.6)', fontSize:13, cursor:'pointer', fontFamily:'inherit', color:'#4a5568' }}>ยกเลิก</button>
        <button onClick={save} disabled={!label.trim()} style={{ flex:2, padding:'9px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#6C63FF,#9B8FFF)', color:'white', fontSize:13, fontWeight:700, cursor: label.trim()?'pointer':'default', fontFamily:'inherit', opacity: label.trim()?1:.5 }}>✓ บันทึก</button>
      </div>
    </div>
  )
}

// ── Main CategoryManager ──────────────────────────
export default function CategoryManager({ onClose }) {
  const { cats, reload } = useCategories()
  const [editing, setEditing]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  function handleDelete(cat) {
    const existing = loadFromLS() || [...DEFAULT_CATS]
    saveToLS(existing.filter(c => c.id !== cat.id))
    setConfirmDel(null)
    reload()
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>จัดการหมวดหมู่</div>
          <div style={{ fontSize:11, color:'#9ca3af' }}>{cats.length} หมวดหมู่</div>
        </div>
        <div style={{ display:'flex', gap:7 }}>
          <button onClick={() => setEditing('new')} style={{ padding:'7px 14px', background:'linear-gradient(135deg,#6C63FF,#9B8FFF)', border:'none', borderRadius:10, color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>+ เพิ่ม</button>
          {onClose && <button onClick={onClose} style={{ padding:'7px 10px', border:'1px solid rgba(200,210,240,0.4)', borderRadius:10, background:'rgba(255,255,255,0.6)', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:'#9ca3af' }}>✕</button>}
        </div>
      </div>

      {editing && (
        <div style={{ background:'rgba(108,99,255,0.04)', border:'1.5px solid rgba(108,99,255,0.15)', borderRadius:14, padding:'12px 14px', marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#6C63FF', marginBottom:4 }}>{editing==='new'?'+ เพิ่มหมวดหมู่ใหม่':`แก้ไข: ${editing.label}`}</div>
          <CategoryForm initial={editing==='new'?null:editing} onSave={() => { setEditing(null); reload() }} onCancel={() => setEditing(null)} />
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {cats.map(cat => (
          <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.75)', border:'0.5px solid rgba(200,210,240,0.4)', borderRadius:12, padding:'9px 12px' }}>
            <div style={{ width:34, height:34, borderRadius:9, background:cat.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>{cat.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e' }}>{cat.label}</div>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:cat.color }}/>
                <span style={{ fontSize:10, color:'#9ca3af' }}>{cat.color}</span>
              </div>
            </div>
            <div style={{ display:'flex', gap:5 }}>
              <button onClick={() => setEditing(cat)} style={{ padding:'4px 9px', border:'1px solid rgba(108,99,255,0.2)', borderRadius:8, background:'rgba(108,99,255,0.06)', fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'#6C63FF' }}>แก้ไข</button>
              {confirmDel===cat.id ? (
                <>
                  <button onClick={() => handleDelete(cat)} style={{ padding:'4px 8px', border:'none', borderRadius:8, background:'rgba(239,68,68,0.1)', fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'#DC2626', fontWeight:600 }}>ยืนยัน</button>
                  <button onClick={() => setConfirmDel(null)} style={{ padding:'4px 7px', border:'1px solid rgba(200,210,240,0.4)', borderRadius:8, background:'transparent', fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'#9ca3af' }}>ยกเลิก</button>
                </>
              ) : (
                <button onClick={() => setConfirmDel(cat.id)} style={{ padding:'4px 8px', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, background:'rgba(239,68,68,0.05)', fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'#EF4444' }}>ลบ</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
