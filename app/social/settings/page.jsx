'use client'
// app/social/settings/page.jsx — connect LINE OA target + notification toggles (Phase 1).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [kind, setKind] = useState('user') // user | group
  const [target, setTarget] = useState('')
  const [notifyDaily, setNotifyDaily] = useState(true)
  const [notifyAlerts, setNotifyAlerts] = useState(true)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setToken(data.session.access_token)
      const res = await fetch('/api/social/line-account', { headers: { Authorization: `Bearer ${data.session.access_token}` } })
      const json = await res.json().catch(() => ({}))
      const acc = json.accounts?.[0]
      if (acc) {
        setKind(acc.line_group_id ? 'group' : 'user')
        setTarget(acc.line_group_id || acc.line_user_id || '')
        setNotifyDaily(acc.notify_daily); setNotifyAlerts(acc.notify_alerts)
      }
    })
  }, [router])

  async function save() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/social/line-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          [kind === 'group' ? 'lineGroupId' : 'lineUserId']: target.trim(),
          notifyDaily, notifyAlerts,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'save failed')
      setMsg({ type: 'ok', text: 'บันทึกแล้ว' })
    } catch (e) { setMsg({ type: 'err', text: String(e.message || e) }) }
    finally { setBusy(false) }
  }

  async function sendTest() {
    setTesting(true); setMsg(null)
    try {
      const res = await fetch('/api/social/line-digest', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'send failed')
      setMsg({ type: 'ok', text: `ส่งสรุปทดสอบไป LINE แล้ว (${json.sent} ปลายทาง)` })
    } catch (e) { setMsg({ type: 'err', text: String(e.message || e) }) }
    finally { setTesting(false) }
  }

  return (
    <div className="se-root">
      <style>{CSS}</style>
      <div className="se-wrap">
        <button className="se-back" onClick={() => router.push('/social')}>← Dashboard</button>
        <h1 className="se-title">Settings · เชื่อม LINE</h1>
        <p className="se-sub">รับสรุปประจำวันและการแจ้งเตือนวิกฤตผ่าน LINE</p>

        <div className="se-card">
          <div className="se-field">
            <label>ปลายทาง</label>
            <div className="se-tabs">
              <button className={kind === 'user' ? 'on' : ''} onClick={() => setKind('user')}>ผู้ใช้ (userId)</button>
              <button className={kind === 'group' ? 'on' : ''} onClick={() => setKind('group')}>กลุ่ม (groupId)</button>
            </div>
          </div>
          <div className="se-field">
            <label>{kind === 'group' ? 'LINE Group ID' : 'LINE User ID'}</label>
            <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Uxxxxxxxx... / Cxxxxxxxx..." />
            <span className="se-hint">ดู userId ได้จาก webhook ของ LINE OA เมื่อทักหาบอท (เพิ่มบอทเป็นเพื่อน/เข้ากลุ่มก่อน)</span>
          </div>
          <label className="se-check"><input type="checkbox" checked={notifyDaily} onChange={(e) => setNotifyDaily(e.target.checked)} /> ส่งสรุปประจำวัน</label>
          <label className="se-check"><input type="checkbox" checked={notifyAlerts} onChange={(e) => setNotifyAlerts(e.target.checked)} /> ส่งแจ้งเตือนวิกฤต (negative spike)</label>
        </div>

        {msg && <div className={`se-msg ${msg.type}`}>{msg.type === 'ok' ? '✅' : '⚠️'} {msg.text}</div>}

        <div className="se-actions">
          <button className="se-btn" disabled={busy || !token || !target.trim()} onClick={save}>{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
          <button className="se-btn ghost" disabled={testing || !token} onClick={sendTest}>{testing ? 'กำลังส่ง...' : '📲 ส่งสรุปทดสอบ'}</button>
        </div>
        <p className="se-note">ต้องตั้งค่า <code>LINE_CHANNEL_ACCESS_TOKEN</code> บนเซิร์ฟเวอร์ · cron จะส่งอัตโนมัติเมื่อเพิ่มใน vercel.json</p>
      </div>
    </div>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .se-root { min-height:100vh; background:#f6f8fb; font-family:'Inter',sans-serif; color:#0f172a; padding:28px 16px; }
  .se-wrap { max-width:560px; margin:0 auto; }
  .se-back { background:none; border:none; color:#2563EB; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; padding:0; margin-bottom:10px; }
  .se-title { font-size:22px; font-weight:800; margin:0; letter-spacing:-.4px; }
  .se-sub { font-size:12.5px; color:#94a3b8; margin:4px 0 16px; }
  .se-card { background:#fff; border:1px solid #eef2f7; border-radius:14px; padding:18px; box-shadow:0 1px 2px rgba(15,23,42,.04); }
  .se-field { margin-bottom:16px; }
  .se-field > label { display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:7px; }
  .se-field input { width:100%; box-sizing:border-box; padding:10px 12px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:13px; font-family:inherit; outline:none; }
  .se-field input:focus { border-color:#2563EB; }
  .se-hint { display:block; font-size:11px; color:#94a3b8; margin-top:6px; }
  .se-tabs { display:flex; gap:8px; }
  .se-tabs button { flex:1; padding:8px; border:1px solid #e2e8f0; background:#fff; border-radius:9px; font-size:12.5px; font-weight:600; color:#64748b; cursor:pointer; font-family:inherit; }
  .se-tabs button.on { background:#2563EB; color:#fff; border-color:#2563EB; }
  .se-check { display:flex; align-items:center; gap:9px; font-size:13px; color:#334155; font-weight:500; margin-top:10px; }
  .se-msg { padding:10px 14px; border-radius:10px; font-size:12.5px; font-weight:500; margin:14px 0; }
  .se-msg.ok { background:rgba(16,185,129,.08); border:1px solid rgba(16,185,129,.2); color:#059669; }
  .se-msg.err { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); color:#dc2626; }
  .se-actions { display:flex; gap:12px; margin-top:16px; flex-wrap:wrap; }
  .se-btn { padding:12px 22px; background:#2563EB; color:#fff; border:none; border-radius:11px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; box-shadow:0 4px 14px rgba(37,99,235,.3); }
  .se-btn:disabled { opacity:.55; cursor:default; }
  .se-btn.ghost { background:#fff; color:#2563EB; border:1.5px solid #dbe6ff; box-shadow:none; }
  .se-note { font-size:11px; color:#94a3b8; margin-top:14px; }
  .se-note code { background:#f1f5f9; padding:1px 6px; border-radius:5px; }
`
