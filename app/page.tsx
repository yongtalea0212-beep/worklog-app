'use client'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import WorklogApp from './components/WorklogApp'

export default function Page() {
  const [status, setStatus] = useState<'loading' | 'auth' | 'ready'>('loading')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setStatus('ready')
      } else {
        setStatus('auth')
        window.location.href = '/login'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (status === 'loading') return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg,#F0ECFF,#E8F4FF,#F0FFF8)',
      fontFamily: 'Inter,sans-serif', fontSize: 14, color: '#6C63FF',
    }}>✨ กำลังโหลด StayScape...</div>
  )

  if (status === 'auth') return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg,#F0ECFF,#E8F4FF,#F0FFF8)',
      fontFamily: 'Inter,sans-serif', fontSize: 14, color: '#9ca3af',
    }}>กำลังไปหน้า Login...</div>
  )

  return <WorklogApp />
}
