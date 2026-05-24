// app/api/line/webhook/route.js — WorkLog AI LINE Bot v3
// Premium Flex Cards + Quick Reply + Postback Actions

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
    const {data,error}=await supabase.from('work_logs').insert({
      line_user_id:uid, title:d.title||'งานจาก LINE', description:d.desc||'',
      ai_summary:d.summary||'', category:d.category||'other', hours_spent:d.hours||1,
      status:'done', tags:d.tags||[], date:new Date().toISOString().split('T')[0],
      image_urls:d.images||[], source:'line',
    }).select()
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
async function callAI(prompt) {
  if (!ANTHROPIC_KEY) return ''
  const ctrl=new AbortController(), t=setTimeout(()=>ctrl.abort(),10000)
  try {
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:500,messages:[{role:'user',content:prompt}]}),
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
              { type:'button', style:'secondary', height:'sm', flex:1, color:'#E8E0FF',
                action:{ type:'message', label:'✏️', text:'/edit '+log.id } },
              { type:'button', style:'primary', height:'sm', flex:2, color:cat.color,
                action:{ type:'uri', label:'ดูใน App', uri:APP_URL } },
            ]
          },
          styles:{ footer:{ separator:true, separatorColor:'#E8E0FF' } }
        }
      })
    }
  }]
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

  if (cmd==='/help') {
    return replyLINE(token,[{
      type:'text',
      text:'🤖 WorkLog AI Commands\n\n/today — งานวันนี้ (Flex Card)\n/logs — งานล่าสุด\n/summary — สรุปเดือนนี้\n/edit <id> — แก้ไขงาน\n/addimage <id> — เพิ่มรูป\n/timer start/stop\n\n💡 พิมพ์บอกว่าทำงานอะไร หรือส่งรูป AI บันทึกให้เลย!',
      quickReply:{
        items:[
          { type:'action', action:{ type:'message', label:'📊 วันนี้', text:'/today' } },
          { type:'action', action:{ type:'message', label:'📋 งานล่าสุด', text:'/logs' } },
          { type:'action', action:{ type:'message', label:'📈 สรุปเดือน', text:'/summary' } },
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
    return replyLINE(token,[{
      type:'text',
      text:'👋 ยินดีต้อนรับสู่ WorkLog AI! 🎉\n\n💡 วิธีใช้:\n• พิมพ์บอกว่าทำงานอะไร\n• ส่งรูปผลงาน → AI บันทึกให้เลย\n\nส่ง /help เพื่อดูคำสั่งทั้งหมด',
      quickReply:{items:[
        { type:'action', action:{ type:'message', label:'❓ Help', text:'/help' } },
        { type:'action', action:{ type:'message', label:'📊 วันนี้', text:'/today' } },
      ]}
    }])
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

  // ✅ วิเคราะห์ก่อน แล้ว reply ครั้งเดียว
  const analyzed = await analyze(text, text)
  const d = {
    title:    analyzed.refined_title || text.slice(0,60),
    desc:     text,
    summary:  analyzed.summary,
    category: analyzed.category || 'other',
    hours:    analyzed.hours || 1,
    tags:     analyzed.tags || [],
    images:   [],
  }
  const saved = await saveWorklog(uid, d)
  return replyLINE(token, msgWorklogSaved(d, saved))
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
    // New image → ask for description
    const buf=await getContent(event.message.id)
    const imgUrl=buf?await uploadImg(buf,event.message.id):null
    setSession(uid,'awaiting_desc',{imgUrl})
    return replyLINE(token, msgImageReceived(imgUrl||'https://via.placeholder.com/800x400/6C63FF/FFFFFF?text=WorkLog+AI'))
  }

  if (mtype==='video') return replyLINE(token,[{type:'text',text:'🎬 รับวิดีโอแล้ว ✅\nพิมพ์อธิบายงานในวิดีโอนี้เพื่อบันทึก'}])
  if (mtype==='audio') return replyLINE(token,[{type:'text',text:'🎤 รับเสียงแล้ว!\nพิมพ์บอกว่าทำงานอะไร 📝'}])
  if (mtype==='file') return replyLINE(token,[{type:'text',text:'📎 รับไฟล์ "+(event.message.fileName||"ไฟล์")+" แล้ว ✅'}])
}

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────
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
