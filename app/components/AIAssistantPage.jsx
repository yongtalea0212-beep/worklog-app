"use client"
import { useState, useRef, useEffect } from 'react'

const CATS = [
  { id:'graphic',   label:'Graphic Design', color:'#6C63FF', bg:'rgba(108,99,255,0.1)',  icon:'🎨' },
  { id:'video',     label:'Video Editing',  color:'#06B6D4', bg:'rgba(6,182,212,0.1)',   icon:'🎬' },
  { id:'photo',     label:'Photography',    color:'#F59E0B', bg:'rgba(245,158,11,0.1)',  icon:'📷' },
  { id:'marketing', label:'Marketing',      color:'#EF4444', bg:'rgba(239,68,68,0.1)',   icon:'📢' },
  { id:'ai',        label:'AI Content',     color:'#8B5CF6', bg:'rgba(139,92,246,0.1)',  icon:'🤖' },
  { id:'branding',  label:'Branding',       color:'#EC4899', bg:'rgba(236,72,153,0.1)',  icon:'✨' },
  { id:'pos',       label:'POS Design',     color:'#10B981', bg:'rgba(16,185,129,0.1)',  icon:'🏪' },
  { id:'other',     label:'อื่นๆ',          color:'#64748B', bg:'rgba(100,116,139,0.1)', icon:'📌' },
]
const getCat = id => CATS.find(c => c.id === id) || CATS[7]
const fmtDate = s => { try { return new Date(s).toLocaleDateString('th-TH',{day:'numeric',month:'short'}) } catch { return s } }

async function callAI(prompt) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  const data = await res.json()
  return data.text || ''
}

// ─── Shared styles ───
const card = {
  background:'rgba(255,255,255,0.65)',
  backdropFilter:'blur(24px)',
  WebkitBackdropFilter:'blur(24px)',
  border:'1px solid rgba(255,255,255,0.9)',
  borderRadius:22, padding:22,
  boxShadow:'0 4px 24px rgba(100,110,200,0.09),inset 0 1px 0 rgba(255,255,255,0.8)',
  marginBottom:16,
}
const btnPrimary = {
  padding:'9px 20px',
  background:'linear-gradient(135deg,#6C63FF,#9B8FFF)',
  border:'none', borderRadius:10,
  fontSize:13, fontWeight:600, color:'white',
  cursor:'pointer', fontFamily:'inherit',
  boxShadow:'0 4px 14px rgba(108,99,255,0.3)',
  display:'inline-flex', alignItems:'center', gap:6,
  transition:'all .15s',
}
const btnGhost = {
  padding:'8px 18px',
  background:'rgba(255,255,255,0.6)',
  border:'1px solid rgba(200,210,240,0.5)',
  borderRadius:10, fontSize:13, fontWeight:500,
  color:'#6b7099', cursor:'pointer', fontFamily:'inherit',
  display:'inline-flex', alignItems:'center', gap:6,
  transition:'all .15s',
}
const inputStyle = {
  width:'100%', padding:'10px 14px',
  background:'rgba(255,255,255,0.6)',
  border:'1px solid rgba(200,210,240,0.5)',
  borderRadius:10, fontSize:13, color:'#1a1a2e',
  fontFamily:'inherit', outline:'none',
  boxSizing:'border-box', transition:'all .15s',
}
const labelStyle = {
  display:'block', fontSize:10, fontWeight:700,
  color:'#9ca3af', letterSpacing:1, marginBottom:6, textTransform:'uppercase',
}
const resultBox = {
  background:'linear-gradient(135deg,rgba(108,99,255,0.06),rgba(167,139,250,0.04))',
  border:'1px solid rgba(108,99,255,0.18)',
  borderRadius:12, padding:'14px 16px', marginTop:12,
}

// ─────────────────────────────────────────
// 1. VOICE LOGGER
// ─────────────────────────────────────────
function VoiceLogger({ onLogCreated }) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(true)
  const recRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }
    const r = new SR()
    r.lang = 'th-TH'
    r.continuous = false
    r.interimResults = true
    r.onresult = e => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('')
      setTranscript(t)
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recRef.current = r
  }, [])

  function toggleListen() {
    if (!recRef.current) return
    if (listening) { recRef.current.stop(); setListening(false) }
    else { setTranscript(''); setAiResult(null); recRef.current.start(); setListening(true) }
  }

  async function analyzeVoice() {
    if (!transcript.trim()) return
    setLoading(true)
    const prompt = [
      'วิเคราะห์งานจากข้อความนี้แล้วตอบเป็น JSON เท่านั้น:',
      '"' + transcript + '"',
      '',
      'รูปแบบที่ต้องการ:',
      '{"title":"ชื่องาน","summary":"สรุป 1-2 ประโยค","category":"graphic|video|photo|marketing|ai|branding|pos|other","hours":1,"tags":["tag1"]}',
    ].join('\n')
    try {
      const text = await callAI(prompt)
      const clean = text.replace(/```json|```/g, '').trim()
      setAiResult(JSON.parse(clean))
    } catch {
      setAiResult({ title: transcript, summary: transcript, category: 'other', hours: 1, tags: [] })
    }
    setLoading(false)
  }

  function handleCreate() {
    if (!aiResult) return
    onLogCreated({
      title: aiResult.title,
      description: transcript,
      aiSummary: aiResult.summary,
      category: aiResult.category,
      hours: aiResult.hours,
      status: 'done',
      tags: aiResult.tags || [],
      date: new Date().toISOString().split('T')[0],
    })
    setTranscript(''); setAiResult(null)
  }

  const cat = aiResult ? getCat(aiResult.category) : null

  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:16 }}>
        <div style={{ width:42, height:42, borderRadius:12, background:'rgba(108,99,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🎤</div>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e', marginBottom:3 }}>Voice Logger</div>
          <div style={{ fontSize:12, color:'#9ca3af' }}>พูดแทนพิมพ์ — AI แปลงเสียงเป็นงานให้อัตโนมัติ</div>
        </div>
      </div>

      {!supported ? (
        <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'12px 14px', fontSize:13, color:'#DC2626' }}>
          Browser ของคุณไม่รองรับ Voice Input กรุณาใช้ Google Chrome
        </div>
      ) : (
        <>
          <div style={{ textAlign:'center', marginBottom:16 }}>
            <button onClick={toggleListen} style={{
              width:72, height:72, borderRadius:'50%', border:'none',
              background: listening ? 'linear-gradient(135deg,#EF4444,#F87171)' : 'linear-gradient(135deg,#6C63FF,#9B8FFF)',
              color:'white', fontSize:28, cursor:'pointer',
              boxShadow: listening ? '0 0 0 8px rgba(239,68,68,0.15),0 6px 20px rgba(239,68,68,0.35)' : '0 6px 20px rgba(108,99,255,0.4)',
              transition:'all .2s',
            }}>
              {listening ? '⏹' : '🎤'}
            </button>
            <div style={{ fontSize:12, color: listening ? '#EF4444' : '#9ca3af', marginTop:10, fontWeight: listening ? 600 : 400 }}>
              {listening ? 'กำลังฟัง... พูดได้เลย' : 'กดเพื่อเริ่มบันทึกเสียง'}
            </div>
          </div>

          {transcript && (
            <div style={{ marginBottom:12 }}>
              <label style={labelStyle}>ข้อความที่ได้ยิน</label>
              <div style={{ background:'rgba(255,255,255,0.5)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:10, padding:'10px 13px', fontSize:13, color:'#1a1a2e', lineHeight:1.6, minHeight:48 }}>
                {transcript}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button onClick={analyzeVoice} disabled={loading} style={{ ...btnPrimary, fontSize:12, padding:'7px 16px', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'AI กำลังวิเคราะห์...' : '✨ วิเคราะห์ด้วย AI'}
                </button>
                <button onClick={() => { setTranscript(''); setAiResult(null) }} style={{ ...btnGhost, fontSize:12, padding:'7px 14px' }}>ล้าง</button>
              </div>
            </div>
          )}

          {aiResult && (
            <div style={resultBox}>
              <div style={{ fontSize:9, fontWeight:700, color:'#6C63FF', letterSpacing:1, marginBottom:10 }}>AI ANALYSIS</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginBottom:3 }}>ชื่องาน</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>{aiResult.title}</div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginBottom:3 }}>สรุป</div>
                  <div style={{ fontSize:12, color:'#6b7099', lineHeight:1.6 }}>{aiResult.summary}</div>
                </div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  <div>
                    <div style={{ fontSize:10, color:'#9ca3af', marginBottom:3 }}>หมวดหมู่</div>
                    <span style={{ background: cat?.bg, color: cat?.color, fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:20 }}>
                      {cat?.icon} {cat?.label}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:'#9ca3af', marginBottom:3 }}>เวลา</div>
                    <span style={{ fontSize:13, fontWeight:700, color:'#6C63FF' }}>{aiResult.hours} ชม.</span>
                  </div>
                  {aiResult.tags?.length > 0 && (
                    <div>
                      <div style={{ fontSize:10, color:'#9ca3af', marginBottom:3 }}>Tags</div>
                      <div style={{ display:'flex', gap:4 }}>
                        {aiResult.tags.map((t,i) => (
                          <span key={i} style={{ background:'rgba(108,99,255,0.1)', border:'1px solid rgba(108,99,255,0.2)', color:'#6C63FF', fontSize:10, padding:'1px 7px', borderRadius:20 }}>#{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:14, paddingTop:12, borderTop:'1px solid rgba(108,99,255,0.12)' }}>
                <button onClick={handleCreate} style={{ ...btnPrimary, fontSize:12, padding:'7px 16px' }}>บันทึกงานนี้</button>
                <button onClick={() => setAiResult(null)} style={{ ...btnGhost, fontSize:12, padding:'7px 14px' }}>วิเคราะห์ใหม่</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// 2. SMART SEARCH
// ─────────────────────────────────────────
function SmartSearch({ logs }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [mode, setMode] = useState('simple')

  function simpleSearch(q) {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    const lower = q.toLowerCase()
    const found = logs.filter(l =>
      l.title?.toLowerCase().includes(lower) ||
      l.description?.toLowerCase().includes(lower) ||
      l.aiSummary?.toLowerCase().includes(lower) ||
      l.category?.toLowerCase().includes(lower) ||
      l.tags?.some(t => t.toLowerCase().includes(lower))
    )
    setResults(found); setSearched(true)
  }

  async function aiSearch() {
    if (!query.trim()) return
    setLoading(true); setSearched(false)
    try {
      const logList = logs.map((l, i) => [i, l.title, l.category, l.date, (l.aiSummary || l.description || '')].join(' | ')).join('\n')
      const prompt = 'คำค้นหา: "' + query + '"\n\nรายการงาน (index|title|category|date|desc):\n' + logList + '\n\nตอบเป็น JSON array ของ index ที่ตรง เรียงตาม relevance เช่น [0,3,5] ถ้าไม่มีตอบ []'
      const text = await callAI(prompt)
      const clean = text.replace(/```json|```/g, '').trim()
      const indices = JSON.parse(clean)
      setResults(indices.map(i => logs[i]).filter(Boolean))
    } catch { simpleSearch(query) }
    setSearched(true); setLoading(false)
  }

  function handleSearch() {
    if (mode === 'ai') aiSearch()
    else simpleSearch(query)
  }

  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:16 }}>
        <div style={{ width:42, height:42, borderRadius:12, background:'rgba(6,182,212,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🔍</div>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e', marginBottom:3 }}>Smart Search</div>
          <div style={{ fontSize:12, color:'#9ca3af' }}>ค้นหางานด้วยภาษาธรรมชาติหรือ AI</div>
        </div>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:12 }}>
        {[{ k:'simple', label:'ค้นหาทั่วไป' }, { k:'ai', label:'AI Search' }].map(m => (
          <button key={m.k} onClick={() => setMode(m.k)} style={{
            padding:'5px 13px', borderRadius:20, border:'1px solid',
            borderColor: mode === m.k ? 'rgba(108,99,255,0.3)' : 'rgba(200,210,240,0.5)',
            background: mode === m.k ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.5)',
            color: mode === m.k ? '#6C63FF' : '#9ca3af',
            fontSize:12, fontWeight: mode === m.k ? 600 : 400,
            cursor:'pointer', fontFamily:'inherit',
          }}>{m.label}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <input
          style={{ ...inputStyle, flex:1 }}
          placeholder={mode === 'ai' ? 'เช่น งานโมชั่นเดือนที่แล้ว หรือ งานที่ใช้เวลานานสุด' : 'ชื่องาน, หมวดหมู่, แท็ก...'}
          value={query}
          onChange={e => { setQuery(e.target.value); if(mode==='simple') simpleSearch(e.target.value) }}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading || !query.trim()} style={{ ...btnPrimary, fontSize:12, padding:'9px 16px', opacity: (!query.trim() || loading) ? 0.5 : 1 }}>
          {loading ? '⏳' : '🔍'}
        </button>
      </div>

      {searched && (
        <div>
          <div style={{ fontSize:11, color:'#9ca3af', marginBottom:8, fontWeight:500 }}>
            {results.length > 0 ? 'พบ ' + results.length + ' งาน' : 'ไม่พบงานที่ตรงกับคำค้นหา'}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {results.map((log, i) => {
              const cat = getCat(log.category)
              return (
                <div key={i} style={{ background:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.9)', borderRadius:12, padding:'11px 14px', borderLeft:'3px solid ' + cat.color }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'#1a1a2e', flex:1 }}>{log.title}</span>
                    <span style={{ background:cat.bg, color:cat.color, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>{cat.icon} {cat.label}</span>
                    <span style={{ fontSize:11, color:'#9ca3af' }}>{fmtDate(log.date)}</span>
                  </div>
                  {(log.aiSummary || log.description) && (
                    <div style={{ fontSize:11, color:'#9ca3af', lineHeight:1.5 }}>
                      {(log.aiSummary || log.description).slice(0, 100)}{(log.aiSummary || log.description).length > 100 ? '...' : ''}
                    </div>
                  )}
                  <div style={{ fontSize:11, color:cat.color, fontWeight:600, marginTop:4 }}>{log.hours} ชม.</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// 3. AI COACH + BURNOUT
// ─────────────────────────────────────────
function AICoach({ logs }) {
  const [coaching, setCoaching] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('coach')

  function getBurnout() {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
    const last7 = logs.filter(l => new Date(l.date) >= cutoff)
    const hours7 = last7.reduce((s, l) => s + (l.hours || 0), 0)
    const days7 = new Set(last7.map(l => l.date)).size
    const avgH = days7 > 0 ? Math.round((hours7 / days7) * 10) / 10 : 0

    let score = 0
    if (avgH > 6) score += 30
    if (avgH > 8) score += 20
    if (days7 >= 6) score += 25
    if (last7.length > 10) score += 15
    if (last7.length > 15) score += 10
    score = Math.min(score, 100)

    const color = score < 30 ? '#10B981' : score < 60 ? '#F59E0B' : '#EF4444'
    const label = score < 30 ? 'สมดุลดี' : score < 60 ? 'ควรระวัง' : 'เสี่ยง Burnout'
    const emoji = score < 30 ? '😊' : score < 60 ? '😐' : '😰'
    const level = score < 30 ? 'low' : score < 60 ? 'medium' : 'high'
    return { score, color, label, emoji, level, hours7, days7, avgH, count7: last7.length }
  }

  async function getCoaching() {
    setLoading(true)
    const b = getBurnout()
    const total = logs.length
    const hours = logs.reduce((s, l) => s + (l.hours || 0), 0)
    const topEntry = Object.entries(logs.reduce((acc, l) => { acc[l.category] = (acc[l.category] || 0) + 1; return acc }, {})).sort((a,b) => b[1]-a[1])[0]
    const topCat = topEntry ? getCat(topEntry[0]).label : 'ไม่มีข้อมูล'

    const prompt = [
      'คุณเป็น AI Work Coach ให้คำแนะนำ 4 ข้อ ภาษาไทย กระชับ:',
      'งาน: ' + total + ' ชิ้น รวม ' + hours + ' ชม.',
      '7 วันล่าสุด: ' + b.count7 + ' งาน ' + b.hours7 + ' ชม. ' + b.days7 + ' วัน เฉลี่ย ' + b.avgH + ' ชม/วัน',
      'Burnout score: ' + b.score + '/100 (' + b.label + ')',
      'หมวดหลัก: ' + topCat,
      '',
      'ตอบ 4 ข้อ ขึ้นต้นแต่ละข้อด้วย emoji และหัวข้อ เช่น "วิเคราะห์:" ไม่ใช้ ** หรือ markdown',
    ].join('\n')

    try {
      const text = await callAI(prompt)
      setCoaching(text)
    } catch {
      setCoaching('ไม่สามารถเชื่อม AI ได้ในขณะนี้')
    }
    setLoading(false)
  }

  const b = getBurnout()

  const adviceMap = {
    low: 'การทำงานของคุณอยู่ในระดับสมดุลดีมาก ทำต่อไปในแบบนี้ และอย่าลืมพักผ่อนสม่ำเสมอ',
    medium: 'ชั่วโมงทำงานสูงกว่าเกณฑ์นิดหน่อย ลองจัดเวลาพักระหว่างวัน และตรวจสอบ priority ของงาน',
    high: 'ตรวจพบสัญญาณเสี่ยง Burnout ควรลดภาระงานลง 20-30% และเพิ่มเวลาพักผ่อนโดยด่วน',
  }

  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:16 }}>
        <div style={{ width:42, height:42, borderRadius:12, background:'rgba(139,92,246,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🧠</div>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e', marginBottom:3 }}>AI Coach</div>
          <div style={{ fontSize:12, color:'#9ca3af' }}>วิเคราะห์ผลงาน ตรวจ Burnout และให้คำแนะนำ</div>
        </div>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {[{k:'coach',label:'AI Coaching'},{k:'burnout',label:'Burnout Check'}].map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k)} style={{
            padding:'6px 14px', borderRadius:20, border:'1px solid',
            borderColor: activeTab===t.k ? 'rgba(139,92,246,0.3)' : 'rgba(200,210,240,0.5)',
            background: activeTab===t.k ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.5)',
            color: activeTab===t.k ? '#8B5CF6' : '#9ca3af',
            fontSize:12, fontWeight: activeTab===t.k ? 600 : 400,
            cursor:'pointer', fontFamily:'inherit',
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'coach' && (
        <div>
          {!coaching && !loading && (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🧠</div>
              <div style={{ fontSize:13, color:'#9ca3af', marginBottom:16, lineHeight:1.6 }}>
                AI จะวิเคราะห์ pattern การทำงานของคุณและให้คำแนะนำที่ตรงจุด
              </div>
              <button onClick={getCoaching} style={btnPrimary}>วิเคราะห์ผลงานของฉัน</button>
            </div>
          )}
          {loading && (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>⏳</div>
              <div style={{ fontSize:13, color:'#6C63FF' }}>AI กำลังวิเคราะห์...</div>
            </div>
          )}
          {coaching && (
            <div>
              <div style={resultBox}>
                <div style={{ fontSize:9, fontWeight:700, color:'#6C63FF', letterSpacing:1, marginBottom:10 }}>AI COACHING RESULT</div>
                <div style={{ fontSize:13, color:'#1a1a2e', lineHeight:1.9, whiteSpace:'pre-wrap' }}>{coaching}</div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button onClick={getCoaching} style={{ ...btnGhost, fontSize:12, padding:'7px 14px' }}>วิเคราะห์ใหม่</button>
                <button onClick={() => navigator.clipboard?.writeText(coaching)} style={{ ...btnGhost, fontSize:12, padding:'7px 14px' }}>คัดลอก</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'burnout' && (
        <div>
          <div style={{ background:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.9)', borderRadius:16, padding:20, textAlign:'center', marginBottom:14 }}>
            <div style={{ fontSize:48, marginBottom:8 }}>{b.emoji}</div>
            <div style={{ fontSize:13, color:'#9ca3af', marginBottom:6 }}>Burnout Risk Score</div>
            <div style={{ fontSize:40, fontWeight:800, color:b.color, lineHeight:1 }}>
              {b.score}<span style={{ fontSize:20, fontWeight:400, color:'#9ca3af' }}>/100</span>
            </div>
            <div style={{ display:'inline-block', marginTop:8, background:b.color+'15', border:'1px solid '+b.color+'30', color:b.color, fontSize:13, fontWeight:700, padding:'4px 14px', borderRadius:20 }}>
              {b.label}
            </div>
            <div style={{ margin:'14px 0 0', height:8, background:'rgba(0,0,0,0.06)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:b.score+'%', background:b.color, borderRadius:4, transition:'width .6s ease' }}/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
            {[
              { label:'งาน 7 วัน',     value:b.count7,  unit:'งาน', warn:b.count7 > 10  },
              { label:'ชั่วโมง 7 วัน', value:b.hours7,  unit:'ชม.', warn:b.hours7 > 40  },
              { label:'วันที่ทำงาน',   value:b.days7,   unit:'วัน', warn:b.days7 >= 6   },
              { label:'เฉลี่ย/วัน',    value:b.avgH,    unit:'ชม.', warn:b.avgH > 8     },
            ].map((s, i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.55)', border:'1px solid '+(s.warn?'rgba(245,158,11,0.25)':'rgba(255,255,255,0.85)'), borderRadius:12, padding:'11px 13px' }}>
                <div style={{ fontSize:10, color:'#9ca3af', marginBottom:3 }}>{s.label}</div>
                <div style={{ fontSize:18, fontWeight:700, color:s.warn?'#D97706':'#1a1a2e' }}>
                  {s.value}<span style={{ fontSize:11, color:'#9ca3af', marginLeft:2 }}>{s.unit}</span>
                  {s.warn && <span style={{ fontSize:11, marginLeft:4 }}>⚠️</span>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:b.color+'10', border:'1px solid '+b.color+'20', borderRadius:12, padding:'13px 15px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:b.color, letterSpacing:1, marginBottom:6 }}>RECOMMENDATION</div>
            <div style={{ fontSize:12, color:'#6b7099', lineHeight:1.7 }}>{adviceMap[b.level]}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// 4. AUTO CATEGORIZE
// ─────────────────────────────────────────
function AutoCategorize() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function analyze() {
    if (!input.trim()) return
    setLoading(true)
    const prompt = [
      'วิเคราะห์งานนี้และตอบเป็น JSON เท่านั้น:',
      '"' + input + '"',
      '',
      '{"category":"graphic|video|photo|marketing|ai|branding|pos|other","confidence":0-100,"reason":"เหตุผล","estimatedHours":1,"suggestedTags":["tag1"],"priority":"low|medium|high"}',
    ].join('\n')
    try {
      const text = await callAI(prompt)
      const clean = text.replace(/```json|```/g, '').trim()
      setResult(JSON.parse(clean))
    } catch {
      setResult({ category:'other', confidence:50, reason:'ไม่สามารถวิเคราะห์ได้', estimatedHours:2, suggestedTags:[], priority:'medium' })
    }
    setLoading(false)
  }

  const cat = result ? getCat(result.category) : null
  const priorityLabel = { low:'ต่ำ', medium:'กลาง', high:'สูง' }
  const priorityColor = { low:'#10B981', medium:'#F59E0B', high:'#EF4444' }

  return (
    <div style={card}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:16 }}>
        <div style={{ width:42, height:42, borderRadius:12, background:'rgba(16,185,129,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🏷️</div>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e', marginBottom:3 }}>Smart Auto-Categorize</div>
          <div style={{ fontSize:12, color:'#9ca3af' }}>AI จัดหมวดหมู่งานให้อัตโนมัติ พร้อมประมาณเวลาและแท็ก</div>
        </div>
      </div>

      <div style={{ marginBottom:10 }}>
        <label style={labelStyle}>ชื่องานหรือรายละเอียด</label>
        <textarea
          style={{ ...inputStyle, minHeight:72, resize:'vertical', lineHeight:1.6 }}
          placeholder="เช่น ทำโปสเตอร์เปิดตัวสินค้าใหม่สำหรับ TikTok"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
      </div>

      <button onClick={analyze} disabled={loading || !input.trim()} style={{ ...btnPrimary, fontSize:12, padding:'8px 18px', opacity:(!input.trim()||loading)?0.5:1 }}>
        {loading ? 'กำลังวิเคราะห์...' : '🏷️ วิเคราะห์งาน'}
      </button>

      {result && (
        <div style={resultBox}>
          <div style={{ fontSize:9, fontWeight:700, color:'#6C63FF', letterSpacing:1, marginBottom:12 }}>AI RESULT</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <div style={{ background:'rgba(255,255,255,0.6)', borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:'#9ca3af', marginBottom:4 }}>หมวดหมู่</div>
              <span style={{ background:cat?.bg, color:cat?.color, fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
                {cat?.icon} {cat?.label}
              </span>
              <div style={{ fontSize:10, color:'#9ca3af', marginTop:4 }}>ความมั่นใจ {result.confidence}%</div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.6)', borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:'#9ca3af', marginBottom:4 }}>เวลาโดยประมาณ</div>
              <div style={{ fontSize:18, fontWeight:700, color:'#6C63FF' }}>{result.estimatedHours} ชม.</div>
              <div style={{ fontSize:10, color:priorityColor[result.priority]||'#9ca3af', marginTop:4, fontWeight:600 }}>
                Priority: {priorityLabel[result.priority]||result.priority}
              </div>
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:'#9ca3af', marginBottom:4 }}>เหตุผล</div>
            <div style={{ fontSize:12, color:'#6b7099', lineHeight:1.6 }}>{result.reason}</div>
          </div>
          {result.suggestedTags?.length > 0 && (
            <div>
              <div style={{ fontSize:10, color:'#9ca3af', marginBottom:6 }}>แท็กที่แนะนำ</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {result.suggestedTags.map((t, i) => (
                  <span key={i} style={{ background:'rgba(108,99,255,0.1)', border:'1px solid rgba(108,99,255,0.2)', color:'#6C63FF', fontSize:11, padding:'2px 8px', borderRadius:20 }}>#{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function AIAssistantPage({ logs, onLogCreated }) {
  const features = [
    { icon:'🎤', label:'Voice Logger',      desc:'พูดแทนพิมพ์'          },
    { icon:'🔍', label:'Smart Search',      desc:'ค้นหาด้วย AI'         },
    { icon:'🧠', label:'AI Coach',          desc:'วิเคราะห์ผลงาน'       },
    { icon:'🏷️', label:'Auto-Categorize',  desc:'จัดหมวดหมู่อัตโนมัติ' },
  ]

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:20, fontWeight:700, color:'#1a1a2e' }}>AI Assistant</div>
        <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>เครื่องมือ AI ที่ช่วยให้การบันทึกงานง่ายขึ้น</div>
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.9)', borderRadius:20, padding:'6px 13px', boxShadow:'0 2px 8px rgba(100,110,200,0.06)' }}>
            <span style={{ fontSize:14 }}>{f.icon}</span>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e', lineHeight:1.2 }}>{f.label}</div>
              <div style={{ fontSize:10, color:'#9ca3af' }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <VoiceLogger onLogCreated={onLogCreated} />
      <SmartSearch logs={logs} />
      <AICoach logs={logs} />
      <AutoCategorize />
    </div>
  )
}
