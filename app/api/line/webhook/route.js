// app/api/line/webhook/route.js
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const LINE_TOKEN    = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_SECRET   = process.env.LINE_CHANNEL_SECRET || ''
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!LINE_TOKEN)    console.error('[LINE] LINE_CHANNEL_ACCESS_TOKEN missing')
if (!ANTHROPIC_KEY) console.error('[LINE] ANTHROPIC_API_KEY missing')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const CAT_EMOJI = { graphic:'🎨',video:'🎬',photo:'📷',marketing:'📢',ai:'🤖',branding:'✨',pos:'🏪',other:'📌' }

// ── Signature ──
function verifySignature(body, sig) {
  if (!LINE_SECRET) { console.warn('[LINE] No secret — skip verify'); return true }
  try {
    const hash = crypto.createHmac('SHA256', LINE_SECRET).update(body).digest('base64')
    if (hash !== sig) { console.error('[LINE] Signature mismatch'); return false }
    return true
  } catch(e) { console.error('[LINE] Verify error:', e); return false }
}

// ── Reply (replyToken — must be fast) ──
async function replyLINE(replyToken, messages) {
  if (!LINE_TOKEN || !replyToken) { console.error('[LINE] reply: missing token or replyToken'); return false }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+LINE_TOKEN },
      body: JSON.stringify({ replyToken, messages }),
    })
    const json = await res.json()
    if (!res.ok) { console.error('[LINE] reply failed:', res.status, json); return false }
    console.log('[LINE] reply OK')
    return true
  } catch(e) { console.error('[LINE] reply error:', e); return false }
}

// ── Push (userId — use after background processing) ──
async function pushLINE(userId, messages) {
  if (!LINE_TOKEN || !userId) return false
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+LINE_TOKEN },
      body: JSON.stringify({ to: userId, messages }),
    })
    const json = await res.json()
    if (!res.ok) { console.error('[LINE] push failed:', res.status, json); return false }
    console.log('[LINE] push OK to', userId)
    return true
  } catch(e) { console.error('[LINE] push error:', e); return false }
}

// ── Download media ──
async function getLineContent(messageId) {
  if (!LINE_TOKEN) return null
  try {
    const res = await fetch('https://api-data.line.me/v2/bot/message/'+messageId+'/content', {
      headers: { 'Authorization':'Bearer '+LINE_TOKEN },
    })
    if (!res.ok) { console.error('[LINE] content dl failed:', res.status); return null }
    return Buffer.from(await res.arrayBuffer())
  } catch(e) { console.error('[LINE] content dl error:', e); return null }
}

// ── Supabase ──
async function uploadToSupabase(buffer, filename, contentType) {
  const path = 'line/'+Date.now()+'_'+filename
  try {
    const { error } = await supabase.storage.from('worklog-gallery')
      .upload(path, buffer, { contentType, cacheControl:'3600', upsert:false })
    if (error) { console.error('[SUPA] upload error:', error.message); return null }
    return supabase.storage.from('worklog-gallery').getPublicUrl(path).data.publicUrl
  } catch(e) { console.error('[SUPA] upload exception:', e); return null }
}

async function saveWorklog(lineUserId, analyzed, imageUrls=[]) {
  const today = new Date().toISOString().split('T')[0]
  try {
    const { data, error } = await supabase.from('work_logs').insert({
      line_user_id: lineUserId,
      title:        analyzed.title    || 'งานจาก LINE',
      description:  analyzed.summary  || '',
      ai_summary:   analyzed.summary  || '',
      category:     analyzed.category || 'other',
      hours_spent:  analyzed.hours    || 1,
      status:       'done',
      tags:         analyzed.tags     || [],
      date:         today,
      image_urls:   imageUrls,
      source:       'line',
    }).select()
    if (error) { console.error('[SUPA] insert error:', error.message); return null }
    console.log('[SUPA] saved id:', data?.[0]?.id)
    return data?.[0] || null
  } catch(e) { console.error('[SUPA] insert exception:', e); return null }
}

async function logMessage(userId, type, content) {
  try {
    await supabase.from('line_messages').insert({
      line_user_id: userId,
      message_type: type,
      content: String(content||'').slice(0,500),
      status: 'received',
      created_at: new Date().toISOString(),
    })
  } catch(e) {
    console.error('[SUPA] logMessage error:', e)
  }
}

// ── Claude AI ──
async function callClaude(prompt) {
  if (!ANTHROPIC_KEY) { console.error('[CLAUDE] No API key'); return '' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version':'2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // fast + cheap for LINE bot
        max_tokens: 400,
        messages: [{ role:'user', content: prompt }],
      }),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      const err = await res.json().catch(()=>({}))
      console.error('[CLAUDE] API error:', res.status, err)
      return ''
    }
    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    console.log('[CLAUDE] OK, length:', text.length)
    return text
  } catch(e) {
    clearTimeout(timer)
    console.error('[CLAUDE] error:', e.name==='AbortError' ? 'TIMEOUT' : e)
    return ''
  }
}

async function analyzeWorklog(text) {
  const prompt = 'วิเคราะห์งานจากข้อความนี้แล้วตอบ JSON เท่านั้น ไม่มี markdown:\n"'+text+'"\n\n{"title":"ชื่องานสั้นๆ","summary":"สรุป 1-2 ประโยค","category":"graphic|video|photo|marketing|ai|branding|pos|other","hours":1,"tags":["tag1"]}'
  try {
    const txt = await callClaude(prompt)
    if (!txt) throw new Error('empty')
    const clean = txt.replace(/```json|```/g,'').trim()
    const s=clean.indexOf('{'), e=clean.lastIndexOf('}')
    if (s===-1||e===-1) throw new Error('no json')
    return JSON.parse(clean.slice(s,e+1))
  } catch(err) {
    console.error('[CLAUDE] analyze failed:', err.message)
    return { title:text.slice(0,60), summary:text, category:'other', hours:1, tags:[] }
  }
}

// ── Commands (fast — no AI) ──
async function handleCommand(userId, cmd, replyToken) {
  const c = cmd.trim().toLowerCase()
  console.log('[CMD]', c, 'user:', userId)

  if (c==='/today') {
    const today = new Date().toISOString().split('T')[0]
    const { data:logs } = await supabase.from('work_logs')
      .select('title,hours_spent,category').eq('line_user_id',userId).eq('date',today).limit(20)
    if (!logs?.length) return replyLINE(replyToken,[{type:'text',text:'วันนี้ยังไม่มีงาน 📋\nส่งข้อความเพื่อบันทึกงานได้เลย!'}])
    const total=logs.reduce((s,l)=>s+(l.hours_spent||0),0)
    const list=logs.map(l=>(CAT_EMOJI[l.category]||'📌')+' '+l.title+' ('+l.hours_spent+'h)').join('\n')
    return replyLINE(replyToken,[{type:'text',text:'📊 วันนี้ '+today+'\n'+logs.length+' งาน · '+total+' ชม.\n\n'+list}])
  }

  if (c==='/summary') {
    const fd=new Date(); fd.setDate(1)
    const { data:logs } = await supabase.from('work_logs')
      .select('hours_spent').eq('line_user_id',userId).gte('date',fd.toISOString().split('T')[0])
    const total=logs?.length||0, hours=logs?.reduce((s,l)=>s+(l.hours_spent||0),0)||0
    return replyLINE(replyToken,[{type:'text',text:'📊 เดือนนี้\n✅ '+total+' งาน · ⏱ '+hours+' ชม.'}])
  }

  if (c==='/timer start') {
    await supabase.from('line_timers').upsert({line_user_id:userId,started_at:new Date().toISOString(),active:true})
    return replyLINE(replyToken,[{type:'text',text:'⏱ เริ่มจับเวลาแล้ว!\nส่ง /timer stop เมื่อเสร็จ'}])
  }

  if (c==='/timer stop') {
    const { data:timer } = await supabase.from('line_timers')
      .select('*').eq('line_user_id',userId).eq('active',true).single()
    if (timer) {
      const min=Math.round((Date.now()-new Date(timer.started_at).getTime())/60000)
      await supabase.from('line_timers').update({active:false}).eq('id',timer.id)
      return replyLINE(replyToken,[{type:'text',text:'⏱ หยุดแล้ว · '+min+' นาที ('+Math.round(min/6)/10+' ชม.)\nส่งข้อความบอกว่าทำอะไรเพื่อบันทึก 📝'}])
    }
    return replyLINE(replyToken,[{type:'text',text:'ไม่มี timer ที่ทำงาน\nส่ง /timer start เพื่อเริ่ม'}])
  }

  if (c==='/report') {
    return replyLINE(replyToken,[{type:'text',text:'📊 ดูรายงานได้ที่:\nhttps://worklog-app-virid.vercel.app'}])
  }

  if (c==='/help') {
    return replyLINE(replyToken,[{type:'text',text:'🤖 WorkLog AI\n\n/today — งานวันนี้\n/summary — สรุปเดือนนี้\n/timer start — เริ่มจับเวลา\n/timer stop — หยุดจับเวลา\n/report — ลิงก์รายงาน\n/help — คำสั่งทั้งหมด\n\n💡 พิมพ์บอกว่าทำงานอะไร AI บันทึกให้เลย!'}])
  }

  await replyLINE(replyToken,[{type:'text',text:'ไม่รู้จักคำสั่งนี้ ส่ง /help เพื่อดูทั้งหมด'}])
  return true
}

// ── Background: AI analyze + save + push result ──
async function bgProcessText(userId, text) {
  console.log('[BG] start for', userId)
  try {
    const analyzed = await analyzeWorklog(text)
    await saveWorklog(userId, analyzed)
    const emoji = CAT_EMOJI[analyzed.category]||'📌'
    await pushLINE(userId, [{
      type:'text',
      text:'✅ บันทึกแล้ว!\n\n'+emoji+' '+analyzed.title
        +'\n⏱ '+analyzed.hours+' ชม.'
        +'\n📂 '+analyzed.category
        +(analyzed.tags?.length?'\n🏷 '+analyzed.tags.join(', '):'')
        +'\n\n✨ '+analyzed.summary,
    }])
    console.log('[BG] done for', userId)
  } catch(e) {
    console.error('[BG] failed:', e)
    await pushLINE(userId,[{type:'text',text:'⚠️ บันทึกงานแล้ว แต่ AI วิเคราะห์ไม่สำเร็จ'}])
  }
}

async function bgProcessImage(userId, messageId) {
  try {
    const buffer = await getLineContent(messageId)
    const url = buffer ? await uploadToSupabase(buffer, messageId+'.jpg','image/jpeg') : null
    await saveWorklog(userId,{title:'รูปภาพจาก LINE',summary:'รูปที่อัปโหลดจาก LINE',category:'photo',hours:1,tags:['photo']},[url].filter(Boolean))
    await pushLINE(userId,[{type:'text',text:url?'🖼️ บันทึกรูปใน Gallery แล้ว ✅':'🖼️ บันทึกแล้ว (upload ไม่สำเร็จ)'}])
  } catch(e) { console.error('[BG-IMG] failed:', e) }
}

// ── Main event handler ──
async function processEvent(event) {
  const userId     = event.source?.userId || 'unknown'
  const replyToken = event.replyToken
  console.log('[EVENT]', event.type, event.message?.type||'', userId)

  // FOLLOW
  if (event.type==='follow') {
    await supabase.from('line_users').upsert({line_user_id:userId,followed_at:new Date().toISOString(),active:true}).catch(()=>{})
    return replyLINE(replyToken,[{type:'text',text:'👋 ยินดีต้อนรับสู่ WorkLog AI!\n\n💡 บอกว่าทำงานอะไร AI บันทึกให้เลย\nส่ง /help เพื่อดูคำสั่งทั้งหมด'}])
  }

  if (event.type!=='message') return

  const mtype = event.message?.type

  // TEXT
  if (mtype==='text') {
    const text=(event.message.text||'').trim()
    if (!text) return
    await logMessage(userId,'text',text)

    if (text.startsWith('/')) return handleCommand(userId,text,replyToken)

    // ✅ Reply immediately
    await replyLINE(replyToken,[{type:'text',text:'⏳ รับแล้ว! AI กำลังวิเคราะห์...'}])

    // ✅ Background processing (non-blocking)
    bgProcessText(userId, text).catch(e=>console.error('[EVENT] bgProcessText uncaught:',e))
    return
  }

  // IMAGE
  if (mtype==='image') {
    await logMessage(userId,'image',event.message.id)
    await replyLINE(replyToken,[{type:'text',text:'🖼️ รับรูปแล้ว! กำลังบันทึกใน Gallery...'}])
    bgProcessImage(userId, event.message.id).catch(e=>console.error('[EVENT] bgProcessImage uncaught:',e))
    return
  }

  // VIDEO
  if (mtype==='video') {
    await logMessage(userId,'video',event.message.id)
    return replyLINE(replyToken,[{type:'text',text:'🎬 รับวิดีโอแล้ว ✅\nส่งข้อความอธิบายงานเพิ่มเติมได้เลย'}])
  }

  // AUDIO
  if (mtype==='audio') {
    await logMessage(userId,'audio',event.message.id)
    return replyLINE(replyToken,[{type:'text',text:'🎤 รับเสียงแล้ว!\nส่งข้อความอธิบายงานแทนได้เลย 📝'}])
  }

  // FILE
  if (mtype==='file') {
    const name=event.message.fileName||'ไฟล์'
    await logMessage(userId,'file',name)
    return replyLINE(replyToken,[{type:'text',text:'📎 รับไฟล์ "'+name+'" แล้ว ✅'}])
  }

  console.log('[EVENT] unhandled type:', mtype)
}

// ── GET health check ──
export async function GET() {
  return NextResponse.json({
    status: 'WorkLog AI LINE Webhook ✅',
    time:   new Date().toISOString(),
    env: {
      LINE_TOKEN:    LINE_TOKEN    ? '✅' : '❌ missing',
      LINE_SECRET:   LINE_SECRET   ? '✅' : '❌ missing',
      ANTHROPIC_KEY: ANTHROPIC_KEY ? '✅' : '❌ missing',
      SUPABASE:      SUPABASE_URL  ? '✅' : '❌ missing',
    },
  })
}

// ── POST main handler ──
export async function POST(request) {
  const t0 = Date.now()
  console.log('[WEBHOOK] POST', new Date().toISOString())
  try {
    const rawBody   = await request.text()
    const signature = request.headers.get('x-line-signature')||''

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({error:'Invalid signature'},{status:401})
    }

    let payload
    try { payload = JSON.parse(rawBody) }
    catch(e) { console.error('[WEBHOOK] parse error:', e); return NextResponse.json({error:'Bad JSON'},{status:400}) }

    const events = payload.events||[]
    console.log('[WEBHOOK] events:', events.length)

    if (!events.length) return NextResponse.json({ok:true,processed:0})

    await Promise.all(events.map(e=>
      processEvent(e).catch(err=>console.error('[WEBHOOK] event error:',err))
    ))

    console.log('[WEBHOOK] done in', Date.now()-t0+'ms')
    return NextResponse.json({ok:true,processed:events.length,ms:Date.now()-t0})
  } catch(e) {
    console.error('[WEBHOOK] fatal:', e)
    return NextResponse.json({error:'Internal error'},{status:500})
  }
}
