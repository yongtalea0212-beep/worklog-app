"use client"
import { useState } from 'react'

const CATS = [
  { id:'graphic',   label:'Graphic Design', color:'#6C63FF' },
  { id:'video',     label:'Video Editing',  color:'#06B6D4' },
  { id:'photo',     label:'Photography',    color:'#F59E0B' },
  { id:'marketing', label:'Marketing',      color:'#EF4444' },
  { id:'ai',        label:'AI Content',     color:'#8B5CF6' },
  { id:'branding',  label:'Branding',       color:'#EC4899' },
  { id:'pos',       label:'POS Design',     color:'#10B981' },
  { id:'other',     label:'อื่นๆ',          color:'#64748B' },
]
const getCat = id => CATS.find(c => c.id === id) || CATS[7]

const THEMES = [
  { id:'purple', name:'Purple Glass',  bg:'1E1B4B', accent:'A78BFA', dark:true  },
  { id:'dark',   name:'Dark Premium',  bg:'0F172A', accent:'818CF8', dark:true  },
  { id:'ocean',  name:'Ocean Depth',   bg:'0C4A6E', accent:'38BDF8', dark:true  },
  { id:'forest', name:'Forest',        bg:'14532D', accent:'4ADE80', dark:true  },
  { id:'white',  name:'Clean White',   bg:'FFFFFF', accent:'6C63FF', dark:false },
  { id:'slate',  name:'Slate Pro',     bg:'1E293B', accent:'94A3B8', dark:true  },
]

async function callAI(prompt) {
  try {
    const res = await fetch('/api/claude', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt }),
    })
    const d = await res.json()
    return d.text || ''
  } catch { return '' }
}

// ── Slide Canvas ──
function SlideCanvas({ slide, theme, index, total }) {
  if (!slide) return null
  const isDark = theme.dark
  const bg     = '#' + theme.bg
  const accent = '#' + theme.accent
  const text   = isDark ? '#F1F5F9' : '#1E293B'
  const text2  = isDark ? 'rgba(241,245,249,0.6)' : '#64748B'
  const text3  = isDark ? 'rgba(241,245,249,0.3)' : '#94A3B8'
  const card   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'
  const cardBd = isDark ? 'rgba(255,255,255,0.1)'  : 'rgba(255,255,255,0.95)'

  const wrap = {
    width:'100%', height:'100%', background:bg,
    position:'relative', overflow:'hidden', fontFamily:'Inter,sans-serif',
  }
  const Orbs = () => <>
    <div style={{ position:'absolute', top:-50,right:-50,width:200,height:200,borderRadius:'50%',background:`radial-gradient(circle,${accent}22,transparent)`,pointerEvents:'none' }}/>
    <div style={{ position:'absolute', bottom:-30,left:-30,width:140,height:140,borderRadius:'50%',background:`radial-gradient(circle,${accent}18,transparent)`,pointerEvents:'none' }}/>
  </>
  const Pager = () => <div style={{ position:'absolute',bottom:12,right:18,fontSize:10,color:text3,fontWeight:500 }}>{index+1}/{total}</div>

  if (slide.type === 'cover') return (
    <div style={wrap}><Orbs/>
      <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'40px',zIndex:1 }}>
        <div style={{ fontSize:9,fontWeight:800,color:accent,letterSpacing:3,marginBottom:14,opacity:.9 }}>WORKLOG AI</div>
        <div style={{ fontSize:28,fontWeight:800,color:text,lineHeight:1.2,marginBottom:12,letterSpacing:-1 }}>{slide.title}</div>
        <div style={{ fontSize:12,color:text2,maxWidth:360,lineHeight:1.75,marginBottom:24 }}>{slide.subtitle}</div>
        <div style={{ display:'flex',gap:12 }}>
          {(slide.stats||[]).map((s,i)=>(
            <div key={i} style={{ background:card,backdropFilter:'blur(12px)',border:`1px solid ${cardBd}`,borderRadius:12,padding:'12px 18px',textAlign:'center' }}>
              <div style={{ fontSize:24,fontWeight:800,color:accent,lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:10,color:text3,marginTop:3,letterSpacing:.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <Pager/>
    </div>
  )

  if (slide.type === 'content') return (
    <div style={wrap}><Orbs/>
      <div style={{ position:'relative',zIndex:1,padding:'32px 40px',height:'100%',boxSizing:'border-box',display:'flex',flexDirection:'column',justifyContent:'center' }}>
        <div style={{ fontSize:9,fontWeight:800,color:accent,letterSpacing:2.5,marginBottom:8,opacity:.85 }}>{slide.eyebrow||'CONTENT'}</div>
        <div style={{ fontSize:20,fontWeight:800,color:text,marginBottom:6,letterSpacing:-.5,lineHeight:1.2 }}>{slide.title}</div>
        {slide.subtitle&&<div style={{ fontSize:11,color:text2,marginBottom:14,lineHeight:1.6 }}>{slide.subtitle}</div>}
        <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
          {(slide.points||[]).map((p,i)=>(
            <div key={i} style={{ display:'flex',gap:10,alignItems:'flex-start',background:card,backdropFilter:'blur(8px)',border:`1px solid ${cardBd}`,borderRadius:10,padding:'9px 12px' }}>
              <div style={{ width:20,height:20,borderRadius:6,background:`${accent}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1 }}>
                <div style={{ width:5,height:5,borderRadius:'50%',background:accent }}/>
              </div>
              <div style={{ fontSize:11,color:text,lineHeight:1.55 }}>{p}</div>
            </div>
          ))}
        </div>
      </div>
      <Pager/>
    </div>
  )

  if (slide.type === 'stats') return (
    <div style={wrap}><Orbs/>
      <div style={{ position:'relative',zIndex:1,padding:'32px 40px',height:'100%',boxSizing:'border-box',display:'flex',flexDirection:'column',justifyContent:'center' }}>
        <div style={{ fontSize:9,fontWeight:800,color:accent,letterSpacing:2.5,marginBottom:8,opacity:.85 }}>KPI OVERVIEW</div>
        <div style={{ fontSize:20,fontWeight:800,color:text,marginBottom:18,letterSpacing:-.5 }}>{slide.title}</div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
          {(slide.stats||[]).slice(0,6).map((s,i)=>(
            <div key={i} style={{ background:card,backdropFilter:'blur(12px)',border:`1px solid ${cardBd}`,borderRadius:12,padding:'14px 10px',textAlign:'center' }}>
              <div style={{ fontSize:9,color:text3,marginBottom:5,fontWeight:700,letterSpacing:.8,textTransform:'uppercase' }}>{s.label}</div>
              <div style={{ fontSize:26,fontWeight:800,color:s.color?'#'+s.color:accent,lineHeight:1 }}>{s.value}</div>
              {s.sub&&<div style={{ fontSize:9,color:text3,marginTop:4 }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>
      <Pager/>
    </div>
  )

  if (slide.type === 'chart') return (
    <div style={wrap}><Orbs/>
      <div style={{ position:'relative',zIndex:1,padding:'32px 40px',height:'100%',boxSizing:'border-box',display:'flex',flexDirection:'column',justifyContent:'center' }}>
        <div style={{ fontSize:9,fontWeight:800,color:accent,letterSpacing:2.5,marginBottom:8,opacity:.85 }}>ANALYTICS</div>
        <div style={{ fontSize:20,fontWeight:800,color:text,marginBottom:18,letterSpacing:-.5 }}>{slide.title}</div>
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {(slide.bars||[]).slice(0,6).map((b,i)=>{
            const max = Math.max(...(slide.bars||[]).map(x=>x.value),1)
            const pct = Math.min(Math.round((b.value/max)*100),100)
            return (
              <div key={i}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                  <span style={{ fontSize:11,color:text,fontWeight:500 }}>{b.label}</span>
                  <span style={{ fontSize:11,color:accent,fontWeight:700 }}>{b.value}{b.unit||''}</span>
                </div>
                <div style={{ height:6,background:`${accent}18`,borderRadius:3,overflow:'hidden' }}>
                  <div style={{ height:'100%',width:pct+'%',background:`linear-gradient(90deg,${accent},${accent}aa)`,borderRadius:3 }}/>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <Pager/>
    </div>
  )

  if (slide.type === 'timeline') return (
    <div style={wrap}><Orbs/>
      <div style={{ position:'relative',zIndex:1,padding:'30px 38px',height:'100%',boxSizing:'border-box',display:'flex',flexDirection:'column',justifyContent:'center' }}>
        <div style={{ fontSize:9,fontWeight:800,color:accent,letterSpacing:2.5,marginBottom:8,opacity:.85 }}>TIMELINE</div>
        <div style={{ fontSize:20,fontWeight:800,color:text,marginBottom:16,letterSpacing:-.5 }}>{slide.title}</div>
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {(slide.events||[]).slice(0,5).map((e,i)=>(
            <div key={i} style={{ display:'flex',gap:12,alignItems:'flex-start' }}>
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0 }}>
                <div style={{ width:24,height:24,borderRadius:'50%',background:`${accent}22`,border:`2px solid ${accent}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:accent }}>{i+1}</div>
                {i<(slide.events||[]).length-1&&<div style={{ width:2,height:16,background:`${accent}30`,marginTop:2 }}/>}
              </div>
              <div style={{ background:card,backdropFilter:'blur(8px)',border:`1px solid ${cardBd}`,borderRadius:9,padding:'8px 12px',flex:1 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <span style={{ fontSize:11,fontWeight:700,color:text }}>{e.title}</span>
                  {e.date&&<span style={{ fontSize:9,color:accent,fontWeight:600 }}>{e.date}</span>}
                </div>
                {e.desc&&<div style={{ fontSize:10,color:text2,marginTop:2,lineHeight:1.5 }}>{e.desc}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Pager/>
    </div>
  )

  if (slide.type === 'two_col') return (
    <div style={wrap}><Orbs/>
      <div style={{ position:'relative',zIndex:1,padding:'30px 36px',height:'100%',boxSizing:'border-box',display:'flex',flexDirection:'column',justifyContent:'center' }}>
        <div style={{ fontSize:9,fontWeight:800,color:accent,letterSpacing:2.5,marginBottom:8,opacity:.85 }}>{slide.eyebrow||'OVERVIEW'}</div>
        <div style={{ fontSize:20,fontWeight:800,color:text,marginBottom:14,letterSpacing:-.5 }}>{slide.title}</div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          {(slide.cols||[]).slice(0,2).map((col,i)=>(
            <div key={i} style={{ background:card,backdropFilter:'blur(12px)',border:`1px solid ${cardBd}`,borderRadius:12,padding:'14px' }}>
              <div style={{ fontSize:10,fontWeight:800,color:accent,letterSpacing:.8,marginBottom:8 }}>{col.heading}</div>
              {(col.points||[]).slice(0,5).map((p,j)=>(
                <div key={j} style={{ display:'flex',gap:7,marginBottom:6,alignItems:'flex-start' }}>
                  <div style={{ width:4,height:4,borderRadius:'50%',background:accent,marginTop:5,flexShrink:0 }}/>
                  <div style={{ fontSize:10,color:text,lineHeight:1.5 }}>{p}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <Pager/>
    </div>
  )

  if (slide.type === 'gallery') return (
    <div style={wrap}><Orbs/>
      <div style={{ position:'relative',zIndex:1,padding:'28px 36px',height:'100%',boxSizing:'border-box',display:'flex',flexDirection:'column' }}>
        <div style={{ fontSize:9,fontWeight:800,color:accent,letterSpacing:2.5,marginBottom:6,opacity:.85 }}>GALLERY</div>
        <div style={{ fontSize:20,fontWeight:800,color:text,marginBottom:12,letterSpacing:-.4 }}>{slide.title}</div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,flex:1 }}>
          {Array.from({length:6}).map((_,i)=>{
            const url=(slide.images||[])[i]
            return (
              <div key={i} style={{ borderRadius:9,overflow:'hidden',background:`${accent}12`,border:`1px solid ${cardBd}`,aspectRatio:'4/3' }}>
                {url?<img src={url} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} loading="lazy"/>:<div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:text3 }}>🖼️</div>}
              </div>
            )
          })}
        </div>
      </div>
      <Pager/>
    </div>
  )

  if (slide.type === 'summary') return (
    <div style={wrap}><Orbs/>
      <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'40px 48px',zIndex:1 }}>
        <div style={{ fontSize:9,fontWeight:800,color:accent,letterSpacing:3,marginBottom:14,opacity:.9 }}>SUMMARY</div>
        <div style={{ fontSize:24,fontWeight:800,color:text,lineHeight:1.2,marginBottom:12,letterSpacing:-1 }}>{slide.title}</div>
        {slide.body&&<div style={{ fontSize:12,color:text2,lineHeight:1.85,maxWidth:400,marginBottom:20 }}>{slide.body}</div>}
        <div style={{ display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center' }}>
          {(slide.badges||[]).map((b,i)=>(
            <div key={i} style={{ background:`${accent}18`,border:`1px solid ${accent}30`,color:accent,fontSize:11,fontWeight:700,padding:'6px 14px',borderRadius:20 }}>{b}</div>
          ))}
        </div>
      </div>
      <Pager/>
    </div>
  )

  // default
  return (
    <div style={{...wrap,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <Orbs/>
      <div style={{ textAlign:'center',position:'relative',zIndex:1,padding:28 }}>
        <div style={{ fontSize:20,fontWeight:800,color:text,marginBottom:8 }}>{slide.title}</div>
        <div style={{ fontSize:12,color:text2 }}>{slide.subtitle||slide.body||''}</div>
      </div>
      <Pager/>
    </div>
  )
}

// ── Thumbnail ──
function Thumb({ slide, theme, index, active, onClick }) {
  return (
    <div onClick={onClick} style={{ borderRadius:10,overflow:'hidden',cursor:'pointer',border:'2px solid '+(active?'#6C63FF':'transparent'),marginBottom:8,boxShadow:'0 2px 8px rgba(100,110,200,0.1)',transition:'all .18s' }}>
      <div style={{ aspectRatio:'16/9',position:'relative',overflow:'hidden',background:'#'+theme.bg,borderRadius:8 }}>
        <div style={{ transform:'scale(0.22)',transformOrigin:'top left',width:'454%',height:'454%',pointerEvents:'none' }}>
          <SlideCanvas slide={slide} theme={theme} index={index} total={10}/>
        </div>
      </div>
      <div style={{ padding:'5px 8px',background:'rgba(255,255,255,0.65)' }}>
        <div style={{ fontSize:10,fontWeight:600,color:'#1a1a2e',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{slide.title||'Slide '+(index+1)}</div>
        <div style={{ fontSize:9,color:'#9ca3af' }}>#{index+1} {slide.type}</div>
      </div>
    </div>
  )
}

// ── AI generate 10 slides ──
async function buildSlides(logs, customPrompt) {
  const total = logs.length
  const hours = logs.reduce((s,l)=>s+(l.hours||0),0)
  const done  = logs.filter(l=>l.status==='done').length
  const pct   = total>0?Math.round(done/total*100):0
  const avgH  = total>0?Math.round(hours/total*10)/10:0
  const wdays = new Set(logs.map(l=>l.date)).size
  const byCat = logs.reduce((a,l)=>{ a[l.category]=(a[l.category]||0)+1; return a },{})
  const tops  = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,4)
  const imgs  = logs.flatMap(l=>l.imageUrls||l.image_urls||[])
  const names = logs.slice(0,6).map(l=>l.title||'').filter(Boolean).join(', ')
  const sums  = logs.slice(0,3).map(l=>l.aiSummary||l.ai_summary||'').filter(Boolean).join(' ')

  const instruction = customPrompt
    ? 'สร้าง presentation 10 slides ตามคำสั่ง: ' + customPrompt
    : 'สร้าง presentation 10 slides สำหรับ monthly work report ภาษาไทย'

  const prompt = [
    instruction,
    '',
    'ข้อมูล: งาน='+total+' ชั่วโมง='+hours+' เสร็จ='+pct+'% เฉลี่ย='+avgH+'h/งาน วันทำงาน='+wdays,
    'หมวด: '+tops.map(([id,n])=>getCat(id).label+'('+n+')').join(','),
    'งาน: '+names,
    sums?'summary: '+sums:'',
    '',
    'Rules:',
    '1. ต้องมีครบ 10 slides',
    '2. ใช้ types ผสมกัน: cover,content,stats,chart,timeline,two_col,gallery,summary',
    '3. เนื้อหาภาษาไทยจริง ไม่ใช่ placeholder',
    '4. stats[].color = hex string ไม่มี # (เช่น "6C63FF")',
    '',
    'Schema:',
    'cover:    {type,title,subtitle,stats:[{value,label}]}',
    'content:  {type,eyebrow,title,subtitle,points:[str]}',
    'stats:    {type,title,stats:[{label,value,color,sub}]}',
    'chart:    {type,title,bars:[{label,value,unit}]}',
    'timeline: {type,title,events:[{title,desc,date}]}',
    'two_col:  {type,eyebrow,title,cols:[{heading,points:[str]}]}',
    'gallery:  {type,title,images:[]}',
    'summary:  {type,title,body,badges:[str]}',
    '',
    'ตอบ JSON array เท่านั้น ห้าม markdown',
  ].join('\n')

  try {
    const text  = await callAI(prompt)
    const clean = text.replace(/```json|```/g,'').trim()
    const si = clean.indexOf('['), ei = clean.lastIndexOf(']')
    if (si===-1||ei===-1) throw new Error('no array')
    const arr = JSON.parse(clean.slice(si,ei+1))
    const gal = arr.find(s=>s.type==='gallery')
    if (gal && imgs.length>0) gal.images = imgs.slice(0,6)
    return arr.slice(0,10)
  } catch {
    return fallbackSlides(total,hours,done,pct,avgH,wdays,tops,logs,imgs)
  }
}

function fallbackSlides(total,hours,done,pct,avgH,wdays,tops,logs,imgs) {
  const byCat = logs.reduce((a,l)=>{ a[l.category]=(a[l.category]||0)+1; return a },{})
  return [
    { type:'cover', title:'Monthly Report พฤษภาคม 2568', subtitle:'สรุปผลงานและความสำเร็จประจำเดือน', stats:[{value:total,label:'งาน'},{value:hours+'h',label:'ชั่วโมง'},{value:pct+'%',label:'สำเร็จ'}] },
    { type:'stats', title:'KPI Dashboard', stats:[{label:'งานทั้งหมด',value:total,color:'6C63FF'},{label:'ชั่วโมงรวม',value:hours,color:'06B6D4'},{label:'เสร็จแล้ว',value:pct+'%',color:'10B981'},{label:'เฉลี่ย/งาน',value:avgH+'h',color:'F59E0B'},{label:'วันทำงาน',value:wdays,color:'EC4899'},{label:'Top Category',value:tops[0]?getCat(tops[0][0]).label:'—',color:'8B5CF6'}] },
    { type:'content', eyebrow:'HIGHLIGHTS', title:'ผลงานเด่นประจำเดือน', subtitle:'งานที่สร้างผลกระทบสูงสุด', points:logs.slice(0,5).map(l=>l.title||'งาน') },
    { type:'chart', title:'ชั่วโมงตามหมวดหมู่', bars:tops.map(([id])=>({ label:getCat(id).label, value:logs.filter(l=>l.category===id).reduce((s,l)=>s+(l.hours||0),0), unit:'ชม.' })) },
    { type:'timeline', title:'Work Timeline', events:logs.slice(0,5).map(l=>({ title:l.title||'งาน', desc:getCat(l.category).label, date:l.date })) },
    { type:'two_col', eyebrow:'BREAKDOWN', title:'สรุปตามประเภทงาน', cols:[{heading:'Creative & Design',points:logs.filter(l=>['graphic','branding','pos'].includes(l.category)).slice(0,4).map(l=>l.title||'')},{heading:'Content & Media',points:logs.filter(l=>['video','photo','marketing','ai'].includes(l.category)).slice(0,4).map(l=>l.title||'')}] },
    { type:'gallery', title:'Gallery Showcase', images:imgs },
    { type:'content', eyebrow:'INSIGHTS', title:'Key Learnings', subtitle:'สิ่งที่เรียนรู้จากการทำงาน', points:['พัฒนาทักษะการออกแบบและ workflow','บริหารเวลาได้มีประสิทธิภาพสูงขึ้น','สร้างผลงานคุณภาพสูงตามความต้องการลูกค้า','ทำงานร่วมกับทีมได้ราบรื่น'] },
    { type:'chart', title:'Weekly Progress', bars:[{label:'สัปดาห์ 1',value:Math.round(hours*0.22*10)/10,unit:'h'},{label:'สัปดาห์ 2',value:Math.round(hours*0.28*10)/10,unit:'h'},{label:'สัปดาห์ 3',value:Math.round(hours*0.26*10)/10,unit:'h'},{label:'สัปดาห์ 4',value:Math.round(hours*0.24*10)/10,unit:'h'}] },
    { type:'summary', title:'สรุปและแผนเดือนหน้า', body:'เดือนนี้ทำงานสำเร็จ '+total+' ชิ้น รวม '+hours+' ชั่วโมง อัตราสำเร็จ '+pct+'%', badges:['✅ '+pct+'% Done','⏱ '+hours+'h','🎯 '+total+' Tasks','🚀 Next Month!'] },
  ]
}

// ── Real PPTX Export ──
async function exportPPTX(slides, theme, title) {
  if (!window.PptxGenJS) {
    await new Promise((res,rej) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js'
      s.onload = res; s.onerror = rej
      document.head.appendChild(s)
    })
  }
  const pptx = new window.PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  pptx.title  = title
  pptx.author = 'WorkLog AI'

  const isDark= theme.dark
  const bgC   = theme.bg
  const acc   = theme.accent
  const txtM  = isDark?'F1F5F9':'1E293B'
  const txtS  = isDark?'94A3B8':'64748B'
  const txtMu = isDark?'475569':'94A3B8'
  const cardC = isDark?'1E293B':'FFFFFF'

  for (let idx=0; idx<slides.length; idx++) {
    const slide = slides[idx]
    const s = pptx.addSlide()
    s.background = { color: bgC }

    // orb decorations
    s.addShape(pptx.shapes.OVAL, { x:8.5,y:-0.8,w:2.5,h:2.5, fill:{color:acc,transparency:82}, line:{color:acc,transparency:82} })
    s.addShape(pptx.shapes.OVAL, { x:-0.6,y:4.2,w:1.8,h:1.8, fill:{color:acc,transparency:85}, line:{color:acc,transparency:85} })
    // page number
    s.addText(String(idx+1)+'/'+String(slides.length), { x:8.8,y:5.2,w:1,h:0.3, fontSize:9,color:txtMu,align:'right',fontFace:'Calibri',margin:0 })

    if (slide.type==='cover') {
      s.addText('WORKLOG AI', { x:1,y:0.65,w:8,h:0.3, fontSize:9,bold:true,color:acc,charSpacing:3,align:'center',fontFace:'Calibri',margin:0 })
      s.addText(String(slide.title||''), { x:0.8,y:1.0,w:8.4,h:1.1, fontSize:32,bold:true,color:txtM,align:'center',fontFace:'Calibri',margin:0 })
      s.addText(String(slide.subtitle||''), { x:1.5,y:2.15,w:7,h:0.65, fontSize:14,color:txtS,align:'center',fontFace:'Calibri',margin:0 })
      const stats=slide.stats||[]
      const cW=1.7, gap=0.2, totalW=stats.length*(cW+gap)-gap
      const startX=(10-totalW)/2
      stats.forEach((st,i)=>{
        const cx=startX+i*(cW+gap)
        s.addShape(pptx.shapes.RECTANGLE, { x:cx,y:3.1,w:cW,h:0.85, fill:{color:cardC,transparency:isDark?20:5}, line:{color:acc,transparency:70} })
        s.addText(String(st.value), { x:cx,y:3.16,w:cW,h:0.42, fontSize:22,bold:true,color:acc,align:'center',fontFace:'Calibri',margin:0 })
        s.addText(String(st.label), { x:cx,y:3.58,w:cW,h:0.28, fontSize:10,color:txtMu,align:'center',fontFace:'Calibri',margin:0 })
      })
    }

    else if (slide.type==='content') {
      s.addText(String(slide.eyebrow||'CONTENT'), { x:0.6,y:0.38,w:8.8,h:0.28, fontSize:9,bold:true,color:acc,charSpacing:3,fontFace:'Calibri',margin:0 })
      s.addText(String(slide.title||''), { x:0.6,y:0.68,w:8.8,h:0.78, fontSize:24,bold:true,color:txtM,fontFace:'Calibri',margin:0 })
      if (slide.subtitle) s.addText(String(slide.subtitle), { x:0.6,y:1.48,w:8.8,h:0.38, fontSize:13,color:txtS,fontFace:'Calibri',margin:0 })
      const pts=slide.points||[], startY=slide.subtitle?1.95:1.65
      pts.slice(0,6).forEach((p,i)=>{
        const yy=startY+i*0.64
        s.addShape(pptx.shapes.RECTANGLE, { x:0.6,y:yy,w:8.8,h:0.55, fill:{color:cardC,transparency:isDark?28:5}, line:{color:acc,transparency:75} })
        s.addShape(pptx.shapes.OVAL, { x:0.78,y:yy+0.18,w:0.2,h:0.2, fill:{color:acc}, line:{color:acc} })
        s.addText(String(p), { x:1.12,y:yy,w:8.2,h:0.55, fontSize:12,color:txtM,fontFace:'Calibri',valign:'middle' })
      })
    }

    else if (slide.type==='stats') {
      s.addText('KPI', { x:0.6,y:0.38,w:8.8,h:0.28, fontSize:9,bold:true,color:acc,charSpacing:3,fontFace:'Calibri',margin:0 })
      s.addText(String(slide.title||''), { x:0.6,y:0.68,w:8.8,h:0.68, fontSize:24,bold:true,color:txtM,fontFace:'Calibri',margin:0 })
      const stats=(slide.stats||[]).slice(0,6)
      const cW=2.7,cH=1.45,cols=3
      stats.forEach((st,i)=>{
        const col=i%cols,row=Math.floor(i/cols)
        const cx=0.6+col*(cW+0.22),cy=1.55+row*(cH+0.15)
        s.addShape(pptx.shapes.RECTANGLE, { x:cx,y:cy,w:cW,h:cH, fill:{color:cardC,transparency:isDark?25:5}, line:{color:st.color||acc,transparency:65} })
        s.addText(String(st.label||'').toUpperCase(), { x:cx,y:cy+0.1,w:cW,h:0.26, fontSize:9,bold:true,color:txtMu,align:'center',fontFace:'Calibri',margin:0 })
        s.addText(String(st.value||''), { x:cx,y:cy+0.36,w:cW,h:0.68, fontSize:28,bold:true,color:st.color?st.color:acc,align:'center',fontFace:'Calibri',margin:0 })
        if (st.sub) s.addText(String(st.sub), { x:cx,y:cy+1.04,w:cW,h:0.28, fontSize:9,color:txtMu,align:'center',fontFace:'Calibri',margin:0 })
      })
    }

    else if (slide.type==='chart') {
      s.addText('ANALYTICS', { x:0.6,y:0.38,w:8.8,h:0.28, fontSize:9,bold:true,color:acc,charSpacing:3,fontFace:'Calibri',margin:0 })
      s.addText(String(slide.title||''), { x:0.6,y:0.68,w:8.8,h:0.68, fontSize:24,bold:true,color:txtM,fontFace:'Calibri',margin:0 })
      const bars=(slide.bars||[]).slice(0,6)
      const maxV=Math.max(...bars.map(b=>b.value),1)
      bars.forEach((b,i)=>{
        const yy=1.55+i*0.58, pct=Math.min(b.value/maxV,1)
        s.addText(String(b.label||''), { x:0.6,y:yy,w:2.4,h:0.38, fontSize:11,color:txtM,fontFace:'Calibri',valign:'middle' })
        s.addShape(pptx.shapes.RECTANGLE, { x:3.1,y:yy+0.06,w:5.4,h:0.28, fill:{color:acc,transparency:85}, line:{color:'FFFFFF',transparency:100} })
        if (pct>0) s.addShape(pptx.shapes.RECTANGLE, { x:3.1,y:yy+0.06,w:Math.max(5.4*pct,0.05),h:0.28, fill:{color:acc,transparency:20}, line:{color:'FFFFFF',transparency:100} })
        s.addText(String(b.value||'')+(b.unit||''), { x:8.6,y:yy,w:1,h:0.38, fontSize:11,bold:true,color:acc,align:'right',fontFace:'Calibri',valign:'middle',margin:0 })
      })
    }

    else if (slide.type==='timeline') {
      s.addText('TIMELINE', { x:0.6,y:0.38,w:8.8,h:0.28, fontSize:9,bold:true,color:acc,charSpacing:3,fontFace:'Calibri',margin:0 })
      s.addText(String(slide.title||''), { x:0.6,y:0.68,w:8.8,h:0.68, fontSize:24,bold:true,color:txtM,fontFace:'Calibri',margin:0 })
      ;(slide.events||[]).slice(0,5).forEach((ev,i)=>{
        const yy=1.55+i*0.7
        s.addShape(pptx.shapes.OVAL, { x:0.6,y:yy+0.04,w:0.3,h:0.3, fill:{color:acc,transparency:20}, line:{color:acc} })
        s.addText(String(i+1), { x:0.6,y:yy+0.04,w:0.3,h:0.3, fontSize:10,bold:true,color:isDark?'FFFFFF':bgC,align:'center',valign:'middle',fontFace:'Calibri',margin:0 })
        s.addShape(pptx.shapes.RECTANGLE, { x:1.08,y:yy,w:8.28,h:0.56, fill:{color:cardC,transparency:isDark?25:5}, line:{color:acc,transparency:75} })
        s.addText(String(ev.title||''), { x:1.18,y:yy,w:5.2,h:0.3, fontSize:11,bold:true,color:txtM,fontFace:'Calibri',valign:'middle' })
        if (ev.date) s.addText(String(ev.date), { x:6.5,y:yy,w:2.7,h:0.3, fontSize:10,color:acc,align:'right',fontFace:'Calibri',valign:'middle',margin:0 })
        if (ev.desc) s.addText(String(ev.desc), { x:1.18,y:yy+0.28,w:8.1,h:0.26, fontSize:10,color:txtS,fontFace:'Calibri',valign:'middle' })
      })
    }

    else if (slide.type==='two_col') {
      s.addText(String(slide.eyebrow||'OVERVIEW'), { x:0.6,y:0.38,w:8.8,h:0.28, fontSize:9,bold:true,color:acc,charSpacing:3,fontFace:'Calibri',margin:0 })
      s.addText(String(slide.title||''), { x:0.6,y:0.68,w:8.8,h:0.68, fontSize:24,bold:true,color:txtM,fontFace:'Calibri',margin:0 })
      ;(slide.cols||[]).slice(0,2).forEach((col,ci)=>{
        const cx=0.6+ci*4.8
        s.addShape(pptx.shapes.RECTANGLE, { x:cx,y:1.55,w:4.4,h:3.72, fill:{color:cardC,transparency:isDark?25:5}, line:{color:acc,transparency:70} })
        s.addText(String(col.heading||''), { x:cx+0.2,y:1.68,w:4,h:0.32, fontSize:11,bold:true,color:acc,fontFace:'Calibri',margin:0 })
        ;(col.points||[]).slice(0,5).forEach((p,pi)=>{
          const py=2.1+pi*0.54
          s.addShape(pptx.shapes.OVAL, { x:cx+0.2,y:py+0.07,w:0.13,h:0.13, fill:{color:acc}, line:{color:acc} })
          s.addText(String(p||''), { x:cx+0.43,y:py,w:3.85,h:0.48, fontSize:11,color:txtM,fontFace:'Calibri',valign:'middle' })
        })
      })
    }

    else if (slide.type==='gallery') {
      s.addText('GALLERY', { x:0.6,y:0.38,w:8.8,h:0.28, fontSize:9,bold:true,color:acc,charSpacing:3,fontFace:'Calibri',margin:0 })
      s.addText(String(slide.title||'Gallery'), { x:0.6,y:0.68,w:8.8,h:0.68, fontSize:24,bold:true,color:txtM,fontFace:'Calibri',margin:0 })
      ;(slide.images||[]).slice(0,6).forEach((url,i)=>{
        const col=i%3,row=Math.floor(i/3)
        const ix=0.6+col*3.05,iy=1.55+row*1.85
        if (url&&typeof url==='string'&&url.startsWith('http')) {
          try { s.addImage({ path:url,x:ix,y:iy,w:2.85,h:1.65,sizing:{type:'cover',w:2.85,h:1.65} }) }
          catch { s.addShape(pptx.shapes.RECTANGLE,{x:ix,y:iy,w:2.85,h:1.65,fill:{color:acc,transparency:80},line:{color:acc,transparency:60}}) }
        } else {
          s.addShape(pptx.shapes.RECTANGLE,{x:ix,y:iy,w:2.85,h:1.65,fill:{color:acc,transparency:80},line:{color:acc,transparency:60}})
          s.addText('🖼️',{x:ix,y:iy,w:2.85,h:1.65,fontSize:20,align:'center',valign:'middle'})
        }
      })
    }

    else if (slide.type==='summary') {
      s.addText('SUMMARY', { x:1,y:0.5,w:8,h:0.28, fontSize:9,bold:true,color:acc,charSpacing:3,align:'center',fontFace:'Calibri',margin:0 })
      s.addText(String(slide.title||''), { x:0.8,y:0.88,w:8.4,h:0.95, fontSize:26,bold:true,color:txtM,align:'center',fontFace:'Calibri',margin:0 })
      if (slide.body) s.addText(String(slide.body), { x:1.2,y:1.95,w:7.6,h:1.1, fontSize:13,color:txtS,align:'center',fontFace:'Calibri',lineSpacingMultiple:1.4 })
      const badges=(slide.badges||[]).slice(0,4)
      const bW=1.85,bGap=0.2,totalBW=badges.length*(bW+bGap)-bGap
      const bStartX=(10-totalBW)/2
      badges.forEach((b,i)=>{
        const bx=bStartX+i*(bW+bGap)
        s.addShape(pptx.shapes.RECTANGLE,{x:bx,y:3.4,w:bW,h:0.48,fill:{color:acc,transparency:80},line:{color:acc,transparency:50}})
        s.addText(String(b||''),{x:bx,y:3.4,w:bW,h:0.48,fontSize:11,bold:true,color:acc,align:'center',valign:'middle',fontFace:'Calibri',margin:0})
      })
    }

    else {
      s.addText(String(slide.title||''), { x:0.6,y:1.5,w:8.8,h:1, fontSize:26,bold:true,color:txtM,align:'center',fontFace:'Calibri' })
      if (slide.subtitle||slide.body) s.addText(String(slide.subtitle||slide.body||''), { x:1,y:2.8,w:8,h:1.2, fontSize:14,color:txtS,align:'center',fontFace:'Calibri' })
    }
  }

  await pptx.writeFile({ fileName: (title||'WorkLog').replace(/[^a-zA-Z0-9ก-๙ _-]/g,'_')+'.pptx' })
}

// ── MAIN ──
export default function PresentationStudio({ logs=[] }) {
  const [slides,    setSlides]    = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [theme,     setTheme]     = useState(THEMES[0])
  const [generating,setGenerating]= useState(false)
  const [exporting, setExporting] = useState(false)
  const [title,     setTitle]     = useState('WorkLog Report · พ.ค. 2568')
  const [prompt,    setPrompt]    = useState('')
  const [aiAction,  setAiAction]  = useState(null)
  const [aiResult,  setAiResult]  = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [leftTab,   setLeftTab]   = useState('slides')
  const [progress,  setProgress]  = useState(0)

  const total = logs.length
  const hours = logs.reduce((s,l)=>s+(l.hours||0),0)
  const done  = logs.filter(l=>l.status==='done').length
  const imgs  = logs.flatMap(l=>l.imageUrls||l.image_urls||[])

  async function generate() {
    if (!logs.length) return
    setGenerating(true); setProgress(0); setAiResult('')
    const iv = setInterval(()=>setProgress(p=>Math.min(p+7,88)),300)
    const generated = await buildSlides(logs, prompt)
    clearInterval(iv); setProgress(100)
    setSlides(generated); setActiveIdx(0)
    setTimeout(()=>{ setGenerating(false); setProgress(0) }, 400)
  }

  async function doExport() {
    if (!slides.length) return
    setExporting(true)
    try { await exportPPTX(slides, theme, title) }
    catch(e) { alert('Export failed: '+e.message) }
    setExporting(false)
  }

  async function aiEdit(action) {
    const slide = slides[activeIdx]
    if (!slide) return
    setAiAction(action); setAiLoading(true); setAiResult('')
    const p = {
      improve:      'ปรับปรุง slide นี้ให้ดีขึ้น ตอบ JSON: '+JSON.stringify(slide),
      professional: 'แปลง corporate level ตอบ JSON: '+JSON.stringify(slide),
      translate:    'แปลเป็นอังกฤษ ตอบ JSON: '+JSON.stringify(slide),
      shorter:      'ทำสั้นกระชับ ตอบ JSON: '+JSON.stringify(slide),
      expand:       'เพิ่มรายละเอียด ตอบ JSON: '+JSON.stringify(slide),
      custom:       prompt.trim()?'แก้ slide ตาม: '+prompt+'\nSlide: '+JSON.stringify(slide)+'\nตอบ JSON เท่านั้น':'',
    }[action]
    if (!p) { setAiLoading(false); return }
    const text = await callAI(p)
    try {
      const clean = text.replace(/```json|```/g,'').trim()
      const si=clean.indexOf('{'),ei=clean.lastIndexOf('}')
      if (si!==-1&&ei!==-1) {
        const updated = JSON.parse(clean.slice(si,ei+1))
        const ns=[...slides]; ns[activeIdx]={...slides[activeIdx],...updated}
        setSlides(ns); setAiResult('✅ อัปเดต slide แล้ว')
      } else setAiResult(text.slice(0,180))
    } catch { setAiResult(text.slice(0,180)) }
    setAiLoading(false)
  }

  const CSS_VARS = `
    .ps2{font-family:'Inter',sans-serif}
    .ps2-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:11px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s}
    .ps2-btn:hover{transform:translateY(-1px)}
    .ps2-btn:disabled{opacity:.5;cursor:default;transform:none}
    .ps2-primary{background:linear-gradient(135deg,#6C63FF,#9B8FFF);color:white;box-shadow:0 4px 12px rgba(108,99,255,0.3)}
    .ps2-ghost{background:rgba(255,255,255,.65);color:#6b7099;border:1px solid rgba(200,210,240,.5)}
    .ps2-ghost:hover{background:rgba(255,255,255,.9);color:#1a1a2e}
    .ps2-input{width:100%;background:rgba(255,255,255,.6);border:1px solid rgba(200,210,240,.5);border-radius:12px;padding:10px 14px;font-size:13px;color:#1a1a2e;font-family:inherit;outline:none;transition:all .15s;box-sizing:border-box}
    .ps2-input:focus{border-color:rgba(108,99,255,.45);background:rgba(255,255,255,.9);box-shadow:0 0 0 3px rgba(108,99,255,.1)}
    .ps2-lbl{display:block;font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;margin-bottom:7px}
    .ps2-mini{background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.85);border-radius:12px;padding:13px 14px}
    .ps2-prog{height:4px;background:rgba(108,99,255,.12);border-radius:2px;overflow:hidden;margin:8px 0}
    .ps2-prog-fill{height:100%;background:linear-gradient(90deg,#6C63FF,#9B8FFF);border-radius:2px;transition:width .4s ease}
    @keyframes ps2-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes ps2-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    .ps2-spin{animation:ps2-spin 1.2s linear infinite;display:inline-block}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(108,99,255,.2);border-radius:4px}
  `

  // ── EMPTY STATE ──
  if (!slides.length) return (
    <>
      <style>{CSS_VARS}</style>
      <div className="ps2" style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'65vh',padding:24 }}>
        <div style={{ background:'rgba(255,255,255,.72)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:'1px solid rgba(255,255,255,.96)',borderRadius:28,padding:'46px 42px',maxWidth:600,width:'100%',animation:'ps2-in .3s ease',boxShadow:'0 8px 40px rgba(100,110,200,.12)' }}>

          <div style={{ textAlign:'center',marginBottom:26 }}>
            <div style={{ width:62,height:62,borderRadius:18,background:'linear-gradient(135deg,#6C63FF,#A78BFA)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 14px',boxShadow:'0 8px 24px rgba(108,99,255,.35)' }}>🎬</div>
            <div style={{ fontSize:23,fontWeight:800,color:'#1a1a2e',letterSpacing:-.4 }}>Presentation Studio</div>
            <div style={{ fontSize:14,color:'#6b7099',marginTop:6,lineHeight:1.7 }}>AI สร้าง 10 slides อัตโนมัติจาก {total} งานของคุณ</div>
          </div>

          {/* Stats */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:22 }}>
            {[{v:total,l:'งาน',c:'#6C63FF'},{v:hours,l:'ชั่วโมง',c:'#06B6D4'},{v:done,l:'เสร็จ',c:'#10B981'},{v:imgs.length,l:'รูปภาพ',c:'#F59E0B'}].map((s,i)=>(
              <div key={i} style={{ background:'rgba(255,255,255,.6)',border:'1px solid rgba(200,210,240,.4)',borderRadius:14,padding:'11px 8px',textAlign:'center' }}>
                <div style={{ fontSize:22,fontWeight:800,color:s.c }}>{s.v}</div>
                <div style={{ fontSize:11,color:'#9ca3af',marginTop:3 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Theme */}
          <div style={{ marginBottom:18 }}>
            <label className="ps2-lbl">Theme</label>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
              {THEMES.map(t=>(
                <button key={t.id} onClick={()=>setTheme(t)} style={{ padding:'9px 12px',borderRadius:12,border:'2px solid '+(theme.id===t.id?'#6C63FF':'rgba(200,210,240,.4)'),background:theme.id===t.id?'rgba(108,99,255,.1)':'rgba(255,255,255,.55)',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:8,transition:'all .15s' }}>
                  <div style={{ width:26,height:18,borderRadius:5,background:'#'+t.bg,flexShrink:0,border:'1px solid rgba(0,0,0,.1)' }}/>
                  <span style={{ fontSize:11,fontWeight:theme.id===t.id?700:500,color:theme.id===t.id?'#6C63FF':'#6b7099' }}>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div style={{ marginBottom:18 }}>
            <label className="ps2-lbl">AI Prompt (ไม่บังคับ — ปล่อยว่างให้ AI วิเคราะห์เอง)</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="เช่น: สร้างสไตล์ startup pitch ภาษาอังกฤษ เน้น video และ branding..." className="ps2-input" style={{ minHeight:80,resize:'vertical',lineHeight:1.65 }}/>
          </div>

          {/* Title */}
          <div style={{ marginBottom:22 }}>
            <label className="ps2-lbl">ชื่อ Presentation</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="ps2-input" placeholder="WorkLog Report · พ.ค. 2568"/>
          </div>

          <button onClick={generate} disabled={generating||!total} className="ps2-btn ps2-primary" style={{ width:'100%',justifyContent:'center',padding:'14px',fontSize:15 }}>
            {generating?<><span className="ps2-spin">⏳</span> AI กำลังสร้าง {progress}%...</>:'✨ สร้าง 10 Slides ด้วย AI'}
          </button>
          {generating&&<div className="ps2-prog"><div className="ps2-prog-fill" style={{ width:progress+'%' }}/></div>}
          {!total&&<div style={{ fontSize:12,color:'#9ca3af',textAlign:'center',marginTop:10 }}>กรุณาเพิ่มงานก่อน</div>}
        </div>
      </div>
    </>
  )

  // ── WORKSPACE ──
  return (
    <>
      <style>{CSS_VARS}</style>
      <div className="ps2" style={{ display:'grid',gridTemplateColumns:'200px 1fr 258px',height:'calc(100vh - 57px)',gap:0 }}>

        {/* LEFT */}
        <div style={{ background:'rgba(255,255,255,.55)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderRight:'1px solid rgba(255,255,255,.75)',overflow:'auto',padding:'12px 10px' }}>
          <div style={{ display:'flex',gap:4,marginBottom:10 }}>
            {[['slides','Slides'],['theme','Theme']].map(([k,l])=>(
              <button key={k} onClick={()=>setLeftTab(k)} style={{ flex:1,padding:'6px 4px',borderRadius:8,border:'1px solid',fontSize:11,fontWeight:leftTab===k?700:500,cursor:'pointer',fontFamily:'inherit',transition:'all .15s',borderColor:leftTab===k?'rgba(108,99,255,.3)':'rgba(200,210,240,.4)',background:leftTab===k?'rgba(108,99,255,.1)':'rgba(255,255,255,.5)',color:leftTab===k?'#6C63FF':'#9ca3af' }}>{l}</button>
            ))}
          </div>
          {leftTab==='slides'&&slides.map((s,i)=>(
            <Thumb key={i} slide={s} theme={theme} index={i} active={activeIdx===i} onClick={()=>setActiveIdx(i)}/>
          ))}
          {leftTab==='theme'&&THEMES.map(t=>(
            <button key={t.id} onClick={()=>setTheme(t)} style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 11px',background:theme.id===t.id?'rgba(108,99,255,.09)':'rgba(255,255,255,.55)',border:'1px solid '+(theme.id===t.id?'rgba(108,99,255,.3)':'rgba(200,210,240,.4)'),borderRadius:12,cursor:'pointer',fontFamily:'inherit',marginBottom:6,transition:'all .15s' }}>
              <div style={{ width:30,height:22,borderRadius:7,background:'#'+t.bg,flexShrink:0 }}/>
              <div style={{ flex:1,textAlign:'left' }}>
                <div style={{ fontSize:11,fontWeight:theme.id===t.id?700:500,color:theme.id===t.id?'#6C63FF':'#1a1a2e' }}>{t.name}</div>
                <div style={{ fontSize:9,color:'#9ca3af' }}>{t.dark?'Dark':'Light'}</div>
              </div>
              {theme.id===t.id&&<span style={{ color:'#6C63FF',fontSize:12 }}>✓</span>}
            </button>
          ))}
        </div>

        {/* CENTER */}
        <div style={{ background:'rgba(230,233,255,.4)',display:'flex',flexDirection:'column',alignItems:'center',padding:'20px 18px',gap:14,overflowY:'auto' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,width:'100%',maxWidth:720 }}>
            <button disabled={activeIdx===0} onClick={()=>setActiveIdx(i=>Math.max(i-1,0))} className="ps2-btn ps2-ghost" style={{ padding:'7px 14px',fontSize:12 }}>←</button>
            <div style={{ flex:1,textAlign:'center',fontSize:13,fontWeight:600,color:'#1a1a2e' }}>
              {title} <span style={{ color:'#9ca3af',fontWeight:400 }}>· {activeIdx+1}/{slides.length}</span>
            </div>
            <button disabled={activeIdx===slides.length-1} onClick={()=>setActiveIdx(i=>Math.min(i+1,slides.length-1))} className="ps2-btn ps2-ghost" style={{ padding:'7px 14px',fontSize:12 }}>→</button>
          </div>

          <div style={{ width:'100%',maxWidth:720,aspectRatio:'16/9',borderRadius:18,overflow:'hidden',boxShadow:'0 20px 60px rgba(100,110,200,.22)' }} key={activeIdx+theme.id}>
            <SlideCanvas slide={slides[activeIdx]} theme={theme} index={activeIdx} total={slides.length}/>
          </div>

          <div style={{ display:'flex',gap:5,alignItems:'center' }}>
            {slides.map((_,i)=>(
              <button key={i} onClick={()=>setActiveIdx(i)} style={{ width:i===activeIdx?22:8,height:8,borderRadius:4,border:'none',background:i===activeIdx?'#6C63FF':'rgba(108,99,255,.25)',cursor:'pointer',transition:'all .2s',padding:0 }}/>
            ))}
          </div>

          <div style={{ background:'rgba(255,255,255,.65)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,.9)',borderRadius:14,padding:'10px 18px',maxWidth:720,width:'100%',display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14,fontWeight:700,color:'#1a1a2e' }}>{slides[activeIdx]?.title}</div>
              <div style={{ fontSize:12,color:'#9ca3af',marginTop:2 }}>Type: {slides[activeIdx]?.type} · Slide {activeIdx+1}/{slides.length}</div>
            </div>
            <span style={{ background:'rgba(108,99,255,.1)',color:'#6C63FF',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20 }}>{slides[activeIdx]?.type}</span>
          </div>

          <div style={{ display:'flex',gap:9,maxWidth:720,width:'100%' }}>
            <button onClick={generate} disabled={generating} className="ps2-btn ps2-ghost" style={{ flex:1,justifyContent:'center' }}>
              {generating?<span className="ps2-spin">⏳</span>:'🔄'} Regenerate
            </button>
            <button onClick={doExport} disabled={exporting} className="ps2-btn ps2-primary" style={{ flex:2.5,justifyContent:'center',fontSize:14 }}>
              {exporting?<><span className="ps2-spin">⏳</span> Exporting...</>:'📥 Download .pptx'}
            </button>
            <button onClick={()=>setSlides([])} className="ps2-btn ps2-ghost" style={{ padding:'9px 14px' }}>↩</button>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ background:'rgba(255,255,255,.55)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderLeft:'1px solid rgba(255,255,255,.75)',overflow:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:12 }}>
          <div style={{ fontSize:13,fontWeight:700,color:'#1a1a2e' }}>✨ AI Slide Editor</div>

          {/* Prompt box */}
          <div className="ps2-mini">
            <label className="ps2-lbl">AI Prompt</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder='เช่น "เพิ่ม KPI" "แปลเป็น EN" "สไตล์ minimal"...' className="ps2-input" style={{ minHeight:62,resize:'vertical',lineHeight:1.6,marginBottom:8 }}/>
            <button onClick={()=>aiEdit('custom')} disabled={!prompt.trim()||aiLoading} className="ps2-btn ps2-primary" style={{ width:'100%',justifyContent:'center',fontSize:12 }}>
              {aiLoading&&aiAction==='custom'?<><span className="ps2-spin">⏳</span> กำลังแก้...</>:'✨ ส่งให้ AI แก้ Slide นี้'}
            </button>
          </div>

          {/* Quick actions */}
          <div className="ps2-mini">
            <label className="ps2-lbl">Quick Actions</label>
            {[
              {k:'improve',      icon:'💡',l:'ปรับปรุงเนื้อหา',     c:'rgba(108,99,255,.09)', t:'#6C63FF'},
              {k:'professional', icon:'💼',l:'สไตล์ Corporate',     c:'rgba(6,182,212,.09)',  t:'#06B6D4'},
              {k:'translate',    icon:'🌐',l:'แปลเป็นอังกฤษ',      c:'rgba(16,185,129,.09)', t:'#10B981'},
              {k:'shorter',      icon:'✂️',l:'กระชับขึ้น',           c:'rgba(245,158,11,.09)', t:'#D97706'},
              {k:'expand',       icon:'📝',l:'เพิ่มรายละเอียด',     c:'rgba(139,92,246,.09)', t:'#8B5CF6'},
            ].map(btn=>(
              <button key={btn.k} onClick={()=>aiEdit(btn.k)} disabled={aiLoading} style={{ display:'flex',alignItems:'center',gap:9,padding:'9px 12px',background:btn.c,border:'none',borderRadius:10,cursor:aiLoading?'default':'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,color:btn.t,opacity:aiLoading?.6:1,transition:'all .15s',textAlign:'left',width:'100%',marginBottom:6 }}>
                {aiLoading&&aiAction===btn.k?<span className="ps2-spin" style={{ fontSize:13 }}>⏳</span>:<span style={{ fontSize:14 }}>{btn.icon}</span>}
                {btn.l}
              </button>
            ))}
          </div>

          {/* AI Result */}
          {aiResult&&(
            <div className="ps2-mini" style={{ background:'rgba(16,185,129,.06)',border:'1px solid rgba(16,185,129,.2)' }}>
              <div style={{ fontSize:10,fontWeight:700,color:'#10B981',letterSpacing:1,marginBottom:6 }}>RESULT</div>
              <div style={{ fontSize:12,color:'#1a1a2e',lineHeight:1.65 }}>{aiResult}</div>
              <button onClick={()=>setAiResult('')} style={{ marginTop:8,fontSize:11,color:'#9ca3af',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit' }}>ล้าง ×</button>
            </div>
          )}

          {/* Regenerate all */}
          <div className="ps2-mini">
            <label className="ps2-lbl">Regenerate ทั้งหมด</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="ใส่ prompt ใหม่..." className="ps2-input" style={{ minHeight:52,resize:'vertical',marginBottom:8 }}/>
            <button onClick={generate} disabled={generating} className="ps2-btn ps2-primary" style={{ width:'100%',justifyContent:'center',fontSize:12 }}>
              {generating?<><span className="ps2-spin">⏳</span> {progress}%</>:'🔄 สร้างใหม่ 10 slides'}
            </button>
            {generating&&<div className="ps2-prog"><div className="ps2-prog-fill" style={{ width:progress+'%' }}/></div>}
          </div>

          {/* Export */}
          <div className="ps2-mini">
            <label className="ps2-lbl">Export PPTX</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="ps2-input" style={{ marginBottom:8 }}/>
            <button onClick={doExport} disabled={exporting} className="ps2-btn ps2-primary" style={{ width:'100%',justifyContent:'center',fontSize:13 }}>
              {exporting?<><span className="ps2-spin">⏳</span> Exporting...</>:'📥 Download .pptx'}
            </button>
            <div style={{ fontSize:11,color:'#9ca3af',marginTop:7,textAlign:'center' }}>ไฟล์ .pptx เปิดได้ใน PowerPoint</div>
          </div>
        </div>
      </div>
    </>
  )
}
