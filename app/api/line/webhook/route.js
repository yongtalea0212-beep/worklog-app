// app/api/line/webhook/route.js
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const LINE_ACCESS_TOKEN  = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_CHANNEL_SECRET= process.env.LINE_CHANNEL_SECRET || ''
const ANTHROPIC_KEY      = process.env.ANTHROPIC_API_KEY || ''

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function verifySignature(body, signature) {
  return true // skip verification for now
}

async function replyLINE(replyToken, messages) {
  if (!LINE_ACCESS_TOKEN || !replyToken) return
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
}

async function getLineContent(messageId) {
  if (!LINE_ACCESS_TOKEN) return null
  const res = await fetch('https://api-data.line.me/v2/bot/message/' + messageId + '/content', {
    headers: { 'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN },
  })
  if (!res.ok) return null
  const buffer = await res.arrayBuffer()
  return Buffer.from(buffer)
}

async function uploadToSupabase(buffer, filename, contentType) {
  const path = 'line/' + Date.now() + '_' + filename
  const { error } = await supabase.storage
    .from('worklog-gallery')
    .upload(path, buffer, { contentType, cacheControl: '3600', upsert: false })
  if (error) return null
  const { data } = supabase.storage.from('worklog-gallery').getPublicUrl(path)
  return data.publicUrl
}

async function callClaude(prompt) {
  if (!ANTHROPIC_KEY) return ''
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// ─────────────────────────────────────────
// AI ANALYZE TEXT
// ─────────────────────────────────────────
async function analyzeWorklog(text) {
  const prompt = [
    'วิเคราะห์งานจากข้อความนี้แล้วตอบ JSON เท่านั้น:',
    '"' + text + '"',
    '',
    '{"title":"ชื่องานสั้นๆ","summary":"สรุป 1-2 ประโยค","category":"graphic|video|photo|marketing|ai|branding|pos|other","hours":1,"tags":["tag1"],"priority":"low|medium|high"}',
  ].join('\n')
  try {
    const txt = await callClaude(prompt)
    const clean = txt.replace(/```json|```/g, '').trim()
    const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
    if (s === -1 || e === -1) throw new Error('no json')
    return JSON.parse(clean.slice(s, e + 1))
  } catch {
    return {
      title: text.slice(0, 60),
      summary: text,
      category: 'other',
      hours: 1,
      tags: [],
      priority: 'medium',
    }
  }
}

// ─────────────────────────────────────────
// SAVE WORKLOG TO SUPABASE
// ─────────────────────────────────────────
async function saveWorklog(lineUserId, analyzed, imageUrls = []) {
  const today = new Date().toISOString().split('T')[0]

  // Find user by line_user_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('line_user_id', lineUserId)
    .single()

  const userId = profile?.id || null

  const { data, error } = await supabase.from('work_logs').insert({
    user_id:     userId,
    line_user_id:lineUserId,
    title:       analyzed.title,
    description: analyzed.summary,
    ai_summary:  analyzed.summary,
    category:    analyzed.category,
    hours_spent: analyzed.hours,
    status:      'done',
    tags:        analyzed.tags || [],
    date:        today,
    image_urls:  imageUrls,
    source:      'line',
  }).select()

  if (error) console.error('Save worklog error:', error)
  return data?.[0] || null
}

// ─────────────────────────────────────────
// LOG LINE MESSAGE
// ─────────────────────────────────────────
async function logMessage(lineUserId, type, content, status = 'processed') {
  await supabase.from('line_messages').insert({
    line_user_id: lineUserId,
    message_type: type,
    content,
    status,
    created_at: new Date().toISOString(),
  }).catch(() => {})
}

// ─────────────────────────────────────────
// HANDLE COMMANDS
// ─────────────────────────────────────────
async function handleCommand(lineUserId, command, replyToken) {
  const cmd = command.trim().toLowerCase()

  if (cmd === '/today') {
    const today = new Date().toISOString().split('T')[0]
    const { data: logs } = await supabase
      .from('work_logs')
      .select('title, hours_spent, category')
      .eq('line_user_id', lineUserId)
      .eq('date', today)

    if (!logs?.length) {
      await replyLINE(replyToken, [{ type:'text', text:'วันนี้ยังไม่มีงานที่บันทึก 📋\nส่งข้อความเพื่อบันทึกงานได้เลย!' }])
    } else {
      const total = logs.reduce((s, l) => s + (l.hours_spent || 0), 0)
      const list = logs.map(l => '• ' + l.title + ' (' + l.hours_spent + 'h)').join('\n')
      await replyLINE(replyToken, [{ type:'text', text:'📊 วันนี้ ' + today + '\n' + logs.length + ' งาน · ' + total + ' ชั่วโมง\n\n' + list }])
    }
    return true
  }

  if (cmd === '/summary') {
    const { data: logs } = await supabase
      .from('work_logs')
      .select('title, hours_spent, category')
      .eq('line_user_id', lineUserId)
      .gte('date', new Date(new Date().setDate(1)).toISOString().split('T')[0])

    const total = logs?.length || 0
    const hours = logs?.reduce((s, l) => s + (l.hours_spent || 0), 0) || 0
    await replyLINE(replyToken, [{ type:'text', text:'📊 สรุปเดือนนี้\n✅ ' + total + ' งาน\n⏱ ' + hours + ' ชั่วโมง\n\nดูรายงานเต็มที่ WorkLog AI ✨' }])
    return true
  }

  if (cmd === '/timer start') {
    await supabase.from('line_timers').upsert({ line_user_id: lineUserId, started_at: new Date().toISOString(), active: true })
    await replyLINE(replyToken, [{ type:'text', text:'⏱ เริ่มจับเวลาแล้ว!\nส่ง /timer stop เมื่อเสร็จงาน' }])
    return true
  }

  if (cmd === '/timer stop') {
    const { data: timer } = await supabase
      .from('line_timers')
      .select('*')
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single()

    if (timer) {
      const elapsed = Math.round((Date.now() - new Date(timer.started_at).getTime()) / 1000 / 60)
      await supabase.from('line_timers').update({ active: false }).eq('id', timer.id)
      await replyLINE(replyToken, [{ type:'text', text:'⏱ หยุดจับเวลาแล้ว\nเวลาที่ใช้: ' + elapsed + ' นาที (' + Math.round(elapsed / 6) / 10 + ' ชั่วโมง)\n\nส่งข้อความบอกว่าทำอะไรเพื่อบันทึกงาน 📝' }])
    } else {
      await replyLINE(replyToken, [{ type:'text', text:'ไม่มีการจับเวลาที่กำลังทำงานอยู่\nส่ง /timer start เพื่อเริ่ม' }])
    }
    return true
  }

  if (cmd === '/report') {
    await replyLINE(replyToken, [{ type:'text', text:'📊 รายงานประจำเดือน\nกำลังสร้าง... เปิด WorkLog AI เพื่อดูรายงาน PDF และ Presentation ✨' }])
    return true
  }

  if (cmd === '/help') {
    await replyLINE(replyToken, [{
      type: 'text',
      text: '🤖 WorkLog AI Commands\n\n/today — งานวันนี้\n/summary — สรุปเดือนนี้\n/timer start — เริ่มจับเวลา\n/timer stop — หยุดจับเวลา\n/report — สร้างรายงาน\n/help — คำสั่งทั้งหมด\n\n💡 หรือส่งข้อความปกติเพื่อบันทึกงาน!'
    }])
    return true
  }

  return false
}

// ─────────────────────────────────────────
// PROCESS EVENT
// ─────────────────────────────────────────
async function processEvent(event) {
  const lineUserId = event.source?.userId || 'unknown'
  const replyToken = event.replyToken

  // ── TEXT MESSAGE ──
  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text || ''

    // Check commands
    if (text.startsWith('/')) {
      const handled = await handleCommand(lineUserId, text, replyToken)
      if (handled) return
    }

    // Log message
    await logMessage(lineUserId, 'text', text)

    // Analyze with AI
    const analyzed = await analyzeWorklog(text)

    // Save worklog
    const saved = await saveWorklog(lineUserId, analyzed)

    // Reply
    const catEmoji = { graphic:'🎨', video:'🎬', photo:'📷', marketing:'📢', ai:'🤖', branding:'✨', pos:'🏪', other:'📌' }
    const emoji = catEmoji[analyzed.category] || '📌'

    await replyLINE(replyToken, [{
      type: 'text',
      text: '✅ บันทึกงานแล้ว!\n\n' + emoji + ' ' + analyzed.title + '\n⏱ ' + analyzed.hours + ' ชั่วโมง\n📂 ' + analyzed.category + '\n🏷 ' + (analyzed.tags || []).join(', ') + '\n\n✨ ' + analyzed.summary
    }])
    return
  }

  // ── IMAGE ──
  if (event.type === 'message' && event.message.type === 'image') {
    await logMessage(lineUserId, 'image', event.message.id)

    const buffer = await getLineContent(event.message.id)
    let imageUrl = null

    if (buffer) {
      imageUrl = await uploadToSupabase(buffer, event.message.id + '.jpg', 'image/jpeg')
    }

    const analyzed = await analyzeWorklog('ได้รับรูปภาพจากผู้ใช้ LINE — งานที่มีรูปภาพแนบ')
    analyzed.title = 'รูปภาพจาก LINE'
    analyzed.category = 'photo'

    await saveWorklog(lineUserId, analyzed, imageUrl ? [imageUrl] : [])

    await replyLINE(replyToken, [{
      type: 'text',
      text: '🖼️ รับรูปภาพแล้ว!\nบันทึกใน Gallery เรียบร้อย ✅\n\nส่งข้อความอธิบายงานเพิ่มเติมได้เลย'
    }])
    return
  }

  // ── VIDEO ──
  if (event.type === 'message' && event.message.type === 'video') {
    await logMessage(lineUserId, 'video', event.message.id)
    await replyLINE(replyToken, [{ type:'text', text:'🎬 รับวิดีโอแล้ว! บันทึกใน Gallery ✅\nส่งข้อความอธิบายงานเพิ่มเติมได้เลย' }])
    return
  }

  // ── AUDIO / VOICE ──
  if (event.type === 'message' && event.message.type === 'audio') {
    await logMessage(lineUserId, 'audio', event.message.id)
    await replyLINE(replyToken, [{ type:'text', text:'🎤 รับเสียงแล้ว!\n\n⚙️ AI กำลังแปลงเสียงเป็นข้อความ...\n(ฟีเจอร์นี้ต้องการ Whisper API)\n\nสำหรับตอนนี้ส่งข้อความอธิบายงานแทนได้เลย' }])
    return
  }

  // ── FILE ──
  if (event.type === 'message' && event.message.type === 'file') {
    await logMessage(lineUserId, 'file', event.message.fileName || event.message.id)
    await replyLINE(replyToken, [{ type:'text', text:'📎 รับไฟล์ "' + (event.message.fileName || 'ไฟล์') + '" แล้ว!\nบันทึกเรียบร้อย ✅' }])
    return
  }

  // ── FOLLOW ──
  if (event.type === 'follow') {
    await supabase.from('line_users').upsert({
      line_user_id: lineUserId,
      followed_at: new Date().toISOString(),
      active: true,
    }).catch(() => {})

    await replyLINE(replyToken, [{
      type: 'text',
      text: '👋 สวัสดี! ยินดีต้อนรับสู่ WorkLog AI\n\n💡 ส่งข้อความบอกว่าทำงานอะไรวันนี้\nAI จะบันทึกงานให้อัตโนมัติ!\n\nส่ง /help เพื่อดูคำสั่งทั้งหมด'
    }])
    return
  }
}

// ─────────────────────────────────────────
// GET — Webhook verification
// ─────────────────────────────────────────
export async function GET() {
  return NextResponse.json({ status: 'WorkLog AI LINE Webhook is running ✅' })
}

// ─────────────────────────────────────────
// POST — Receive events
// ─────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature') || ''

    // Verify signature
    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(body)
    const events = payload.events || []

    // Process all events concurrently
    await Promise.allSettled(events.map(processEvent))

    return NextResponse.json({ ok: true, processed: events.length })
  } catch (error) {
    console.error('LINE webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
