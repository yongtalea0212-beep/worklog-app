'use client'
import { useEffect, useState } from 'react'

// Floating "install app" pill. Uses the native beforeinstallprompt on
// Android/Chrome; shows Add-to-Home-Screen instructions on iOS Safari.
// Hidden when already installed (standalone) or after the user dismisses it.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [mode, setMode] = useState(null) // 'android' | 'ios' | null
  const [showIosTip, setShowIosTip] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (standalone) return
    if (localStorage.getItem('ss-install-dismissed') === '1') return

    const onBip = (e) => { e.preventDefault(); setDeferred(e); setMode('android') }
    const onInstalled = () => { setMode(null); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)

    // iOS Safari never fires beforeinstallprompt → detect and offer manual steps.
    const ua = window.navigator.userAgent || ''
    const isIos = /iphone|ipad|ipod/i.test(ua)
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
    if (isIos && isSafari) queueMicrotask(() => setMode('ios'))

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => { setMode(null); setShowIosTip(false); try { localStorage.setItem('ss-install-dismissed', '1') } catch {} }

  const install = async () => {
    if (mode === 'ios') { setShowIosTip((v) => !v); return }
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch {}
    setDeferred(null); setMode(null)
  }

  if (!mode) return null

  const wrap = {
    position: 'fixed', left: '50%', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)',
    transform: 'translateX(-50%)', zIndex: 2000, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 8, fontFamily: 'Inter, system-ui, sans-serif',
  }
  const pill = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
    background: 'linear-gradient(135deg,#6C63FF,#9B8FFF)', color: '#fff',
    borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
    boxShadow: '0 8px 28px rgba(108,99,255,0.45)',
  }
  const xBtn = {
    background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', width: 22, height: 22,
    borderRadius: '50%', cursor: 'pointer', fontSize: 13, lineHeight: 1, display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }

  return (
    <div style={wrap}>
      {mode === 'ios' && showIosTip && (
        <div style={{
          background: 'rgba(26,26,46,0.95)', color: '#fff', borderRadius: 14, padding: '12px 14px',
          fontSize: 13, lineHeight: 1.6, maxWidth: 280, boxShadow: '0 8px 28px rgba(0,0,0,0.3)', textAlign: 'center',
        }}>
          ติดตั้ง StayScape บนหน้าโฮม:<br />แตะปุ่ม <strong>แชร์</strong> ⬆️ แล้วเลือก<br /><strong>“เพิ่มไปยังหน้าจอโฮม”</strong>
        </div>
      )}
      <div style={pill}>
        <span onClick={install} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          📲 ติดตั้งแอป StayScape
        </span>
        <button aria-label="ปิด" onClick={dismiss} style={xBtn}>✕</button>
      </div>
    </div>
  )
}
