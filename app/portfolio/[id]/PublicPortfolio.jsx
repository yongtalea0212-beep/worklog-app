'use client'

const CATS = [
  { id:'graphic',   label:'Graphic',   color:'#6C63FF', bg:'rgba(108,99,255,0.1)',  icon:'🎨' },
  { id:'video',     label:'Video',     color:'#06B6D4', bg:'rgba(6,182,212,0.1)',   icon:'🎬' },
  { id:'photo',     label:'Photo',     color:'#F59E0B', bg:'rgba(245,158,11,0.1)',  icon:'📷' },
  { id:'marketing', label:'Marketing', color:'#EF4444', bg:'rgba(239,68,68,0.1)',   icon:'📢' },
  { id:'ai',        label:'AI',        color:'#8B5CF6', bg:'rgba(139,92,246,0.1)',  icon:'🤖' },
  { id:'branding',  label:'Branding',  color:'#EC4899', bg:'rgba(236,72,153,0.1)',  icon:'✨' },
  { id:'pos',       label:'POS',       color:'#10B981', bg:'rgba(16,185,129,0.1)',  icon:'🏪' },
  { id:'other',     label:'อื่นๆ',     color:'#64748B', bg:'rgba(100,116,139,0.1)', icon:'📌' },
]
const FALLBACK_CAT = { id:'other', label:'Other', icon:'📌', color:'#9ca3af', bg:'rgba(156,163,175,0.1)' }
const getCat = id => CATS.find(c => c.id === id) || FALLBACK_CAT
const fmtDate = s => { try { const d = new Date(s); return isNaN(d) ? '-' : d.toLocaleDateString('th-TH',{day:'numeric',month:'short'}) } catch { return '-' } }

function getStats(logs){
  const total = logs.length, hours = logs.reduce((s,l)=>s+(l.hours||0),0)
  const byCategory = {}
  logs.forEach(l => { byCategory[l.category] = (byCategory[l.category]||0)+1 })
  const completionRate = total>0 ? Math.round((logs.filter(l=>l.status==='done').length/total)*100) : 0
  return { total, hours, byCategory, completionRate }
}

function Badge({ category }){
  const cat = getCat(category)
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10.5,fontWeight:600,color:cat.color,background:cat.bg,padding:'2px 8px',borderRadius:20}}>{cat.icon} {cat.label}</span>
}

export default function PublicPortfolio({ logs, profile }){
  const stats = getStats(logs)
  const catData = Object.entries(stats.byCategory).map(([id,count])=>({cat:getCat(id),count})).sort((a,b)=>b.count-a.count)
  const maxCat = Math.max(1, ...catData.map(c=>c.count))
  const gallery = []
  logs.forEach(l => (l.imageUrls||[]).forEach(u => { if(u) gallery.push({url:u,title:l.title}) }))
  const featured = logs.filter(l => (l.imageUrls||[]).length>0).slice(0,6)
  const name = profile.name || 'My Portfolio'
  const initials = (name||'U').trim()[0]?.toUpperCase() || 'U'

  const bg = 'linear-gradient(160deg,#F0ECFF 0%,#E8F4FF 50%,#F0FFF8 100%)'
  const card = { background:'rgba(255,255,255,0.72)', border:'1px solid rgba(255,255,255,0.9)', borderRadius:18, padding:18, boxShadow:'0 4px 24px rgba(100,110,200,0.08)' }
  const cardT = { fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:12 }

  return (
    <div style={{minHeight:'100vh',background:bg,fontFamily:'Inter,system-ui,sans-serif',padding:'24px 16px'}}>
      <div style={{maxWidth:760,margin:'0 auto'}}>
        {/* Hero */}
        <div style={{position:'relative',overflow:'hidden',background:'linear-gradient(135deg,#6C63FF 0%,#9B8FFF 55%,#06B6D4 130%)',borderRadius:22,padding:'34px 28px',marginBottom:18,boxShadow:'0 12px 40px rgba(108,99,255,0.28)'}}>
          <div style={{position:'absolute',top:-40,right:-30,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.12)'}}/>
          <div style={{position:'absolute',bottom:-50,left:-20,width:140,height:140,borderRadius:'50%',background:'rgba(255,255,255,0.08)'}}/>
          <div style={{position:'relative',display:'flex',alignItems:'center',gap:18,flexWrap:'wrap'}}>
            <div style={{width:84,height:84,borderRadius:'50%',background:'rgba(255,255,255,0.25)',border:'3px solid rgba(255,255,255,0.7)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,fontSize:32,fontWeight:800,color:'white'}}>
              {profile.avatar ? <img src={profile.avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials}
            </div>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:24,fontWeight:800,color:'white',letterSpacing:-.4}}>{name}</div>
              {profile.title && <div style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,0.92)',marginTop:2}}>{profile.title}</div>}
              {profile.bio && <div style={{fontSize:12.5,color:'rgba(255,255,255,0.85)',marginTop:8,lineHeight:1.6,maxWidth:460}}>{profile.bio}</div>}
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
                {profile.email && <a href={`mailto:${profile.email}`} style={{textDecoration:'none',background:'rgba(255,255,255,0.2)',color:'white',fontSize:11.5,fontWeight:600,padding:'5px 12px',borderRadius:20}}>✉️ {profile.email}</a>}
                {profile.phone && <span style={{background:'rgba(255,255,255,0.2)',color:'white',fontSize:11.5,fontWeight:600,padding:'5px 12px',borderRadius:20}}>📞 {profile.phone}</span>}
                {profile.line && <span style={{background:'rgba(255,255,255,0.2)',color:'white',fontSize:11.5,fontWeight:600,padding:'5px 12px',borderRadius:20}}>💬 {profile.line}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
          {[{icon:'✦',l:'ผลงาน',v:stats.total,c:'#6C63FF'},{icon:'⏱',l:'ชั่วโมง',v:stats.hours,c:'#06B6D4'},{icon:'✓',l:'สำเร็จ',v:`${stats.completionRate}%`,c:'#10B981'}].map(s=>(
            <div key={s.l} style={{...card,textAlign:'center',padding:16}}>
              <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
              <div style={{fontSize:24,fontWeight:800,color:s.c}}>{s.v}</div>
              <div style={{fontSize:11,color:'#9ca3af'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Skills */}
        {catData.length>0 && (
          <div style={{...card,marginBottom:16}}>
            <div style={cardT}>ทักษะ &amp; ความเชี่ยวชาญ</div>
            <div style={{display:'flex',flexDirection:'column',gap:11}}>
              {catData.map(({cat,count})=>(
                <div key={cat.id}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    <span style={{fontSize:14}}>{cat.icon}</span>
                    <span style={{fontSize:12.5,fontWeight:600,color:'#1a1a2e'}}>{cat.label}</span>
                    <span style={{marginLeft:'auto',fontSize:11,fontWeight:700,color:cat.color}}>{count} งาน</span>
                  </div>
                  <div style={{height:8,borderRadius:8,background:'rgba(108,99,255,0.08)',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.round((count/maxCat)*100)}%`,background:`linear-gradient(90deg,${cat.color},${cat.color}aa)`,borderRadius:8}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        {gallery.length>0 && (
          <div style={{...card,marginBottom:16}}>
            <div style={cardT}>ผลงานเด่น ({gallery.length})</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:8}}>
              {gallery.slice(0,12).map((g,i)=>(
                <a key={i} href={g.url} target="_blank" rel="noreferrer" style={{display:'block',aspectRatio:'1',borderRadius:12,overflow:'hidden',border:'1px solid rgba(108,99,255,0.12)',background:'rgba(108,99,255,0.04)'}}>
                  <img src={g.url} alt={g.title} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Selected works */}
        {logs.length>0 && (
          <div style={{...card,marginBottom:16}}>
            <div style={cardT}>ผลงานที่เลือก</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {(featured.length?featured:logs.slice(0,6)).map(log=>{
                const cat = getCat(log.category)
                const img = (log.imageUrls||[])[0]
                return (
                  <div key={log.id} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px',borderRadius:12,background:'rgba(255,255,255,0.5)',border:'1px solid rgba(108,99,255,0.08)'}}>
                    <div style={{width:52,height:52,borderRadius:10,flexShrink:0,overflow:'hidden',background:cat.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
                      {img ? <img src={img} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : cat.icon}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{fontSize:13.5,fontWeight:700,color:'#1a1a2e'}}>{log.title}</span>
                        <Badge category={log.category}/>
                      </div>
                      {(log.aiSummary||log.description) && <div style={{fontSize:12,color:'#4a5568',lineHeight:1.5,marginTop:4}}>{log.aiSummary||log.description}</div>}
                      <div style={{fontSize:10.5,color:'#9ca3af',marginTop:4}}>{fmtDate(log.date)} · {log.hours} ชม.</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {logs.length===0 && (
          <div style={{...card,textAlign:'center',padding:'40px 20px',color:'#9ca3af',marginBottom:16}}>
            <div style={{fontSize:32,marginBottom:8}}>📭</div>
            <div style={{fontSize:13}}>ยังไม่มีผลงานที่จะแสดง</div>
          </div>
        )}

        <div style={{textAlign:'center',fontSize:11,color:'#9ca3af',padding:'8px 0 20px'}}>สร้างด้วย ✨ StayScape</div>
      </div>
    </div>
  )
}
