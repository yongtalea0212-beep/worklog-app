'use client'
import { useEffect, useState } from 'react'

export default function LiffPage() {
  const [status, setStatus] = useState('init')
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // Only shortcut if BOTH a cached LINE profile AND a live Supabase session exist
    ;(async () => {
      try {
        const cached = localStorage.getItem('lineProfile')
        if (cached) {
          const p = JSON.parse(cached)
          const { supabase: sb } = await import('../lib/supabase')
          const { data } = await sb.auth.getSession()
          if (p?.userId && data?.session) {
            setProfile(p)
            setStatus('success')
            setTimeout(() => { window.location.href = '/' }, 600)
            return
          }
        }
      } catch {}
      initLiff()
    })()
  }, [])

  // Derive a stable Supabase email+password from the LINE userId.
  // Same LINE user → same credentials → same Supabase uid on every device.
  async function lineCredentials(userId) {
    const enc = new TextEncoder()
    const buf = await crypto.subtle.digest('SHA-256', enc.encode('stayscape-line-v1:' + userId))
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    return {
      email: `line_${userId.toLowerCase()}@line.stayscape.app`,
      password: `Ln1!${hex.slice(0, 32)}`,
    }
  }

  async function initLiff() {
    setStatus('loading')
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID
      if (!liffId) throw new Error('LIFF_ID not configured')

      const liff = (await import('@line/liff')).default
      await liff.init({ liffId })

      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href })
        return
      }

      // Get profile BEFORE any redirect
      const p = await liff.getProfile()
      setProfile(p)

      // Save to localStorage for session persistence
      localStorage.setItem('lineProfile', JSON.stringify({
        userId: p.userId,
        displayName: p.displayName,
        pictureUrl: p.pictureUrl || '',
      }))
      localStorage.setItem('line_user_id', p.userId)
      localStorage.setItem('line_display_name', p.displayName)
      localStorage.setItem('line_picture_url', p.pictureUrl || '')

      // Sign into Supabase with a DETERMINISTIC account derived from the LINE userId.
      // This guarantees the SAME Supabase user (same uid) on every device for the
      // same LINE account → work logs stay in sync across mobile & desktop.
      try {
        const { supabase: sb } = await import('../lib/supabase')
        const { email, password } = await lineCredentials(p.userId)

        // Try to sign in to the existing account first
        let { data: signInData, error: signInErr } =
          await sb.auth.signInWithPassword({ email, password })

        // If the account doesn't exist yet, create it then sign in
        if (signInErr) {
          const { error: signUpErr } = await sb.auth.signUp({
            email, password,
            options: { data: {
              line_user_id: p.userId,
              line_display_name: p.displayName,
              line_picture_url: p.pictureUrl || '',
              provider: 'line',
            } }
          })
          if (signUpErr && !/already registered/i.test(signUpErr.message)) throw signUpErr
          const retry = await sb.auth.signInWithPassword({ email, password })
          if (retry.error) throw retry.error
          signInData = retry.data
        }

        if (!signInData?.session) throw new Error('ไม่สามารถสร้างเซสชันได้ กรุณาลองใหม่')

        // Keep LINE profile metadata fresh
        await sb.auth.updateUser({
          data: {
            line_user_id: p.userId,
            line_display_name: p.displayName,
            line_picture_url: p.pictureUrl || '',
            provider: 'line',
          }
        })
      } catch (e) {
        console.error('Supabase LINE auth error:', e)
        setError(e.message || 'เชื่อมต่อระบบไม่สำเร็จ')
        setStatus('error')
        return
      }

      setStatus('success')
      setTimeout(() => {
        if (liff.isInClient()) liff.closeWindow()
        else window.location.href = '/'
      }, 1200)

    } catch (e) {
      console.error('LIFF error:', e)
      setError(e.message || 'เกิดข้อผิดพลาด')
      setStatus('error')
    }
  }

  const bg = 'linear-gradient(160deg,#F0ECFF 0%,#E8F4FF 50%,#F0FFF8 100%)'
  const center = {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexDirection: 'column', gap: 16,
    fontFamily: 'Inter,sans-serif', background: bg, padding: 24,
  }

  const Logo = () => (
    <div style={{ width:52, height:52, borderRadius:16, background:'#fff', overflow:'hidden', boxShadow:'0 4px 20px rgba(108,99,255,0.35)', marginBottom:4 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand-logo.png" alt="StayScape" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
    </div>
  )

  if (status === 'init' || status === 'loading') return (
    <div style={center}>
      <Logo/>
      <div style={{ fontSize:15, fontWeight:600, color:'#1a1a2e' }}>StayScape</div>
      <div style={{ fontSize:13, color:'#6C63FF' }}>กำลังเชื่อมต่อ LINE...</div>
      <div style={{ width:36, height:36, border:'3px solid rgba(108,99,255,0.15)', borderTop:'3px solid #6C63FF', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (status === 'success') return (
    <div style={center}>
      <Logo/>
      <div style={{ background:'rgba(255,255,255,0.9)', borderRadius:20, padding:'24px 28px', textAlign:'center', maxWidth:300, width:'100%', boxShadow:'0 4px 24px rgba(108,99,255,0.1)', border:'1px solid rgba(255,255,255,0.9)' }}>
        {profile?.pictureUrl && <img src={profile.pictureUrl} alt="" style={{ width:64, height:64, borderRadius:'50%', border:'3px solid rgba(108,99,255,0.2)', marginBottom:12, display:'block', margin:'0 auto 12px' }}/>}
        <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e', marginBottom:8 }}>{profile?.displayName}</div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', color:'#059669', fontSize:12, fontWeight:600, padding:'5px 14px', borderRadius:20 }}>✅ เข้าสู่ระบบสำเร็จ</div>
        <div style={{ fontSize:12, color:'#9ca3af', marginTop:10 }}>กำลังเข้าสู่ StayScape...</div>
      </div>
    </div>
  )

  return (
    <div style={center}>
      <Logo/>
      <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:16, padding:'20px 24px', textAlign:'center', maxWidth:300 }}>
        <div style={{ fontSize:28, marginBottom:8 }}>⚠️</div>
        <div style={{ fontSize:14, fontWeight:600, color:'#DC2626', marginBottom:6 }}>เกิดข้อผิดพลาด</div>
        <div style={{ fontSize:12, color:'#9ca3af', marginBottom:14 }}>{error}</div>
        <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
          <button onClick={initLiff} style={{ padding:'8px 18px', background:'#6C63FF', border:'none', borderRadius:10, fontSize:13, color:'white', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>ลองอีกครั้ง</button>
          <a href="/login" style={{ padding:'8px 18px', background:'rgba(255,255,255,0.8)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:10, fontSize:13, color:'#4a5568', textDecoration:'none', fontFamily:'inherit' }}>Login</a>
        </div>
      </div>
    </div>
  )
}
