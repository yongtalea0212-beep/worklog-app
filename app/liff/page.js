// app/liff/page.js
'use client'
import { useEffect, useState } from 'react'

export default function LiffPage() {
  const [status, setStatus] = useState('loading')
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    initLiff()
  }, [])

  async function initLiff() {
    try {
      // โหลด LIFF SDK
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID
      if (!liffId) { setError('ไม่พบ LIFF_ID'); setStatus('error'); return }

      // import LIFF SDK dynamically
      const liff = (await import('@line/liff')).default
      await liff.init({ liffId })

      if (!liff.isLoggedIn()) {
        liff.login()
        return
      }

      // ดึง profile
      const p = await liff.getProfile()
      setProfile(p)

      // Save userId ลง localStorage — SmartWorklogWorkspace จะหยิบไปใช้
      localStorage.setItem('line_user_id', p.userId)
      localStorage.setItem('line_display_name', p.displayName)
      localStorage.setItem('line_picture_url', p.pictureUrl || '')

      setStatus('success')

      // redirect กลับแอปหลังจาก 2 วินาที
      setTimeout(() => {
        if (liff.isInClient()) {
          liff.closeWindow()
        } else {
          window.location.href = '/'
        }
      }, 2000)

    } catch (e) {
      console.error('LIFF error:', e)
      setError(e.message)
      setStatus('error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      fontFamily: "'Inter', sans-serif",
      background: 'linear-gradient(135deg, #E8EAF6, #EDE7F6, #E3F2FD)',
      padding: 24,
    }}>
      {/* Logo */}
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, boxShadow: '0 8px 24px rgba(108,99,255,0.35)',
        marginBottom: 8,
      }}>✦</div>

      <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>WorkLog AI</div>

      {status === 'loading' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid rgba(108,99,255,0.2)',
            borderTop: '3px solid #6C63FF', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }}/>
          <div style={{ fontSize: 14, color: '#6b7099' }}>กำลังเชื่อมต่อ Line...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {status === 'success' && profile && (
        <div style={{
          background: 'rgba(255,255,255,0.85)',
          borderRadius: 20,
          padding: '20px 28px',
          textAlign: 'center',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.9)',
          maxWidth: 300,
        }}>
          {profile.pictureUrl && (
            <img src={profile.pictureUrl} alt="" style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '3px solid rgba(108,99,255,0.2)',
              marginBottom: 10,
            }}/>
          )}
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
            {profile.displayName}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
            color: '#059669', fontSize: 12, fontWeight: 600,
            padding: '4px 12px', borderRadius: 20, marginBottom: 14,
          }}>
            ✅ เชื่อมต่อ Line สำเร็จ
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            กำลังกลับสู่แอป...
          </div>
        </div>
      )}

      {status === 'error' && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 14, padding: '16px 20px',
          textAlign: 'center', maxWidth: 280,
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, marginBottom: 4 }}>
            เกิดข้อผิดพลาด
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{error}</div>
          <button onClick={initLiff} style={{
            marginTop: 12, padding: '7px 18px',
            background: '#6C63FF', color: 'white',
            border: 'none', borderRadius: 8,
            fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ลองอีกครั้ง
          </button>
        </div>
      )}
    </div>
  )
}
