'use client'
// app/login/page.js
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode]       = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/')
    })
  }, [])

  async function handleEmail(e) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.replace('/')
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name } }
        })
        if (error) throw error
        setSuccess('ส่ง email ยืนยันแล้ว กรุณาตรวจสอบกล่องจดหมาย')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        })
        if (error) throw error
        setSuccess('ส่ง link reset password แล้ว กรุณาตรวจสอบ email')
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function handleLine() {
    // LINE LIFF flow — redirect to LIFF page first
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (liffId) {
      window.location.href = `https://liff.line.me/${liffId}`
    } else {
      setError('LIFF ID ยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ')
    }
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    .login-root {
      min-height: 100vh;
      background: linear-gradient(160deg, #F0ECFF 0%, #E8F4FF 45%, #F0FFF8 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 20px; font-family: 'Inter', sans-serif;
    }
    .login-card {
      background: rgba(255,255,255,0.88);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.9);
      border-radius: 24px;
      padding: 40px 36px;
      width: 100%; max-width: 420px;
      box-shadow: 0 8px 40px rgba(108,99,255,0.12);
    }
    .login-logo {
      display: flex; align-items: center; gap: 12px; margin-bottom: 28px;
    }
    .login-logo-mark {
      width: 44px; height: 44px; border-radius: 14px;
      background: linear-gradient(135deg, #1a1040, #0D1A2E);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(108,99,255,0.35);
    }
    .login-logo-mark span {
      background: linear-gradient(135deg,#a78bfa,#38bdf8);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      font-size: 17px; font-weight: 900; letter-spacing: -1px;
    }
    .login-brand { font-size: 20px; font-weight: 700; color: #1a1a2e; }
    .login-brand-sub { font-size: 11px; color: #9ca3af; font-weight: 400; }
    .login-title { font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .login-sub { font-size: 13px; color: #9ca3af; margin-bottom: 24px; }
    .login-label { font-size: 12px; font-weight: 600; color: #4a5568; margin-bottom: 6px; display: block; }
    .login-input {
      width: 100%; padding: 11px 14px;
      background: rgba(255,255,255,0.7);
      border: 1.5px solid rgba(200,210,240,0.6);
      border-radius: 12px; font-size: 14px; color: #1a1a2e;
      font-family: inherit; outline: none; transition: .15s;
      box-sizing: border-box;
    }
    .login-input:focus { border-color: #6C63FF; background: rgba(255,255,255,0.9); }
    .login-input-wrap { position: relative; margin-bottom: 14px; }
    .login-eye {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; color: #9ca3af;
      font-size: 16px; padding: 4px;
    }
    .login-btn {
      width: 100%; padding: 13px;
      background: linear-gradient(135deg, #6C63FF, #9B8FFF);
      border: none; border-radius: 12px;
      font-size: 14px; font-weight: 700; color: white;
      cursor: pointer; font-family: inherit; transition: .15s;
      box-shadow: 0 4px 16px rgba(108,99,255,0.35);
      margin-top: 4px;
    }
    .login-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(108,99,255,0.45); }
    .login-btn:disabled { opacity: .6; cursor: default; }
    .login-divider {
      display: flex; align-items: center; gap: 12px;
      margin: 18px 0; font-size: 12px; color: #9ca3af;
    }
    .login-divider::before, .login-divider::after {
      content: ''; flex: 1; height: 1px;
      background: rgba(200,210,240,0.5);
    }
    .oauth-btn {
      width: 100%; padding: 11px 14px;
      background: rgba(255,255,255,0.7);
      border: 1.5px solid rgba(200,210,240,0.5);
      border-radius: 12px; font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: .15s;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      color: #1a1a2e; margin-bottom: 8px;
    }
    .oauth-btn:hover:not(:disabled) { background: rgba(255,255,255,0.9); border-color: rgba(108,99,255,0.3); }
    .oauth-btn:disabled { opacity: .6; cursor: default; }
    .oauth-icon { width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
    .login-err { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 10px 14px; font-size: 12px; color: #DC2626; margin-bottom: 14px; }
    .login-ok  { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: 10px; padding: 10px 14px; font-size: 12px; color: #059669; margin-bottom: 14px; }
    .login-switch { text-align: center; font-size: 13px; color: #9ca3af; margin-top: 16px; }
    .login-switch button { background: none; border: none; color: #6C63FF; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 13px; }
    .login-switch button:hover { text-decoration: underline; }
    .login-forgot { text-align: right; margin-bottom: 14px; }
    .login-forgot button { background: none; border: none; color: #6C63FF; font-size: 12px; cursor: pointer; font-family: inherit; }
    .login-loading { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin .7s linear infinite; margin-right: 8px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 480px) {
      .login-card { padding: 28px 20px; border-radius: 20px; }
    }
  `

  return (
    <>
      <style>{CSS}</style>
      <div className="login-root">
        <div className="login-card">
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-mark">
              <span>SS</span>
            </div>
            <div>
              <div className="login-brand">StayScape</div>
              <div className="login-brand-sub">Work · Life · Balance</div>
            </div>
          </div>

          {/* Title */}
          <div className="login-title">
            {mode === 'login' ? 'ยินดีต้อนรับกลับ' : mode === 'signup' ? 'สร้างบัญชีใหม่' : 'ลืมรหัสผ่าน'}
          </div>
          <div className="login-sub">
            {mode === 'login' ? 'เข้าสู่ระบบเพื่อเริ่มบันทึกงาน'
              : mode === 'signup' ? 'เริ่มต้นใช้งาน StayScape ฟรี'
              : 'ใส่อีเมลเพื่อรับ link reset password'}
          </div>

          {/* Error / Success */}
          {error   && <div className="login-err">⚠️ {error}</div>}
          {success && <div className="login-ok">✅ {success}</div>}

          <form onSubmit={handleEmail}>
            {mode === 'signup' && (
              <div className="login-input-wrap">
                <label className="login-label">ชื่อ-นามสกุล</label>
                <input className="login-input" type="text" placeholder="ชื่อของคุณ"
                  value={name} onChange={e => setName(e.target.value)} required/>
              </div>
            )}
            <div className="login-input-wrap">
              <label className="login-label">อีเมล</label>
              <input className="login-input" type="email" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required/>
            </div>
            {mode !== 'forgot' && (
              <>
                <div className="login-input-wrap">
                  <label className="login-label">รหัสผ่าน</label>
                  <input className="login-input" type={showPass ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? 'อย่างน้อย 8 ตัวอักษร' : '••••••••'}
                    value={password} onChange={e => setPass(e.target.value)}
                    style={{ paddingRight: 44 }} required/>
                  <button type="button" className="login-eye" onClick={() => setShowPass(s => !s)}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
                {mode === 'login' && (
                  <div className="login-forgot">
                    <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}>
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                )}
              </>
            )}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading && <span className="login-loading"/>}
              {mode === 'login' ? 'เข้าสู่ระบบ' : mode === 'signup' ? 'สร้างบัญชี' : 'ส่ง Email'}
            </button>
          </form>

          {mode !== 'forgot' && (
            <>
              <div className="login-divider">หรือเข้าสู่ระบบด้วย</div>

              {/* Google */}
              <button className="oauth-btn" onClick={handleGoogle} disabled={loading}>
                <div className="oauth-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                เข้าสู่ระบบด้วย Google
              </button>

              {/* LINE */}
              <button className="oauth-btn" onClick={handleLine} disabled={loading}
                style={{ borderColor: 'rgba(6,199,85,0.3)', color: '#059669' }}>
                <div className="oauth-icon" style={{ background: '#06C755', borderRadius: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                </div>
                เข้าสู่ระบบด้วย LINE
              </button>
            </>
          )}

          {/* Switch mode */}
          <div className="login-switch">
            {mode === 'login' ? (
              <span>ยังไม่มีบัญชี? <button onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>สมัครสมาชิก</button></span>
            ) : mode === 'signup' ? (
              <span>มีบัญชีแล้ว? <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}>เข้าสู่ระบบ</button></span>
            ) : (
              <span><button onClick={() => { setMode('login'); setError(''); setSuccess('') }}>← กลับไปเข้าสู่ระบบ</button></span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
