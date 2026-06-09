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

async function run(type) {
  const today = bkkDateStr()
  // Pull candidate rows for all LINE users (small dataset; filter in JS).
  const { data, error } = await supabase
    .from('work_logs')
    .select('line_user_id,title,category,status,date,start_at,end_at,due_date,priority')
    .not('line_user_id', 'is', null)
    .limit(5000)
  if (error) { console.error('[CRON]', error.message); return { ok:false, error:error.message } }

  // group by user
  const byUser = new Map()
  for (const r of (data || [])) {
    if (!byUser.has(r.line_user_id)) byUser.set(r.line_user_id, [])
    byUser.get(r.line_user_id).push(r)
  }

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

    } else { // pending (evening)
      const notDone = rows.filter(r => r.status !== 'done')
      const overdue = notDone.filter(r => r.due_date && r.due_date < today)
      const dueToday = notDone.filter(r => r.due_date === today)
      const scheduledToday = notDone.filter(r => r.start_at && bkkDayOf(r.start_at) === today)
      const pool = [...overdue, ...dueToday, ...scheduledToday]
      // de-dupe by title+category
      const seen = new Set()
      const items = pool.filter(r => { const k = r.title + '|' + r.category; if (seen.has(k)) return false; seen.add(k); return true })
      if (!items.length) continue
      const lines = items.slice(0, 8).map(r => ({
        time: r.due_date && r.due_date < today ? '⚠️' : '•',
        color: r.due_date && r.due_date < today ? '#EF4444' : '#6C63FF',
        text: `${CAT[r.category] || '📌'} ${r.title || 'งาน'}`,
      }))
      card = digestCard('🌙 สรุปงานค้างวันนี้', `ยังไม่เสร็จ ${items.length} งาน${overdue.length ? ` · เลยกำหนด ${overdue.length}` : ''}`,
        lines, '🌐 จัดการงาน')
    }

    if (card) { await pushLINE(uid, [card]); sent++ }
  }
  return { ok:true, type, users: byUser.size, sent }
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
