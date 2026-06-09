// app/api/cron/line-digest/route.js
// §20 — scheduled LINE digests. Triggered by Vercel Cron (see vercel.json):
//   07:00 Asia/Bangkok (00:00 UTC) → ?type=plan     (today's plan)
//   18:00 Asia/Bangkok (11:00 UTC) → ?type=pending  (incomplete summary)
// Only sends when there's meaningful content (no spam).
import { createClient } from '@supabase/supabase-js'

const LINE_TOKEN   = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL || 'https://worklog-app-virid.vercel.app'
const MASCOT_FACE  = APP_URL + '/mascot-face.png?v=2'
const MASCOT_HAPPY = APP_URL + '/mascot-happy.png?v=2'
const MASCOT_ALERT = APP_URL + '/mascot-alert.png?v=2'
const MASCOT_HERO  = APP_URL + '/mascot-hero.png?v=2'
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

async function callAI(prompt, { maxTokens = 400, timeoutMs = 15000 } = {}) {
  if (!ANTHROPIC_KEY) return ''
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'x-api-key':ANTHROPIC_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:maxTokens, messages:[{ role:'user', content:prompt }] }),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (!r.ok) return ''
    return (await r.json()).content?.[0]?.text || ''
  } catch { clearTimeout(t); return '' }
}

function digestCard(title, subtitle, lines, footerLabel) {
  return {
    type:'flex', altText:title,
    contents:{
      type:'bubble', size:'mega',
      header:{ type:'box', layout:'horizontal', paddingAll:'16px', spacing:'md', backgroundColor:'#F0EEFF',
        contents:[
          { type:'image', url:MASCOT_FACE, size:'44px', aspectMode:'cover', flex:0, gravity:'center' },
          { type:'box', layout:'vertical', flex:1, justifyContent:'center', contents:[
            { type:'text', text:title, weight:'bold', size:'md', color:'#6C63FF' },
            ...(subtitle ? [{ type:'text', text:subtitle, size:'xs', color:'#9ca3af', margin:'xs' }] : []),
          ] },
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
    header:{ type:'box', layout:'horizontal', paddingAll:'14px', spacing:'sm', backgroundColor: overdue ? '#FFF0F0' : '#F0EEFF',
      contents:[
        { type:'image', url: overdue ? MASCOT_ALERT : MASCOT_FACE, size:'40px', aspectMode:'cover', flex:0, gravity:'top' },
        { type:'box', layout:'vertical', flex:1, contents:[
          { type:'text', text: overdue ? '⚠️ งานเลยกำหนด' : '⏰ ถึงเวลาเสร็จแล้ว', size:'xs', weight:'bold', color: overdue ? '#EF4444' : '#6C63FF' },
          { type:'text', text:`${CAT[t.category] || '📌'} ${t.title || 'งาน'}`, weight:'bold', size:'sm', color:'#1a1a2e', wrap:true, margin:'sm' },
          ...(sub ? [{ type:'text', text:sub, size:'xxs', color:'#9ca3af', margin:'xs' }] : []),
        ] },
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
      hero:{ type:'image', url:MASCOT_HERO, size:'full', aspectRatio:'20:11', aspectMode:'cover', backgroundColor:'#6C63FF' },
      body:{ type:'box', layout:'vertical', paddingAll:'18px', spacing:'md', backgroundColor:'#FAFBFF',
        contents:[
          { type:'text', text:'🌟 สวัสดีเช้าวันจันทร์!', size:'lg', weight:'bold', color:'#6C63FF' },
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

function isFridayBkk() { return new Date(Date.now() + 7 * 3600000).getUTCDay() === 5 }

// AI weekly recap — short summary + one actionable tip for next week.
async function weeklyAI(week, stats) {
  const catList = Object.entries(stats.byCat).map(([c, n]) => `${CAT[c] || c}×${n}`).join(', ')
  const titles = week.slice(0, 15).map(r => `- ${r.title || 'งาน'} (${r.status === 'done' ? 'เสร็จ' : 'ค้าง'})`).join('\n')
  const p = `สรุปผลงานสัปดาห์นี้ของผู้ใช้แบบกระชับ เป็นกันเอง ให้กำลังใจ ตอบ JSON เท่านั้น ห้าม markdown
สถิติ: ทำทั้งหมด ${stats.total} งาน, เสร็จ ${stats.done}, ค้าง ${stats.pending}, รวม ${Math.round(stats.hours * 10) / 10} ชม.
หมวด: ${catList || '-'}
รายการงาน:
${titles || '-'}
ตอบ: {"summary":"สรุปภาพรวม 1-2 ประโยค","advice":"คำแนะนำสำหรับสัปดาห์หน้า 1 ข้อ สั้นๆ ปฏิบัติได้จริง"}`
  try {
    const txt = await callAI(p)
    const s = txt.indexOf('{'), e = txt.lastIndexOf('}')
    if (s === -1 || e === -1) throw new Error('no json')
    const j = JSON.parse(txt.slice(s, e + 1))
    return { summary: j.summary || '', advice: j.advice || '' }
  } catch {
    return {
      summary: `สัปดาห์นี้ทำไป ${stats.total} งาน เสร็จ ${stats.done} งาน 💪`,
      advice: 'สัปดาห์หน้าลองลิสต์งานตั้งแต่วันจันทร์เพื่อวางแผนล่วงหน้า',
    }
  }
}

function weeklyCard(stats, ai) {
  const completion = stats.total ? Math.round(stats.done / stats.total * 100) : 0
  const statBox = (emoji, val, label, color) => ({
    type:'box', layout:'vertical', flex:1, cornerRadius:'10px', paddingAll:'10px',
    backgroundColor:'#FFFFFF', borderColor:'#E8E0FF', borderWidth:'1px',
    contents:[
      { type:'text', text:emoji, size:'sm', align:'center' },
      { type:'text', text:String(val), size:'md', weight:'bold', color, align:'center', margin:'xs' },
      { type:'text', text:label, size:'xxs', color:'#9ca3af', align:'center' },
    ]
  })
  return {
    type:'flex', altText:'📈 สรุปผลงานสัปดาห์นี้',
    contents:{
      type:'bubble', size:'mega',
      header:{ type:'box', layout:'horizontal', paddingAll:'18px', spacing:'md', backgroundColor:'#6C63FF',
        contents:[
          { type:'box', layout:'vertical', flex:0, width:'50px', height:'50px', cornerRadius:'25px',
            backgroundColor:'#FFFFFF', justifyContent:'center', alignItems:'center',
            contents:[{ type:'image', url:MASCOT_HAPPY, size:'38px', aspectMode:'cover' }] },
          { type:'box', layout:'vertical', flex:1, justifyContent:'center', contents:[
            { type:'text', text:'📈 สรุปสัปดาห์นี้', size:'lg', weight:'bold', color:'#FFFFFF' },
            { type:'text', text:'WorkLog AI · ทบทวนก่อนสุดสัปดาห์', size:'xs', color:'#E8E0FF', margin:'xs' },
          ] },
          { type:'box', layout:'vertical', flex:0, justifyContent:'center', cornerRadius:'20px',
            paddingAll:'6px', paddingStart:'14px', paddingEnd:'14px', backgroundColor:'#FFFFFF',
            contents:[{ type:'text', text:completion + '%', size:'md', weight:'bold', color:'#6C63FF' }] },
        ] },
      body:{ type:'box', layout:'vertical', paddingAll:'16px', spacing:'md', backgroundColor:'#FAFBFF',
        contents:[
          { type:'box', layout:'horizontal', spacing:'sm', contents:[
            statBox('✅', stats.done, 'เสร็จ', '#10B981'),
            statBox('📝', stats.pending, 'ค้าง', '#F59E0B'),
            statBox('⏱', Math.round(stats.hours * 10) / 10, 'ชม.', '#06B6D4'),
          ] },
          ...(ai.summary ? [{
            type:'box', layout:'vertical', cornerRadius:'10px', paddingAll:'12px', backgroundColor:'#F0EEFF',
            contents:[
              { type:'text', text:'✨ ภาพรวม', size:'xs', weight:'bold', color:'#6C63FF' },
              { type:'text', text:ai.summary, size:'sm', color:'#6b7099', wrap:true, margin:'sm' },
            ]
          }] : []),
          ...(ai.advice ? [{
            type:'box', layout:'vertical', cornerRadius:'10px', paddingAll:'12px', backgroundColor:'#FFF8E0',
            contents:[
              { type:'text', text:'💡 คำแนะนำสัปดาห์หน้า', size:'xs', weight:'bold', color:'#F59E0B' },
              { type:'text', text:ai.advice, size:'sm', color:'#6b7099', wrap:true, margin:'sm' },
            ]
          }] : []),
        ] },
      footer:{ type:'box', layout:'vertical', paddingAll:'12px', spacing:'sm', backgroundColor:'#FAFBFF',
        contents:[
          { type:'box', layout:'horizontal', spacing:'sm', contents:[
            { type:'button', style:'secondary', height:'sm', color:'#E8E0FF', action:{ type:'message', label:'📄 ส่ง PDF', text:'ส่ง PDF' } },
            { type:'button', style:'secondary', height:'sm', color:'#E8E0FF', action:{ type:'message', label:'📊 แดชบอร์ด', text:'แดชบอร์ด' } },
          ] },
          { type:'button', style:'primary', height:'sm', color:'#6C63FF', action:{ type:'uri', label:'🌐 เปิดแอป', uri: APP_URL } },
        ] },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } },
    }
  }
}

async function sendWeeklySummary(byUser) {
  const weekAgo = bkkDateStr(new Date(Date.now() - 7 * 86400000))
  let sent = 0
  for (const [uid, rows] of byUser) {
    const week = rows.filter(r => r.date && r.date >= weekAgo)
    if (!week.length) continue
    const done = week.filter(r => r.status === 'done').length
    const pending = week.length - done
    const hours = week.reduce((s, r) => s + (r.hours_spent || 0), 0)
    const byCat = {}
    for (const r of week) { const c = r.category || 'other'; byCat[c] = (byCat[c] || 0) + 1 }
    const stats = { total: week.length, done, pending, hours, byCat }
    const ai = await weeklyAI(week, stats)
    await pushLINE(uid, [weeklyCard(stats, ai)])
    sent++
  }
  return sent
}

async function run(type) {
  const today = bkkDateStr()
  // Pull candidate rows for all LINE users (small dataset; filter in JS).
  const { data, error } = await supabase
    .from('work_logs')
    .select('id,line_user_id,title,category,status,date,start_at,end_at,due_date,priority,hours_spent')
    .not('line_user_id', 'is', null)
    .limit(5000)
  if (error) { console.error('[CRON]', error.message); return { ok:false, error:error.message } }

  // group by user
  const byUser = new Map()
  for (const r of (data || [])) {
    if (!byUser.has(r.line_user_id)) byUser.set(r.line_user_id, [])
    byUser.get(r.line_user_id).push(r)
  }

  // Manual test hook: ?type=weekly forces the recap regardless of weekday.
  if (type === 'weekly') {
    const weeklySent = await sendWeeklySummary(byUser)
    return { ok:true, type, users: byUser.size, weeklySent }
  }

  // Monday greeting rides on the daily 07:00 plan cron (keeps us at 2 crons for Hobby).
  let mondaySent = 0
  if (type === 'plan' && isMondayBkk()) mondaySent = await sendMondayGreetings(byUser)

  // Friday AI weekly recap rides on the 18:00 pending cron (still 2 crons total).
  let weeklySent = 0
  if (type === 'pending' && isFridayBkk()) weeklySent = await sendWeeklySummary(byUser)

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
  return { ok:true, type, users: byUser.size, sent, mondaySent, weeklySent }
}

export async function GET(request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when configured.
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization') || ''
    if (auth !== `Bearer ${CRON_SECRET}`) return Response.json({ error:'unauthorized' }, { status:401 })
  }
  const typeParam = new URL(request.url).searchParams.get('type')
  const type = typeParam === 'pending' ? 'pending' : typeParam === 'weekly' ? 'weekly' : 'plan'
  const result = await run(type)
  return Response.json(result)
}
