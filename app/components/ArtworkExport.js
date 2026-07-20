"use client"
// Artwork report exports — PDF (@react-pdf, Thai font) + Excel (exceljs).
// Client-side, professional layout: cover band, KPI cards, type distribution,
// and a per-task artwork gallery with large previews. Supports a date range.
import {
  Document, Page, Text, View, StyleSheet, Font, Image, pdf
} from '@react-pdf/renderer'

Font.register({
  family: 'IBMPlexSansThai',
  fonts: [
    { src: '/fonts/IBMPlexSansThai-Regular.ttf',  fontWeight: 400 },
    { src: '/fonts/IBMPlexSansThai-Medium.ttf',   fontWeight: 500 },
    { src: '/fonts/IBMPlexSansThai-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/IBMPlexSansThai-Bold.ttf',     fontWeight: 700 },
  ],
})
Font.registerHyphenationCallback(word => [word])

const F = 'IBMPlexSansThai'
const ACCENT = '#6C63FF', PINK = '#EC4899', TEXT = '#1a1a2e', TEXT2 = '#6b7099', TEXT3 = '#9ca3af'
const GREEN = '#10B981', AMBER = '#F59E0B'

const AW_TYPE_LABEL = {
  banner:'Banner', poster:'Poster', logo:'Logo', video:'Video', facebook:'Facebook',
  motion:'Motion', brochure:'Brochure', website:'Website', ui:'UI', mockup:'Mockup', other:'อื่นๆ',
}
const AW_ST_LABEL = { pending:'รอเริ่ม', doing:'กำลังทำ', done:'เสร็จ' }
const AW_ST_COLOR = { pending:TEXT3, doing:AMBER, done:GREEN }

// Shared aggregation (backward compat: task without artworks = 1 piece)
export function aggregateArtworks(logs){
  let total=0, done=0, doing=0, pending=0
  const byType={}
  logs.forEach(l=>{
    const list=l.artworks||[]
    if(!list.length){ total+=1; if(l.status==='done')done+=1; else if(l.status==='in_progress')doing+=1; else pending+=1 }
    else list.forEach(a=>{
      total+=1; byType[a.type||'other']=(byType[a.type||'other']||0)+1
      if(a.status==='done')done+=1; else if(a.status==='doing')doing+=1; else pending+=1
    })
  })
  return { total, done, doing, pending, byType }
}

const S = StyleSheet.create({
  page: { fontFamily:F, fontSize:10, color:TEXT, backgroundColor:'#F7F7FE', paddingTop:32, paddingBottom:54, paddingHorizontal:36 },

  // ── Cover band ──
  band: { backgroundColor:ACCENT, borderRadius:16, padding:22, marginBottom:14 },
  eyebrow: { fontSize:7.5, fontWeight:600, color:'rgba(255,255,255,0.72)', letterSpacing:2.2, marginBottom:8 },
  h1: { fontSize:24, fontWeight:700, color:'#FFFFFF', marginBottom:3 },
  bandSub: { fontSize:10.5, color:'rgba(255,255,255,0.85)' },
  bandMeta: { fontSize:8.5, color:'rgba(255,255,255,0.6)', marginTop:2 },
  bandStats: { flexDirection:'row', gap:7, marginTop:16 },
  bandStat: { flex:1, backgroundColor:'rgba(255,255,255,0.14)', borderRadius:10, paddingVertical:10, paddingHorizontal:8 },
  bandStatNum: { fontSize:19, fontWeight:700, color:'#FFFFFF' },
  bandStatLabel: { fontSize:7.5, color:'rgba(255,255,255,0.72)', marginTop:2 },

  // ── Sections ──
  section: { fontSize:12.5, fontWeight:700, marginTop:12, marginBottom:8, color:TEXT },
  sectionSub: { fontSize:8.5, fontWeight:400, color:TEXT3 },

  // ── Type distribution ──
  typeCard: { backgroundColor:'#FFFFFF', borderRadius:12, padding:14, borderWidth:1, borderColor:'#ECEAFB' },
  typeRow: { flexDirection:'row', alignItems:'center', marginBottom:6, gap:8 },
  typeName: { width:64, fontSize:9, fontWeight:600, color:TEXT2 },
  typeBarWrap: { flex:1, height:9, backgroundColor:'#EEECFB', borderRadius:5 },
  typeBar: { height:9, borderRadius:5, backgroundColor:ACCENT },
  typeCount: { width:30, fontSize:9.5, fontWeight:700, color:ACCENT, textAlign:'right' },

  // ── Task block ──
  task: { backgroundColor:'#FFFFFF', borderRadius:14, padding:14, marginBottom:12, borderWidth:1, borderColor:'#ECEAFB' },
  taskHead: { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10, gap:8 },
  taskTitle: { fontSize:12, fontWeight:700, flex:1 },
  taskMetaWrap: { alignItems:'flex-end' },
  taskDate: { fontSize:8.5, color:TEXT3 },
  taskCount: { fontSize:9, fontWeight:700, color:ACCENT, marginTop:1 },
  taskProgressWrap: { height:5, backgroundColor:'#EEECFB', borderRadius:3, marginBottom:12 },
  taskProgress: { height:5, borderRadius:3, backgroundColor:GREEN },

  // ── Artwork gallery card ──
  awGrid: { flexDirection:'row', flexWrap:'wrap', gap:8 },
  awCard: { width:'31.7%', backgroundColor:'#FAFAFF', borderRadius:10, borderWidth:1, borderColor:'#EEECFB', overflow:'hidden' },
  awImg: { width:'100%', height:92, objectFit:'cover', backgroundColor:'#EEECFB' },
  awPlaceholder: { width:'100%', height:92, backgroundColor:'#EEECFB', alignItems:'center', justifyContent:'center' },
  awPlaceholderText: { fontSize:9, fontWeight:600, color:ACCENT },
  awBody: { padding:8 },
  awTitle: { fontSize:9, fontWeight:700, marginBottom:4 },
  awChipRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  awType: { fontSize:7.5, color:TEXT2, backgroundColor:'#EEECFB', paddingHorizontal:6, paddingVertical:2, borderRadius:6 },
  awSt: { fontSize:7.5, fontWeight:700 },

  footer: { position:'absolute', bottom:22, left:36, right:36, flexDirection:'row', justifyContent:'space-between', borderTopWidth:0.75, borderTopColor:'#E3E0F5', paddingTop:7 },
  footerText: { fontSize:7.5, color:TEXT3 },
})

function ArtworkPDF({ logs, periodLabel }){
  const agg = aggregateArtworks(logs)
  const types = Object.entries(agg.byType).map(([id,c])=>({ id, c })).sort((a,b)=>b.c-a.c)
  const maxType = types[0]?.c || 1
  const withAw = logs.filter(l=>(l.artworks||[]).length>0)
  const dstr = new Date().toLocaleDateString('th-TH',{ day:'numeric', month:'long', year:'numeric' })
  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Cover band */}
        <View style={S.band}>
          <Text style={S.eyebrow}>STAYSCAPE · ARTWORK REPORT</Text>
          <Text style={S.h1}>รายงานชิ้นงาน</Text>
          <Text style={S.bandSub}>ช่วงเวลา: {periodLabel || 'ทั้งหมด'}</Text>
          <Text style={S.bandMeta}>สร้างเมื่อ {dstr}</Text>
          <View style={S.bandStats}>
            {[
              [logs.length, 'งานทั้งหมด'],
              [agg.total, 'ชิ้นงานทั้งหมด'],
              [agg.done, 'เสร็จแล้ว'],
              [agg.doing, 'กำลังทำ'],
              [agg.pending, 'รอเริ่ม'],
            ].map(([n,l],i)=>(
              <View key={i} style={S.bandStat}>
                <Text style={S.bandStatNum}>{n}</Text>
                <Text style={S.bandStatLabel}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Type distribution */}
        {types.length>0 && (
          <View>
            <Text style={S.section}>ประเภทชิ้นงาน</Text>
            <View style={S.typeCard}>
              {types.map(t=>(
                <View key={t.id} style={S.typeRow}>
                  <Text style={S.typeName}>{AW_TYPE_LABEL[t.id]||t.id}</Text>
                  <View style={S.typeBarWrap}><View style={[S.typeBar,{width:`${Math.max(4,Math.round(t.c/maxType*100))}%`}]}/></View>
                  <Text style={S.typeCount}>{t.c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Per-task artwork gallery */}
        <Text style={S.section}>
          ผลงาน  <Text style={S.sectionSub}>({withAw.length} งาน · {withAw.reduce((s,l)=>s+(l.artworks||[]).length,0)} ชิ้นงาน)</Text>
        </Text>
        {withAw.map(l=>{
          const list = l.artworks||[]
          const doneN = list.filter(a=>a.status==='done').length
          return (
            <View key={l.id} style={S.task} wrap={false}>
              <View style={S.taskHead}>
                <Text style={S.taskTitle}>{l.title||'ไม่มีชื่อ'}</Text>
                <View style={S.taskMetaWrap}>
                  <Text style={S.taskDate}>{l.date||''}</Text>
                  <Text style={S.taskCount}>{doneN}/{list.length} ชิ้นเสร็จ</Text>
                </View>
              </View>
              <View style={S.taskProgressWrap}>
                <View style={[S.taskProgress,{width:`${list.length?Math.round(doneN/list.length*100):0}%`}]}/>
              </View>
              <View style={S.awGrid}>
                {list.map((a,i)=>(
                  <View key={a.id||i} style={S.awCard}>
                    {a.thumbnail
                      ? <Image src={a.thumbnail} style={S.awImg}/>
                      : <View style={S.awPlaceholder}><Text style={S.awPlaceholderText}>{AW_TYPE_LABEL[a.type]||'Artwork'}</Text></View>}
                    <View style={S.awBody}>
                      <Text style={S.awTitle}>{a.title}</Text>
                      <View style={S.awChipRow}>
                        <Text style={S.awType}>{AW_TYPE_LABEL[a.type]||a.type||'-'}</Text>
                        <Text style={[S.awSt,{color:AW_ST_COLOR[a.status]||TEXT3}]}>{AW_ST_LABEL[a.status]||a.status}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )
        })}
        {withAw.length===0 && (
          <View style={[S.typeCard,{alignItems:'center',paddingVertical:24}]}>
            <Text style={{fontSize:10,color:TEXT3}}>ไม่มีงานที่เพิ่มชิ้นงานในช่วงเวลานี้ — งานเดิมนับเป็นงานละ 1 ชิ้นใน KPI</Text>
          </View>
        )}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>StayScape · Artwork Report · {periodLabel || 'ทั้งหมด'}</Text>
          <Text style={S.footerText} render={({pageNumber,totalPages})=>`หน้า ${pageNumber} / ${totalPages}`}/>
        </View>
      </Page>
    </Document>
  )
}

function saveBlob(blob, filename){
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export async function downloadArtworkPDF(logs, periodLabel=''){
  const blob = await pdf(<ArtworkPDF logs={logs} periodLabel={periodLabel}/>).toBlob()
  saveBlob(blob, `artwork-report-${new Date().toISOString().slice(0,10)}.pdf`)
}

export async function downloadArtworkExcel(logs, periodLabel=''){
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'StayScape'
  const agg = aggregateArtworks(logs)

  const s1 = wb.addWorksheet('สรุป')
  s1.columns = [{ header:'ตัวชี้วัด', key:'k', width:26 }, { header:'ค่า', key:'v', width:18 }]
  s1.addRows([
    { k:'ช่วงเวลา', v:periodLabel || 'ทั้งหมด' },
    { k:'งานทั้งหมด', v:logs.length },
    { k:'ชิ้นงานทั้งหมด', v:agg.total },
    { k:'เสร็จแล้ว', v:agg.done },
    { k:'กำลังทำ', v:agg.doing },
    { k:'รอเริ่ม', v:agg.pending },
    ...Object.entries(agg.byType).sort((a,b)=>b[1]-a[1]).map(([t,c])=>({ k:'ประเภท: '+(AW_TYPE_LABEL[t]||t), v:c })),
  ])
  s1.getRow(1).font = { bold:true }

  const s2 = wb.addWorksheet('Artworks')
  s2.columns = [
    { header:'Task', key:'task', width:34 },
    { header:'Artwork', key:'aw', width:30 },
    { header:'Type', key:'type', width:12 },
    { header:'Status', key:'st', width:12 },
    { header:'Created', key:'created', width:14 },
  ]
  logs.forEach(l=>{
    const list=l.artworks||[]
    if(!list.length){ s2.addRow({ task:l.title, aw:'(งานนับเป็น 1 ชิ้น)', type:'-', st:l.status==='done'?'เสร็จ':l.status==='in_progress'?'กำลังทำ':'รอเริ่ม', created:l.date||'' }) }
    else list.forEach(a=>s2.addRow({
      task:l.title, aw:a.title, type:AW_TYPE_LABEL[a.type]||a.type||'-',
      st:AW_ST_LABEL[a.status]||a.status, created:(a.created_at||'').slice(0,10)||l.date||'',
    }))
  })
  s2.getRow(1).font = { bold:true }

  const buf = await wb.xlsx.writeBuffer()
  saveBlob(new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `artwork-report-${new Date().toISOString().slice(0,10)}.xlsx`)
}
