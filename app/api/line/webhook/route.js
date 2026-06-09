// app/api/line/webhook/route.js — WorkLog AI LINE Bot v3.1
// Premium Flex Cards + Quick Reply + Postback Actions
// AI Command Center · PDF→Task · AI Inbox (vision) · report delivery

import { NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const LINE_TOKEN    = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_SECRET   = process.env.LINE_CHANNEL_SECRET || ''
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL || 'https://worklog-app-virid.vercel.app'
const MASCOT_FACE      = APP_URL + '/mascot-face.png?v=2'
const MASCOT_HAPPY     = APP_URL + '/mascot-happy.png?v=2'
const MASCOT_HERO_WAVE = APP_URL + '/mascot-hero-wave.png?v=2'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// WorkLog AI Brand Colors
const BRAND = {
  purple:     '#6C63FF',
  purpleLight:'#9B8FFF',
  purpleBg:   '#F0EEFF',
  cyan:       '#06B6D4',
  green:      '#10B981',
  amber:      '#F59E0B',
  red:        '#EF4444',
  pink:       '#EC4899',
  text:       '#1a1a2e',
  textSub:    '#6b7099',
  textMuted:  '#9ca3af',
  cardBg:     '#FAFBFF',
  white:      '#FFFFFF',
}

const CAT = {
  graphic:   { label:'Graphic Design', emoji:'🎨', color:'#6C63FF', bg:'#F0EEFF' },
  video:     { label:'Video Editing',  emoji:'🎬', color:'#06B6D4', bg:'#E0F9FF' },
  photo:     { label:'Photography',    emoji:'📷', color:'#F59E0B', bg:'#FFF8E0' },
  marketing: { label:'Marketing',      emoji:'📢', color:'#EF4444', bg:'#FFF0F0' },
  ai:        { label:'AI Content',     emoji:'🤖', color:'#8B5CF6', bg:'#F3EEFF' },
  branding:  { label:'Branding',       emoji:'✨', color:'#EC4899', bg:'#FFF0F8' },
  pos:       { label:'POS Design',     emoji:'🏪', color:'#10B981', bg:'#E8FFF5' },
  other:     { label:'อื่นๆ',          emoji:'📌', color:'#64748B', bg:'#F1F5F9' },
}

// ─────────────────────────────────────────
// SESSION (in-memory — Vercel serverless)
// ─────────────────────────────────────────
const sessions = new Map()
function getSession(uid) { return sessions.get(uid) || { state:'idle', data:{} } }
function setSession(uid, state, data={}) { sessions.set(uid, { state, data, t:Date.now() }) }
function clearSession(uid) { sessions.delete(uid) }

// ─────────────────────────────────────────
// DATE/TIME (Asia/Bangkok, UTC+7)
// ─────────────────────────────────────────
function bkkToday() { return new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0] }
// Combine a Bangkok date (YYYY-MM-DD) + time (HH:MM) into a UTC ISO timestamp.
function bkkISO(dateStr, hhmm) {
  if (!dateStr || !hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null
  const t = new Date(`${dateStr}T${hhmm.padStart(5,'0')}:00+07:00`)
  return isNaN(t) ? null : t.toISOString()
}
function fmtThaiDate(dateStr) {
  try { return new Date(`${dateStr}T00:00:00+07:00`).toLocaleDateString('th-TH', { day:'numeric', month:'short' }) }
  catch { return dateStr }
}

// ─────────────────────────────────────────
// SIGNATURE
// ─────────────────────────────────────────
function verifySig(body, sig) {
  if (!LINE_SECRET) return true
  try { return crypto.createHmac('SHA256',LINE_SECRET).update(body).digest('base64') === sig }
  catch { return false }
}

// ─────────────────────────────────────────
// LINE API
// ─────────────────────────────────────────
async function replyLINE(token, messages) {
  if (!LINE_TOKEN||!token) return false
  try {
    const r = await fetch('https://api.line.me/v2/bot/message/reply',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+LINE_TOKEN},
      body: JSON.stringify({ replyToken:token, messages }),
    })
    const j = await r.json()
    if (!r.ok) { console.error('[REPLY]',r.status,j); return false }
    return true
  } catch(e){ console.error('[REPLY]',e); return false }
}

// Push message (ส่งจาก WorkLog App → LINE)
async function pushLINE(userId, messages) {
  if (!LINE_TOKEN || !userId) return false
  try {
    const r = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+LINE_TOKEN },
      body: JSON.stringify({ to: userId, messages }),
    })
    if (!r.ok) { console.error('[PUSH]', r.status, await r.json().catch(()=>({}))); return false }
    return true
  } catch(e) { console.error('[PUSH]', e); return false }
}

async function getContent(msgId) {
  if (!LINE_TOKEN) return null
  try {
    const r = await fetch('https://api-data.line.me/v2/bot/message/'+msgId+'/content',{
      headers:{'Authorization':'Bearer '+LINE_TOKEN}
    })
    if (!r.ok) return null
    return Buffer.from(await r.arrayBuffer())
  } catch { return null }
}

// ─────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────
async function uploadImg(buf, id) {
  const path='line/'+Date.now()+'_'+id+'.jpg'
  try {
    const {error}=await supabase.storage.from('worklog-gallery').upload(path,buf,{contentType:'image/jpeg',cacheControl:'3600',upsert:false})
    if (error){ console.error('[UP]',error.message); return null }
    return supabase.storage.from('worklog-gallery').getPublicUrl(path).data.publicUrl
  } catch(e){ console.error('[UP]',e); return null }
}

async function saveWorklog(uid, d) {
  try {
    const row = {
      line_user_id:uid, title:d.title||'งานจาก LINE', description:d.desc||'',
      ai_summary:d.summary||'', category:d.category||'other', hours_spent:d.hours||1,
      status:d.status||'done', tags:d.tags||[], date:d.date||new Date().toISOString().split('T')[0],
      image_urls:d.images||[], source:d.source||'line',
    }
    // Scheduling fields are only written when the capture actually detected them,
    // so plain "I did X" logs don't get spurious null schedules.
    if (d.start_at)  row.start_at = d.start_at
    if (d.end_at)    row.end_at   = d.end_at
    if (d.due_date)  row.due_date = d.due_date
    if (d.priority)  row.priority = d.priority
    const {data,error}=await supabase.from('work_logs').insert(row).select()
    if (error){ console.error('[SAVE]',error.message); return null }
    return data?.[0]||null
  } catch(e){ console.error('[SAVE]',e); return null }
}

async function updateWorklog(id, d) {
  const update={}
  if (d.title!==undefined)    update.title=d.title
  if (d.desc!==undefined)     update.description=d.desc
  if (d.summary!==undefined)  update.ai_summary=d.summary
  if (d.category!==undefined) update.category=d.category
  if (d.hours!==undefined)    update.hours_spent=d.hours
  if (d.tags!==undefined)     update.tags=d.tags
  if (d.images!==undefined)   update.image_urls=d.images
  const {error}=await supabase.from('work_logs').update(update).eq('id',id)
  return !error
}

async function getWorklog(id) {
  const {data}=await supabase.from('work_logs').select('*').eq('id',id).single()
  return data
}

async function getTodayLogs(uid) {
  const today=new Date().toISOString().split('T')[0]
  const {data}=await supabase.from('work_logs').select('id,title,category,hours_spent,date')
    .eq('line_user_id',uid).eq('date',today).limit(20)
  return data||[]
}

async function getMonthLogs(uid) {
  const fd=new Date(); fd.setDate(1)
  const {data}=await supabase.from('work_logs').select('hours_spent,category')
    .eq('line_user_id',uid).gte('date',fd.toISOString().split('T')[0])
  return data||[]
}

async function getRecentLogs(uid, n=5) {
  const {data}=await supabase.from('work_logs').select('id,title,category,hours_spent,date,image_urls')
    .eq('line_user_id',uid).order('created_at',{ascending:false}).limit(n)
  return data||[]
}

// ─────────────────────────────────────────
// CLAUDE
// ─────────────────────────────────────────
async function callAI(prompt, { maxTokens = 500, timeoutMs = 10000 } = {}) {
  if (!ANTHROPIC_KEY) return ''
  const ctrl=new AbortController(), t=setTimeout(()=>ctrl.abort(),timeoutMs)
  try {
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:maxTokens,messages:[{role:'user',content:prompt}]}),
      signal:ctrl.signal,
    })
    clearTimeout(t)
    if (!r.ok){ const e=await r.json().catch(()=>({})); console.error('[AI]',r.status,e); return '' }
    return (await r.json()).content?.[0]?.text||''
  } catch(e){ clearTimeout(t); console.error('[AI]',e.name==='AbortError'?'TIMEOUT':e); return '' }
}

async function analyze(title, desc) {
  const p='วิเคราะห์งานนี้ตอบ JSON เท่านั้น ไม่มี markdown:\nชื่อ:"'+title+'"\nรายละเอียด:"'+desc+'"\n\n{"summary":"สรุป 1-2 ประโยคมืออาชีพ","category":"graphic|video|photo|marketing|ai|branding|pos|other","hours":1,"tags":["tag1","tag2"],"refined_title":"ชื่อกระชับ"}'
  try {
    const txt=await callAI(p)
    if (!txt) throw new Error('empty')
    const s=txt.indexOf('{'),e=txt.lastIndexOf('}')
    if (s===-1||e===-1) throw new Error('no json')
    return JSON.parse(txt.slice(s,e+1))
  } catch { return {summary:desc,category:'other',hours:1,tags:[],refined_title:title.slice(0,60)} }
}

// ─────────────────────────────────────────
// FLEX MESSAGE BUILDERS — WorkLog AI Style
// ─────────────────────────────────────────

// 1. Image received card with Quick Reply
function msgImageReceived(imgUrl) {
  const messages = []

  // Flex Card — "รับรูปแล้ว"
  messages.push({
    type: 'flex',
    altText: '📸 รับรูปแล้ว! — บอก AI ว่าทำงานอะไร',
    contents: {
      type: 'bubble',
      size: 'mega',
      // Hero = image preview
      hero: {
        type: 'image',
        url: imgUrl || 'https://via.placeholder.com/800x400/6C63FF/FFFFFF?text=WorkLog+AI',
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
        action: { type:'uri', uri: APP_URL },
      },
      // Header
      header: {
        type: 'box', layout: 'horizontal', paddingAll: '16px',
        backgroundColor: BRAND.purpleBg,
        contents: [
          {
            type: 'box', layout: 'vertical', flex: 1,
            contents: [
              {
                type: 'box', layout: 'horizontal', spacing: 'sm',
                contents: [
                  { type:'text', text:'📸', size:'sm', flex:0 },
                  { type:'text', text:'รับรูปแล้ว!', weight:'bold', size:'md', color:BRAND.purple, flex:1 },
                ]
              },
              { type:'text', text:'บอก AI ว่าทำงานอะไรในรูปนี้', size:'xs', color:BRAND.textMuted, margin:'xs' },
            ]
          },
          {
            type: 'box', layout: 'vertical', flex: 0, justifyContent:'center',
            contents:[{ type:'text', text:'✨', size:'xl' }]
          }
        ]
      },
      // Body
      body: {
        type: 'box', layout: 'vertical', paddingAll: '16px', spacing: 'md',
        backgroundColor: BRAND.cardBg,
        contents: [
          {
            type: 'box', layout: 'vertical',
            backgroundColor: BRAND.white,
            cornerRadius: '12px', paddingAll: '14px',
            borderColor: '#E8E0FF', borderWidth: '1px',
            contents: [
              { type:'text', text:'💬 พิมพ์รายละเอียดงาน', size:'sm', weight:'bold', color:BRAND.text },
              { type:'text', text:'เช่น: "ออกแบบโปสเตอร์ POS ร้านกาแฟ"', size:'xs', color:BRAND.textMuted, margin:'sm', wrap:true },
            ]
          },
          {
            type:'text', text:'หรือกดปุ่มด้านล่างเพื่อข้าม',
            size:'xs', color:BRAND.textMuted, align:'center',
          }
        ]
      },
      // Footer
      footer: {
        type:'box', layout:'vertical', paddingAll:'12px', spacing:'sm',
        backgroundColor: BRAND.cardBg,
        contents:[{
          type:'button',
          style:'secondary',
          height:'sm',
          action:{ type:'message', label:'⏭️ ข้ามไม่ใส่รายละเอียด', text:'/skip' },
          color:'#E8E0FF',
        }]
      },
      styles:{
        header:{ separator:false },
        footer:{ separator:true, separatorColor:'#E8E0FF' }
      }
    }
  })

  return messages
}

// 2. Worklog Summary Card (after save)
function msgWorklogSaved(d, saved) {
  const cat    = CAT[d.category] || CAT.other
  const tags   = (d.tags||[]).slice(0,4)
  const imgUrl = d.images?.[0]
  const logId  = saved?.id || ''

  return [{
    type: 'flex',
    altText: '✅ บันทึกงานแล้ว: ' + d.title,
    contents: {
      type: 'bubble',
      size: 'mega',

      // Hero image
      ...(imgUrl ? {
        hero: {
          type: 'image', url: imgUrl, size: 'full',
          aspectRatio: '20:11', aspectMode: 'cover',
          action: { type:'uri', uri: APP_URL },
        }
      } : {}),

      // Header
      header: {
        type: 'box', layout: 'vertical', paddingAll: '16px',
        backgroundColor: cat.bg,
        contents: [
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type:'text', text: cat.emoji, size:'sm', flex:0 },
              { type:'text', text: cat.label.toUpperCase(), size:'xs', color:cat.color, weight:'bold', flex:1 },
              {
                type:'box', layout:'vertical',
                cornerRadius:'20px', paddingAll:'3px',
                paddingStart:'10px', paddingEnd:'10px',
                backgroundColor: BRAND.green,
                contents:[{ type:'text', text:'✅ บันทึกแล้ว', size:'xs', color:BRAND.white, weight:'bold' }]
              }
            ]
          },
          { type:'text', text: d.title, weight:'bold', size:'lg', color:BRAND.text, wrap:true, margin:'sm' },
        ]
      },

      // Body
      body: {
        type: 'box', layout: 'vertical', paddingAll: '16px', spacing: 'md',
        backgroundColor: BRAND.cardBg,
        contents: [

          // Stats row
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              {
                type: 'box', layout: 'vertical', flex:1,
                cornerRadius: '10px', paddingAll: '10px',
                backgroundColor: BRAND.white,
                contents: [
                  { type:'text', text:'⏱', size:'sm', align:'center' },
                  { type:'text', text: String(d.hours||1)+' ชม.', size:'sm', weight:'bold', color:cat.color, align:'center', margin:'xs' },
                ]
              },
              {
                type: 'box', layout: 'vertical', flex:1,
                cornerRadius: '10px', paddingAll: '10px',
                backgroundColor: BRAND.white,
                contents: [
                  { type:'text', text:'📂', size:'sm', align:'center' },
                  { type:'text', text: cat.label, size:'xs', weight:'bold', color:cat.color, align:'center', margin:'xs' },
                ]
              },
              {
                type: 'box', layout: 'vertical', flex:1,
                cornerRadius: '10px', paddingAll: '10px',
                backgroundColor: BRAND.white,
                contents: [
                  { type:'text', text:'🖼', size:'sm', align:'center' },
                  { type:'text', text: String((d.images||[]).length)+' รูป', size:'sm', weight:'bold', color:cat.color, align:'center', margin:'xs' },
                ]
              },
            ]
          },

          // AI Summary
          ...(d.summary ? [{
            type: 'box', layout: 'vertical',
            cornerRadius: '10px', paddingAll: '12px',
            backgroundColor: BRAND.purpleBg,
            contents: [
              {
                type: 'box', layout: 'horizontal', spacing: 'sm',
                contents: [
                  { type:'text', text:'✨', size:'xs', flex:0 },
                  { type:'text', text:'AI Summary', size:'xs', color:BRAND.purple, weight:'bold', flex:1 },
                ]
              },
              { type:'text', text: d.summary, size:'sm', color:BRAND.textSub, wrap:true, margin:'sm' },
            ]
          }] : []),

          // Tags
          ...(tags.length > 0 ? [{
            type: 'box', layout: 'horizontal', spacing: 'xs',
            contents: tags.map(t=>({
              type: 'box', layout: 'vertical',
              cornerRadius: '20px', paddingAll: '4px',
              paddingStart: '10px', paddingEnd: '10px',
              backgroundColor: cat.bg,
              contents: [{ type:'text', text:'#'+t, size:'xs', color:cat.color, weight:'bold' }]
            }))
          }] : []),

          // Date
          { type:'text', text:'📅 '+new Date().toLocaleDateString('th-TH'), size:'xs', color:BRAND.textMuted },
        ]
      },

      // Footer
      footer: {
        type: 'box', layout: 'vertical', paddingAll: '12px', spacing: 'sm',
        backgroundColor: BRAND.cardBg,
        contents: [
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              {
                type: 'button', style: 'secondary', height: 'sm', flex: 1,
                action: { type:'message', label:'✏️ แก้ไข', text:'/edit '+logId },
                color: '#E8E0FF',
              },
              {
                type: 'button', style: 'secondary', height: 'sm', flex: 1,
                action: { type:'message', label:'📸 เพิ่มรูป', text:'/addimage '+logId },
                color: '#E8E0FF',
              },
            ]
          },
          {
            type: 'button', style: 'primary', height: 'sm',
            color: BRAND.purple,
            action: { type:'uri', label:'🌐 ดูใน WorkLog AI', uri: APP_URL },
          },
        ]
      },

      styles: {
        header: { separator: false },
        footer: { separator: true, separatorColor: '#E8E0FF' }
      }
    }
  }]
}

// 3. Edit menu card
function msgEditMenu(log) {
  const cat = CAT[log.category||'other']||CAT.other
  return [{
    type:'flex',
    altText:'✏️ แก้ไขงาน: '+log.title,
    contents:{
      type:'bubble', size:'mega',
      header:{
        type:'box', layout:'vertical', paddingAll:'16px', backgroundColor:cat.bg,
        contents:[
          { type:'text', text:'✏️ แก้ไขงาน', weight:'bold', size:'md', color:cat.color },
          { type:'text', text:log.title||'', size:'sm', color:BRAND.textSub, wrap:true, margin:'xs' },
        ]
      },
      body:{
        type:'box', layout:'vertical', paddingAll:'14px', spacing:'sm',
        backgroundColor:BRAND.cardBg,
        contents:[
          // Current info
          {
            type:'box', layout:'vertical', cornerRadius:'10px', paddingAll:'12px',
            backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
            contents:[
              { type:'box', layout:'horizontal', contents:[
                { type:'text', text:'⏱ เวลา', size:'xs', color:BRAND.textMuted, flex:1 },
                { type:'text', text:String(log.hours_spent||1)+' ชม.', size:'xs', weight:'bold', color:BRAND.purple, flex:0 },
              ]},
              { type:'separator', margin:'sm' },
              { type:'box', layout:'horizontal', margin:'sm', contents:[
                { type:'text', text:'📂 หมวด', size:'xs', color:BRAND.textMuted, flex:1 },
                { type:'text', text:cat.emoji+' '+cat.label, size:'xs', weight:'bold', color:cat.color, flex:0 },
              ]},
              ...(log.ai_summary ? [
                { type:'separator', margin:'sm' },
                { type:'text', text:log.ai_summary, size:'xs', color:BRAND.textSub, wrap:true, margin:'sm' },
              ] : []),
            ]
          }
        ]
      },
      footer:{
        type:'box', layout:'vertical', paddingAll:'12px', spacing:'sm',
        backgroundColor:BRAND.cardBg,
        contents:[
          {
            type:'box', layout:'horizontal', spacing:'sm',
            contents:[
              { type:'button', style:'secondary', height:'sm', flex:1, color:'#E8E0FF',
                action:{ type:'message', label:'📝 ชื่องาน', text:'/edit-title '+log.id } },
              { type:'button', style:'secondary', height:'sm', flex:1, color:'#E8E0FF',
                action:{ type:'message', label:'📄 รายละเอียด', text:'/edit-desc '+log.id } },
            ]
          },
          {
            type:'box', layout:'horizontal', spacing:'sm',
            contents:[
              { type:'button', style:'secondary', height:'sm', flex:1, color:'#E8E0FF',
                action:{ type:'message', label:'⏱ เวลา', text:'/edit-hours '+log.id } },
              { type:'button', style:'secondary', height:'sm', flex:1, color:'#E8E0FF',
                action:{ type:'message', label:'📂 หมวด', text:'/edit-cat '+log.id } },
            ]
          },
          { type:'button', style:'primary', height:'sm', color:BRAND.purple,
            action:{ type:'uri', label:'🌐 แก้ไขในแอป', uri:APP_URL } },
        ]
      },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
    }
  }]
}

// 4. Quick Reply for category selection
function qrCategories(prefix, id) {
  return {
    items: Object.entries(CAT).map(([k,v])=>({
      type:'action',
      imageUrl:`https://via.placeholder.com/40/FFFFFF/000000?text=${encodeURIComponent(v.emoji)}`,
      action:{ type:'message', label:v.emoji+' '+v.label, text:prefix+' '+id+' '+k }
    }))
  }
}

// 5. Today summary card
function msgToday(logs, date) {
  const total = logs.reduce((s,l)=>s+(l.hours_spent||0),0)
  const byCat = logs.reduce((a,l)=>{ const c=l.category||'other'; a[c]=(a[c]||0)+(l.hours_spent||0); return a },{})
  const catRows = Object.entries(byCat).map(([c,h])=>{
    const cat=CAT[c]||CAT.other
    const pct=Math.round(h/Math.max(total,1)*100)
    return {
      type:'box', layout:'vertical', margin:'xs',
      contents:[
        { type:'box', layout:'horizontal', contents:[
          { type:'text', text:cat.emoji+' '+cat.label, size:'xs', color:BRAND.text, flex:1 },
          { type:'text', text:h+'h', size:'xs', weight:'bold', color:cat.color, flex:0 },
        ]},
        { type:'box', layout:'horizontal', margin:'xs', contents:[
          { type:'box', layout:'vertical', flex:pct, height:'4px', backgroundColor:cat.color, cornerRadius:'2px' },
          ...(pct<100?[{ type:'box', layout:'vertical', flex:100-pct, height:'4px', backgroundColor:'#E8E0FF', cornerRadius:'2px' }]:[]),
        ]}
      ]
    }
  })
  return [{
    type:'flex', altText:'📊 วันนี้ '+date+' · '+logs.length+' งาน',
    contents:{
      type:'bubble', size:'mega',
      header:{
        type:'box', layout:'horizontal', paddingAll:'16px', backgroundColor:BRAND.purpleBg,
        contents:[
          { type:'box', layout:'vertical', flex:1, contents:[
            { type:'text', text:'📊 วันนี้', weight:'bold', size:'md', color:BRAND.purple },
            { type:'text', text:date, size:'xs', color:BRAND.textMuted, margin:'xs' },
          ]},
          { type:'box', layout:'vertical', flex:0, justifyContent:'center',
            cornerRadius:'20px', paddingAll:'6px', paddingStart:'14px', paddingEnd:'14px',
            backgroundColor:BRAND.purple,
            contents:[{ type:'text', text:String(total)+' ชม.', size:'sm', weight:'bold', color:BRAND.white }]
          }
        ]
      },
      body:{
        type:'box', layout:'vertical', paddingAll:'16px', spacing:'md',
        backgroundColor:BRAND.cardBg,
        contents:[
          // Stats
          {
            type:'box', layout:'horizontal', spacing:'sm',
            contents:[
              { type:'box', layout:'vertical', flex:1, cornerRadius:'10px', paddingAll:'10px',
                backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
                contents:[
                  { type:'text', text:'✅', size:'md', align:'center' },
                  { type:'text', text:String(logs.length)+' งาน', size:'sm', weight:'bold', color:BRAND.purple, align:'center', margin:'xs' },
                ]
              },
              { type:'box', layout:'vertical', flex:1, cornerRadius:'10px', paddingAll:'10px',
                backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
                contents:[
                  { type:'text', text:'⏱', size:'md', align:'center' },
                  { type:'text', text:String(total)+' ชม.', size:'sm', weight:'bold', color:BRAND.cyan, align:'center', margin:'xs' },
                ]
              },
            ]
          },
          // Category breakdown
          ...(catRows.length>0?[{
            type:'box', layout:'vertical', cornerRadius:'10px', paddingAll:'12px',
            backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
            contents:[
              { type:'text', text:'หมวดหมู่วันนี้', size:'xs', color:BRAND.textMuted, weight:'bold', margin:'none' },
              { type:'separator', margin:'sm' },
              ...catRows,
            ]
          }]:[]),
          // Work list
          ...logs.slice(0,5).map((l,i)=>{
            const cat=CAT[l.category||'other']||CAT.other
            return {
              type:'box', layout:'horizontal', spacing:'sm',
              paddingTop: i===0?'4px':'0px',
              contents:[
                { type:'text', text:cat.emoji, size:'sm', flex:0 },
                { type:'text', text:l.title||'งาน', size:'xs', color:BRAND.text, flex:1, wrap:true },
                { type:'text', text:(l.hours_spent||1)+'h', size:'xs', color:cat.color, flex:0, weight:'bold' },
              ]
            }
          }),
        ]
      },
      footer:{
        type:'box', layout:'vertical', paddingAll:'12px', backgroundColor:BRAND.cardBg,
        contents:[{
          type:'button', style:'primary', height:'sm', color:BRAND.purple,
          action:{ type:'uri', label:'🌐 ดูทั้งหมดในแอป', uri:APP_URL },
        }]
      },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
    }
  }]
}

// 6. Recent logs carousel
function msgRecentLogs(logs) {
  if (!logs.length) return [{ type:'text', text:'ยังไม่มีงาน 📋\nส่งข้อความหรือรูปเพื่อบันทึกงาน!' }]
  return [{
    type:'flex', altText:'📋 งานล่าสุด '+logs.length+' รายการ',
    contents:{
      type:'carousel',
      contents: logs.map(log=>{
        const cat=CAT[log.category||'other']||CAT.other
        const img=log.image_urls?.[0]
        return {
          type:'bubble', size:'kilo',
          ...(img?{ hero:{ type:'image',url:img,size:'full',aspectRatio:'20:13',aspectMode:'cover' } }:{}),
          header:{
            type:'box', layout:'vertical', paddingAll:'12px', backgroundColor:cat.bg,
            contents:[
              { type:'box', layout:'horizontal', contents:[
                { type:'text', text:cat.emoji, size:'xs', flex:0 },
                { type:'text', text:cat.label, size:'xs', color:cat.color, weight:'bold', flex:1 },
              ]},
              { type:'text', text:log.title||'งาน', size:'sm', weight:'bold', color:BRAND.text, wrap:true, margin:'xs' },
            ]
          },
          body:{
            type:'box', layout:'horizontal', paddingAll:'10px', spacing:'sm',
            contents:[
              { type:'text', text:'⏱ '+(log.hours_spent||1)+'h', size:'xs', color:BRAND.textMuted, flex:1 },
              { type:'text', text:'📅 '+log.date, size:'xs', color:BRAND.textMuted, flex:0 },
            ]
          },
          footer:{
            type:'box', layout:'horizontal', paddingAll:'8px', spacing:'sm',
            contents:[
              { type:'button', style:'secondary', height:'sm', flex:0, color:'#E8E0FF',
                action:{ type:'message', label:'✏️', text:'/edit '+log.id } },
              { type:'button', style:'secondary', height:'sm', flex:1, color:'#E8E0FF',
                action:{ type:'postback', label:'🤖 AI', data:'action=analyze&logId='+log.id } },
              { type:'button', style:'primary', height:'sm', flex:1, color:cat.color,
                action:{ type:'uri', label:'App', uri:APP_URL } },
            ]
          },
          styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
        }
      })
    }
  }]
}

// 7. Status Update Card (ส่งจากแอปเมื่อเปลี่ยนสถานะ)
function msgStatusUpdate(log, trigger) {
  const cat = CAT[log.category||'other'] || CAT.other
  const STATUS = {
    done:        { emoji:'✅', label:'เสร็จแล้ว', color:BRAND.green,  bg:'#ECFDF5' },
    in_progress: { emoji:'🔄', label:'กำลังทำ',   color:BRAND.amber,  bg:'#FFFBEB' },
    draft:       { emoji:'📝', label:'ร่าง',       color:BRAND.purple, bg:BRAND.purpleBg },
  }
  const TRIGGERS = {
    timer_start:   '▶ เริ่มจับเวลา',
    status_change: '🔔 เปลี่ยนสถานะ',
    save:          '💾 บันทึกงานแล้ว',
    created:       '✅ สร้างงานใหม่',
    completed:     '🎉 งานเสร็จแล้ว',
  }
  const st = STATUS[log.status] || STATUS.draft
  const triggerLabel = TRIGGERS[trigger] || '📋 WorkLog AI'
  const dateStr = log.date
    ? new Date(log.date).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'})
    : new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'})
  const logId = log.id || ''

  return [{
    type: 'flex',
    altText: triggerLabel + ': ' + (log.title||'งาน') + ' — ' + st.label,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'horizontal', paddingAll: '14px', spacing:'md',
        backgroundColor: st.bg,
        contents: [
          { type:'image', url: log.status === 'done' ? MASCOT_HAPPY : MASCOT_FACE, size:'48px', aspectMode:'cover', flex:0, gravity:'top' },
          { type:'box', layout:'vertical', flex:1, contents:[
            {
              type: 'box', layout: 'horizontal',
              contents: [
                { type:'text', text: triggerLabel, size:'xs', color:BRAND.textMuted, flex:1, gravity:'center' },
                {
                  type:'box', layout:'vertical', flex:0,
                  cornerRadius:'20px', paddingAll:'3px',
                  paddingStart:'10px', paddingEnd:'10px',
                  backgroundColor: st.color + '22',
                  contents:[{ type:'text', text: st.emoji+' '+st.label, size:'xs', color:st.color, weight:'bold' }]
                }
              ]
            },
            { type:'text', text: log.title||'ไม่มีชื่องาน', weight:'bold', size:'md', color:BRAND.text, wrap:true, margin:'sm' },
          ]},
        ]
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '14px', spacing: 'sm',
        backgroundColor: BRAND.cardBg,
        contents: [
          // AI Summary
          ...(log.aiSummary ? [{
            type:'box', layout:'vertical', cornerRadius:'10px', paddingAll:'10px',
            backgroundColor: BRAND.purpleBg,
            contents:[
              { type:'box', layout:'horizontal', spacing:'xs',
                contents:[
                  { type:'text', text:'✨', size:'xs', flex:0 },
                  { type:'text', text:'AI Summary', size:'xs', color:BRAND.purple, weight:'bold', flex:1 },
                ]},
              { type:'text', text: log.aiSummary, size:'xs', color:BRAND.textSub, wrap:true, margin:'sm' },
            ]
          }] : []),
          // Meta row
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type:'text', text: cat.emoji+' '+cat.label, size:'xs', color:BRAND.textMuted, flex:1 },
              { type:'text', text: '⏱ '+(log.hours||0)+' ชม.', size:'xs', color:BRAND.textMuted, align:'center', flex:1 },
              { type:'text', text: '📅 '+dateStr, size:'xs', color:BRAND.textMuted, align:'end', flex:1 },
            ]
          },
          // Tags
          ...(log.tags?.length ? [{
            type:'box', layout:'horizontal', spacing:'xs',
            contents: (log.tags||[]).slice(0,4).map(t=>({
              type:'box', layout:'vertical',
              cornerRadius:'20px', paddingAll:'3px', paddingStart:'8px', paddingEnd:'8px',
              backgroundColor: cat.bg,
              contents:[{ type:'text', text:'#'+t, size:'xxs', color:cat.color, weight:'bold' }]
            }))
          }] : []),
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', paddingAll: '12px', spacing: 'sm',
        backgroundColor: BRAND.cardBg,
        contents: [
          // Status change buttons
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: ['done','in_progress','draft'].map(s => ({
              type: 'button',
              action: { type:'postback', label: STATUS[s].emoji+(s==='done'?' เสร็จ':s==='in_progress'?' กำลังทำ':' ร่าง'), data:'action=status&logId='+logId+'&status='+s },
              style: log.status === s ? 'primary' : 'secondary',
              color: log.status === s ? STATUS[s].color : '#E8E0FF',
              height: 'sm', flex: 1,
            }))
          },
          {
            type: 'button', style: 'primary', height: 'sm', color: BRAND.purple,
            action: { type:'uri', label:'🌐 ดูใน WorkLog AI', uri: APP_URL },
          },
        ]
      },
      styles: {
        header: { separator: false },
        footer: { separator: true, separatorColor: '#E8E0FF' }
      }
    }
  }]
}

// ─────────────────────────────────────────
// QUERY HELPERS (AI Command Center)
// ─────────────────────────────────────────
function monthStart() { const d=new Date(); d.setDate(1); return d.toISOString().split('T')[0] }
function daysAgo(n) { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0] }
const SEL = 'id,title,category,hours_spent,status,date,tags,image_urls,ai_summary,description'

async function getPendingLogs(uid, n=10) {
  const { data } = await supabase.from('work_logs').select(SEL)
    .eq('line_user_id', uid).neq('status', 'done').order('date', { ascending:false }).limit(n)
  return data || []
}
async function getWeekLogs(uid) {
  const { data } = await supabase.from('work_logs').select(SEL)
    .eq('line_user_id', uid).gte('date', daysAgo(7)).order('date', { ascending:false }).limit(30)
  return data || []
}
async function getMonthLogsFull(uid) {
  const { data } = await supabase.from('work_logs').select(SEL)
    .eq('line_user_id', uid).gte('date', monthStart()).order('date', { ascending:false }).limit(200)
  return data || []
}
async function getDoneToday(uid) {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase.from('work_logs').select(SEL)
    .eq('line_user_id', uid).eq('date', today).eq('status', 'done').limit(30)
  return data || []
}
async function getProjectLogs(uid, name) {
  // Projects in this dataset are expressed through tags / titles.
  const term = (name || '').trim()
  if (!term) return []
  const { data } = await supabase.from('work_logs').select(SEL)
    .eq('line_user_id', uid).or(`title.ilike.%${term}%,description.ilike.%${term}%`)
    .order('date', { ascending:false }).limit(30)
  let rows = data || []
  const low = term.toLowerCase()
  const byTag = rows.filter(r => (r.tags||[]).some(t => String(t).toLowerCase().includes(low)))
  // Merge title/desc matches with tag matches, de-duped.
  const seen = new Set(rows.map(r=>r.id))
  if (!byTag.length) {
    const { data: tagData } = await supabase.from('work_logs').select(SEL)
      .eq('line_user_id', uid).contains('tags', [term]).order('date',{ascending:false}).limit(30)
    for (const r of (tagData||[])) if (!seen.has(r.id)) { rows.push(r); seen.add(r.id) }
  }
  return rows
}

function aggregateProjects(logs) {
  // Build "projects" from tags; fall back to categories when no tags exist.
  const tagMap = {}
  for (const l of logs) {
    const tags = (l.tags||[])
    if (tags.length) for (const t of tags) {
      tagMap[t] = tagMap[t] || { name:t, count:0, hours:0 }
      tagMap[t].count++; tagMap[t].hours += (l.hours_spent||0)
    } else {
      const c = CAT[l.category]?.label || 'อื่นๆ'
      tagMap[c] = tagMap[c] || { name:c, count:0, hours:0 }
      tagMap[c].count++; tagMap[c].hours += (l.hours_spent||0)
    }
  }
  return Object.values(tagMap).sort((a,b)=>b.count-a.count)
}

function computeDashboard(monthLogs) {
  const total = monthLogs.length
  const done = monthLogs.filter(l=>l.status==='done').length
  const inProgress = monthLogs.filter(l=>l.status==='in_progress').length
  const pending = monthLogs.filter(l=>l.status==='draft').length
  const hours = Math.round(monthLogs.reduce((s,l)=>s+(l.hours_spent||0),0)*10)/10
  const projects = aggregateProjects(monthLogs).length
  const completion = total ? Math.round(done/total*100) : 0
  return { total, done, inProgress, pending, hours, projects, completion }
}

// ─────────────────────────────────────────
// AI — intent understanding + task analysis
// ─────────────────────────────────────────
async function understand(text) {
  const today = bkkToday()
  const dow = new Date(`${today}T00:00:00+07:00`).toLocaleDateString('th-TH', { weekday:'long' })
  const p = `คุณเป็นตัวแยกเจตนา (intent) ของผู้ใช้แอปบันทึกงาน "WorkLog AI" ตอบ JSON เท่านั้น ห้าม markdown
วันนี้คือ ${today} (${dow}) เขตเวลาไทย — ใช้อ้างอิงเมื่อผู้ใช้พูดถึงวัน/เวลา เช่น "พรุ่งนี้" "บ่าย 2" "ศุกร์นี้"
ข้อความผู้ใช้: "${text}"
หมวดงาน: graphic|video|photo|marketing|ai|branding|pos|other
รายการ intent ที่เป็นไปได้:
- today (งานวันนี้), done_today (งานเสร็จวันนี้), week (งานสัปดาห์นี้), month (งานเดือนนี้), recent (งานล่าสุด)
- pending (งานค้าง/ยังไม่เสร็จ), projects (โปรเจกต์ทั้งหมด), project_tasks (งานของโปรเจกต์ใดโปรเจกต์หนึ่ง)
- hours (เวลาทำงานเดือนนี้), productivity (สรุปประสิทธิภาพ), dashboard (แดชบอร์ด)
- report (ดูสรุปรายงานเดือนนี้), send_pdf (สร้าง/ส่งไฟล์ PDF รายงาน), send_ppt (สร้าง/ส่งไฟล์ PowerPoint/สไลด์), help (ขอความช่วยเหลือ)
- create_task (ผู้ใช้กำลังอธิบายงาน ไม่ว่าจะทำเสร็จแล้วหรือเป็นงานที่จะทำ/นัดหมายในอนาคต)
- unknown (ไม่เข้าพวก)
สำหรับ create_task ให้แยกด้วยว่า:
- status: "done" = ทำเสร็จไปแล้ว (เช่น "เมื่อกี้ตัดต่อวิดีโอเสร็จ"), "todo" = ยังไม่ทำ/เป็นงานที่ต้องทำหรือมีนัด (เช่น "พรุ่งนี้ต้องส่งงานลูกค้า", "บ่าย 2 ประชุม")
- date: วันที่ของงาน YYYY-MM-DD (ถ้าพูดถึงวัน) ไม่งั้น null
- start, end: เวลาเริ่ม/สิ้นสุด รูปแบบ "HH:MM" (24 ชม.) ถ้ามี ไม่งั้น null
- due: วันครบกำหนดส่ง YYYY-MM-DD ถ้ามีเดดไลน์ ไม่งั้น null
- priority: "low|medium|high" ถ้าบอกความเร่งด่วน ไม่งั้น null
ตอบรูปแบบ: {"intent":"...","project":"<ชื่อโปรเจกต์หรือ tag ถ้า intent=project_tasks ไม่งั้น null>","task":{"title":"ชื่อกระชับ","summary":"สรุปมืออาชีพ 1-2 ประโยค","category":"...","hours":1,"tags":["t1"],"status":"done|todo","date":null,"start":null,"end":null,"due":null,"priority":null}}
ถ้า intent ไม่ใช่ create_task ให้ task เป็น null`
  try {
    const txt = await callAI(p)
    if (!txt) throw new Error('empty')
    const s = txt.indexOf('{'), e = txt.lastIndexOf('}')
    if (s===-1||e===-1) throw new Error('no json')
    const parsed = JSON.parse(txt.slice(s, e+1))
    if (!parsed.intent) throw new Error('no intent')
    return parsed
  } catch {
    return fallbackIntent(text)
  }
}

function fallbackIntent(text) {
  const t = (text||'').toLowerCase()
  const has = (...ks) => ks.some(k => t.includes(k))
  if (has('แดชบอร์ด','dashboard')) return { intent:'dashboard', project:null, task:null }
  if (has('ส่ง ppt','ส่งppt','ppt','powerpoint','พาวเวอร์','สไลด์','พรีเซน')) return { intent:'send_ppt', project:null, task:null }
  if (has('ส่ง pdf','ส่งpdf','pdf')) return { intent:'send_pdf', project:null, task:null }
  if (has('ค้าง','ยังไม่เสร็จ','overdue')) return { intent:'pending', project:null, task:null }
  if (has('เสร็จ') && has('วันนี้')) return { intent:'done_today', project:null, task:null }
  if (has('วันนี้','today')) return { intent:'today', project:null, task:null }
  if (has('สัปดาห์','week')) return { intent:'week', project:null, task:null }
  if (has('รายงาน','report')) return { intent:'report', project:null, task:null }
  if (has('เวลา') && has('เดือน')) return { intent:'hours', project:null, task:null }
  if (has('เดือน','month')) return { intent:'month', project:null, task:null }
  if (has('ประสิทธิภาพ','productivity')) return { intent:'productivity', project:null, task:null }
  if (has('โปรเจกต์','โปรเจ็ค','project')) return { intent:'projects', project:null, task:null }
  if (has('ล่าสุด','recent')) return { intent:'recent', project:null, task:null }
  if (has('ช่วยเหลือ','help','คำสั่ง')) return { intent:'help', project:null, task:null }
  // No clear command → treat as a work description to capture (safety net).
  return { intent:'create_task', project:null, task:null }
}

async function aiAnalyzeTask(log) {
  const cat = CAT[log.category]?.label || 'อื่นๆ'
  const p = `วิเคราะห์งานนี้แบบมืออาชีพ ตอบ JSON เท่านั้น ห้าม markdown:
ชื่องาน: "${log.title||''}"
รายละเอียด: "${log.description||log.ai_summary||''}"
หมวด: ${cat}
เวลาที่ใช้: ${log.hours_spent||0} ชม.
สถานะ: ${log.status||'draft'}
วันที่: ${log.date||''}
ตอบ: {"summary":"สรุปงาน 1-2 ประโยค","risk":"low|medium|high","score":85,"next_action":"สิ่งที่ควรทำต่อไป 1 ข้อ","suggestion":"ข้อเสนอแนะปรับปรุง 1 ข้อ"}
score = คะแนนประสิทธิภาพ 0-100`
  try {
    const txt = await callAI(p)
    const s = txt.indexOf('{'), e = txt.lastIndexOf('}')
    if (s===-1||e===-1) throw new Error('no json')
    return JSON.parse(txt.slice(s, e+1))
  } catch {
    return { summary: log.ai_summary||log.title||'', risk:'low', score:70, next_action:'ตรวจสอบและปิดงาน', suggestion:'บันทึกรายละเอียดเพิ่มเติมเพื่อการวิเคราะห์ที่แม่นยำขึ้น' }
  }
}

// ─────────────────────────────────────────
// PDF — text extraction + AI summarization & task detection (§7, §8)
// ─────────────────────────────────────────
async function extractPdfText(buf) {
  try {
    // pdfjs-dist legacy build runs in Node with no worker and no DOM globals —
    // the serverless-safe way to read a PDF's text layer.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    // pdf.worker.mjs is force-included next to pdf.mjs (see next.config
    // outputFileTracingIncludes) so pdfjs's default sibling resolution works.
    const task = pdfjs.getDocument({
      data: new Uint8Array(buf),
      isEvalSupported: false,
      useWorkerFetch: false,
      useSystemFonts: false,
    })
    const doc = await task.promise
    const pages = doc.numPages
    let out = ''
    for (let i = 1; i <= Math.min(pages, 30); i++) {
      const page = await doc.getPage(i)
      const tc = await page.getTextContent()
      out += tc.items.map(it => ('str' in it ? it.str : '')).join(' ') + '\n'
    }
    // Best-effort cleanup — must never fail the extraction we just completed.
    try { await task.destroy() } catch {}
    return { text: out.trim(), pages, ok: true, err: '' }
  } catch (e) {
    const msg = (e && (e.message || String(e))) || 'unknown'
    console.error('[PDF]', msg)
    return { text: '', pages: 0, ok: false, err: msg.slice(0, 140) }
  }
}

async function analyzePdf(text, pages) {
  const clipped = text.slice(0, 6000)
  const p = `วิเคราะห์เอกสารต่อไปนี้ สรุปและแยกงานที่ควรทำ (tasks) ตอบ JSON เท่านั้น ห้าม markdown
จำนวนหน้า: ${pages}
เนื้อหาเอกสาร:
"""${clipped}"""
หมวดงาน: graphic|video|photo|marketing|ai|branding|pos|other
ตอบรูปแบบ: {"summary":"สรุปเอกสาร 2-3 ประโยค","topics":["หัวข้อสำคัญ"],"action_items":["สิ่งที่ต้องทำ"],"deadlines":["กำหนดส่ง/วันสำคัญ"],"responsible":["ผู้รับผิดชอบ"],"tasks":[{"title":"ชื่องานกระชับ","category":"หมวด","hours":1}]}
tasks = งานที่ควรสร้างจากเอกสารนี้ สูงสุด 8 งาน ถ้าไม่พบให้เป็น []`
  try {
    const txt = await callAI(p, { maxTokens: 2000, timeoutMs: 20000 })
    const s = txt.indexOf('{'), e = txt.lastIndexOf('}')
    if (s === -1 || e === -1) throw new Error('no json')
    const parsed = JSON.parse(txt.slice(s, e + 1))
    return {
      summary: parsed.summary || '',
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
      deadlines: Array.isArray(parsed.deadlines) ? parsed.deadlines : [],
      responsible: Array.isArray(parsed.responsible) ? parsed.responsible : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.slice(0, 8) : [],
    }
  } catch {
    return { summary: '', topics: [], action_items: [], deadlines: [], responsible: [], tasks: [] }
  }
}

// ─────────────────────────────────────────
// REPORT GENERATION + LINE FILE DELIVERY (§11–14)
// ─────────────────────────────────────────
async function uploadReport(buf, uid, ext, contentType) {
  const safeUid = String(uid).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'user'
  const fname = new Date().toISOString().slice(0, 7) // YYYY-MM
  const p = `reports/${safeUid}_${fname}_${Date.now()}.${ext}`
  try {
    const { error } = await supabase.storage.from('worklog-gallery')
      .upload(p, buf, { contentType, cacheControl: '3600', upsert: false })
    if (error) { console.error('[REPORT-UP]', error.message); return null }
    return supabase.storage.from('worklog-gallery').getPublicUrl(p).data.publicUrl
  } catch (e) { console.error('[REPORT-UP]', e); return null }
}

// "File ready" delivery card — LINE can't push raw files, so we deliver a
// download/open link to the stored report (§14).
function msgFileReady(kind, url, meta) {
  const isPpt = kind === 'ppt'
  const label = isPpt ? 'PowerPoint (.pptx)' : 'PDF'
  const emoji = isPpt ? '📑' : '📄'
  return [{
    type:'flex', altText:emoji+' รายงาน'+label+'พร้อมแล้ว',
    contents:{
      type:'bubble', size:'mega',
      header:{
        type:'box', layout:'vertical', paddingAll:'16px', backgroundColor:BRAND.purpleBg,
        contents:[
          { type:'text', text:emoji+' รายงานพร้อมแล้ว', weight:'bold', size:'md', color:BRAND.purple },
          { type:'text', text:label+' · '+(meta?.periodLabel||''), size:'xs', color:BRAND.textMuted, margin:'xs' },
        ]
      },
      body:{
        type:'box', layout:'vertical', paddingAll:'14px', spacing:'sm', backgroundColor:BRAND.cardBg,
        contents:[
          { type:'text', text:meta?.title||'รายงานสรุปผลงานประจำเดือน', size:'sm', weight:'bold', color:BRAND.text, wrap:true },
          { type:'text', text:'แตะปุ่มด้านล่างเพื่อเปิด/ดาวน์โหลด/แชร์ไฟล์', size:'xs', color:BRAND.textMuted, wrap:true, margin:'sm' },
        ]
      },
      footer:{
        type:'box', layout:'vertical', paddingAll:'12px', spacing:'sm', backgroundColor:BRAND.cardBg,
        contents:[
          { type:'button', style:'primary', height:'sm', color:BRAND.purple,
            action:{ type:'uri', label:'📥 เปิด / ดาวน์โหลด', uri:url } },
          { type:'button', style:'secondary', height:'sm', color:'#E8E0FF',
            action:{ type:'uri', label:'↗ แชร์ไฟล์', uri:'https://line.me/R/msg/text/?'+encodeURIComponent((meta?.title||'รายงาน')+' '+url) } },
        ]
      },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
    }
  }]
}

// Generate the report off the reply path (via after()) and push it when ready.
async function generateAndPushReport(uid, kind, lang = 'th') {
  try {
    const logs = await getMonthLogsFull(uid)
    if (!logs.length) return pushLINE(uid, [{ type:'text', text:'เดือนนี้ยังไม่มีงานสำหรับสร้างรายงานครับ 📭' }])
    const now = new Date()
    const { buildReportModel, renderReportPDF, renderReportPPTX } = await import('@/app/components/presentation/serverReport')
    const model = buildReportModel(logs, now.getFullYear(), now.getMonth() + 1, lang)
    let buf, ext, ctype
    if (kind === 'ppt') {
      buf = await renderReportPPTX(model); ext = 'pptx'
      ctype = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    } else {
      buf = await renderReportPDF(model); ext = 'pdf'; ctype = 'application/pdf'
    }
    const url = await uploadReport(buf, uid, ext, ctype)
    if (!url) return pushLINE(uid, [{ type:'text', text:'⚠️ อัปโหลดไฟล์รายงานไม่สำเร็จ ลองใหม่อีกครั้งครับ' }])
    return pushLINE(uid, msgFileReady(kind, url, model.meta))
  } catch (e) {
    console.error('[GEN-REPORT]', e?.message || e)
    return pushLINE(uid, [{ type:'text', text:'⚠️ เกิดข้อผิดพลาดระหว่างสร้างไฟล์รายงานครับ' }])
  }
}

// ─────────────────────────────────────────
// AI INBOX — vision understanding of images/screenshots (§10)
// ─────────────────────────────────────────
const INBOX_TYPES = {
  task:            { label:'งาน',          emoji:'✅' },
  meeting:         { label:'ประชุม',       emoji:'📅' },
  invoice:         { label:'ใบแจ้งหนี้',    emoji:'🧾' },
  purchase_order:  { label:'ใบสั่งซื้อ',    emoji:'📦' },
  contract:        { label:'สัญญา',         emoji:'📜' },
  report:          { label:'รายงาน',        emoji:'📊' },
  presentation:    { label:'พรีเซนเทชัน',   emoji:'📑' },
  marketing:       { label:'งานการตลาด',    emoji:'📢' },
  customer_request:{ label:'คำขอลูกค้า',    emoji:'🙋' },
  support_ticket:  { label:'ซัพพอร์ต',      emoji:'🎫' },
  other:           { label:'อื่นๆ',         emoji:'📌' },
}
const PRIORITY = {
  high:   { label:'ด่วน',  emoji:'🔴', color:BRAND.red },
  medium: { label:'ปกติ',  emoji:'🟡', color:BRAND.amber },
  low:    { label:'ไม่เร่ง', emoji:'🟢', color:BRAND.green },
}

// Claude vision call — classifies/extracts directly from the image (no external OCR).
async function callAIVision(prompt, base64, mediaType='image/jpeg', { maxTokens=700, timeoutMs=20000 } = {}) {
  if (!ANTHROPIC_KEY || !base64) return ''
  const ctrl=new AbortController(), t=setTimeout(()=>ctrl.abort(),timeoutMs)
  try {
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:'claude-haiku-4-5-20251001', max_tokens:maxTokens,
        messages:[{ role:'user', content:[
          { type:'image', source:{ type:'base64', media_type:mediaType, data:base64 } },
          { type:'text', text:prompt },
        ]}],
      }),
      signal:ctrl.signal,
    })
    clearTimeout(t)
    if (!r.ok){ const e=await r.json().catch(()=>({})); console.error('[VISION]',r.status,e); return '' }
    return (await r.json()).content?.[0]?.text||''
  } catch(e){ clearTimeout(t); console.error('[VISION]',e.name==='AbortError'?'TIMEOUT':e); return '' }
}

async function analyzeImageInbox(base64) {
  const p = `คุณเป็นระบบรับงานอัจฉริยะ (AI Inbox) วิเคราะห์รูป/สกรีนช็อตนี้ ตอบ JSON เท่านั้น ห้าม markdown
ประเภท inbox: task|meeting|invoice|purchase_order|contract|report|presentation|marketing|customer_request|support_ticket|other
หมวดงาน: graphic|video|photo|marketing|ai|branding|pos|other
ความสำคัญ: high|medium|low
ตอบ: {"inbox_type":"...","title":"ชื่อสั้นกระชับ","summary":"สิ่งที่อยู่ในรูป 1-2 ประโยค","category":"...","priority":"...","hours":1,"tags":["t1","t2"],"extracted_text":"ข้อความ/ตัวเลข/วันที่สำคัญที่อ่านได้ในรูป ถ้าไม่มีให้เว้นว่าง"}`
  try {
    const txt = await callAIVision(p, base64, 'image/jpeg', { maxTokens:700, timeoutMs:18000 })
    const s = txt.indexOf('{'), e = txt.lastIndexOf('}')
    if (s===-1||e===-1) throw new Error('no json')
    const a = JSON.parse(txt.slice(s, e+1))
    if (!a.title && !a.summary) throw new Error('empty')
    return {
      inbox_type: INBOX_TYPES[a.inbox_type] ? a.inbox_type : 'other',
      title: a.title || '',
      summary: a.summary || '',
      category: CAT[a.category] ? a.category : 'photo',
      priority: PRIORITY[a.priority] ? a.priority : 'medium',
      hours: Number(a.hours) || 1,
      tags: Array.isArray(a.tags) ? a.tags.slice(0,5) : [],
      extracted_text: a.extracted_text || '',
    }
  } catch { return null }
}

// AI Inbox classification card (§10)
function msgInboxCard(a, imgUrl) {
  const itype = INBOX_TYPES[a.inbox_type] || INBOX_TYPES.other
  const cat = CAT[a.category] || CAT.other
  const pr = PRIORITY[a.priority] || PRIORITY.medium
  return [{
    type:'flex', altText:'📥 AI Inbox: '+(a.title||'รับรูปแล้ว'),
    contents:{
      type:'bubble', size:'mega',
      ...(imgUrl ? { hero:{ type:'image', url:imgUrl, size:'full', aspectRatio:'20:13', aspectMode:'cover', action:{ type:'uri', uri:APP_URL } } } : {}),
      header:{
        type:'box', layout:'vertical', paddingAll:'16px', backgroundColor:cat.bg,
        contents:[
          { type:'box', layout:'horizontal', contents:[
            { type:'text', text:'📥 AI Inbox', size:'xs', weight:'bold', color:BRAND.purple, flex:1 },
            { type:'box', layout:'vertical', flex:0, cornerRadius:'20px', paddingAll:'3px', paddingStart:'10px', paddingEnd:'10px', backgroundColor:cat.color+'22',
              contents:[{ type:'text', text:itype.emoji+' '+itype.label, size:'xxs', color:cat.color, weight:'bold' }] },
          ]},
          { type:'text', text:a.title||'งานจากรูป', weight:'bold', size:'md', color:BRAND.text, wrap:true, margin:'sm' },
        ]
      },
      body:{
        type:'box', layout:'vertical', paddingAll:'14px', spacing:'md', backgroundColor:BRAND.cardBg,
        contents:[
          ...(a.summary ? [{
            type:'box', layout:'vertical', cornerRadius:'10px', paddingAll:'12px', backgroundColor:BRAND.purpleBg,
            contents:[
              { type:'text', text:'✨ AI เข้าใจว่า', size:'xs', weight:'bold', color:BRAND.purple },
              { type:'text', text:a.summary, size:'sm', color:BRAND.textSub, wrap:true, margin:'sm' },
            ]
          }] : []),
          { type:'box', layout:'horizontal', spacing:'sm', contents:[
            { type:'box', layout:'vertical', flex:1, cornerRadius:'10px', paddingAll:'10px', backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
              contents:[
                { type:'text', text:'หมวด', size:'xxs', color:BRAND.textMuted, align:'center' },
                { type:'text', text:cat.emoji+' '+cat.label, size:'xs', weight:'bold', color:cat.color, align:'center', margin:'xs', wrap:true },
              ]},
            { type:'box', layout:'vertical', flex:1, cornerRadius:'10px', paddingAll:'10px', backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
              contents:[
                { type:'text', text:'ความสำคัญ', size:'xxs', color:BRAND.textMuted, align:'center' },
                { type:'text', text:pr.emoji+' '+pr.label, size:'xs', weight:'bold', color:pr.color, align:'center', margin:'xs' },
              ]},
            { type:'box', layout:'vertical', flex:1, cornerRadius:'10px', paddingAll:'10px', backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
              contents:[
                { type:'text', text:'เวลา', size:'xxs', color:BRAND.textMuted, align:'center' },
                { type:'text', text:(a.hours||1)+' ชม.', size:'xs', weight:'bold', color:BRAND.cyan, align:'center', margin:'xs' },
              ]},
          ]},
          ...(a.extracted_text ? [{
            type:'box', layout:'vertical', cornerRadius:'10px', paddingAll:'10px', backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
            contents:[
              { type:'text', text:'🔍 ข้อความที่อ่านได้', size:'xxs', color:BRAND.textMuted, weight:'bold' },
              { type:'text', text:a.extracted_text, size:'xs', color:BRAND.textSub, wrap:true, margin:'sm' },
            ]
          }] : []),
        ]
      },
      footer:{
        type:'box', layout:'vertical', paddingAll:'12px', spacing:'sm', backgroundColor:BRAND.cardBg,
        contents:[
          { type:'button', style:'primary', height:'sm', color:BRAND.green,
            action:{ type:'postback', label:'✅ สร้างงาน', data:'action=inbox_create' } },
          { type:'box', layout:'horizontal', spacing:'sm', contents:[
            { type:'button', style:'secondary', height:'sm', flex:1, color:'#E8E0FF',
              action:{ type:'postback', label:'✏️ ใส่เอง', data:'action=inbox_describe' } },
            { type:'button', style:'secondary', height:'sm', flex:1, color:'#E8E0FF',
              action:{ type:'postback', label:'❌ ข้าม', data:'action=inbox_skip' } },
          ]},
        ]
      },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
    }
  }]
}

// ─────────────────────────────────────────
// FLEX BUILDERS — Command Center
// ─────────────────────────────────────────
function btn(label, data, color, style='secondary') {
  return { type:'button', height:'sm', style, color: color||'#E8E0FF',
    action: data.uri ? { type:'uri', label, uri:data.uri } : { type:'postback', label, data:data.postback } }
}

// Compact "new task created" popup card (§6)
function msgCompactCreated(d, saved) {
  const cat = CAT[d.category] || CAT.other
  const logId = saved?.id || ''
  const isTodo = d.status && d.status !== 'done'
  const headLabel = isTodo ? '🗓️ เพิ่มงานที่ต้องทำ' : '✅ บันทึกงานแล้ว'
  const headColor = isTodo ? BRAND.purple : BRAND.green
  // Schedule line: prefer a start time, else a deadline, else the date.
  let when = '📅 ' + fmtThaiDate(d.date || bkkToday())
  if (d.start_at) {
    const s = new Date(new Date(d.start_at).getTime() + 7*3600000)
    const e = d.end_at ? new Date(new Date(d.end_at).getTime() + 7*3600000) : null
    const hhmm = x => `${String(x.getUTCHours()).padStart(2,'0')}:${String(x.getUTCMinutes()).padStart(2,'0')}`
    when = `🕐 ${fmtThaiDate(d.date)} ${hhmm(s)}${e ? '–' + hhmm(e) : ''}`
  } else if (d.due_date) {
    when = '⏳ ส่ง ' + fmtThaiDate(d.due_date)
  }
  return [{
    type:'flex', altText:headLabel+': '+d.title,
    contents:{
      type:'bubble', size:'kilo',
      header:{
        type:'box', layout:'horizontal', paddingAll:'14px', spacing:'md', backgroundColor:cat.bg,
        contents:[
          { type:'image', url:MASCOT_FACE, size:'48px', aspectMode:'cover', flex:0, gravity:'top' },
          { type:'box', layout:'vertical', flex:1, contents:[
            { type:'box', layout:'horizontal', contents:[
              { type:'text', text:headLabel, size:'xs', weight:'bold', color:headColor, flex:1 },
              { type:'text', text:cat.emoji+' '+cat.label, size:'xxs', color:cat.color, flex:0, align:'end', gravity:'center' },
            ]},
            { type:'text', text:d.title, weight:'bold', size:'md', color:BRAND.text, wrap:true, margin:'sm' },
          ]},
        ]
      },
      body:{
        type:'box', layout:'horizontal', paddingAll:'12px', spacing:'sm', backgroundColor:BRAND.cardBg,
        contents:[
          { type:'text', text:'⏱ '+(d.hours||1)+' ชม.', size:'xs', color:BRAND.textSub, flex:0 },
          { type:'text', text:when, size:'xs', color: (d.due_date||d.start_at) ? BRAND.purple : BRAND.textSub, weight:(d.due_date||d.start_at)?'bold':'regular', flex:1, align:'end', wrap:true },
        ]
      },
      footer:{
        type:'box', layout:'vertical', paddingAll:'12px', spacing:'sm', backgroundColor:BRAND.cardBg,
        contents:[
          { type:'box', layout:'horizontal', spacing:'sm', contents:[
            btn('🤖 AI วิเคราะห์', { postback:'action=analyze&logId='+logId }, '#E8E0FF'),
            btn('🌐 เปิดงาน', { uri:APP_URL }, BRAND.purple, 'primary'),
          ]},
        ]
      },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
    }
  }]
}

// Welcome card — shown when a new user adds the bot as a friend.
function msgWelcome() {
  const feat = (emoji, title, desc) => ({
    type:'box', layout:'horizontal', spacing:'md', margin:'md',
    contents:[
      { type:'text', text:emoji, size:'lg', flex:0, gravity:'top' },
      { type:'box', layout:'vertical', flex:1, contents:[
        { type:'text', text:title, size:'sm', weight:'bold', color:BRAND.text, wrap:true },
        { type:'text', text:desc, size:'xs', color:BRAND.textSub, wrap:true, margin:'xs' },
      ]},
    ]
  })
  return [{
    type:'flex', altText:'👋 ยินดีต้อนรับสู่ WorkLog AI — ผู้ช่วยจัดการงานผ่าน LINE',
    contents:{
      type:'bubble', size:'mega',
      hero:{ type:'image', url:MASCOT_HERO_WAVE, size:'full', aspectRatio:'20:11', aspectMode:'cover', backgroundColor:BRAND.purple },
      body:{
        type:'box', layout:'vertical', paddingAll:'18px', spacing:'none', backgroundColor:BRAND.cardBg,
        contents:[
          { type:'text', text:'WorkLog AI', size:'xl', weight:'bold', color:BRAND.purple },
          { type:'text', text:'👋 สวัสดี! ผมเป็นผู้ช่วย AI จัดการงานของคุณผ่าน LINE', size:'sm', color:BRAND.textSub, margin:'sm', wrap:true },
          { type:'separator', margin:'lg', color:'#EDEAFF' },
          { type:'text', text:'ทำอะไรได้บ้าง', size:'xs', weight:'bold', color:BRAND.textMuted, margin:'lg' },
          feat('📝','พิมพ์เล่างานเป็นภาษาคน','เช่น "พรุ่งนี้บ่าย 2 ตัดต่อวิดีโอลูกค้า" — AI จัดหมวด เวลา และเตือนให้'),
          feat('📸','ส่งรูป / ไฟล์ PDF','AI อ่านให้แล้วบันทึกเป็นงานพร้อมสรุปอัตโนมัติ'),
          feat('⏰','เตือนงานอัตโนมัติ','สรุปงานทุกเช้า และให้กดยืนยัน "เสร็จแล้ว" ได้ในแชต'),
          feat('📊','ถามอะไรก็ได้','"แดชบอร์ด" "งานค้าง" "รายงานเดือนนี้" "ส่ง PDF"'),
        ]
      },
      footer:{
        type:'box', layout:'vertical', paddingAll:'14px', spacing:'sm', backgroundColor:BRAND.cardBg,
        contents:[
          { type:'text', text:'💡 ลองพิมพ์งานแรกของคุณได้เลย!', size:'xs', color:BRAND.textSub, align:'center' },
          { type:'box', layout:'horizontal', spacing:'sm', contents:[
            btn('📅 งานวันนี้', { postback:'action=cmd&cmd=today' }, '#E8E0FF'),
            btn('❓ วิธีใช้', { postback:'action=cmd&cmd=help' }, '#E8E0FF'),
          ]},
          { type:'button', style:'primary', height:'sm', color:BRAND.purple,
            action:{ type:'uri', label:'🌐 เปิด WorkLog AI', uri:APP_URL } },
        ]
      },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
    }
  }]
}

// Generic task list card
function msgTaskList(titleTxt, subtitle, logs, accent=BRAND.purple) {
  if (!logs.length) return [{ type:'text', text:'ไม่พบงานในเงื่อนไขนี้ 📭' }]
  const rows = logs.slice(0,10).map((l,i)=>{
    const cat = CAT[l.category||'other']||CAT.other
    const st = l.status==='done'?'✅':l.status==='in_progress'?'🔄':'📝'
    return {
      type:'box', layout:'horizontal', spacing:'sm', paddingTop: i===0?'2px':'6px',
      contents:[
        { type:'text', text:st, size:'sm', flex:0 },
        { type:'box', layout:'vertical', flex:1, contents:[
          { type:'text', text:l.title||'งาน', size:'sm', color:BRAND.text, wrap:true },
          { type:'text', text:cat.emoji+' '+cat.label+' · '+(l.date||''), size:'xxs', color:BRAND.textMuted },
        ]},
        { type:'text', text:(l.hours_spent||0)+'h', size:'xs', weight:'bold', color:cat.color, flex:0 },
      ]
    }
  })
  return [{
    type:'flex', altText:titleTxt+' · '+logs.length+' งาน',
    contents:{
      type:'bubble', size:'mega',
      header:{
        type:'box', layout:'vertical', paddingAll:'16px', backgroundColor:BRAND.purpleBg,
        contents:[
          { type:'box', layout:'horizontal', contents:[
            { type:'text', text:titleTxt, weight:'bold', size:'md', color:accent, flex:1 },
            { type:'box', layout:'vertical', flex:0, cornerRadius:'20px', paddingAll:'4px', paddingStart:'12px', paddingEnd:'12px', backgroundColor:accent,
              contents:[{ type:'text', text:String(logs.length), size:'sm', weight:'bold', color:BRAND.white }] },
          ]},
          ...(subtitle?[{ type:'text', text:subtitle, size:'xs', color:BRAND.textMuted, margin:'xs' }]:[]),
        ]
      },
      body:{ type:'box', layout:'vertical', paddingAll:'14px', spacing:'none', backgroundColor:BRAND.cardBg, contents:rows },
      footer:{
        type:'box', layout:'vertical', paddingAll:'12px', backgroundColor:BRAND.cardBg,
        contents:[{ type:'button', style:'primary', height:'sm', color:accent, action:{ type:'uri', label:'🌐 เปิดในแอป', uri:APP_URL } }]
      },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
    }
  }]
}

// Dashboard card (§5)
function msgDashboard(stats, projects) {
  const stat = (emoji,label,val,color)=>({
    type:'box', layout:'vertical', flex:1, cornerRadius:'10px', paddingAll:'10px',
    backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
    contents:[
      { type:'text', text:emoji, size:'sm', align:'center' },
      { type:'text', text:String(val), size:'md', weight:'bold', color:color, align:'center', margin:'xs' },
      { type:'text', text:label, size:'xxs', color:BRAND.textMuted, align:'center' },
    ]
  })
  return [{
    type:'flex', altText:'📊 แดชบอร์ด WorkLog AI',
    contents:{
      type:'bubble', size:'mega',
      header:{
        type:'box', layout:'horizontal', paddingAll:'16px', spacing:'md', backgroundColor:BRAND.purpleBg,
        contents:[
          { type:'image', url:MASCOT_FACE, size:'46px', aspectMode:'cover', flex:0, gravity:'center' },
          { type:'box', layout:'vertical', flex:1, justifyContent:'center', contents:[
            { type:'text', text:'📊 แดชบอร์ด', weight:'bold', size:'lg', color:BRAND.purple },
            { type:'text', text:new Date().toLocaleDateString('th-TH',{month:'long',year:'numeric'}), size:'xs', color:BRAND.textMuted, margin:'xs' },
          ]},
          { type:'box', layout:'vertical', flex:0, justifyContent:'center', cornerRadius:'20px', paddingAll:'6px', paddingStart:'14px', paddingEnd:'14px', backgroundColor:BRAND.purple,
            contents:[{ type:'text', text:stats.completion+'%', size:'md', weight:'bold', color:BRAND.white }] },
        ]
      },
      body:{
        type:'box', layout:'vertical', paddingAll:'14px', spacing:'sm', backgroundColor:BRAND.cardBg,
        contents:[
          { type:'box', layout:'horizontal', spacing:'sm', contents:[
            stat('📋','งานเดือนนี้',stats.total,BRAND.purple),
            stat('✅','เสร็จ',stats.done,BRAND.green),
            stat('🔄','กำลังทำ',stats.inProgress,BRAND.amber),
          ]},
          { type:'box', layout:'horizontal', spacing:'sm', contents:[
            stat('📝','ค้าง',stats.pending,BRAND.red),
            stat('⏱','ชั่วโมง',stats.hours,BRAND.cyan),
            stat('📁','โปรเจกต์',stats.projects,BRAND.pink),
          ]},
          ...(projects && projects.length ? [{
            type:'box', layout:'vertical', cornerRadius:'10px', paddingAll:'12px', backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
            contents:[
              { type:'text', text:'โปรเจกต์เด่น', size:'xs', weight:'bold', color:BRAND.textMuted },
              { type:'separator', margin:'sm' },
              ...projects.slice(0,4).map(p=>({
                type:'box', layout:'horizontal', margin:'sm', contents:[
                  { type:'text', text:'📁 '+p.name, size:'xs', color:BRAND.text, flex:1, wrap:true },
                  { type:'text', text:p.count+' งาน · '+Math.round(p.hours*10)/10+'h', size:'xxs', color:BRAND.textMuted, flex:0, align:'end' },
                ]
              })),
            ]
          }]:[]),
        ]
      },
      footer:{
        type:'box', layout:'vertical', paddingAll:'12px', spacing:'sm', backgroundColor:BRAND.cardBg,
        contents:[
          { type:'box', layout:'horizontal', spacing:'sm', contents:[
            btn('📋 งานค้าง', { postback:'action=cmd&cmd=pending' }, '#E8E0FF'),
            btn('📈 รายงาน', { postback:'action=cmd&cmd=report' }, '#E8E0FF'),
          ]},
          { type:'button', style:'primary', height:'sm', color:BRAND.purple, action:{ type:'uri', label:'🌐 เปิดแดชบอร์ด', uri:APP_URL } },
        ]
      },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
    }
  }]
}

// AI analysis result card (§3)
function msgAIAnalysis(log, a) {
  const cat = CAT[log.category||'other']||CAT.other
  const RISK = { low:{e:'🟢',l:'ความเสี่ยงต่ำ',c:BRAND.green}, medium:{e:'🟡',l:'ความเสี่ยงปานกลาง',c:BRAND.amber}, high:{e:'🔴',l:'ความเสี่ยงสูง',c:BRAND.red} }
  const risk = RISK[a.risk] || RISK.low
  const score = Math.max(0, Math.min(100, parseInt(a.score)||0))
  return [{
    type:'flex', altText:'🤖 AI วิเคราะห์: '+(log.title||'งาน'),
    contents:{
      type:'bubble', size:'mega',
      header:{
        type:'box', layout:'vertical', paddingAll:'16px', backgroundColor:BRAND.purpleBg,
        contents:[
          { type:'text', text:'🤖 AI วิเคราะห์งาน', size:'xs', weight:'bold', color:BRAND.purple },
          { type:'text', text:log.title||'งาน', weight:'bold', size:'md', color:BRAND.text, wrap:true, margin:'xs' },
        ]
      },
      body:{
        type:'box', layout:'vertical', paddingAll:'14px', spacing:'md', backgroundColor:BRAND.cardBg,
        contents:[
          { type:'box', layout:'horizontal', spacing:'sm', contents:[
            { type:'box', layout:'vertical', flex:1, cornerRadius:'10px', paddingAll:'10px', backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
              contents:[
                { type:'text', text:'⭐ Productivity', size:'xxs', color:BRAND.textMuted, align:'center' },
                { type:'text', text:score+'/100', size:'lg', weight:'bold', color:BRAND.purple, align:'center', margin:'xs' },
              ]},
            { type:'box', layout:'vertical', flex:1, cornerRadius:'10px', paddingAll:'10px', backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
              contents:[
                { type:'text', text:risk.e+' Risk', size:'xxs', color:BRAND.textMuted, align:'center' },
                { type:'text', text:risk.l, size:'sm', weight:'bold', color:risk.c, align:'center', margin:'xs' },
              ]},
          ]},
          { type:'box', layout:'vertical', cornerRadius:'10px', paddingAll:'12px', backgroundColor:BRAND.purpleBg,
            contents:[
              { type:'text', text:'✨ สรุป', size:'xs', weight:'bold', color:BRAND.purple },
              { type:'text', text:a.summary||'-', size:'sm', color:BRAND.textSub, wrap:true, margin:'sm' },
            ]},
          { type:'box', layout:'vertical', cornerRadius:'10px', paddingAll:'12px', backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
            contents:[
              { type:'text', text:'➡️ ควรทำต่อไป', size:'xs', weight:'bold', color:BRAND.cyan },
              { type:'text', text:a.next_action||'-', size:'sm', color:BRAND.textSub, wrap:true, margin:'sm' },
              { type:'separator', margin:'md' },
              { type:'text', text:'💡 ข้อเสนอแนะ', size:'xs', weight:'bold', color:BRAND.amber, margin:'md' },
              { type:'text', text:a.suggestion||'-', size:'sm', color:BRAND.textSub, wrap:true, margin:'sm' },
            ]},
        ]
      },
      footer:{
        type:'box', layout:'vertical', paddingAll:'12px', backgroundColor:BRAND.cardBg,
        contents:[{ type:'button', style:'primary', height:'sm', color:cat.color, action:{ type:'uri', label:'🌐 เปิดงานในแอป', uri:APP_URL } }]
      },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
    }
  }]
}

// PDF document summary card (§8)
function msgPdfSummary(fileName, info) {
  const section = (emoji, label, items, color) => (items && items.length ? [{
    type:'box', layout:'vertical', cornerRadius:'10px', paddingAll:'12px', backgroundColor:BRAND.white, borderColor:'#E8E0FF', borderWidth:'1px',
    contents:[
      { type:'text', text:emoji+' '+label, size:'xs', weight:'bold', color:color },
      ...items.slice(0,5).map(it=>({ type:'text', text:'• '+String(it), size:'xs', color:BRAND.textSub, wrap:true, margin:'sm' })),
    ]
  }] : [])
  return {
    type:'flex', altText:'📄 สรุปเอกสาร: '+(fileName||'PDF'),
    contents:{
      type:'bubble', size:'mega',
      header:{
        type:'box', layout:'vertical', paddingAll:'16px', backgroundColor:BRAND.purpleBg,
        contents:[
          { type:'box', layout:'horizontal', contents:[
            { type:'text', text:'📄 สรุปเอกสาร', weight:'bold', size:'md', color:BRAND.purple, flex:1 },
            { type:'text', text:(info.pages||0)+' หน้า', size:'xs', color:BRAND.textMuted, flex:0, align:'end', gravity:'center' },
          ]},
          { type:'text', text:fileName||'PDF', size:'xs', color:BRAND.textMuted, wrap:true, margin:'xs' },
        ]
      },
      body:{
        type:'box', layout:'vertical', paddingAll:'14px', spacing:'md', backgroundColor:BRAND.cardBg,
        contents:[
          ...(info.summary ? [{
            type:'box', layout:'vertical', cornerRadius:'10px', paddingAll:'12px', backgroundColor:BRAND.purpleBg,
            contents:[
              { type:'text', text:'✨ สรุป', size:'xs', weight:'bold', color:BRAND.purple },
              { type:'text', text:info.summary, size:'sm', color:BRAND.textSub, wrap:true, margin:'sm' },
            ]
          }] : []),
          ...section('🏷', 'หัวข้อ', info.topics, BRAND.cyan),
          ...section('📌', 'สิ่งที่ต้องทำ', info.action_items, BRAND.amber),
          ...section('📅', 'กำหนดส่ง', info.deadlines, BRAND.red),
          ...section('👤', 'ผู้รับผิดชอบ', info.responsible, BRAND.pink),
        ]
      },
      styles:{ header:{ separator:false } }
    }
  }
}

// Detected-tasks confirmation card (§7)
function msgPdfTasks(tasks) {
  const rows = tasks.map((t,i)=>{
    const cat = CAT[t.category] || CAT.other
    return {
      type:'box', layout:'horizontal', spacing:'sm', paddingTop: i===0?'2px':'6px',
      contents:[
        { type:'text', text:cat.emoji, size:'sm', flex:0 },
        { type:'text', text:t.title||'งาน', size:'sm', color:BRAND.text, flex:1, wrap:true },
        { type:'text', text:(t.hours||1)+'h', size:'xs', weight:'bold', color:cat.color, flex:0 },
      ]
    }
  })
  return {
    type:'flex', altText:'🤖 AI พบ '+tasks.length+' งานในเอกสาร',
    contents:{
      type:'bubble', size:'mega',
      header:{
        type:'box', layout:'horizontal', paddingAll:'16px', backgroundColor:BRAND.purpleBg,
        contents:[
          { type:'text', text:'🤖 AI พบงานในเอกสาร', weight:'bold', size:'md', color:BRAND.purple, flex:1 },
          { type:'box', layout:'vertical', flex:0, cornerRadius:'20px', paddingAll:'4px', paddingStart:'12px', paddingEnd:'12px', backgroundColor:BRAND.purple,
            contents:[{ type:'text', text:String(tasks.length), size:'sm', weight:'bold', color:BRAND.white }] },
        ]
      },
      body:{ type:'box', layout:'vertical', paddingAll:'14px', backgroundColor:BRAND.cardBg, contents:rows },
      footer:{
        type:'box', layout:'vertical', paddingAll:'12px', spacing:'sm', backgroundColor:BRAND.cardBg,
        contents:[
          { type:'button', style:'primary', height:'sm', color:BRAND.green,
            action:{ type:'postback', label:'✅ สร้างทั้งหมด ('+tasks.length+')', data:'action=pdf_create' } },
          { type:'box', layout:'horizontal', spacing:'sm', contents:[
            btn('✏️ แก้ในแอป', { uri:APP_URL }, '#E8E0FF'),
            btn('❌ ยกเลิก', { postback:'action=pdf_cancel' }, '#E8E0FF'),
          ]},
        ]
      },
      styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
    }
  }
}

// ─────────────────────────────────────────
// INTENT ROUTER (natural language → action)
// ─────────────────────────────────────────
async function routeIntent(uid, intent, token, { project, understood } = {}) {
  switch (intent) {
    case 'today': {
      const logs = await getTodayLogs(uid)
      if (!logs.length) return replyLINE(token,[{type:'text',text:'วันนี้ยังไม่มีงาน 📋\nพิมพ์บอกว่าทำงานอะไรเพื่อบันทึก!'}])
      return replyLINE(token, msgToday(logs, new Date().toISOString().split('T')[0]))
    }
    case 'done_today': {
      const logs = await getDoneToday(uid)
      return replyLINE(token, msgTaskList('✅ งานเสร็จวันนี้', new Date().toLocaleDateString('th-TH'), logs, BRAND.green))
    }
    case 'week': {
      const logs = await getWeekLogs(uid)
      return replyLINE(token, msgTaskList('🗓 งาน 7 วันล่าสุด', null, logs))
    }
    case 'month': {
      const logs = await getMonthLogsFull(uid)
      return replyLINE(token, msgTaskList('📅 งานเดือนนี้', new Date().toLocaleDateString('th-TH',{month:'long',year:'numeric'}), logs))
    }
    case 'recent': {
      const logs = await getRecentLogs(uid, 5)
      return replyLINE(token, msgRecentLogs(logs))
    }
    case 'pending': {
      const logs = await getPendingLogs(uid)
      return replyLINE(token, msgTaskList('📝 งานค้าง (ยังไม่เสร็จ)', null, logs, BRAND.amber))
    }
    case 'projects': {
      const logs = await getMonthLogsFull(uid)
      const projects = aggregateProjects(logs)
      if (!projects.length) return replyLINE(token,[{type:'text',text:'ยังไม่มีโปรเจกต์ในเดือนนี้ 📁'}])
      const rows = projects.slice(0,10).map(p=>({
        type:'box', layout:'horizontal', margin:'sm', contents:[
          { type:'text', text:'📁 '+p.name, size:'sm', color:BRAND.text, flex:1, wrap:true },
          { type:'text', text:p.count+' งาน · '+Math.round(p.hours*10)/10+'h', size:'xs', color:BRAND.textMuted, flex:0, align:'end' },
        ]
      }))
      return replyLINE(token,[{
        type:'flex', altText:'📁 โปรเจกต์ทั้งหมด',
        contents:{ type:'bubble', size:'mega',
          header:{ type:'box', layout:'vertical', paddingAll:'16px', backgroundColor:BRAND.purpleBg,
            contents:[{ type:'text', text:'📁 โปรเจกต์ทั้งหมด', weight:'bold', size:'md', color:BRAND.purple }] },
          body:{ type:'box', layout:'vertical', paddingAll:'14px', backgroundColor:BRAND.cardBg, contents:rows },
          footer:{ type:'box', layout:'vertical', paddingAll:'12px', backgroundColor:BRAND.cardBg,
            contents:[{ type:'button', style:'primary', height:'sm', color:BRAND.purple, action:{ type:'uri', label:'🌐 เปิดในแอป', uri:APP_URL } }] },
          styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
        }
      }])
    }
    case 'project_tasks': {
      const name = project || (understood && understood.project)
      if (!name) return replyLINE(token,[{type:'text',text:'พิมพ์ชื่อโปรเจกต์ที่ต้องการดู เช่น "งานของ Student Care"'}])
      const logs = await getProjectLogs(uid, name)
      return replyLINE(token, msgTaskList('📁 '+name, logs.length+' งานที่เกี่ยวข้อง', logs))
    }
    case 'hours': {
      const logs = await getMonthLogsFull(uid)
      const stats = computeDashboard(logs)
      const byCat = {}
      for (const l of logs) { const c=CAT[l.category]?.label||'อื่นๆ'; byCat[c]=(byCat[c]||0)+(l.hours_spent||0) }
      const lines = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,h])=>`• ${c}: ${Math.round(h*10)/10} ชม.`).join('\n')
      return replyLINE(token,[{type:'text',text:'⏱ เวลาทำงานเดือนนี้\nรวม '+stats.hours+' ชั่วโมง · '+stats.total+' งาน\n\n'+(lines||'ยังไม่มีข้อมูล')}])
    }
    case 'productivity': {
      const logs = await getMonthLogsFull(uid)
      const s = computeDashboard(logs)
      const avg = s.total ? Math.round(s.hours/s.total*10)/10 : 0
      return replyLINE(token,[{type:'text',
        text:'📈 สรุปประสิทธิภาพเดือนนี้\n\n✅ อัตราการทำงานสำเร็จ: '+s.completion+'%\n📋 งานทั้งหมด: '+s.total+' (เสร็จ '+s.done+')\n⏱ ชั่วโมงรวม: '+s.hours+' (เฉลี่ย '+avg+'/งาน)\n📁 โปรเจกต์: '+s.projects}])
    }
    case 'dashboard': {
      const logs = await getMonthLogsFull(uid)
      const stats = computeDashboard(logs)
      const projects = aggregateProjects(logs)
      return replyLINE(token, msgDashboard(stats, projects))
    }
    case 'report': {
      const logs = await getMonthLogsFull(uid)
      const s = computeDashboard(logs)
      return replyLINE(token,[{
        type:'flex', altText:'📈 รายงานเดือนนี้',
        contents:{ type:'bubble', size:'kilo',
          header:{ type:'box', layout:'vertical', paddingAll:'16px', backgroundColor:BRAND.purpleBg,
            contents:[
              { type:'text', text:'📈 รายงานเดือนนี้', weight:'bold', size:'md', color:BRAND.purple },
              { type:'text', text:new Date().toLocaleDateString('th-TH',{month:'long',year:'numeric'}), size:'xs', color:BRAND.textMuted, margin:'xs' },
            ]},
          body:{ type:'box', layout:'vertical', paddingAll:'14px', spacing:'sm', backgroundColor:BRAND.cardBg,
            contents:[
              { type:'text', text:'✅ '+s.done+'/'+s.total+' งานเสร็จ ('+s.completion+'%)', size:'sm', color:BRAND.text },
              { type:'text', text:'⏱ '+s.hours+' ชั่วโมง · 📁 '+s.projects+' โปรเจกต์', size:'sm', color:BRAND.text },
              { type:'text', text:'สร้างรายงานฉบับเต็ม (PDF/PPT) ได้ในแอป', size:'xs', color:BRAND.textMuted, wrap:true, margin:'sm' },
            ]},
          footer:{ type:'box', layout:'vertical', paddingAll:'12px', spacing:'sm', backgroundColor:BRAND.cardBg,
            contents:[
              { type:'box', layout:'horizontal', spacing:'sm', contents:[
                btn('📄 ส่ง PDF', { postback:'action=cmd&cmd=send_pdf' }, BRAND.purple, 'primary'),
                btn('📑 ส่ง PPT', { postback:'action=cmd&cmd=send_ppt' }, '#E8E0FF'),
              ]},
              { type:'button', style:'secondary', height:'sm', color:'#E8E0FF', action:{ type:'uri', label:'🌐 สร้างในแอป', uri:APP_URL } },
            ] },
          styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
        }
      }])
    }
    case 'send_pdf':
    case 'send_ppt': {
      const kind = intent === 'send_ppt' ? 'ppt' : 'pdf'
      // Heavy work runs after the webhook responds; result is pushed when ready.
      after(() => generateAndPushReport(uid, kind, 'th'))
      const label = kind === 'ppt' ? 'PowerPoint' : 'PDF'
      return replyLINE(token, [{ type:'text', text:'⏳ กำลังสร้างรายงาน '+label+' เดือนนี้...\nจะส่งไฟล์ให้ทันทีเมื่อเสร็จครับ 📄' }])
    }
    case 'help':
      return handleCmd(uid, '/help', token)
    default:
      return null
  }
}

// ─────────────────────────────────────────
// COMMANDS
// ─────────────────────────────────────────
async function handleCmd(uid, text, token) {
  const parts=text.trim().split(' ')
  const cmd=parts[0].toLowerCase()
  const arg=parts.slice(1).join(' ')

  if (cmd==='/skip') {
    const s=getSession(uid)
    if (s.state==='awaiting_desc' && s.data.imgUrl) {
      const d={ title:'รูปภาพจาก LINE', desc:'', summary:'', category:'photo', hours:1, tags:['photo'], images:[s.data.imgUrl] }
      const saved=await saveWorklog(uid,d)
      clearSession(uid)
      return replyLINE(token, msgWorklogSaved(d, saved))
    }
    clearSession(uid)
    return replyLINE(token,[{type:'text',text:'ไม่มีรูปค้างอยู่ครับ'}])
  }

  if (cmd==='/today') {
    const today=new Date().toISOString().split('T')[0]
    const logs=await getTodayLogs(uid)
    if (!logs.length) return replyLINE(token,[{type:'text',text:'วันนี้ยังไม่มีงาน 📋\nส่งข้อความหรือรูปเพื่อบันทึกงาน!'}])
    return replyLINE(token, msgToday(logs, today))
  }

  if (cmd==='/logs') {
    const logs=await getRecentLogs(uid,5)
    return replyLINE(token, msgRecentLogs(logs))
  }

  if (cmd==='/summary') {
    const logs=await getMonthLogs(uid)
    const total=logs.length, hours=logs.reduce((s,l)=>s+(l.hours_spent||0),0)
    return replyLINE(token,[{type:'text',text:'📊 เดือนนี้\n✅ '+total+' งาน\n⏱ '+hours+' ชั่วโมง\n\n'+APP_URL}])
  }

  if (cmd==='/edit' && arg) {
    const log=await getWorklog(arg)
    if (!log) return replyLINE(token,[{type:'text',text:'ไม่พบงานนี้'}])
    return replyLINE(token, msgEditMenu(log))
  }

  if (cmd==='/edit-title' && arg) {
    setSession(uid,'editing_title',{id:arg})
    return replyLINE(token,[{type:'text',text:'✏️ พิมพ์ชื่องานใหม่:'}])
  }
  if (cmd==='/edit-desc' && arg) {
    setSession(uid,'editing_desc',{id:arg})
    return replyLINE(token,[{type:'text',text:'📄 พิมพ์รายละเอียดงานใหม่:'}])
  }
  if (cmd==='/edit-hours' && arg) {
    setSession(uid,'editing_hours',{id:arg})
    return replyLINE(token,[{type:'text',text:'⏱ พิมพ์จำนวนชั่วโมง เช่น: 2.5'}])
  }
  if (cmd==='/edit-cat' && arg) {
    setSession(uid,'editing_cat',{id:arg})
    // Quick Reply with category buttons
    return replyLINE(token,[{
      type:'text', text:'📂 เลือกหมวดหมู่:',
      quickReply: qrCategories('/set-cat', arg)
    }])
  }
  if (cmd==='/set-cat') {
    const parts2=arg.split(' '), id=parts2[0], cat=parts2[1]
    if (!CAT[cat]) return replyLINE(token,[{type:'text',text:'หมวดไม่ถูกต้อง'}])
    await updateWorklog(id,{category:cat})
    clearSession(uid)
    return replyLINE(token,[{type:'text',text:'✅ เปลี่ยนหมวดเป็น '+(CAT[cat].emoji)+' '+(CAT[cat].label)+' แล้ว'}])
  }

  if (cmd==='/addimage' && arg) {
    setSession(uid,'adding_img',{id:arg})
    return replyLINE(token,[{type:'text',text:'📸 ส่งรูปที่ต้องการเพิ่ม:'}])
  }

  if (cmd==='/timer') {
    if (arg==='start') {
      await supabase.from('line_timers').upsert({line_user_id:uid,started_at:new Date().toISOString(),active:true})
      return replyLINE(token,[{type:'text',text:'⏱ เริ่มจับเวลาแล้ว!\nส่ง /timer stop เมื่อเสร็จ'}])
    }
    if (arg==='stop') {
      const {data:t2}=await supabase.from('line_timers').select('*').eq('line_user_id',uid).eq('active',true).single()
      if (t2) {
        const min=Math.round((Date.now()-new Date(t2.started_at).getTime())/60000)
        await supabase.from('line_timers').update({active:false}).eq('id',t2.id)
        return replyLINE(token,[{type:'text',text:'⏱ หยุดแล้ว · '+min+' นาที ('+Math.round(min/6)/10+' ชม.)'}])
      }
      return replyLINE(token,[{type:'text',text:'ไม่มี timer ที่ทำงาน'}])
    }
  }

  if (cmd==='/myid' || cmd==='/id') {
    return replyLINE(token,[{ type:'text', text:'🆔 User ID ของคุณ:\n'+uid }])
  }

  if (cmd==='/help') {
    return replyLINE(token,[{
      type:'text',
      text:'🤖 WorkLog AI — ผู้ช่วย AI\n\nพิมพ์เป็นภาษาธรรมชาติได้เลย เช่น:\n• "งานวันนี้" / "งานเสร็จวันนี้"\n• "งานค้าง" / "งานสัปดาห์นี้" / "งานเดือนนี้"\n• "แดชบอร์ด"\n• "งานของ <ชื่อโปรเจกต์>"\n• "เวลาทำงานเดือนนี้" / "สรุปประสิทธิภาพ"\n• "รายงานเดือนนี้" · "ส่ง PDF" · "ส่ง PPT"\n\n📝 พิมพ์อธิบายงานที่ทำ → AI บันทึกให้พร้อมการ์ด\n📸 ส่งรูปผลงาน → AI บันทึกให้\n\nคำสั่งลัด: /today /logs /summary /timer start|stop',
      quickReply:{
        items:[
          { type:'action', action:{ type:'message', label:'📊 แดชบอร์ด', text:'แดชบอร์ด' } },
          { type:'action', action:{ type:'message', label:'📅 งานวันนี้', text:'งานวันนี้' } },
          { type:'action', action:{ type:'message', label:'📝 งานค้าง', text:'งานค้าง' } },
          { type:'action', action:{ type:'message', label:'📋 งานล่าสุด', text:'/logs' } },
        ]
      }
    }])
  }

  return replyLINE(token,[{
    type:'text', text:'ไม่รู้จักคำสั่ง ส่ง /help',
    quickReply:{items:[
      { type:'action', action:{ type:'message', label:'❓ Help', text:'/help' } },
      { type:'action', action:{ type:'message', label:'📊 วันนี้', text:'/today' } },
    ]}
  }])
}

// ─────────────────────────────────────────
// SESSION HANDLER
// ─────────────────────────────────────────
async function handleSession(uid, text, token) {
  const s=getSession(uid)

  if (s.state==='awaiting_desc') {
    clearSession(uid)
    await replyLINE(token,[{type:'text',text:'⏳ AI กำลังวิเคราะห์...'}])
    const analyzed=await analyze(text,text)
    const d={
      title: analyzed.refined_title||text.slice(0,60),
      desc: text, summary:analyzed.summary,
      category:analyzed.category||'graphic', hours:analyzed.hours||1,
      tags:analyzed.tags||[], images:[s.data.imgUrl].filter(Boolean),
    }
    const saved=await saveWorklog(uid,d)
    return replyLINE(token, msgWorklogSaved(d,saved))
  }

  if (s.state==='editing_title') {
    clearSession(uid)
    await updateWorklog(s.data.id,{title:text})
    return replyLINE(token,[{type:'text',text:'✅ เปลี่ยนชื่อเป็น: '+text}])
  }
  if (s.state==='editing_desc') {
    clearSession(uid)
    await updateWorklog(s.data.id,{desc:text})
    return replyLINE(token,[{type:'text',text:'✅ แก้รายละเอียดแล้ว'}])
  }
  if (s.state==='editing_hours') {
    const h=parseFloat(text)||1
    clearSession(uid)
    await updateWorklog(s.data.id,{hours:h})
    return replyLINE(token,[{type:'text',text:'✅ เปลี่ยนเวลาเป็น '+h+' ชม.'}])
  }
  if (s.state==='editing_cat') {
    const cat=text.trim().toLowerCase()
    if (!CAT[cat]) return replyLINE(token,[{
      type:'text', text:'กรุณาเลือกหมวดจากปุ่มด้านล่าง:',
      quickReply: qrCategories('/set-cat', s.data.id)
    }])
    clearSession(uid)
    await updateWorklog(s.data.id,{category:cat})
    return replyLINE(token,[{type:'text',text:'✅ เปลี่ยนหมวดเป็น '+(CAT[cat].emoji)+' '+(CAT[cat].label)}])
  }

  return false
}

// ─────────────────────────────────────────
// MAIN EVENT PROCESSOR
// ─────────────────────────────────────────
async function processEvent(event) {
  const uid   = event.source?.userId||'unknown'
  const token = event.replyToken
  const mtype = event.message?.type

  if (event.type==='follow') {
    await supabase.from('line_users').upsert({line_user_id:uid,followed_at:new Date().toISOString(),active:true}).catch(()=>{})
    return replyLINE(token, msgWelcome())
  }

  // Postback from Flex Card buttons (status change)
  if (event.type === 'postback') {
    const params = new URLSearchParams(event.postback?.data || '')
    const action = params.get('action')
    const logId  = params.get('logId')
    const newStatus = params.get('status')

    if (action === 'status' && logId && newStatus) {
      await updateWorklog(logId, { status: newStatus })
      const updated = await getWorklog(logId)
      if (updated) {
        const d = {
          id: updated.id, title: updated.title,
          aiSummary: updated.ai_summary, category: updated.category,
          hours: updated.hours_spent, status: newStatus,
          tags: updated.tags || [], date: updated.date,
        }
        // Completing from a card is a real completion event.
        return replyLINE(token, msgStatusUpdate(d, newStatus === 'done' ? 'completed' : 'status_change'))
      }
    }

    // 🤖 AI Analyze Task
    if (action === 'analyze' && logId) {
      const log = await getWorklog(logId)
      if (!log) return replyLINE(token,[{type:'text',text:'ไม่พบงานนี้'}])
      const a = await aiAnalyzeTask(log)
      return replyLINE(token, msgAIAnalysis(log, a))
    }

    // Dashboard quick-action buttons → reuse the intent router
    if (action === 'cmd') {
      const cmd = params.get('cmd')
      const res = await routeIntent(uid, cmd, token, {})
      if (res !== null) return res
    }

    // Create all tasks detected from a PDF (§7)
    if (action === 'pdf_create') {
      const s = getSession(uid)
      const tasks = (s.state === 'pdf_tasks' && Array.isArray(s.data.tasks)) ? s.data.tasks : []
      if (!tasks.length) return replyLINE(token,[{type:'text',text:'เซสชันหมดอายุ ⏳ กรุณาส่งไฟล์ PDF อีกครั้งครับ'}])
      let created = 0
      for (const t of tasks) {
        const saved = await saveWorklog(uid, {
          title: t.title || 'งานจากเอกสาร', desc: '', summary: t.title || '',
          category: t.category || 'other', hours: t.hours || 1,
          tags: ['PDF'], status: 'draft', source: 'line-pdf',
        })
        if (saved) created++
      }
      clearSession(uid)
      return replyLINE(token,[{
        type:'text',
        text:'✅ สร้าง '+created+' งานจากเอกสารแล้ว (สถานะ: ร่าง)\nเปิดแก้ไขรายละเอียดได้ในแอป',
        quickReply:{items:[
          { type:'action', action:{ type:'message', label:'📝 งานค้าง', text:'งานค้าง' } },
          { type:'action', action:{ type:'uri', label:'🌐 เปิดแอป', uri:APP_URL } },
        ]}
      }])
    }
    if (action === 'pdf_cancel') {
      clearSession(uid)
      return replyLINE(token,[{type:'text',text:'ยกเลิกแล้ว ไม่ได้สร้างงานจากเอกสาร ❌'}])
    }

    // AI Inbox confirmation (§10)
    if (action === 'inbox_create') {
      const s = getSession(uid)
      if (s.state !== 'inbox_confirm' || !s.data.analysis) return replyLINE(token,[{type:'text',text:'เซสชันหมดอายุ ⏳ ส่งรูปอีกครั้งครับ'}])
      const a = s.data.analysis
      const tags = [...(a.tags || [])]
      const itype = INBOX_TYPES[a.inbox_type]
      if (itype && a.inbox_type !== 'other') tags.push(itype.label)
      if (a.priority === 'high') tags.push('ด่วน')
      const d = {
        title: a.title || 'งานจากรูป', desc: a.extracted_text || '', summary: a.summary || '',
        category: a.category || 'photo', hours: a.hours || 1,
        tags, images: [s.data.imgUrl].filter(Boolean), status: 'draft', source: 'line-inbox',
      }
      const saved = await saveWorklog(uid, d)
      clearSession(uid)
      return replyLINE(token, msgCompactCreated(d, saved))
    }
    if (action === 'inbox_describe') {
      const s = getSession(uid)
      const imgUrl = s.data?.imgUrl || null
      setSession(uid, 'awaiting_desc', { imgUrl })
      return replyLINE(token,[{type:'text',text:'✏️ พิมพ์รายละเอียดงานในรูปนี้ได้เลยครับ'}])
    }
    if (action === 'inbox_skip') {
      clearSession(uid)
      return replyLINE(token,[{type:'text',text:'ข้ามแล้ว — รูปถูกเก็บไว้ในคลังภาพแล้ว ✅'}])
    }
    return
  }

  if (event.type!=='message') return

  // TEXT
if (mtype==='text') {
  const text=(event.message.text||'').trim()
  if (!text) return
  if (text.startsWith('/')) return handleCmd(uid,text,token)
  const s=getSession(uid)
  if (s.state!=='idle') {
    const handled=await handleSession(uid,text,token)
    if (handled!==false) return
  }

  // AI Command Center: understand the message (intent) in a single AI call.
  const understood = await understand(text)

  // Queries / commands → answer, never create a task (no notification spam).
  if (understood.intent && understood.intent !== 'create_task' && understood.intent !== 'unknown') {
    const routed = await routeIntent(uid, understood.intent, token, { project: understood.project, understood })
    if (routed !== null) return routed
  }

  // Otherwise treat as a work description and capture it (one compact card).
  const t = understood.task || {}
  const d = {
    title:    t.title || text.slice(0,60),
    desc:     text,
    summary:  t.summary || '',
    category: t.category || 'other',
    hours:    t.hours || 1,
    tags:     Array.isArray(t.tags) ? t.tags : [],
    images:   [],
  }
  // Fall back to a dedicated analysis if the combined call gave no task fields.
  if (!t.title || !t.summary) {
    const analyzed = await analyze(text, text)
    d.title = t.title || analyzed.refined_title || text.slice(0,60)
    d.summary = t.summary || analyzed.summary
    d.category = t.category || analyzed.category || 'other'
    d.hours = t.hours || analyzed.hours || 1
    d.tags = (Array.isArray(t.tags) && t.tags.length) ? t.tags : (analyzed.tags || [])
  }
  // Scheduling: a "todo" becomes an open task (so reminders pick it up); a "done"
  // stays as a completed log. Resolve any date/time the AI extracted.
  const isTodo = t.status === 'todo'
  const taskDate = t.date || bkkToday()
  d.date = taskDate
  d.status = isTodo ? 'draft' : 'done'
  if (t.start) d.start_at = bkkISO(taskDate, t.start)
  if (t.end)   d.end_at   = bkkISO(taskDate, t.end)
  if (t.due)   d.due_date = t.due
  if (['low','medium','high'].includes(t.priority)) d.priority = t.priority
  const saved = await saveWorklog(uid, d)
  return replyLINE(token, msgCompactCreated(d, saved))
}

  // IMAGE
  if (mtype==='image') {
    const s=getSession(uid)
    // Adding image to existing worklog
    if (s.state==='adding_img' && s.data.id) {
      const buf=await getContent(event.message.id)
      const url=buf?await uploadImg(buf,event.message.id):null
      if (url) {
        const log=await getWorklog(s.data.id)
        const imgs=[...(log?.image_urls||[]),url]
        await updateWorklog(s.data.id,{images:imgs})
        clearSession(uid)
        return replyLINE(token,[{type:'text',text:'📸 เพิ่มรูปแล้ว ✅ ('+imgs.length+' รูปทั้งหมด)'}])
      }
      clearSession(uid)
      return replyLINE(token,[{type:'text',text:'⚠️ อัปโหลดรูปไม่สำเร็จ'}])
    }
    // New image → AI Inbox: understand it with Claude vision (§10)
    const buf=await getContent(event.message.id)
    const imgUrl=buf?await uploadImg(buf,event.message.id):null
    // Vision has request-size limits; very large images fall back to manual entry.
    const analysis = (buf && buf.length <= 4_500_000)
      ? await analyzeImageInbox(buf.toString('base64'))
      : null
    if (analysis) {
      setSession(uid,'inbox_confirm',{ analysis, imgUrl })
      return replyLINE(token, msgInboxCard(analysis, imgUrl))
    }
    // Fallback: vision unavailable/too large → ask for a description.
    setSession(uid,'awaiting_desc',{imgUrl})
    return replyLINE(token, msgImageReceived(imgUrl||'https://via.placeholder.com/800x400/6C63FF/FFFFFF?text=WorkLog+AI'))
  }

  if (mtype==='video') return replyLINE(token,[{type:'text',text:'🎬 รับวิดีโอแล้ว ✅\nพิมพ์อธิบายงานในวิดีโอนี้เพื่อบันทึก'}])
  if (mtype==='audio') return replyLINE(token,[{type:'text',text:'🎤 รับข้อความเสียงแล้ว ✅\nตอนนี้ยังไม่รองรับการถอดเสียงอัตโนมัติ — พิมพ์อธิบายงานเพื่อบันทึกได้เลยครับ'}])
  if (mtype==='file') {
    const fileName = event.message.fileName || 'ไฟล์'
    // Only PDFs get the intelligence pipeline; other files are acknowledged.
    if (!/\.pdf$/i.test(fileName)) {
      return replyLINE(token,[{type:'text',text:'📎 รับไฟล์ "'+fileName+'" แล้ว ✅\nรองรับการวิเคราะห์เฉพาะไฟล์ PDF ในตอนนี้ — พิมพ์อธิบายงานในไฟล์นี้เพื่อบันทึกได้ครับ'}])
    }
    const buf = await getContent(event.message.id)
    if (!buf) return replyLINE(token,[{type:'text',text:'⚠️ ดาวน์โหลดไฟล์ไม่สำเร็จ ลองส่งใหม่อีกครั้งครับ'}])

    const { text, pages, ok, err } = await extractPdfText(buf)
    // Extraction threw → reported (reason is logged server-side).
    if (!ok) {
      console.error('[PDF] extract failed:', err)
      return replyLINE(token,[{type:'text',text:'⚠️ อ่านไฟล์ PDF ไม่สำเร็จครับ\nลองส่งใหม่ หรือพิมพ์อธิบายงานในเอกสารนี้เพื่อบันทึกแทนได้ครับ'}])
    }
    // Parsed OK but little/no text → genuinely a scanned/image PDF.
    if (text.replace(/\s/g,'').length < 40) {
      return replyLINE(token,[{type:'text',text:'📄 รับ "'+fileName+'" ('+(pages||'?')+' หน้า) แล้ว\nแต่ในไฟล์ไม่มีชั้นข้อความ — น่าจะเป็น PDF สแกน/รูปภาพ ซึ่งยังไม่รองรับ OCR\nพิมพ์อธิบายงานในเอกสารนี้เพื่อบันทึกแทนได้ครับ'}])
    }

    const info = await analyzePdf(text, pages)
    info.pages = pages // carry the real page count to the summary card
    const messages = [msgPdfSummary(fileName, info)]
    if (info.tasks.length) {
      setSession(uid, 'pdf_tasks', { tasks: info.tasks, fileName })
      messages.push(msgPdfTasks(info.tasks))
    } else {
      messages.push({ type:'text', text:'ℹ️ ไม่พบงานที่ชัดเจนให้สร้างจากเอกสารนี้' })
    }
    return replyLINE(token, messages)
  }
}

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────
// ─────────────────────────────────────────
// PUT — Push Flex Card จาก WorkLog App
// WorkLog App เรียก: PUT /api/line/webhook
// body: { userId, log, trigger }
// ─────────────────────────────────────────
export async function PUT(request) {
  try {
    const { userId, log, trigger } = await request.json()
    if (!userId || !log) return NextResponse.json({ error:'Missing userId or log' }, { status:400 })
    const messages = msgStatusUpdate(log, trigger || 'save')
    const ok = await pushLINE(userId, messages)
    return NextResponse.json({ ok })
  } catch(e) {
    console.error('[PUSH-ROUTE]', e)
    return NextResponse.json({ error: e.message }, { status:500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status:'WorkLog AI LINE Bot v3 ✅',
    time:new Date().toISOString(),
    env:{
      LINE_TOKEN:LINE_TOKEN?'✅':'❌',
      ANTHROPIC:ANTHROPIC_KEY?'✅':'❌',
      SUPABASE:SUPABASE_URL?'✅':'❌',
    }
  })
}

export async function POST(request) {
  const t0=Date.now()
  try {
    const raw=await request.text()
    const sig=request.headers.get('x-line-signature')||''
    if (!verifySig(raw,sig)) return NextResponse.json({error:'Invalid signature'},{status:401})
    let payload
    try { payload=JSON.parse(raw) } catch { return NextResponse.json({error:'Bad JSON'},{status:400}) }
    const events=payload.events||[]
    if (!events.length) return NextResponse.json({ok:true,processed:0})
    await Promise.all(events.map(e=>processEvent(e).catch(err=>console.error('[EVENT]',err))))
    console.log('[WEBHOOK] done',Date.now()-t0+'ms')
    return NextResponse.json({ok:true,processed:events.length,ms:Date.now()-t0})
  } catch(e) {
    console.error('[FATAL]',e)
    return NextResponse.json({error:'Internal error'},{status:500})
  }
}
