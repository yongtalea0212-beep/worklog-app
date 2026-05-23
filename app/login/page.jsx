"use client"
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') router.push('/')
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/')
    } else if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` }
      })
      if (error) setError(error.message)
      else setSuccess('ส่ง email ยืนยันแล้ว กรุณาตรวจสอบ inbox')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      })
      if (error) setError(error.message)
      else setSuccess('ส่ง email reset password แล้ว กรุณาตรวจสอบ inbox')
    }
    setLoading(false)
  }

  const titles = { login: 'เข้าสู่ระบบ', register: 'สมัครสมาชิก', forgot: 'ลืมรหัสผ่าน' }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 60% at 20% -10%, rgba(180,170,255,0.35) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 90% 20%, rgba(200,230,255,0.3) 0%, transparent 50%), #eef0f8',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.9)', borderRadius: 24,
        padding: '36px 32px', width: 380,
        boxShadow: '0 20px 60px rgba(100,110,180,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, margin: '0 auto 12px',
            boxShadow: '0 4px 14px rgba(108,99,255,0.35)',
          }}>✦</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#6C63FF' }}>WorkLog AI</div>
          <div style={{ fontSize: 22, fontWeight: 300, color: '#1a1d2e', marginTop: 4 }}>
            {titles[mode]}
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444', marginBottom: 16 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#059669', marginBottom: 16 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 5, letterSpacing: 0.5 }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(200,205,230,0.5)', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 5, letterSpacing: 0.5 }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ width: '100%', padding: '10px 40px 10px 14px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(200,205,230,0.5)', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9CA3AF' }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop: 4, padding: 11,
            background: loading ? 'rgba(108,99,255,0.5)' : 'linear-gradient(135deg,#6C63FF,#8B7FFF)',
            border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 600,
            cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
          }}>
            {loading ? 'กำลังดำเนินการ...' : titles[mode]}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('register'); setError(''); setSuccess('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6C63FF', fontFamily: 'inherit' }}>
                ยังไม่มีบัญชี? สมัครสมาชิก
              </button>
              <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9CA3AF', fontFamily: 'inherit' }}>
                ลืมรหัสผ่าน?
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6C63FF', fontFamily: 'inherit' }}>
              ← กลับไปหน้า Login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}