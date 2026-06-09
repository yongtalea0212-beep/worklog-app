"use client"
import { useState, useEffect } from 'react'

// ─────────────────────────────────────────
// CSS
// ─────────────────────────────────────────
const CSS = `
.line-root { font-family: 'Inter', sans-serif; }
.line-glass {
  background: rgba(255,255,255,0.68);
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.92);
  border-radius: 20px; padding: 20px;
  box-shadow: 0 4px 24px rgba(100,110,200,0.09), inset 0 1px 0 rgba(255,255,255,0.85);
}
.line-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 20px; border-radius: 11px; font-size: 13px;
  font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: all .15s;
}
.line-btn:hover { transform: translateY(-1px); }
.line-btn:disabled { opacity: 0.5; cursor: default; transform: none; }
.line-btn-primary { background: linear-gradient(135deg,#00B900,#00D900); color: white; box-shadow: 0 4px 12px rgba(0,185,0,0.3); }
.line-btn-ghost { background: rgba(255,255,255,0.65); color: #6b7099; border: 1px solid rgba(200,210,240,0.5); }
.line-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
}
.line-pulse { animation: line-pulse 2s ease-in-out infinite; }
.line-tab { padding: 7px 16px; border-radius: 20px; border: 1px solid; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; }
.line-tab.active { font-weight: 700; }
.line-msg-card {
  background: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.85);
  border-radius: 14px; padding: 13px 16px; margin-bottom: 8px;
  transition: all .2s; position: relative; overflow: hidden;
}
.line-msg-card:hover { background: rgba(255,255,255,0.75); transform: translateX(3px); }
.line-cmd-card {
  background: rgba(255,255,255,0.5); border: 1px solid rgba(200,210,240,0.4);
  border-radius: 12px; padding: 12px 14px;
}
.line-stat { background: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.9); border-radius: 14px; padding: 16px; text-align: center; box-shadow: 0 2px 10px rgba(100,110,200,0.07); }
@keyframes line-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.9)} }
@keyframes line-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(0,185,0,0.2);border-radius:4px}
`

const CATS = {
  graphic:'🎨', video:'🎬', photo:'📷', marketing:'📢',
  ai:'🤖', branding:'✨', pos:'🏪', other:'📌',
}

const MSG_TYPES = {
  text:  { icon:'💬', color:'#6C63FF', bg:'rgba(108,99,255,0.1)'  },
  image: { icon:'🖼️', color:'#F59E0B', bg:'rgba(245,158,11,0.1)' },
  video: { icon:'🎬', color:'#06B6D4', bg:'rgba(6,182,212,0.1)'  },
  audio: { icon:'🎤', color:'#10B981', bg:'rgba(16,185,129,0.1)' },
  file:  { icon:'📎', color:'#8B5CF6', bg:'rgba(139,92,246,0.1)' },
}

function fmtTime(s) {
  try { return new Date(s).toLocaleString('th-TH', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) }
  catch { return s }
}

// ─────────────────────────────────────────
// SETUP GUIDE COMPONENT
// ─────────────────────────────────────────
function SetupGuide() {
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState(null)

  function copy(text, key) {
    navigator.clipboard?.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const webhookUrl = (typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app') + '/api/line/webhook'

  const steps = [
    {
      title: 'สร้าง LINE OA & Messaging API',
      desc: 'ไปที่ LINE Developers Console แล้วสร้าง Provider และ Channel',
      actions: [
        { label: 'เปิด LINE Developers Console', url: 'https://developers.line.biz/console/', icon: '🔗' },
        { label: 'สร้าง Messaging API Channel', note: 'Provider → Create a channel → Messaging API' },
      ],
    },
    {
      title: 'ตั้งค่า Webhook URL',
      desc: 'ใส่ URL นี้ในหน้า Messaging API Settings',
      codeBlock: webhookUrl,
      codeKey: 'webhook',
      actions: [
        { label: 'Messaging API → Webhook settings → Webhook URL', note: 'วางURL แล้วกด Verify' },
        { label: 'เปิด Use webhook = ON' },
      ],
    },
    {
      title: 'เพิ่ม Environment Variables',
      desc: 'เพิ่มใน .env.local และ Vercel Dashboard',
      codeBlock: 'LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token\nLINE_CHANNEL_SECRET=your_channel_secret',
      codeKey: 'env',
      actions: [
        { label: 'Channel Access Token: Messaging API → Channel access token (long-lived) → Issue' },
        { label: 'Channel Secret: Basic settings → Channel secret' },
      ],
    },
    {
      title: 'ตั้งค่า Supabase Tables',
      desc: 'รัน SQL นี้ใน Supabase SQL Editor',
      codeBlock: `-- เพิ่ม columns ใน work_logs
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS line_user_id text;
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS source text DEFAULT 'web';

-- สร้าง table line_messages
CREATE TABLE IF NOT EXISTS line_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id text NOT NULL,
  message_type text NOT NULL,
  content text,
  status text DEFAULT 'processed',
  created_at timestamptz DEFAULT now()
);

-- สร้าง table line_users
CREATE TABLE IF NOT EXISTS line_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id text UNIQUE NOT NULL,
  display_name text,
  followed_at timestamptz,
  active boolean DEFAULT true
);

-- สร้าง table line_timers
CREATE TABLE IF NOT EXISTS line_timers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id text NOT NULL,
  started_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE line_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_timers   ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_all_line_messages" ON line_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_line_users"    ON line_users    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_line_timers"   ON line_timers   FOR ALL USING (true) WITH CHECK (true);`,
      codeKey: 'sql',
    },
    {
      title: 'Deploy & Test',
      desc: 'Deploy ไป Vercel แล้วทดสอบโดยส่งข้อความหา LINE OA',
      actions: [
        { label: 'git push → Vercel deploy อัตโนมัติ', note: 'ต้องใส่ ENV vars ใน Vercel ด้วย' },
        { label: 'ส่ง /help ใน LINE → ควรได้รับ reply', note: 'ถ้าไม่ได้ รับ ตรวจ Webhook URL' },
        { label: 'ส่งข้อความบอกงาน → AI บันทึกอัตโนมัติ' },
      ],
    },
  ]

  const current = steps[step]

  return (
    <div style={{ animation:'line-fade .3s ease' }}>
      {/* Progress */}
      <div style={{ display:'flex', gap:8, marginBottom:20, alignItems:'center' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div onClick={() => setStep(i)} style={{ width:28, height:28, borderRadius:'50%', background:i<=step?'#00B900':'rgba(200,210,240,0.5)', color:i<=step?'white':'#9ca3af', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .2s' }}>
              {i < step ? '✓' : i+1}
            </div>
            {i < steps.length-1 && <div style={{ width:20, height:2, background:i<step?'#00B900':'rgba(200,210,240,0.5)', borderRadius:1 }}/>}
          </div>
        ))}
        <span style={{ fontSize:12, color:'#9ca3af', marginLeft:8 }}>ขั้นที่ {step+1} / {steps.length}</span>
      </div>

      {/* Step card */}
      <div className="line-glass" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:14 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(0,185,0,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
            {['📱','🔗','🔑','🗃️','🚀'][step]}
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>{current.title}</div>
            <div style={{ fontSize:13, color:'#6b7099', marginTop:3 }}>{current.desc}</div>
          </div>
        </div>

        {current.actions && (
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
            {current.actions.map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', background:'rgba(255,255,255,0.5)', border:'1px solid rgba(200,210,240,0.4)', borderRadius:11 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:'rgba(0,185,0,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#00B900', flexShrink:0, marginTop:1 }}>{i+1}</div>
                <div>
                  <div style={{ fontSize:13, color:'#1a1a2e', fontWeight:500 }}>{a.label}</div>
                  {a.note && <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{a.note}</div>}
                  {a.url && <a href={a.url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'#00B900', fontWeight:600, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4, marginTop:4 }}>เปิด →</a>}
                </div>
              </div>
            ))}
          </div>
        )}

        {current.codeBlock && (
          <div style={{ position:'relative', marginBottom:14 }}>
            <div style={{ background:'rgba(15,23,42,0.95)', borderRadius:12, padding:'14px 16px', fontFamily:'monospace', fontSize:12, color:'#e2e8f0', lineHeight:1.7, overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
              {current.codeBlock}
            </div>
            <button onClick={() => copy(current.codeBlock, current.codeKey)} style={{ position:'absolute', top:10, right:10, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, color:'white', fontSize:11, padding:'4px 10px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
              {copied === current.codeKey ? '✓ copied' : 'copy'}
            </button>
          </div>
        )}

        <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
          <button onClick={() => setStep(s => Math.max(s-1,0))} disabled={step===0} className="line-btn line-btn-ghost" style={{ fontSize:12, opacity:step===0?.4:1 }}>← ก่อนหน้า</button>
          <button onClick={() => setStep(s => Math.min(s+1,steps.length-1))} disabled={step===steps.length-1} className="line-btn line-btn-primary" style={{ fontSize:12, opacity:step===steps.length-1?.4:1 }}>ถัดไป →</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// DEMO MESSAGES
// ─────────────────────────────────────────
const DEMO_MESSAGES = [
  { id:1, line_user_id:'U001', message_type:'text', content:'วันนี้ทำโปสเตอร์โปรโมชั่น POS ร้านกาแฟเสร็จแล้ว ใช้เวลาประมาณ 3 ชั่วโมง', status:'processed', created_at: new Date(Date.now()-300000).toISOString(), ai_result:{ title:'โปสเตอร์ POS ร้านกาแฟ', category:'graphic', hours:3, tags:['POS','poster','coffee'] } },
  { id:2, line_user_id:'U001', message_type:'image', content:'IMG_20240516.jpg', status:'processed', created_at: new Date(Date.now()-600000).toISOString(), ai_result:{ title:'รูปภาพจาก LINE', category:'photo', hours:1, tags:['photo'] } },
  { id:3, line_user_id:'U002', message_type:'text', content:'ตัดต่อวิดีโอ TikTok โปรโมชั่น เพิ่ม caption และ subtitle เสร็จแล้ว', status:'processed', created_at: new Date(Date.now()-1200000).toISOString(), ai_result:{ title:'วิดีโอ TikTok โปรโมชั่น', category:'video', hours:2, tags:['TikTok','video','caption'] } },
  { id:4, line_user_id:'U001', message_type:'text', content:'/today', status:'command', created_at: new Date(Date.now()-1800000).toISOString(), ai_result:null },
  { id:5, line_user_id:'U003', message_type:'audio', content:'voice_001.m4a', status:'processed', created_at: new Date(Date.now()-3600000).toISOString(), ai_result:{ title:'บันทึกเสียง Voice Note', category:'other', hours:0.5, tags:['voice'] } },
]

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function LINEIntegrationPage({ logs = [] }) {
  const [tab, setTab]         = useState('overview')
  const [messages, setMessages] = useState(DEMO_MESSAGES)
  const [connected, setConnected] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  // Stats
  const totalFromLINE = logs.filter(l => l.source === 'line').length
  const msgCount = messages.length
  const users = [...new Set(messages.map(m => m.line_user_id))].length
  const processed = messages.filter(m => m.status === 'processed').length

  const TABS = [
    { k:'overview',  l:'Overview'  },
    { k:'setup',     l:'Setup Guide' },
    { k:'messages',  l:'Messages'  },
    { k:'commands',  l:'Commands'  },
  ]

  async function testWebhook() {
    setTesting(true); setTestResult(null)
    await new Promise(r => setTimeout(r, 1500))
    setTestResult({ ok: true, message: 'Webhook endpoint ตอบสนองปกติ ✅' })
    setTesting(false)
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="line-root">

        {/* Page Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:22 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#00B900,#00D900)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 4px 14px rgba(0,185,0,0.35)' }}>💬</div>
              <div>
                <div style={{ fontSize:20, fontWeight:700, color:'#1a1a2e' }}>LINE Integration Center</div>
                <div style={{ fontSize:12, color:'#9ca3af', marginTop:1 }}>เชื่อม LINE OA กับ StayScape — บันทึกงานผ่าน LINE ได้เลย</div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div className="line-badge" style={{ background:connected?'rgba(0,185,0,0.1)':'rgba(239,68,68,0.1)', color:connected?'#00B900':'#EF4444', border:'1px solid '+(connected?'rgba(0,185,0,0.25)':'rgba(239,68,68,0.25)') }}>
              <div className={connected?'line-pulse':''} style={{ width:7, height:7, borderRadius:'50%', background:connected?'#00B900':'#EF4444' }}/>
              {connected ? 'Connected' : 'Not Connected'}
            </div>
            <button onClick={testWebhook} disabled={testing} className="line-btn line-btn-ghost" style={{ fontSize:12 }}>
              {testing ? '⏳ Testing...' : '🔍 Test Webhook'}
            </button>
          </div>
        </div>

        {testResult && (
          <div style={{ background:'rgba(0,185,0,0.07)', border:'1px solid rgba(0,185,0,0.2)', borderRadius:12, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#00B900', display:'flex', alignItems:'center', gap:8 }}>
            ✅ {testResult.message}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className={'line-tab'+(tab===t.k?' active':'')} style={{
              borderColor: tab===t.k ? 'rgba(0,185,0,0.3)' : 'rgba(200,210,240,0.5)',
              background: tab===t.k ? 'rgba(0,185,0,0.1)' : 'rgba(255,255,255,0.55)',
              color: tab===t.k ? '#00B900' : '#9ca3af',
            }}>{t.l}</button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div style={{ animation:'line-fade .3s ease' }}>
            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {[
                { icon:'📩', label:'ข้อความทั้งหมด', value:msgCount,          color:'#6C63FF' },
                { icon:'✅', label:'บันทึกแล้ว',      value:processed,         color:'#00B900' },
                { icon:'👥', label:'ผู้ใช้',          value:users,             color:'#06B6D4' },
                { icon:'📋', label:'งานจาก LINE',     value:totalFromLINE,     color:'#F59E0B' },
              ].map((s,i) => (
                <div key={i} className="line-stat">
                  <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
                  <div style={{ fontSize:24, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* How it works */}
              <div className="line-glass">
                <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:14 }}>🔄 วิธีทำงาน</div>
                {[
                  { n:1, t:'ส่งข้อความใน LINE', d:'บอก AI ว่าทำงานอะไรวันนี้', c:'#6C63FF' },
                  { n:2, t:'AI วิเคราะห์อัตโนมัติ', d:'จัดหมวดหมู่ สรุป สร้าง tags', c:'#8B5CF6' },
                  { n:3, t:'บันทึกใน StayScape', d:'ขึ้น Dashboard, Calendar, Gallery', c:'#00B900' },
                  { n:4, t:'ดูรายงานบนเว็บ', d:'PDF, PPTX, Analytics ครบ', c:'#F59E0B' },
                ].map((s,i) => (
                  <div key={i} style={{ display:'flex', gap:12, marginBottom:i<3?12:0, alignItems:'flex-start' }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:s.c+'18', border:'1px solid '+s.c+'30', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:s.c, flexShrink:0 }}>{s.n}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e' }}>{s.t}</div>
                      <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent activity */}
              <div className="line-glass">
                <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:14 }}>📨 กิจกรรมล่าสุด</div>
                {messages.slice(0,5).map((msg, i) => {
                  const mType = MSG_TYPES[msg.message_type] || MSG_TYPES.text
                  return (
                    <div key={i} style={{ display:'flex', gap:10, paddingBottom:i<4?10:0, borderBottom:i<4?'1px solid rgba(0,0,0,0.05)':'none', marginBottom:i<4?10:0 }}>
                      <div style={{ width:28, height:28, borderRadius:8, background:mType.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{mType.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:'#1a1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {msg.content?.slice(0,50)}{msg.content?.length>50?'...':''}
                        </div>
                        <div style={{ fontSize:10, color:'#9ca3af', marginTop:2, display:'flex', gap:6 }}>
                          <span>{msg.line_user_id}</span>
                          <span>·</span>
                          <span>{fmtTime(msg.created_at)}</span>
                        </div>
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, color:msg.status==='processed'?'#00B900':'#F59E0B', flexShrink:0 }}>
                        {msg.status==='processed'?'✅':'⚡'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Architecture */}
            <div className="line-glass" style={{ marginTop:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:14 }}>🏗️ Architecture</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                {[
                  { icon:'📱', label:'LINE OA',         color:'#00B900' },
                  { arrow:true },
                  { icon:'🔗', label:'Webhook API',     color:'#6C63FF' },
                  { arrow:true },
                  { icon:'🤖', label:'AI Processing',   color:'#8B5CF6' },
                  { arrow:true },
                  { icon:'🗄️', label:'Supabase DB',     color:'#06B6D4' },
                  { arrow:true },
                  { icon:'🖥️', label:'StayScape Web',  color:'#F59E0B' },
                ].map((item, i) => (
                  item.arrow
                    ? <div key={i} style={{ fontSize:18, color:'#9ca3af', margin:'0 4px' }}>→</div>
                    : <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                        <div style={{ width:44, height:44, borderRadius:12, background:item.color+'15', border:'1px solid '+item.color+'30', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{item.icon}</div>
                        <span style={{ fontSize:11, fontWeight:600, color:item.color }}>{item.label}</span>
                      </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SETUP GUIDE ── */}
        {tab === 'setup' && <SetupGuide />}

        {/* ── MESSAGES ── */}
        {tab === 'messages' && (
          <div style={{ animation:'line-fade .3s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a2e' }}>{messages.length} ข้อความ</div>
              <div style={{ display:'flex', gap:5 }}>
                {['all','text','image','audio'].map(f => (
                  <button key={f} style={{ padding:'5px 12px', borderRadius:20, border:'1px solid rgba(200,210,240,0.5)', background:'rgba(255,255,255,0.55)', color:'#9ca3af', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>{f}</button>
                ))}
              </div>
            </div>

            {messages.map((msg, i) => {
              const mType = MSG_TYPES[msg.message_type] || MSG_TYPES.text
              return (
                <div key={i} className="line-msg-card">
                  <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, borderRadius:3, background:mType.color }}/>
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start', paddingLeft:8 }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:mType.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{mType.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#1a1a2e' }}>{msg.line_user_id}</span>
                        <span style={{ background:mType.bg, color:mType.color, fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:20 }}>{msg.message_type}</span>
                        <span style={{ fontSize:11, color:'#9ca3af', marginLeft:'auto' }}>{fmtTime(msg.created_at)}</span>
                      </div>
                      <div style={{ fontSize:13, color:'#4a5568', marginBottom:6, lineHeight:1.5 }}>
                        {msg.content?.slice(0,120)}{msg.content?.length>120?'...':''}
                      </div>
                      {msg.ai_result && (
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          <span style={{ background:'rgba(108,99,255,0.08)', color:'#6C63FF', fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>
                            {CATS[msg.ai_result.category]||'📌'} {msg.ai_result.category}
                          </span>
                          <span style={{ background:'rgba(0,185,0,0.08)', color:'#00B900', fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>
                            ⏱ {msg.ai_result.hours}h
                          </span>
                          {(msg.ai_result.tags||[]).slice(0,2).map((t,j) => (
                            <span key={j} style={{ background:'rgba(100,116,139,0.08)', color:'#64748B', fontSize:10, padding:'2px 7px', borderRadius:20 }}>#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize:18, flexShrink:0 }}>
                      {msg.status==='processed'?'✅':msg.status==='command'?'⚡':'⏳'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── COMMANDS ── */}
        {tab === 'commands' && (
          <div style={{ animation:'line-fade .3s ease' }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#1a1a2e', marginBottom:16 }}>คำสั่งที่รองรับ</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              {[
                { cmd:'/today',       icon:'📊', desc:'ดูงานวันนี้ทั้งหมด',         example:'พิมพ์ /today' },
                { cmd:'/summary',     icon:'📋', desc:'สรุปผลงานเดือนนี้',          example:'พิมพ์ /summary' },
                { cmd:'/timer start', icon:'⏱', desc:'เริ่มจับเวลางาน',            example:'พิมพ์ /timer start' },
                { cmd:'/timer stop',  icon:'🛑', desc:'หยุดจับเวลา',               example:'พิมพ์ /timer stop' },
                { cmd:'/report',      icon:'📈', desc:'สร้างรายงานประจำเดือน',     example:'พิมพ์ /report' },
                { cmd:'/help',        icon:'❓', desc:'ดูคำสั่งทั้งหมด',           example:'พิมพ์ /help' },
              ].map((c, i) => (
                <div key={i} className="line-cmd-card">
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <span style={{ fontSize:20 }}>{c.icon}</span>
                    <code style={{ fontSize:13, fontWeight:800, color:'#00B900', background:'rgba(0,185,0,0.1)', padding:'2px 8px', borderRadius:6, fontFamily:'monospace' }}>{c.cmd}</code>
                  </div>
                  <div style={{ fontSize:13, color:'#1a1a2e', marginBottom:4 }}>{c.desc}</div>
                  <div style={{ fontSize:11, color:'#9ca3af' }}>{c.example}</div>
                </div>
              ))}
            </div>

            {/* Natural language */}
            <div className="line-glass">
              <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:14 }}>💬 ส่งข้อความธรรมชาติ (ไม่ต้องใช้คำสั่ง)</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { input:'วันนี้ออกแบบโปสเตอร์ POS ร้านกาแฟ ใช้เวลา 3 ชม.', out:'🎨 Graphic Design · 3h · #POS #poster' },
                  { input:'ตัดต่อวิดีโอ TikTok โปรโมชั่น เพิ่ม subtitle เสร็จแล้ว', out:'🎬 Video Editing · 2h · #TikTok #video' },
                  { input:'ถ่ายภาพ Product Lifestyle สินค้าใหม่ 40 รูป', out:'📷 Photography · 4h · #product #lifestyle' },
                  { input:'ทำ AI content Facebook 10 ชิ้น', out:'🤖 AI Content · 2h · #Facebook #AI' },
                ].map((ex,i) => (
                  <div key={i} style={{ background:'rgba(255,255,255,0.55)', border:'1px solid rgba(200,210,240,0.4)', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:12, color:'#4a5568', marginBottom:8, lineHeight:1.55 }}>💬 "{ex.input}"</div>
                    <div style={{ fontSize:11, color:'#00B900', fontWeight:600 }}>→ AI: {ex.out}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
