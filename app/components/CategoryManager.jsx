'use client'
// app/components/CategoryManager.jsx
// Dynamic category CRUD with icon picker + color picker
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// 200+ icons organized by group
const ICON_GROUPS = {
  'งานสร้างสรรค์': ['🎨','✏️','🖌️','🖼️','📸','🎬','🎥','📹','🎙️','🎵','🎶','🎤','🎭','🎪','✨','💫','🌟','⭐','🔮','🪄'],
  'ธุรกิจ': ['💼','📊','📈','📉','💰','💵','💳','🏦','🤝','📋','📌','📎','🗂️','📁','📂','🗃️','📝','✍️','🖊️','📏'],
  'เทคโนโลยี': ['💻','🖥️','📱','⌨️','🖱️','🖨️','📡','🔌','💡','🔦','🔋','⚡','🤖','🧠','🔬','🔭','⚙️','🔧','🔩','🛠️'],
  'การตลาด': ['📢','📣','🔊','📡','🌐','🗣️','💬','📨','📩','📧','📤','📥','🎯','🏆','🥇','🎗️','🏅','🎖️','🪧','📰'],
  'การออกแบบ': ['🎭','🎨','🖼️','🖌️','✏️','📐','📏','🔲','🔳','⬛','⬜','🟥','🟧','🟨','🟩','🟦','🟪','🔷','🔶','🔸'],
  'การศึกษา': ['📚','📖','📕','📗','📘','📙','🎓','🏫','✏️','🖊️','📝','📓','📔','📒','📃','📄','📑','🗒️','🗓️','📅'],
  'สุขภาพ': ['🏥','💊','🩺','🩹','💉','🧬','🧪','🩻','❤️','💚','💛','💙','💜','🧡','🤍','🖤','🫀','🫁','🧠','👁️'],
  'กีฬา': ['⚽','🏀','🎾','⚾','🏐','🏈','🏉','🎱','🏓','🏸','🥊','🥋','⛷️','🏄','🚴','🏋️','🤸','🧘','🎽','🏆'],
  'อาหาร': ['🍕','🍔','🍜','🍱','🍣','🍛','🥗','🥘','🍲','🥩','🍗','🍖','🌮','🌯','🥙','🧆','🥚','🍳','🥓','🧇'],
  'เดินทาง': ['✈️','🚂','🚢','🚗','🏨','🌍','🗺️','🧭','🏔️','🏖️','🌋','🏕️','🗽','🗼','🏰','⛩️','🕌','🛕','🕍','⛪'],
  'บ้านและชีวิต': ['🏠','🏡','🏗️','🔑','🪑','🛋️','🛏️','🚿','🛁','🪟','🚪','🪴','🌱','🌿','🍀','🌸','🌺','🌻','🌹','💐'],
  'อื่นๆ': ['⭐','❤️','✅','❌','⚠️','💡','🔔','🔕','🎁','🎉','🎊','🎈','🎀','🪅','🧧','🎆','🎇','🧨','🪔','🕯️'],
}

const PRESET_COLORS = [
  { color: '#6C63FF', bg: 'rgba(108,99,255,0.12)', label: 'ม่วง' },
  { color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',  label: 'ฟ้า' },
  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'เหลือง' },
  { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'แดง' },
  { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'เขียว' },
  { color: '#EC4899', bg: 'rgba(236,72,153,0.12)', label: 'ชมพู' },
  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', label: 'ม่วงอ่อน' },
  { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: 'ส้ม' },
  { color: '#14B8A6', bg: 'rgba(20,184,166,0.12)', label: 'เขียวมิ้นต์' },
  { color: '#64748B', bg: 'rgba(100,116,139,0.12)', label: 'เทา' },
]

const DEFAULT_CATS = [
  { id: 'graphic',   label: 'Graphic Design', icon: '🎨', color: '#6C63FF', bg: 'rgba(108,99,255,0.1)' },
  { id: 'video',     label: 'Video',           icon: '🎬', color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
  { id: 'photo',     label: 'Photography',     icon: '📸', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  { id: 'marketing', label: 'Marketing',       icon: '📢', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  { id: 'ai',        label: 'AI Content',      icon: '🤖', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  { id: 'branding',  label: 'Branding',        icon: '✨', color: '#EC4899', bg: 'rgba(236,72,153,0.1)' },
  { id: 'pos',       label: 'POS Design',      icon: '🏪', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  { id: 'other',     label: 'อื่นๆ',           icon: '📌', color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
]

// Hook ใช้ใน component อื่น
export function useCategories() {
  const [cats, setCats] = useState(DEFAULT_CATS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadCats()
  }, [])

  async function loadCats() {
    try {
      // Try localStorage first (instant, no network)
      const saved = localStorage.getItem('stayscape_categories')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCats(parsed); setLoaded(true); return
        }
      }
      // Try Supabase — but don't crash if table doesn't exist
      const { data, error } = await supabase
        .from('categories')
        .select('id, label, icon, color, bg')
        .order('label')
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(d => ({
          id: String(d.id), label: String(d.label || ''),
          icon: String(d.icon || '📌'),
          color: String(d.color || '#6C63FF'),
          bg: String(d.bg || (d.color || '#6C63FF') + '20'),
        }))
        setCats(mapped)
        localStorage.setItem('stayscape_categories', JSON.stringify(mapped))
      }
      // If error (table not found etc.) — silently use DEFAULT_CATS
    } catch {}
    setLoaded(true)
  }

  return { cats, reload: loadCats }
}

// Icon Picker Component
function IconPicker({ value, onChange }) {
  const [search, setSearch] = useState('')
  const [activeGroup, setActiveGroup] = useState('งานสร้างสรรค์')

  const allIcons = Object.entries(ICON_GROUPS).flatMap(([, icons]) => icons)
  const filtered = search
    ? allIcons.filter(icon => icon.includes(search))
    : ICON_GROUPS[activeGroup] || []

  return (
    <div>
      {/* Search */}
      <input
        type="text" placeholder="ค้นหา emoji..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px',
          border: '1.5px solid rgba(108,99,255,0.2)',
          borderRadius: 10, fontSize: 13, fontFamily: 'inherit',
          outline: 'none', marginBottom: 10, boxSizing: 'border-box',
        }}
      />
      {/* Group tabs */}
      {!search && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {Object.keys(ICON_GROUPS).map(g => (
            <button key={g} onClick={() => setActiveGroup(g)} style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11,
              border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
              background: activeGroup === g ? 'rgba(108,99,255,0.1)' : 'transparent',
              borderColor: activeGroup === g ? 'rgba(108,99,255,0.3)' : 'rgba(200,210,240,0.4)',
              color: activeGroup === g ? '#6C63FF' : '#9ca3af',
            }}>{g}</button>
          ))}
        </div>
      )}
      {/* Icons grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
        {filtered.map((icon, i) => (
          <button key={i} onClick={() => onChange(icon)} style={{
            fontSize: 20, padding: 6, border: 'none', cursor: 'pointer',
            borderRadius: 8, background: value === icon ? 'rgba(108,99,255,0.15)' : 'transparent',
            outline: value === icon ? '2px solid rgba(108,99,255,0.4)' : 'none',
            transition: '.1s',
          }}>{icon}</button>
        ))}
      </div>
    </div>
  )
}

// Category Form (Add/Edit)
function CategoryForm({ initial, onSave, onCancel }) {
  const [label, setLabel]   = useState(initial?.label || '')
  const [icon, setIcon]     = useState(initial?.icon || '🎨')
  const [color, setColor]   = useState(initial?.color || '#6C63FF')
  const [showIcons, setShowIcons] = useState(false)
  const [saving, setSaving] = useState(false)

  const bg = color + '20'

  async function save() {
    if (!label.trim()) return
    setSaving(true)
    const cat = {
      id: initial?.id || label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now(),
      label: label.trim(),
      icon, color, bg,
    }
    try {
      // Try Supabase (table may not exist yet — that's OK)
      const row = { id: cat.id, label: cat.label, icon: cat.icon, color: cat.color, bg: cat.bg }
      if (initial?.id) {
        await supabase.from('categories').upsert(row)
      } else {
        await supabase.from('categories').insert(row)
      }
    } catch {}
    // Always save to localStorage
    const saved = JSON.parse(localStorage.getItem('stayscape_categories') || '[]')
    const idx = saved.findIndex(c => c.id === (initial?.id || cat.id))
    if (idx >= 0) saved[idx] = cat; else saved.push(cat)
    localStorage.setItem('stayscape_categories', JSON.stringify(saved))
    onSave(cat)
    setSaving(false)
  }

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: bg, border: `1.5px solid ${color}30`, borderRadius: 14 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color }}>{label || 'ชื่อหมวดหมู่'}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>ตัวอย่างหมวดหมู่</div>
        </div>
      </div>

      {/* Label */}
      <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>ชื่อหมวดหมู่ *</label>
      <input type="text" placeholder="เช่น Graphic Design, Video, ..."
        value={label} onChange={e => setLabel(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid rgba(200,210,240,0.6)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }}
      />

      {/* Icon picker toggle */}
      <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>ไอคอน</label>
      <button onClick={() => setShowIcons(s => !s)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', border: '1.5px solid rgba(200,210,240,0.5)',
        borderRadius: 10, background: 'rgba(255,255,255,0.7)',
        fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
      }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ color: '#4a5568' }}>เปลี่ยนไอคอน</span>
        <span style={{ color: '#9ca3af', fontSize: 12 }}>{showIcons ? '▲' : '▼'}</span>
      </button>
      {showIcons && (
        <div style={{ marginBottom: 14, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(200,210,240,0.4)', borderRadius: 12, padding: 12 }}>
          <IconPicker value={icon} onChange={v => { setIcon(v); setShowIcons(false) }} />
        </div>
      )}

      {/* Color picker */}
      <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 8 }}>สี</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {PRESET_COLORS.map(p => (
          <button key={p.color} onClick={() => setColor(p.color)}
            title={p.label}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: p.color, border: 'none', cursor: 'pointer',
              outline: color === p.color ? `3px solid ${p.color}` : 'none',
              outlineOffset: 2, transition: '.1s',
            }}/>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px', border: '1.5px solid rgba(200,210,240,0.5)', borderRadius: 10, background: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#4a5568' }}>ยกเลิก</button>
        <button onClick={save} disabled={saving || !label.trim()} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#6C63FF,#9B8FFF)', color: 'white', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving || !label.trim() ? .6 : 1 }}>
          {saving ? '⏳ กำลังบันทึก...' : '✓ บันทึก'}
        </button>
      </div>
    </div>
  )
}

// Main CategoryManager component
export default function CategoryManager({ onClose }) {
  const { cats, reload } = useCategories()
  const [editing, setEditing]   = useState(null)   // null | 'new' | cat object
  const [deleting, setDeleting] = useState(null)

  async function handleDelete(cat) {
    // Remove from localStorage
    const saved = JSON.parse(localStorage.getItem('stayscape_categories') || '[]')
    localStorage.setItem('stayscape_categories', JSON.stringify(saved.filter(c => c.id !== cat.id)))
    // Try Supabase
    try { await supabase.from('categories').delete().eq('id', cat.id) } catch {}
    setDeleting(null)
    reload()
  }

  function handleSaved(cat) {
    setEditing(null)
    reload()
  }

  return (
    <div style={{ minHeight: 400 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>จัดการหมวดหมู่</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{cats.length} หมวดหมู่</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditing('new')} style={{ padding: '7px 14px', background: 'linear-gradient(135deg,#6C63FF,#9B8FFF)', border: 'none', borderRadius: 10, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ เพิ่มหมวดหมู่</button>
          {onClose && <button onClick={onClose} style={{ padding: '7px 12px', border: '1px solid rgba(200,210,240,0.4)', borderRadius: 10, background: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#9ca3af' }}>✕</button>}
        </div>
      </div>

      {/* Add/Edit form */}
      {editing && (
        <div style={{ background: 'rgba(108,99,255,0.04)', border: '1.5px solid rgba(108,99,255,0.15)', borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6C63FF', marginBottom: 2 }}>
            {editing === 'new' ? '+ เพิ่มหมวดหมู่ใหม่' : `แก้ไข: ${editing.label}`}
          </div>
          <CategoryForm initial={editing === 'new' ? null : editing} onSave={handleSaved} onCancel={() => setEditing(null)} />
        </div>
      )}

      {/* Category list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {cats.map(cat => (
          <div key={cat.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(255,255,255,0.75)',
            border: '0.5px solid rgba(200,210,240,0.4)',
            borderRadius: 12, padding: '10px 14px',
          }}>
            {/* Icon + preview */}
            <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {cat.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{cat.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }}/>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>{cat.color}</span>
              </div>
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => setEditing(cat)} style={{ padding: '5px 10px', border: '1px solid rgba(200,210,240,0.4)', borderRadius: 8, background: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', color: '#6C63FF' }}>แก้ไข</button>
              {deleting === cat.id ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => handleDelete(cat)} style={{ padding: '5px 8px', border: 'none', borderRadius: 8, background: 'rgba(239,68,68,0.1)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', color: '#DC2626', fontWeight: 600 }}>ยืนยัน</button>
                  <button onClick={() => setDeleting(null)} style={{ padding: '5px 8px', border: '1px solid rgba(200,210,240,0.4)', borderRadius: 8, background: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', color: '#9ca3af' }}>ยกเลิก</button>
                </div>
              ) : (
                <button onClick={() => setDeleting(cat.id)} style={{ padding: '5px 8px', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, background: 'rgba(239,68,68,0.05)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', color: '#EF4444' }}>ลบ</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
