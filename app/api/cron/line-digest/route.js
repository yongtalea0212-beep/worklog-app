// app/api/cron/line-digest/route.js
// §20 — scheduled LINE digests. Triggered by Vercel Cron (see vercel.json):
//   07:00 Asia/Bangkok (00:00 UTC) → ?type=plan     (today's plan)
//   18:00 Asia/Bangkok (11:00 UTC) → ?type=pending  (incomplete summary)
// Only sends when there's meaningful content (no spam).
import { createClient } from '@supabase/supabase-js'

const LINE_TOKEN   = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL || 'https://worklog-app-virid.vercel.app'
const CRON_SECRET  = process.env.CRON_SECRET || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const CAT = {
  graphic:'🎨', video:'🎬', photo:'📷', marketing:'📢', ai:'🤖', branding:'✨', pos:'🏪', other:'📌',
}

// Date in Asia/Bangkok (UTC+7)
function bkkDateStr(d = new Date()) {
  return new Date(d.getTime() + 7 * 3600000).toISOString().split('T')[0]
}
function bkkDayOf(iso) {
  return new Date(new Date(iso).getTime() + 7 * 3600000).toISOString().split('T')[0]
}
function hm(iso) {
  const d = new Date(new Date(iso).getTime() + 7 * 3600000)
  return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`
}

async function pushLINE(to, messages) {
  if (!LINE_TOKEN) return
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ to, messages }),
    })
  } catch (e) { console.error('[CRON push]', e?.message || e) }
}

function digestCard(title, subtitle, lines, footerLabel) {
  return {
    type:'flex', altText:title,
    contents:{
      type:'bubble', size:'mega',
      header:{ type:'box', layout:'vertical', paddingAll:'16px', backgroundColor:'#F0EEFF',
        contents:[
          { type:'text', text:title, weight:'bold', size:'md', color:'#6C63FF' },
          ...(subtitle ? [{ type:'text', text:subtitle, size:'xs', color:'#9ca3af', margin:'xs' }] : []),
        ] },
      body:{ type:'box', layout:'vertical', paddingAll:'14px', spacing:'sm', backgroundColor:'#FAFBFF',
        contents: lines.length ? lines.map(l => ({
          type:'box', layout:'horizontal', spacing:'sm', contents:[
            { type:'text', text:l.time || '•', size:'xs', weight:'bold', color:l.color || '#6C63FF', flex:0, gravity:'center' },
            { type:'text', text:l.text, size:'sm', color:'#1a1a2e', flex:1, wrap:true },
          ]
        })) : [{ type:'text', text:'ไม่มีรายการ', size:'sm', color:'#9ca3af' }] },
      footer:{ type:'box', layout:'vertical', paddingAll:'12px', backgroundColor:'#FAFBFF',
        contents:[{ type:'button', style:'primary', height:'sm', color:'#6C63FF',
          action:{ type:'uri', label: footerLabel || '🌐 เปิดปฏิทิน', uri: APP_URL } }] },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } },
    }
  }
}

// Evening confirm bubble — tap ✅ to mark done (handled by the LINE webhook's
// existing action=status postback).
function confirmBubble(t, today) {
  const overdue = t.due_date && t.due_date < today
  const sub = t.start_at
    ? `🕐 ${hm(t.start_at)}${t.end_at ? '–' + hm(t.end_at) : ''}`
    : (t.due_date ? (overdue ? '⚠️ เลยกำหนดส่ง' : '📅 ครบกำหนดวันนี้') : '')
  return {
    type:'bubble', size:'kilo',
    header:{ type:'box', layout:'vertical', paddingAll:'14px', backgroundColor: overdue ? '#FFF0F0' : '#F0EEFF',
      contents:[
        { type:'text', text: overdue ? '⚠️ งานเลยกำหนด' : '⏰ ถึงเวลาเสร็จแล้ว', size:'xs', weight:'bold', color: overdue ? '#EF4444' : '#6C63FF' },
        { type:'text', text:`${CAT[t.category] || '📌'} ${t.title || 'งาน'}`, weight:'bold', size:'sm', color:'#1a1a2e', wrap:true, margin:'sm' },
        ...(sub ? [{ type:'text', text:sub, size:'xxs', color:'#9ca3af', margin:'xs' }] : []),
      ] },
    footer:{ type:'box', layout:'vertical', paddingAll:'10px', spacing:'sm', backgroundColor:'#FAFBFF',
      contents:[
        { type:'button', style:'primary', height:'sm', color:'#10B981', action:{ type:'postback', label:'✅ เสร็จแล้ว', data:`action=status&logId=${t.id}&status=done` } },
        { type:'button', style:'secondary', height:'sm', color:'#E8E0FF', action:{ type:'uri', label:'🌐 เปิด', uri: APP_URL } },
      ] },
  }
}

function isMondayBkk() { return new Date(Date.now() + 7 * 3600000).getUTCDay() === 1 }

// Monday morning greeting — nudge to list the week's tasks.
function mondayCard(pending) {
  const sub = pending > 0
    ? `ยกมาจากก่อนหน้า ${pending} งานที่ยังไม่เสร็จ`
    : 'เริ่มต้นสัปดาห์ใหม่แบบเคลียร์ ✨'
  return {
    type:'flex', altText:'🌟 สวัสดีเช้าวันจันทร์ — อย่าลืมลิสต์งานสัปดาห์นี้',
    contents:{
      type:'bubble', size:'mega',
      header:{ type:'box', layout:'vertical', paddingAll:'20px', backgroundColor:'#6C63FF',
        contents:[
          { type:'text', text:'🌟 สวัสดีเช้าวันจันทร์!', size:'lg', weight:'bold', color:'#FFFFFF' },
          { type:'text', text:'เริ่มสัปดาห์ใหม่กันแล้ว 💪', size:'sm', color:'#E8E0FF', margin:'sm' },
        ] },
      body:{ type:'box', layout:'vertical', paddingAll:'18px', spacing:'md', backgroundColor:'#FAFBFF',
        contents:[
          { type:'text', text:'📝 อย่าลืมลิสต์งานของสัปดาห์นี้', size:'md', weight:'bold', color:'#1a1a2e', wrap:true },
          { type:'text', text:sub, size:'sm', color:'#6b7099', wrap:true },
          { type:'text', text:'พิมพ์เล่างานที่ต้องทำมาได้เลย เดี๋ยว AI จัดเวลาและเตือนให้ ⏰', size:'xs', color:'#9ca3af', wrap:true },
        ] },
      footer:{ type:'box', layout:'vertical', paddingAll:'14px', spacing:'sm', backgroundColor:'#FAFBFF',
        contents:[
          { type:'box', layout:'horizontal', spacing:'sm', contents:[
            { type:'button', style:'secondary', height:'sm', color:'#E8E0FF', action:{ type:'message', label:'📋 งานค้าง', text:'งานค้าง' } },
            { type:'button', style:'secondary', height:'sm', color:'#E8E0FF', action:{ type:'message', label:'📅 งานวันนี้', text:'งานวันนี้' } },
          ] },
          { type:'button', style:'primary', height:'sm', color:'#6C63FF', action:{ type:'uri', label:'🌐 เปิดปฏิทิน', uri: APP_URL } },
        ] },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } },
    }
  }
}

// Greet every active follower (plus anyone with logs), once, on Monday morning.
async function sendMondayGreetings(byUser) {
  const ids = new Set(byUser.keys())
  const { data } = await supabase.from('line_users').select('line_user_id').eq('active', true).limit(5000)
  for (const u of (data || [])) if (u.line_user_id) ids.add(u.line_user_id)
  let sent = 0
  for (const uid of ids) {
    const rows = byUser.get(uid) || []
    const pending = rows.filter(r => r.status !== 'done').length
    await pushLINE(uid, [mondayCard(pending)])
    sent++
  }
  return sent
}

async function run(type) {
  const today = bkkDateStr()
  // Pull candidate rows for all LINE users (small dataset; filter in JS).
  const { data, error } = await supabase
    .from('work_logs')
    .select('id,line_user_id,title,category,status,date,start_at,end_at,due_date,priority')
    .not('line_user_id', 'is', null)
    .limit(5000)
  if (error) { console.error('[CRON]', error.message); return { ok:false, error:error.message } }

  // group by user
  const byUser = new Map()
  for (const r of (data || [])) {
    if (!byUser.has(r.line_user_id)) byUser.set(r.line_user_id, [])
    byUser.get(r.line_user_id).push(r)
  }

  // Monday greeting rides on the daily 07:00 plan cron (keeps us at 2 crons for Hobby).
  let mondaySent = 0
  if (type === 'plan' && isMondayBkk()) mondaySent = await sendMondayGreetings(byUser)

  let sent = 0
  for (const [uid, rows] of byUser) {
    let card = null

    if (type === 'plan') {
      const scheduled = rows
        .filter(r => r.start_at && bkkDayOf(r.start_at) === today && r.status !== 'done')
        .sort((a,b) => new Date(a.start_at) - new Date(b.start_at))
      const unscheduled = rows.filter(r => !r.start_at && r.status !== 'done').length
      if (!scheduled.length && !unscheduled) continue
      const lines = scheduled.map(r => ({
        time: `${hm(r.start_at)}${r.end_at ? '–' + hm(r.end_at) : ''}`,
        text: `${CAT[r.category] || '📌'} ${r.title || 'งาน'}`,
      }))
      if (unscheduled) lines.push({ time:'📥', text:`อีก ${unscheduled} งานยังไม่จัดเวลา — กด "🤖 จัดตารางให้" ในแอป`, color:'#F59E0B' })
      card = digestCard('☀️ แผนงานวันนี้', new Date().toLocaleDateString('th-TH', { weekday:'long', day:'numeric', month:'long' }),
        lines, '🌐 เปิดปฏิทิน')

    } else { // pending (evening) — confirm carousel
      const notDone = rows.filter(r => r.status !== 'done')
      const overdue = notDone.filter(r => r.due_date && r.due_date < today)
      const dueToday = notDone.filter(r => r.due_date === today)
      const scheduledToday = notDone.filter(r => r.start_at && bkkDayOf(r.start_at) === today)
      const seen = new Set()
      const items = [...overdue, ...dueToday, ...scheduledToday]
        .filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
      if (!items.length) continue
      const bubbles = items.slice(0, 10).map(t => confirmBubble(t, today))
      await pushLINE(uid, [
        { type:'text', text:`🌙 สรุปงานวันนี้\nมี ${items.length} งานที่ยังไม่เสร็จ${overdue.length ? ` (เลยกำหนด ${overdue.length})` : ''} — กดยืนยันเมื่อทำเสร็จได้เลย` },
        { type:'flex', altText:'ยืนยันงานที่ทำเสร็จ', contents:{ type:'carousel', contents: bubbles } },
      ])
      sent++
      continue
    }

    if (card) { await pushLINE(uid, [card]); sent++ }
  }
  return { ok:true, type, users: byUser.size, sent, mondaySent }
}

export async function GET(request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when configured.
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization') || ''
    if (auth !== `Bearer ${CRON_SECRET}`) return Response.json({ error:'unauthorized' }, { status:401 })
  }
  const type = new URL(request.url).searchParams.get('type') === 'pending' ? 'pending' : 'plan'
  const result = await run(type)
  return Response.json(result)
}
