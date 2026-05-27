'use client'
// app/components/MobileNav.jsx
import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  { id: 'dashboard',    icon: '▦',  label: 'หน้าหลัก' },
  { id: 'logs',         icon: '≡',  label: 'งาน' },
  { id: '_fab',         icon: '+',  label: '' },           // FAB center
  { id: 'calendar',     icon: '📅', label: 'ปฏิทิน' },
  { id: '_menu',        icon: '☰',  label: 'เมนู' },
]

const SHEET_MENU = [
  { id: 'projects',       icon: '📁', label: 'Projects',           sub: 'จัดการโปรเจกต์' },
  { id: 'reports',        icon: '📊', label: 'Reports',            sub: 'รายงานสรุป' },
  { id: 'ai-assistant',   icon: '🤖', label: 'AI Assistant',       sub: 'ผู้ช่วย AI' },
  { id: 'export',         icon: '📥', label: 'Export Center',      sub: 'ส่งออกข้อมูล' },
  { id: 'presentation',   icon: '🎬', label: 'Presentation',       sub: 'สร้างสไลด์' },
  { id: 'gallery',        icon: '🖼', label: 'Gallery',            sub: 'คลังรูปภาพ' },
  { id: 'portfolio',      icon: '◈',  label: 'Portfolio',          sub: 'ผลงานของคุณ' },
  { id: 'line-integration',icon: '💬', label: 'LINE Integration',  sub: 'การแจ้งเตือน' },
]

const QUICK_ACTIONS = [
  { icon: '✨', label: 'Generate Report',  action: 'report' },
  { icon: '📤', label: 'Export PDF',       action: 'export-pdf' },
  { icon: '🎬', label: 'Create Slides',    action: 'slides' },
  { icon: '🧠', label: 'AI Summary',       action: 'ai-summary' },
]

export default function MobileNav({ currentPage, onNavigate, onAction, logCount = 0 }) {
  const [sheetOpen, setSheetOpen] = useState(false)

  // Close sheet on page change
  useEffect(() => { setSheetOpen(false) }, [currentPage])

  function go(id) {
    if (id === '_menu')  { setSheetOpen(true); return }
    if (id === '_fab')   { onNavigate?.('log'); return }
    onNavigate?.(id)
  }

  function handleSheetNav(id) {
    setSheetOpen(false)
    onNavigate?.(id)
  }

  function handleAction(action) {
    setSheetOpen(false)
    onAction?.(action)
  }

  return (
    <>
      {/* ── Bottom Navigation Bar ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '0.5px solid rgba(108,99,255,0.12)',
        boxShadow: '0 -2px 20px rgba(100,100,200,0.08)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
        zIndex: 100,
      }}>
        {NAV_ITEMS.map(item => {
          if (item.id === '_fab') return (
            <button key="_fab" onClick={() => go('_fab')} style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, #6C63FF, #9B8FFF)',
              color: 'white', fontSize: 26, fontWeight: 300,
              border: 'none', cursor: 'pointer',
              marginTop: -20, flexShrink: 0,
              boxShadow: '0 6px 20px rgba(108,99,255,0.4)',
              outline: '3px solid rgba(255,255,255,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: '.15s',
            }}>+</button>
          )

          const isActive = item.id !== '_menu' && currentPage === item.id
          return (
            <button key={item.id} onClick={() => go(item.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '4px 12px', borderRadius: 10, minWidth: 52,
              background: isActive ? 'rgba(108,99,255,0.08)' : 'none',
              border: 'none', cursor: 'pointer',
              color: isActive ? '#6C63FF' : '#9ca3af',
              fontSize: 10, fontWeight: isActive ? 700 : 500,
              fontFamily: 'inherit', transition: '.15s',
              position: 'relative',
            }}>
              <span style={{ fontSize: 20, lineHeight: 1.2 }}>{item.icon}</span>
              <span>{item.label}</span>
              {/* Badge for log count */}
              {item.id === 'logs' && logCount > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 6,
                  background: '#6C63FF', color: 'white',
                  fontSize: 9, fontWeight: 700,
                  borderRadius: 10, padding: '1px 5px',
                  border: '1.5px solid white',
                }}>{logCount > 99 ? '99+' : logCount}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* ── Bottom Sheet Overlay ── */}
      {sheetOpen && (
        <div onClick={() => setSheetOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(26,26,46,0.35)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          animation: 'fadeInOverlay .2s ease',
        }}>
          <style>{`
            @keyframes fadeInOverlay { from{opacity:0} to{opacity:1} }
            @keyframes slideUpSheet  { from{transform:translateY(100%)} to{transform:translateY(0)} }
          `}</style>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(30px)',
            borderRadius: '24px 24px 0 0',
            borderTop: '0.5px solid rgba(108,99,255,0.1)',
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            animation: 'slideUpSheet .25s cubic-bezier(0.34,1.2,0.64,1)',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: 'rgba(108,99,255,0.2)', borderRadius: 2, margin: '12px auto 4px' }}/>

            {/* Quick Actions */}
            <div style={{ padding: '4px 14px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '.8px', textTransform: 'uppercase', padding: '10px 2px 8px' }}>Quick Actions</div>
              <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
                {QUICK_ACTIONS.map(a => (
                  <button key={a.action} onClick={() => handleAction(a.action)} style={{
                    flexShrink: 0, background: 'rgba(255,255,255,0.8)',
                    border: '0.5px solid rgba(108,99,255,0.12)',
                    borderRadius: 20, padding: '8px 14px',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 500, color: '#1a1a2e',
                    cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                    transition: '.15s',
                  }}>{a.icon} {a.label}</button>
                ))}
              </div>
            </div>

            {/* Main menu grid */}
            <div style={{ padding: '0 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '.8px', textTransform: 'uppercase', padding: '4px 2px 10px' }}>เมนูหลัก</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {SHEET_MENU.map(item => (
                  <button key={item.id} onClick={() => handleSheetNav(item.id)} style={{
                    background: currentPage === item.id ? 'rgba(108,99,255,0.08)' : 'rgba(255,255,255,0.8)',
                    border: currentPage === item.id ? '1.5px solid rgba(108,99,255,0.25)' : '0.5px solid rgba(108,99,255,0.1)',
                    borderRadius: 14, padding: '12px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', transition: '.15s', textAlign: 'left',
                    fontFamily: 'inherit',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: currentPage === item.id ? 'rgba(108,99,255,0.12)' : 'rgba(108,99,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 17, flexShrink: 0,
                    }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: currentPage === item.id ? '#6C63FF' : '#1a1a2e' }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{item.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
