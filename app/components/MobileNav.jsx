'use client'
// app/components/MobileNav.jsx
// Mobile navigation: a slim bottom tab bar for primary destinations plus a
// slide-in drawer whose contents mirror the desktop sidebar (single source of
// truth — `navItems`) so top and bottom navigation stay consistent.
import { useState, useEffect } from 'react'

// Primary tabs shown in the bottom bar. Everything else lives in the drawer.
const PRIMARY = [
  { id: 'dashboard', icon: '▦', label: 'หน้าหลัก' },
  { id: 'logs',      icon: '≡', label: 'งาน' },
  { id: '_fab',      icon: '+', label: '' },
  { id: 'calendar',  icon: '📅', label: 'ปฏิทิน' },
  { id: '_menu',     icon: '☰', label: 'เมนู' },
]

export default function MobileNav({ currentPage, onNavigate, logCount = 0, navItems = [], user, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  function go(id) {
    if (id === '_menu') { setDrawerOpen(true); return }
    if (id === '_fab') { onNavigate?.('log'); return }
    onNavigate?.(id)
  }

  function handleNav(id) {
    setDrawerOpen(false)
    onNavigate?.(id)
  }

  const displayName = user?.user_metadata?.line_display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const avatar = user?.user_metadata?.line_picture_url

  return (
    <>
      <style>{NAV_CSS}</style>

      {/* ── Bottom Tab Bar ── */}
      <nav className="mnav-bar" aria-label="Primary">
        {PRIMARY.map(item => {
          if (item.id === '_fab') return (
            <button key="_fab" className="mnav-fab" onClick={() => go('_fab')} aria-label="เพิ่มงาน">+</button>
          )
          const isMenu = item.id === '_menu'
          const isActive = !isMenu && currentPage === item.id
          return (
            <button key={item.id} className={'mnav-tab' + (isActive ? ' on' : '')} onClick={() => go(item.id)}
              aria-current={isActive ? 'page' : undefined} aria-haspopup={isMenu ? 'menu' : undefined} aria-expanded={isMenu ? drawerOpen : undefined}>
              <span className="mnav-ic">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'logs' && logCount > 0 && <span className="mnav-badge">{logCount > 99 ? '99+' : logCount}</span>}
            </button>
          )
        })}
      </nav>

      {/* ── Slide-in Drawer (mirrors the sidebar) ── */}
      {drawerOpen && (
        <div className="mnav-overlay" onClick={() => setDrawerOpen(false)} role="presentation">
          <aside className="mnav-drawer" onClick={e => e.stopPropagation()} role="menu" aria-label="เมนูนำทาง">
            <div className="mnav-drawer-head">
              <div className="mnav-avatar">
                {avatar ? <img src={avatar} alt="" /> : (displayName[0] || 'U').toUpperCase()}
              </div>
              <div className="mnav-user">
                <strong>{displayName}</strong>
                <span>{user?.app_metadata?.provider === 'google' ? '🟢 Google' : user?.user_metadata?.line_user_id ? '🟢 LINE' : '🟢 Active'}</span>
              </div>
              <button className="mnav-close" onClick={() => setDrawerOpen(false)} aria-label="ปิดเมนู">✕</button>
            </div>

            <div className="mnav-list">
              {navItems.map(item => {
                const isActive = currentPage === item.id
                return (
                  <button key={item.id} role="menuitem" className={'mnav-item' + (isActive ? ' on' : '')} onClick={() => handleNav(item.id)} aria-current={isActive ? 'page' : undefined}>
                    <span className="mnav-item-ic">{item.icon}</span>
                    <span className="mnav-item-label">{item.label}</span>
                    {item.badge > 0 && <span className="mnav-item-badge">{item.badge}</span>}
                  </button>
                )
              })}
            </div>

            {onLogout && (
              <button className="mnav-logout" role="menuitem" onClick={() => { setDrawerOpen(false); onLogout() }}>
                🚪 ออกจากระบบ
              </button>
            )}
          </aside>
        </div>
      )}
    </>
  )
}

const NAV_CSS = `
.mnav-bar{position:fixed;bottom:0;left:0;right:0;z-index:100;display:flex;justify-content:space-around;align-items:center;
  background:rgba(255,255,255,.94);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-top:.5px solid rgba(108,99,255,.12);box-shadow:0 -2px 20px rgba(100,100,200,.08);
  padding:8px 0 calc(8px + env(safe-area-inset-bottom))}
.mnav-tab{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:52px;padding:4px 12px;border:none;background:none;cursor:pointer;
  font-family:inherit;font-size:10px;font-weight:500;color:#9ca3af}
.mnav-tab.on{color:#6C63FF;font-weight:700;background:rgba(108,99,255,.08);border-radius:10px}
.mnav-tab:focus-visible{outline:2px solid #6C63FF;outline-offset:2px;border-radius:10px}
.mnav-ic{font-size:20px;line-height:1.2}
.mnav-badge{position:absolute;top:0;right:6px;background:#6C63FF;color:#fff;font-size:9px;font-weight:700;border-radius:10px;padding:1px 5px;border:1.5px solid #fff}
.mnav-fab{width:52px;height:52px;border-radius:16px;margin-top:-20px;flex-shrink:0;border:none;cursor:pointer;
  background:linear-gradient(135deg,#6C63FF,#9B8FFF);color:#fff;font-size:26px;
  box-shadow:0 6px 20px rgba(108,99,255,.4);outline:3px solid rgba(255,255,255,.9);
  display:flex;align-items:center;justify-content:center}
.mnav-fab:focus-visible{outline:3px solid #4338ca}
.mnav-overlay{position:fixed;inset:0;z-index:150;background:rgba(26,26,46,.4);backdrop-filter:blur(3px);animation:mnav-fade .2s ease}
@keyframes mnav-fade{from{opacity:0}to{opacity:1}}
.mnav-drawer{position:absolute;top:0;left:0;bottom:0;width:min(82vw,320px);display:flex;flex-direction:column;
  background:rgba(255,255,255,.98);backdrop-filter:blur(30px);border-right:.5px solid rgba(108,99,255,.12);
  box-shadow:4px 0 30px rgba(100,100,200,.18);animation:mnav-slide .26s cubic-bezier(.34,1.1,.64,1);
  padding:calc(14px + env(safe-area-inset-top)) 12px 14px;overflow-y:auto}
@keyframes mnav-slide{from{transform:translateX(-100%)}to{transform:translateX(0)}}
.mnav-drawer-head{display:flex;align-items:center;gap:10px;padding:6px 6px 14px;border-bottom:1px solid rgba(108,99,255,.1);margin-bottom:10px}
.mnav-avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#6C63FF,#9B8FFF);color:#fff;font-weight:700;font-size:15px}
.mnav-avatar img{width:100%;height:100%;object-fit:cover}
.mnav-user{flex:1;min-width:0;display:flex;flex-direction:column}
.mnav-user strong{font-size:14px;color:#1a1a2e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mnav-user span{font-size:10px;color:#9ca3af}
.mnav-close{width:32px;height:32px;border-radius:8px;border:none;background:rgba(108,99,255,.06);color:#6b7099;font-size:14px;cursor:pointer;flex-shrink:0}
.mnav-close:focus-visible{outline:2px solid #6C63FF}
.mnav-list{display:flex;flex-direction:column;gap:3px;flex:1}
.mnav-item{display:flex;align-items:center;gap:12px;padding:12px 12px;border-radius:12px;border:none;background:none;cursor:pointer;
  font-family:inherit;font-size:14px;font-weight:500;color:#1a1a2e;text-align:left;width:100%}
.mnav-item.on{background:rgba(108,99,255,.1);color:#6C63FF;font-weight:700}
.mnav-item:focus-visible{outline:2px solid #6C63FF;outline-offset:-2px}
.mnav-item-ic{font-size:18px;width:24px;text-align:center;flex-shrink:0}
.mnav-item-label{flex:1}
.mnav-item-badge{background:rgba(108,99,255,.12);color:#6C63FF;font-size:11px;font-weight:700;border-radius:10px;padding:1px 8px}
.mnav-logout{margin-top:10px;padding:12px;border-radius:12px;border:1px solid rgba(239,68,68,.15);background:rgba(239,68,68,.08);
  color:#EF4444;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}
.mnav-logout:focus-visible{outline:2px solid #EF4444}
@media (prefers-color-scheme: dark){
  .mnav-bar{background:rgba(15,23,42,.94)}
  .mnav-drawer{background:rgba(15,23,42,.99)}
  .mnav-user strong{color:#e2e8f0}
  .mnav-item{color:#e2e8f0}
}
`
