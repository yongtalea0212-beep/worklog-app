// app/api/line/webhook/route.js
// Architecture v2:
// - Combined image+text into ONE worklog entry
// - Flex Message premium UI
// - Multi-step session state
// - Edit/update worklogs
// - All processing sync (prevent Vercel background kill)

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const LINE_TOKEN    = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_SECRET   = process.env.LINE_CHANNEL_SECRET || ''
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL || 'https://worklog-app-virid.vercel.app'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const CAT_EMOJI = { graphic:'🎨',video:'🎬',photo:'📷',marketing:'📢',ai:'🤖',branding:'✨',pos:'🏪',other:'📌' }
const CAT_COLOR = { graphic:'#6C63FF',video:'#06B6D4',photo:'#F59E0B',marketing:'#EF4444',ai:'#8B5CF6',branding:'#EC4899',pos:'#10B981',other:'#64748B' }

// ─────────────────────────────────────────
// SESSION STORE — in-memory (per function instance)
// For production: use Supabase table
// ─────────────────────────────────────────
const sessions = new Map()

function getSession(userId) {
  return sessions.get(userId) || { state: 'idle', data: {} }
}
function setSession(userId, state, data = {}) {
  sessions.set(userId, { state, data, updatedAt: Date.now() })
}
function clearSession(userId) {
  sessions.delete(userId)
}

// ─────────────────────────────────────────
// SIGNATURE
// ─────────────────────────────────────────
function verifySignature(body, sig) {
  if (!LINE_SECRET) return true
  try {
    return crypto.createHmac('SHA256', LINE_SECRET).update(body).digest('base64') === sig
  } catch { return false }
}

// ─────────────────────────────────────────
// LINE API
// ─────────────────────────────────────────
async function replyLINE(replyToken, messages) {
  if (!LINE_TOKEN || !replyToken) return false
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+LINE_TOKEN },
      body: JSON.stringify({ replyToken, messages }),
    })
    const j = await res.json()
    if (!res.ok) { console.error('[REPLY]', res.status, j); return false }
    return true
  } catch(e) { console.error('[REPLY]', e); return false }
}

async function getLineContent(messageId) {
  if (!LINE_TOKEN) return null
  try {
    const res = await fetch('https://api-data.line.me/v2/bot/message/'+messageId+'/content', {
      headers: { 'Authorization':'Bearer '+LINE_TOKEN }
    })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch { return null }
}

// ─────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────
async function uploadImage(buffer, messageId) {
  const path = 'line/'+Date.now()+'_'+messageId+'.jpg'
  try {
    const { error } = await supabase.storage.from('worklog-gallery')
      .upload(path, buffer, { contentType:'image/jpeg', cacheControl:'3600', upsert:false })
    if (error) { console.error('[UPLOAD]', error.message); return null }
    return supabase.storage.from('worklog-gallery').getPublicUrl(path).data.publicUrl
  } catch(e) { console.error('[UPLOAD]', e); return null }
}

async function saveWorklog(userId, data) {
  const today = new Date().toISOString().split('T')[0]
  try {
    const { data: saved, error } = await supabase.from('work_logs').insert({
      line_user_id: userId,
      title:        data.title    || 'งานจาก LINE',
      description:  data.desc     || '',
      ai_summary:   data.summary  || '',
      category:     data.category || 'other',
      hours_spent:  data.hours    || 1,
      status:       'done',
      tags:         data.tags     || [],
      date:         data.date     || today,
      image_urls:   data.images   || [],
      source:       'line',
    }).select()
    if (error) { console.error('[SAVE]', error.message); return null }
    return saved?.[0] || null
  } catch(e) { console.error('[SAVE]', e); return null }
}

async function updateWorklog(id, data) {
  try {
    const { error } = await supabase.from('work_logs').update({
      title:        data.title,
      description:  data.desc,
      ai_summary:   data.summary,
      category:     data.category,
      hours_spent:  data.hours,
      tags:         data.tags,
      image_urls:   data.images,
    }).eq('id', id)
    if (error) { console.error('[UPDATE]', error.message); return false }
    return true
  } catch(e) { console.error('[UPDATE]', e); return false }
}

async function getRecentWorklogs(userId, limit = 5) {
  const { data } = await supabase.from('work_logs')
    .select('id,title,category,hours_spent,date,image_urls')
    .eq('line_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

// ─────────────────────────────────────────
// CLAUDE AI
// ─────────────────────────────────────────
async function callClaude(prompt) {
  if (!ANTHROPIC_KEY) return ''
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10000)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version':'2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role:'user', content: prompt }],
      }),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) { const e = await res.json().catch(()=>({})); console.error('[AI]', res.status, e); return '' }
    return (await res.json()).content?.[0]?.text || ''
  } catch(e) { clearTimeout(timer); console.error('[AI]', e.name==='AbortError'?'TIMEOUT':e); return '' }
}

async function analyzeWorklog(title, desc, category) {
  const prompt = 'วิเคราะห์งานนี้แล้วตอบ JSON เท่านั้น ไม่มี markdown:\nชื่องาน: "'+title+'"\nรายละเอียด: "'+desc+'"\nหมวด: '+category+'\n\n{"summary":"สรุปงาน 1-2 ประโยค ภาษาไทยระดับมืออาชีพ","tags":["tag1","tag2","tag3"],"hours":2,"refined_title":"ชื่องานที่กระชับและชัดเจน"}'
  try {
    const txt = await callClaude(prompt)
    if (!txt) throw new Error('empty')
    const s=txt.indexOf('{'), e=txt.lastIndexOf('}')
    if (s===-1||e===-1) throw new Error('no json')
    return JSON.parse(txt.slice(s,e+1))
  } catch(err) {
    return { summary:desc, tags:[], hours:1, refined_title:title }
  }
}

// ─────────────────────────────────────────
// FLEX MESSAGES
// ─────────────────────────────────────────

// Card asking user to describe work (after image upload)
function flexAskDescription(imageUrl) {
  return {
    type: 'flex',
    altText: '📸 รูปได้รับแล้ว — บอกรายละเอียดงานด้วย',
    contents: {
      type: 'bubble',
      size: 'mega',
      hero: imageUrl ? {
        type: 'image',
        url: imageUrl,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
      } : undefined,
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '20px',
        contents: [
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type:'text', text:'📸', size:'xl', flex:0 },
              { type:'text', text:'รับรูปแล้ว!', weight:'bold', size:'lg', color:'#1a1a2e', flex:1 },
            ]
          },
          { type:'separator', margin:'md' },
          {
            type: 'text',
            text: 'บอก AI ว่าทำงานอะไรในรูปนี้ เพื่อบันทึกเป็น Worklog',
            wrap: true, size:'sm', color:'#6b7099', margin:'md',
          },
          {
            type: 'text',
            text: '💬 พิมพ์รายละเอียดงาน เช่น:\n"ออกแบบโปสเตอร์ POS ร้านกาแฟ"',
            wrap: true, size:'sm', color:'#9ca3af', margin:'sm',
          },
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll:'12px',
        contents: [
          {
            type: 'button', style: 'primary', height: 'sm',
            color: '#6C63FF',
            action: { type:'message', label:'⏭ ข้ามไม่ใส่รายละเอียด', text:'/skip' },
          }
        ]
      },
      styles: { body:{ backgroundColor:'#FAFBFF' }, footer:{ backgroundColor:'#F5F6FF' } }
    }
  }
}

// Beautiful worklog summary card
function flexWorklogCard(data, saved) {
  const cat     = data.category || 'other'
  const emoji   = CAT_EMOJI[cat] || '📌'
  const color   = CAT_COLOR[cat] || '#6C63FF'
  const tags    = (data.tags||[]).slice(0,4)
  const hasImg  = data.images?.[0]

  return {
    type: 'flex',
    altText: '✅ บันทึกงานแล้ว: ' + data.title,
    contents: {
      type: 'bubble',
      size: 'mega',
      hero: hasImg ? {
        type: 'image',
        url: data.images[0],
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
      } : undefined,
      header: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        backgroundColor: color + '18',
        contents: [
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type:'text', text:emoji+' '+cat.toUpperCase(), size:'xs', color:color, weight:'bold', flex:1 },
              { type:'text', text:'✅ บันทึกแล้ว', size:'xs', color:'#10B981', align:'end' },
            ]
          },
          {
            type: 'text', text: data.title, weight: 'bold', size:'lg',
            color:'#1a1a2e', wrap:true, margin:'sm',
          }
        ]
      },
      body: {
        type: 'box', layout:'vertical', spacing:'sm', paddingAll:'16px',
        contents: [
          // Stats row
          {
            type:'box', layout:'horizontal', spacing:'md',
            contents: [
              {
                type:'box', layout:'vertical', flex:1,
                backgroundColor:'#F8F9FF', cornerRadius:'8px', paddingAll:'10px',
                contents:[
                  { type:'text', text:'⏱', size:'sm', align:'center' },
                  { type:'text', text:String(data.hours||1)+' ชม.', size:'sm', weight:'bold', color:color, align:'center' },
                ]
              },
              {
                type:'box', layout:'vertical', flex:1,
                backgroundColor:'#F8F9FF', cornerRadius:'8px', paddingAll:'10px',
                contents:[
                  { type:'text', text:'📂', size:'sm', align:'center' },
                  { type:'text', text:cat, size:'xs', weight:'bold', color:color, align:'center', wrap:true },
                ]
              },
              {
                type:'box', layout:'vertical', flex:1,
                backgroundColor:'#F8F9FF', cornerRadius:'8px', paddingAll:'10px',
                contents:[
                  { type:'text', text:'🖼', size:'sm', align:'center' },
                  { type:'text', text:String((data.images||[]).length)+' รูป', size:'sm', weight:'bold', color:color, align:'center' },
                ]
              },
            ]
          },
          // Summary
          data.summary ? {
            type:'box', layout:'vertical', margin:'md',
            backgroundColor:'#F0F4FF', cornerRadius:'8px', paddingAll:'12px',
            contents:[
              { type:'text', text:'✨ AI Summary', size:'xs', color:'#6C63FF', weight:'bold', margin:'none' },
              { type:'text', text:data.summary, size:'sm', color:'#4a5568', wrap:true, margin:'sm' },
            ]
          } : null,
          // Tags
          tags.length > 0 ? {
            type:'box', layout:'horizontal', spacing:'sm', margin:'md', wrap:true,
            contents: tags.map(t=>({
              type:'box', layout:'vertical',
              backgroundColor:color+'18', cornerRadius:'20px', paddingAll:'4px',
              paddingStart:'10px', paddingEnd:'10px',
              contents:[{ type:'text', text:'#'+t, size:'xs', color:color }]
            }))
          } : null,
        ].filter(Boolean)
      },
      footer: {
        type:'box', layout:'vertical', spacing:'sm', paddingAll:'12px',
        contents: [
          {
            type:'box', layout:'horizontal', spacing:'sm',
            contents: [
              {
                type:'button', style:'secondary', height:'sm', flex:1,
                action:{ type:'message', label:'✏️ แก้ไข', text:'/edit '+(saved?.id||'') }
              },
              {
                type:'button', style:'primary', height:'sm', flex:1, color:'#6C63FF',
                action:{ type:'uri', label:'🌐 ดูใน App', uri: APP_URL }
              },
            ]
          },
          {
            type:'button', style:'secondary', height:'sm',
            action:{ type:'message', label:'📸 เพิ่มรูปอีก', text:'/addimage '+(saved?.id||'') }
          },
        ]
      },
      styles: { body:{ backgroundColor:'#FAFBFF' }, footer:{ backgroundColor:'#F5F6FF' } }
    }
  }
}

// Recent worklogs card
function flexRecentLogs(logs) {
  if (!logs.length) return { type:'text', text:'ยังไม่มีงานที่บันทึก 📋' }
  return {
    type: 'flex',
    altText: '📊 งานล่าสุด '+logs.length+' รายการ',
    contents: {
      type: 'carousel',
      contents: logs.slice(0,5).map(log => {
        const cat  = log.category||'other'
        const color= CAT_COLOR[cat]||'#6C63FF'
        const emoji= CAT_EMOJI[cat]||'📌'
        return {
          type:'bubble', size:'kilo',
          header:{
            type:'box', layout:'vertical', paddingAll:'12px',
            backgroundColor: color+'22',
            contents:[
              { type:'text', text:emoji+' '+cat.toUpperCase(), size:'xs', color:color, weight:'bold' },
              { type:'text', text:log.title||'งาน', size:'sm', weight:'bold', color:'#1a1a2e', wrap:true, margin:'sm' },
            ]
          },
          body:{
            type:'box', layout:'vertical', spacing:'xs', paddingAll:'12px',
            contents:[
              { type:'text', text:'⏱ '+(log.hours_spent||1)+' ชม. · 📅 '+log.date, size:'xs', color:'#9ca3af' },
            ]
          },
          footer:{
            type:'box', layout:'vertical', paddingAll:'8px',
            contents:[{
              type:'button', style:'primary', height:'sm', color:color,
              action:{ type:'message', label:'แก้ไข', text:'/edit '+log.id }
            }]
          }
        }
      })
    }
  }
}

// Edit prompt card
function flexEditPrompt(worklogId) {
  return {
    type:'flex', altText:'✏️ แก้ไขงาน',
    contents:{
      type:'bubble', size:'mega',
      body:{
        type:'box', layout:'vertical', spacing:'md', paddingAll:'20px',
        contents:[
          { type:'text', text:'✏️ แก้ไขงาน', weight:'bold', size:'lg', color:'#1a1a2e' },
          { type:'separator', margin:'md' },
          { type:'text', text:'เลือกสิ่งที่ต้องการแก้ไข:', size:'sm', color:'#6b7099', margin:'md' },
        ]
      },
      footer:{
        type:'box', layout:'vertical', spacing:'sm', paddingAll:'12px',
        contents:[
          {
            type:'box', layout:'horizontal', spacing:'sm',
            contents:[
              { type:'button', style:'secondary', height:'sm', flex:1, action:{ type:'message', label:'📝 ชื่องาน', text:'/edit-title '+worklogId } },
              { type:'button', style:'secondary', height:'sm', flex:1, action:{ type:'message', label:'📄 รายละเอียด', text:'/edit-desc '+worklogId } },
            ]
          },
          {
            type:'box', layout:'horizontal', spacing:'sm',
            contents:[
              { type:'button', style:'secondary', height:'sm', flex:1, action:{ type:'message', label:'⏱ ชั่วโมง', text:'/edit-hours '+worklogId } },
              { type:'button', style:'secondary', height:'sm', flex:1, action:{ type:'message', label:'📂 หมวดหมู่', text:'/edit-cat '+worklogId } },
            ]
          },
          { type:'button', style:'primary', height:'sm', color:'#6C63FF', action:{ type:'uri', label:'🌐 แก้ไขในแอป', uri: APP_URL } },
        ]
      }
    }
  }
}

// ─────────────────────────────────────────
// COMMANDS
// ─────────────────────────────────────────
async function handleCommand(userId, cmd, replyToken) {
  const parts = cmd.trim().split(' ')
  const c = parts[0].toLowerCase()
  const arg = parts.slice(1).join(' ')

  // /skip — skip description for pending image
  if (c === '/skip') {
    const session = getSession(userId)
    if (session.state === 'awaiting_description' && session.data.imageUrl) {
      const data = {
        title: 'รูปภาพจาก LINE',
        desc: 'รูปภาพที่อัปโหลดจาก LINE',
        category: 'photo', hours: 1, tags: ['photo'],
        images: [session.data.imageUrl], summary: ''
      }
      const saved = await saveWorklog(userId, data)
      clearSession(userId)
      return replyLINE(replyToken, [flexWorklogCard(data, saved)])
    }
    clearSession(userId)
    return replyLINE(replyToken, [{ type:'text', text:'ไม่มีรูปค้างอยู่ครับ' }])
  }

  // /today
  if (c === '/today') {
    const today = new Date().toISOString().split('T')[0]
    const { data:logs } = await supabase.from('work_logs')
      .select('title,hours_spent,category').eq('line_user_id',userId).eq('date',today).limit(20)
    if (!logs?.length) return replyLINE(replyToken,[{type:'text',text:'วันนี้ยังไม่มีงาน 📋\nส่งข้อความหรือรูปเพื่อบันทึกงาน!'}])
    const total=logs.reduce((s,l)=>s+(l.hours_spent||0),0)
    const list=logs.map(l=>(CAT_EMOJI[l.category]||'📌')+' '+l.title+' ('+l.hours_spent+'h)').join('\n')
    return replyLINE(replyToken,[{type:'text',text:'📊 วันนี้ '+today+'\n'+logs.length+' งาน · '+total+' ชม.\n\n'+list}])
  }

  // /logs — show recent worklogs as flex cards
  if (c === '/logs') {
    const logs = await getRecentWorklogs(userId, 5)
    if (!logs.length) return replyLINE(replyToken,[{type:'text',text:'ยังไม่มีงาน 📋'}])
    return replyLINE(replyToken, [flexRecentLogs(logs)])
  }

  // /summary
  if (c === '/summary') {
    const fd=new Date(); fd.setDate(1)
    const { data:logs } = await supabase.from('work_logs')
      .select('hours_spent,category').eq('line_user_id',userId).gte('date',fd.toISOString().split('T')[0])
    const total=logs?.length||0, hours=logs?.reduce((s,l)=>s+(l.hours_spent||0),0)||0
    return replyLINE(replyToken,[{type:'text',text:'📊 เดือนนี้\n✅ '+total+' งาน\n⏱ '+hours+' ชั่วโมง\n\nดูรายงานเต็มที่แอป 👉 '+APP_URL}])
  }

  // /edit <id> — show edit options
  if (c === '/edit' && arg) {
    return replyLINE(replyToken, [flexEditPrompt(arg)])
  }

  // /edit-title <id>
  if (c === '/edit-title' && arg) {
    setSession(userId, 'editing_title', { worklogId: arg })
    return replyLINE(replyToken, [{ type:'text', text:'✏️ พิมพ์ชื่องานใหม่:' }])
  }

  // /edit-desc <id>
  if (c === '/edit-desc' && arg) {
    setSession(userId, 'editing_desc', { worklogId: arg })
    return replyLINE(replyToken, [{ type:'text', text:'✏️ พิมพ์รายละเอียดงานใหม่:' }])
  }

  // /edit-hours <id>
  if (c === '/edit-hours' && arg) {
    setSession(userId, 'editing_hours', { worklogId: arg })
    return replyLINE(replyToken, [{ type:'text', text:'⏱ พิมพ์จำนวนชั่วโมง เช่น: 2.5' }])
  }

  // /edit-cat <id>
  if (c === '/edit-cat' && arg) {
    setSession(userId, 'editing_cat', { worklogId: arg })
    return replyLINE(replyToken, [{
      type:'text',
      text:'📂 เลือกหมวดหมู่:\ngraphic / video / photo / marketing / ai / branding / pos / other'
    }])
  }

  // /addimage <id>
  if (c === '/addimage' && arg) {
    setSession(userId, 'adding_image', { worklogId: arg })
    return replyLINE(replyToken, [{ type:'text', text:'📸 ส่งรูปภาพที่ต้องการเพิ่ม:' }])
  }

  // /timer
  if (c === '/timer') {
    if (arg === 'start') {
      await supabase.from('line_timers').upsert({line_user_id:userId,started_at:new Date().toISOString(),active:true})
      return replyLINE(replyToken,[{type:'text',text:'⏱ เริ่มจับเวลาแล้ว!\nส่ง /timer stop เมื่อเสร็จงาน'}])
    }
    if (arg === 'stop') {
      const { data:timer } = await supabase.from('line_timers').select('*').eq('line_user_id',userId).eq('active',true).single()
      if (timer) {
        const min=Math.round((Date.now()-new Date(timer.started_at).getTime())/60000)
        await supabase.from('line_timers').update({active:false}).eq('id',timer.id)
        return replyLINE(replyToken,[{type:'text',text:'⏱ หยุดแล้ว · '+min+' นาที ('+Math.round(min/6)/10+' ชม.)\nส่งข้อความหรือรูปเพื่อบันทึกงาน 📝'}])
      }
      return replyLINE(replyToken,[{type:'text',text:'ไม่มี timer ที่ทำงาน\nส่ง /timer start เพื่อเริ่ม'}])
    }
  }

  // /help
  if (c === '/help') {
    return replyLINE(replyToken, [{
      type:'text',
      text:'🤖 WorkLog AI\n\n📋 คำสั่ง:\n/today — งานวันนี้\n/logs — งานล่าสุด (Flex UI)\n/summary — สรุปเดือนนี้\n/timer start / stop\n/edit <id> — แก้ไขงาน\n\n💡 วิธีใช้:\n• พิมพ์บอกว่าทำงานอะไร\n• ส่งรูป → บอกรายละเอียด\n• AI บันทึกให้อัตโนมัติ!'
    }])
  }

  return replyLINE(replyToken,[{type:'text',text:'ไม่รู้จักคำสั่ง ส่ง /help เพื่อดูทั้งหมด'}])
}

// ─────────────────────────────────────────
// HANDLE SESSION STATE
// ─────────────────────────────────────────
async function handleSessionInput(userId, text, replyToken) {
  const session = getSession(userId)

  // Awaiting description for pending image
  if (session.state === 'awaiting_description') {
    const imageUrl = session.data.imageUrl
    clearSession(userId)

    await replyLINE(replyToken, [{ type:'text', text:'⏳ AI กำลังวิเคราะห์งาน...' }])

    // Analyze
    const analyzed = await analyzeWorklog(text, text, 'graphic')
    const data = {
      title:    analyzed.refined_title || text.slice(0,60),
      desc:     text,
      summary:  analyzed.summary,
      category: analyzed.category || 'graphic',
      hours:    analyzed.hours || 1,
      tags:     analyzed.tags || [],
      images:   imageUrl ? [imageUrl] : [],
    }

    // Save
    const saved = await saveWorklog(userId, data)

    // Reply with beautiful card
    return replyLINE(replyToken, [flexWorklogCard(data, saved)])
  }

  // Editing title
  if (session.state === 'editing_title') {
    const { worklogId } = session.data
    clearSession(userId)
    await updateWorklog(worklogId, { title: text })
    return replyLINE(replyToken, [{ type:'text', text:'✅ แก้ชื่องานเป็น: '+text }])
  }

  // Editing description
  if (session.state === 'editing_desc') {
    const { worklogId } = session.data
    clearSession(userId)
    await updateWorklog(worklogId, { desc: text })
    return replyLINE(replyToken, [{ type:'text', text:'✅ แก้รายละเอียดแล้ว' }])
  }

  // Editing hours
  if (session.state === 'editing_hours') {
    const { worklogId } = session.data
    const hours = parseFloat(text) || 1
    clearSession(userId)
    await updateWorklog(worklogId, { hours })
    return replyLINE(replyToken, [{ type:'text', text:'✅ แก้เวลาเป็น '+hours+' ชั่วโมง' }])
  }

  // Editing category
  if (session.state === 'editing_cat') {
    const { worklogId } = session.data
    const cat = text.trim().toLowerCase()
    const valid = Object.keys(CAT_EMOJI)
    if (!valid.includes(cat)) {
      return replyLINE(replyToken,[{type:'text',text:'หมวดที่รองรับ: '+valid.join(', ')}])
    }
    clearSession(userId)
    await updateWorklog(worklogId, { category: cat })
    return replyLINE(replyToken, [{ type:'text', text:'✅ แก้หมวดเป็น '+CAT_EMOJI[cat]+' '+cat }])
  }

  return false // not in session
}

// ─────────────────────────────────────────
// MAIN EVENT PROCESSOR
// ─────────────────────────────────────────
async function processEvent(event) {
  const userId     = event.source?.userId || 'unknown'
  const replyToken = event.replyToken
  const mtype      = event.message?.type

  // FOLLOW
  if (event.type === 'follow') {
    await supabase.from('line_users')
      .upsert({ line_user_id:userId, followed_at:new Date().toISOString(), active:true })
      .catch(()=>{})
    return replyLINE(replyToken, [{
      type:'text',
      text:'👋 ยินดีต้อนรับสู่ WorkLog AI! 🎉\n\n💡 วิธีใช้:\n• พิมพ์บอกว่าทำงานอะไร\n• ส่งรูปผลงาน → AI บันทึกให้เลย\n\nส่ง /help เพื่อดูคำสั่งทั้งหมด'
    }])
  }

  if (event.type !== 'message') return

  // TEXT
  if (mtype === 'text') {
    const text = (event.message.text || '').trim()
    if (!text) return

    // Commands
    if (text.startsWith('/')) return handleCommand(userId, text, replyToken)

    // Check active session first
    const session = getSession(userId)
    if (session.state !== 'idle') {
      const handled = await handleSessionInput(userId, text, replyToken)
      if (handled !== false) return
    }

    // Normal worklog from text
    await replyLINE(replyToken, [{ type:'text', text:'⏳ AI กำลังวิเคราะห์งาน...' }])

    const analyzed = await analyzeWorklog(text, text, 'other')
    const data = {
      title:    analyzed.refined_title || text.slice(0,60),
      desc:     text,
      summary:  analyzed.summary,
      category: analyzed.category || 'other',
      hours:    analyzed.hours || 1,
      tags:     analyzed.tags || [],
      images:   [],
    }
    const saved = await saveWorklog(userId, data)
    return replyLINE(replyToken, [flexWorklogCard(data, saved)])
  }

  // IMAGE — start multi-step flow
  if (mtype === 'image') {
    // Download image
    const buffer = await getLineContent(event.message.id)
    let imageUrl = null
    if (buffer) {
      imageUrl = await uploadImage(buffer, event.message.id)
    }

    // Check if in "adding_image" session (add to existing worklog)
    const session = getSession(userId)
    if (session.state === 'adding_image' && session.data.worklogId) {
      const { worklogId } = session.data
      clearSession(userId)
      if (imageUrl) {
        const { data:wl } = await supabase.from('work_logs').select('image_urls').eq('id',worklogId).single()
        const newUrls = [...(wl?.image_urls||[]), imageUrl]
        await supabase.from('work_logs').update({ image_urls: newUrls }).eq('id', worklogId)
        return replyLINE(replyToken, [{ type:'text', text:'📸 เพิ่มรูปแล้ว ✅ ('+newUrls.length+' รูปทั้งหมด)' }])
      }
      return replyLINE(replyToken, [{ type:'text', text:'⚠️ อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง' }])
    }

    // Start awaiting_description session
    setSession(userId, 'awaiting_description', { imageUrl })

    return replyLINE(replyToken, [flexAskDescription(imageUrl)])
  }

  // VIDEO
  if (mtype === 'video') {
    return replyLINE(replyToken, [{ type:'text', text:'🎬 รับวิดีโอแล้ว ✅\nพิมพ์อธิบายงานในวิดีโอนี้เพื่อบันทึก' }])
  }

  // AUDIO
  if (mtype === 'audio') {
    return replyLINE(replyToken, [{ type:'text', text:'🎤 รับเสียงแล้ว!\nพิมพ์บอกว่าทำงานอะไร AI จะบันทึกให้ 📝' }])
  }

  // FILE
  if (mtype === 'file') {
    return replyLINE(replyToken, [{ type:'text', text:'📎 รับไฟล์ "' + (event.message.fileName||'ไฟล์') + '" แล้ว ✅' }])
  }
}

// ─────────────────────────────────────────
// GET — health check
// ─────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: 'WorkLog AI LINE Webhook v2 ✅',
    time: new Date().toISOString(),
    features: ['flex-messages','multi-step-flow','image+text-combined','edit-worklogs'],
    env: {
      LINE_TOKEN:    LINE_TOKEN    ? '✅' : '❌ missing',
      LINE_SECRET:   LINE_SECRET   ? '✅' : '❌ missing',
      ANTHROPIC_KEY: ANTHROPIC_KEY ? '✅' : '❌ missing',
      SUPABASE:      SUPABASE_URL  ? '✅' : '❌ missing',
    }
  })
}

// ─────────────────────────────────────────
// POST — main handler
// ─────────────────────────────────────────
export async function POST(request) {
  const t0 = Date.now()
  try {
    const rawBody   = await request.text()
    const signature = request.headers.get('x-line-signature') || ''

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error:'Invalid signature' }, { status:401 })
    }

    let payload
    try { payload = JSON.parse(rawBody) }
    catch { return NextResponse.json({ error:'Bad JSON' }, { status:400 }) }

    const events = payload.events || []
    if (!events.length) return NextResponse.json({ ok:true, processed:0 })

    await Promise.all(events.map(e =>
      processEvent(e).catch(err => console.error('[WEBHOOK] event error:', err))
    ))

    console.log('[WEBHOOK] done in', Date.now()-t0+'ms')
    return NextResponse.json({ ok:true, processed:events.length, ms:Date.now()-t0 })
  } catch(e) {
    console.error('[WEBHOOK] fatal:', e)
    return NextResponse.json({ error:'Internal error' }, { status:500 })
  }
}
