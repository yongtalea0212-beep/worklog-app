'use client'
import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { supabase } from '../lib/supabase'

// ─── Helpers ───────────────────────────────────────────────────────────────

function getDeviceInfo() {
  if (typeof window === 'undefined') return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' }
  const ua = navigator.userAgent
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua)
  const device = isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop'
  const browser =
    /Edg/.test(ua) ? 'Edge' :
    /SamsungBrowser/.test(ua) ? 'Samsung Browser' :
    /Chrome/.test(ua) ? 'Chrome' :
    /Safari/.test(ua) ? 'Safari' :
    /Firefox/.test(ua) ? 'Firefox' :
    'Unknown'
  const os =
    /Windows/.test(ua) ? 'Windows' :
    /Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua) ? 'macOS' :
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad/.test(ua) ? 'iOS' :
    /Linux/.test(ua) ? 'Linux' :
    'Unknown'
  return { device, browser, os }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return '-' }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '-' }
}

// ─── Toast ────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null
  const bg = toast.type === 'error' ? '#EF4444' : toast.type === 'warning' ? '#F59E0B' : '#10B981'
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: bg, color: 'white',
      padding: '12px 20px', borderRadius: 12,
      fontSize: 14, fontWeight: 600,
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      animation: 'slideUp 0.3s ease',
      maxWidth: 320,
    }}>
      {toast.msg}
    </div>
  )
}

// ─── Collapsible Panel ────────────────────────────────────────────────────

function Panel({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      border: '1px solid var(--card-border, rgba(200,210,240,0.4))',
      borderRadius: 16, overflow: 'hidden', marginBottom: 10,
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: 'rgba(255,255,255,0.5)',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 14, color: 'var(--text, #1a1a2e)' }}>
          <span style={{ fontSize: 18 }}>{icon}</span>{title}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text3, #9ca3af)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.3)', borderTop: '1px solid rgba(200,210,240,0.3)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Status dot ────────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const color = status === 'done' ? '#10B981' : status === 'in_progress' ? '#6C63FF' : '#F59E0B'
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
}

// ─── Main Component ────────────────────────────────────────────────────────

const ProfilePage = memo(function ProfilePage({ user, logs, onLogout, onNavigate }) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [toast, setToast] = useState(null)
  const [avatarError, setAvatarError] = useState(false)
  const [deviceInfo] = useState(() => getDeviceInfo())

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Change name state
  const [nameValue, setNameValue] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  // Change avatar state
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef(null)

  // Change password state
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const safeLogs = logs || []

  const displayName = user?.user_metadata?.line_display_name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.display_name
    || user?.email?.split('@')[0]
    || 'User'

  const provider = user?.app_metadata?.provider === 'google' ? 'Google'
    : user?.user_metadata?.line_user_id ? 'LINE'
    : 'Email'

  const avatarUrl = !avatarError && (
    avatarPreview ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.line_picture_url
  )

  useEffect(() => {
    setNameValue(displayName)
  }, [displayName])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  // ── Stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = safeLogs.length
    const totalHours = safeLogs.reduce((s, l) => s + (l.hours || 0), 0)
    const done = safeLogs.filter(l => l.status === 'done').length
    const projects = new Set(safeLogs.map(l => l.category).filter(Boolean)).size
    const completionRate = total > 0 ? (done / total) * 100 : 0
    const productivity = Math.round(
      (completionRate * 0.5) +
      (Math.min(totalHours / 100, 1) * 30) +
      (Math.min(total / 50, 1) * 20)
    )
    return { total, totalHours: Math.round(totalHours * 10) / 10, done, projects, completionRate: Math.round(completionRate), productivity }
  }, [safeLogs])

  const recentLogs = useMemo(() => safeLogs.slice(0, 5), [safeLogs])

  // ── Logout ────────────────────────────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut({ scope: 'global' })
    localStorage.clear()
    sessionStorage.clear()
    window.location.replace('/login')
  }

  // ── Change Name ────────────────────────────────────────────────────────
  async function handleSaveName() {
    if (!nameValue.trim()) return
    setNameSaving(true)
    const { error } = await supabase.auth.updateUser({ data: { display_name: nameValue.trim(), full_name: nameValue.trim() } })
    setNameSaving(false)
    if (error) showToast('บันทึกชื่อล้มเหลว: ' + error.message, 'error')
    else showToast('บันทึกชื่อสำเร็จ!')
  }

  // ── Change Avatar ─────────────────────────────────────────────────────
  function handleAvatarSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleAvatarUpload() {
    if (!avatarFile || !user?.id) return
    setAvatarUploading(true)
    const BUCKET = 'worklog-gallery'
    const ext = (avatarFile.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `avatars/${user.id}/${Date.now()}.${ext}`
    let { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, avatarFile, { upsert: true, cacheControl: '3600' })
    // If the bucket doesn't exist yet, create it (public) then retry once
    if (uploadError && /bucket not found/i.test(uploadError.message || '')) {
      await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})
      const retry = await supabase.storage.from(BUCKET).upload(path, avatarFile, { upsert: true, cacheControl: '3600' })
      uploadError = retry.error
    }
    if (uploadError) {
      setAvatarUploading(false)
      showToast('อัปโหลดรูปล้มเหลว: ' + uploadError.message, 'error')
      return
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = urlData?.publicUrl
    const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
    setAvatarUploading(false)
    if (updateError) showToast('อัปเดตรูปล้มเหลว: ' + updateError.message, 'error')
    else { showToast('อัปเดตรูปโปรไฟล์สำเร็จ!'); setAvatarError(false) }
  }

  // ── Change Password ────────────────────────────────────────────────────
  async function handleChangePassword() {
    if (pwNew.length < 8) { showToast('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', 'warning'); return }
    if (pwNew !== pwConfirm) { showToast('รหัสผ่านใหม่ไม่ตรงกัน', 'warning'); return }
    if (pwNew === pwCurrent) { showToast('รหัสผ่านใหม่ต้องไม่เหมือนเดิม', 'warning'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    setPwSaving(false)
    if (error) showToast('เปลี่ยนรหัสผ่านล้มเหลว: ' + error.message, 'error')
    else { showToast('เปลี่ยนรหัสผ่านสำเร็จ!'); setPwCurrent(''); setPwNew(''); setPwConfirm('') }
  }

  // ── Delete Account ────────────────────────────────────────────────────
  async function handleDeleteAccount() {
    setDeleteLoading(true)
    await supabase.from('work_logs').delete().eq('user_id', user.id)
    await supabase.auth.signOut({ scope: 'global' })
    localStorage.clear()
    sessionStorage.clear()
    window.location.replace('/login')
  }

  // ── Provider badge ─────────────────────────────────────────────────────
  const providerBadge = (() => {
    if (provider === 'Google') return { bg: 'rgba(66,133,244,0.1)', border: 'rgba(66,133,244,0.3)', color: '#4285F4', label: 'Google', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    )}
    if (provider === 'LINE') return { bg: 'rgba(0,185,0,0.1)', border: 'rgba(0,185,0,0.3)', color: '#00B900', label: 'LINE', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#00B900">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
      </svg>
    )}
    return { bg: 'rgba(108,99,255,0.1)', border: 'rgba(108,99,255,0.3)', color: '#6C63FF', label: 'Email', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    )}
  })()

  // ── KPI cards data ──────────────────────────────────────────────────────
  const kpiCards = [
    { label: 'งานทั้งหมด', value: stats.total, unit: 'งาน', color: '#6C63FF', bg: 'rgba(108,99,255,0.08)', icon: '📋' },
    { label: 'ชั่วโมงรวม', value: stats.totalHours, unit: 'ชม.', color: '#06B6D4', bg: 'rgba(6,182,212,0.08)', icon: '⏱️' },
    { label: 'งานเสร็จ', value: stats.done, unit: 'งาน', color: '#10B981', bg: 'rgba(16,185,129,0.08)', icon: '✅' },
    { label: 'โปรเจกต์', value: stats.projects, unit: 'หมวด', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: '📁' },
    { label: 'อัตราสำเร็จ', value: stats.completionRate, unit: '%', color: '#EC4899', bg: 'rgba(236,72,153,0.08)', icon: '🎯' },
    { label: 'Productivity', value: stats.productivity, unit: '/100', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', icon: '⚡' },
  ]

  const cardStyle = {
    background: 'var(--card, rgba(255,255,255,0.68))',
    backdropFilter: 'var(--blur, blur(20px))',
    WebkitBackdropFilter: 'var(--blur, blur(20px))',
    border: '1px solid var(--card-border, rgba(200,210,240,0.5))',
    borderRadius: 24,
    padding: 24,
    boxShadow: 'var(--shadow-card, 0 4px 24px rgba(108,99,255,0.07))',
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid rgba(200,210,240,0.6)',
    background: 'rgba(255,255,255,0.7)',
    fontFamily: 'inherit', fontSize: 14, color: 'var(--text, #1a1a2e)',
    outline: 'none', marginBottom: 10,
  }

  const btnPrimary = {
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg,#6C63FF,#9B8FFF)',
    color: 'white', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  }

  const btnDanger = {
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg,#EF4444,#F87171)',
    color: 'white', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  }

  // ── Section: Profile Card ──────────────────────────────────────────────
  const ProfileCard = (
    <div style={{ ...cardStyle, textAlign: 'center' }}>
      {/* Avatar */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: 'linear-gradient(135deg,#6C63FF,#9B8FFF)',
        overflow: 'hidden', margin: '0 auto 16px',
        border: '3px solid rgba(108,99,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 40, fontWeight: 700, color: 'white', flexShrink: 0,
        position: 'relative',
      }}>
        {avatarUrl && !avatarError ? (
          <img
            src={avatarUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            alt="avatar"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <span>{displayName[0]?.toUpperCase() || 'U'}</span>
        )}
      </div>

      {/* Name */}
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text, #1a1a2e)', marginBottom: 4 }}>
        {displayName}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text3, #9ca3af)', marginBottom: 12 }}>
        {user?.email || user?.user_metadata?.line_user_id || '-'}
      </div>

      {/* Provider badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: providerBadge.bg, border: `1px solid ${providerBadge.border}`,
        borderRadius: 20, padding: '5px 14px', fontSize: 12,
        color: providerBadge.color, fontWeight: 600, marginBottom: 12,
      }}>
        {providerBadge.icon} เข้าสู่ระบบด้วย {providerBadge.label}
      </div>

      {/* Status badge */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#10B981', fontWeight: 600,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Active
        </div>
      </div>

      {/* Created At */}
      <div style={{ fontSize: 12, color: 'var(--text3, #9ca3af)' }}>
        สมาชิกตั้งแต่: {formatDate(user?.created_at)}
      </div>
    </div>
  )

  // ── Section: Activity Summary ──────────────────────────────────────────
  const ActivitySummary = (
    <div style={cardStyle}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text, #1a1a2e)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>📊</span> สรุปกิจกรรม
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {kpiCards.map(k => (
          <div key={k.label} style={{
            background: k.bg, borderRadius: 14, padding: '12px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color, lineHeight: 1 }}>
              {k.value}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3, #9ca3af)', marginLeft: 2 }}>{k.unit}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3, #9ca3af)', marginTop: 3, fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Section: Recent Activity ────────────────────────────────────────────
  const RecentActivity = (
    <div style={cardStyle}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text, #1a1a2e)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🕐</span> กิจกรรมล่าสุด
        <button
          onClick={() => onNavigate && onNavigate('logs')}
          style={{ marginLeft: 'auto', fontSize: 12, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
        >ดูทั้งหมด →</button>
      </div>
      {recentLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3, #9ca3af)', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          ยังไม่มีกิจกรรม
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recentLogs.map((log, i) => (
            <div
              key={log.id || i}
              onClick={() => onNavigate && onNavigate('logs')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 12,
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(200,210,240,0.3)',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}
            >
              <StatusDot status={log.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #1a1a2e)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.title || log.task || 'Untitled'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3, #9ca3af)', marginTop: 1 }}>
                  {formatDate(log.date || log.created_at)}
                </div>
              </div>
              {log.category && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(108,99,255,0.1)', color: '#6C63FF', whiteSpace: 'nowrap',
                }}>{log.category}</span>
              )}
              <span style={{ fontSize: 12, color: '#06B6D4', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {log.hours || 0}h
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Section: Device Info ───────────────────────────────────────────────
  const DeviceInfo = (
    <div style={cardStyle}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text, #1a1a2e)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>💻</span> ข้อมูลอุปกรณ์
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {[
          { label: 'ประเภทอุปกรณ์', value: deviceInfo.device, icon: deviceInfo.device === 'Mobile' ? '📱' : deviceInfo.device === 'Tablet' ? '📟' : '🖥️' },
          { label: 'เบราว์เซอร์', value: deviceInfo.browser, icon: '🌐' },
          { label: 'ระบบปฏิบัติการ', value: deviceInfo.os, icon: '⚙️' },
          { label: 'เข้าสู่ระบบล่าสุด', value: formatDateTime(user?.last_sign_in_at), icon: '🔐' },
          { label: 'ผู้ให้บริการ', value: provider, icon: '🔗' },
        ].map((item, i, arr) => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 0',
            borderBottom: i < arr.length - 1 ? '1px solid rgba(200,210,240,0.25)' : 'none',
          }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span style={{ fontSize: 13, color: 'var(--text3, #9ca3af)', flex: 1 }}>{item.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #1a1a2e)' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Section: Account Security ──────────────────────────────────────────
  const AccountSecurity = (
    <div style={cardStyle}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text, #1a1a2e)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🔒</span> ความปลอดภัยบัญชี
      </div>

      {/* Change Name */}
      <Panel title="เปลี่ยนชื่อแสดง" icon="✏️">
        <input
          value={nameValue}
          onChange={e => setNameValue(e.target.value)}
          placeholder="ชื่อแสดง"
          style={inputStyle}
        />
        <button
          onClick={handleSaveName}
          disabled={nameSaving}
          style={{ ...btnPrimary, opacity: nameSaving ? 0.7 : 1 }}
        >
          {nameSaving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </Panel>

      {/* Change Avatar */}
      <Panel title="เปลี่ยนรูปโปรไฟล์" icon="🖼️">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarSelect}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          {avatarPreview ? (
            <img src={avatarPreview} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(108,99,255,0.3)' }} alt="preview" />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#6C63FF,#9B8FFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'white', fontWeight: 700 }}>
              {displayName[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <button
            onClick={() => avatarInputRef.current?.click()}
            style={{ ...btnPrimary, background: 'rgba(108,99,255,0.1)', color: '#6C63FF', border: '1px solid rgba(108,99,255,0.3)' }}
          >เลือกรูป</button>
        </div>
        {avatarFile && (
          <button
            onClick={handleAvatarUpload}
            disabled={avatarUploading}
            style={{ ...btnPrimary, opacity: avatarUploading ? 0.7 : 1 }}
          >
            {avatarUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป'}
          </button>
        )}
      </Panel>

      {/* Change Password */}
      {provider === 'Email' && (
        <Panel title="เปลี่ยนรหัสผ่าน" icon="🔑">
          <input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="รหัสผ่านปัจจุบัน" style={inputStyle} />
          <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)" style={inputStyle} />
          <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="ยืนยันรหัสผ่านใหม่" style={{ ...inputStyle, marginBottom: 0 }} />
          <div style={{ marginTop: 12 }}>
            <button onClick={handleChangePassword} disabled={pwSaving} style={{ ...btnPrimary, opacity: pwSaving ? 0.7 : 1 }}>
              {pwSaving ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
            </button>
          </div>
        </Panel>
      )}

      {/* Delete Account */}
      <Panel title="ลบบัญชี" icon="🗑️">
        <div style={{ fontSize: 13, color: 'var(--text3, #9ca3af)', marginBottom: 12 }}>
          การลบบัญชีจะลบข้อมูลทั้งหมดของคุณและไม่สามารถกู้คืนได้
        </div>
        <button onClick={() => { setShowDeleteModal(true); setDeleteStep(1) }} style={btnDanger}>
          ลบบัญชีของฉัน
        </button>
      </Panel>
    </div>
  )

  // ── Logout Button ──────────────────────────────────────────────────────
  const LogoutSection = (
    <div style={cardStyle}>
      {!showLogoutConfirm ? (
        <button
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg,#EF4444,#F87171)',
            color: 'white', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <span>🚪</span> ออกจากระบบ
        </button>
      ) : (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #1a1a2e)', marginBottom: 4 }}>ยืนยันออกจากระบบ?</div>
          <div style={{ fontSize: 12, color: 'var(--text3, #9ca3af)', marginBottom: 14 }}>คุณจะถูกนำออกจากระบบทันที</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowLogoutConfirm(false)}
              style={{ flex: 1, padding: '10px', border: '1px solid rgba(200,210,240,0.5)', borderRadius: 10, background: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text3, #9ca3af)' }}
            >ยกเลิก</button>
            <button
              onClick={handleLogout}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#EF4444,#F87171)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >ออกจากระบบ</button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .profile-desktop { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }
        .profile-mobile { display: flex; flex-direction: column; gap: 16px; }
        @media (max-width: 768px) {
          .profile-desktop { display: none !important; }
          .profile-mobile { display: flex !important; }
        }
        @media (min-width: 769px) {
          .profile-mobile { display: none !important; }
          .profile-desktop { display: grid !important; }
        }
      `}</style>

      <div style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* Page title */}
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text, #1a1a2e)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>👤</span> โปรไฟล์
        </div>

        {/* Desktop layout */}
        <div className="profile-desktop">
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {ProfileCard}
            {LogoutSection}
          </div>
          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {ActivitySummary}
            {RecentActivity}
            {DeviceInfo}
            {AccountSecurity}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="profile-mobile">
          {ProfileCard}
          {ActivitySummary}
          {RecentActivity}
          {DeviceInfo}
          {AccountSecurity}
          {LogoutSection}
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9000, padding: 20, animation: 'fadeIn 0.2s ease',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
        >
          <div style={{
            background: 'white', borderRadius: 20, padding: 28,
            width: '100%', maxWidth: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {deleteStep === 1 ? (
              <>
                <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 8, textAlign: 'center' }}>ลบบัญชีของคุณ?</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, textAlign: 'center', lineHeight: 1.6 }}>
                  การดำเนินการนี้จะลบข้อมูลทั้งหมดของคุณอย่างถาวร รวมถึง worklog ทั้งหมด และไม่สามารถกู้คืนได้
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '11px', border: '1px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#6b7280' }}>ยกเลิก</button>
                  <button onClick={() => setDeleteStep(2)} style={{ flex: 1, ...btnDanger }}>ดำเนินการต่อ</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>🗑️</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>ยืนยันการลบบัญชี</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>กรอกรหัสผ่านของคุณเพื่อยืนยัน</div>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder="รหัสผ่าน"
                  style={{ ...inputStyle, marginBottom: 14 }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '11px', border: '1px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#6b7280' }}>ยกเลิก</button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading || !deletePassword}
                    style={{ flex: 1, ...btnDanger, opacity: (deleteLoading || !deletePassword) ? 0.6 : 1 }}
                  >
                    {deleteLoading ? 'กำลังลบ...' : 'ลบบัญชี'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </>
  )
})

export default ProfilePage
