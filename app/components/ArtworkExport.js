"use client"
// Artwork report exports — PDF (@react-pdf, Thai font) + Excel (exceljs).
// Client-side, mirrors ReportPDF.jsx conventions.
import {
  Document, Page, Text, View, StyleSheet, Font, Image, pdf
} from '@react-pdf/renderer'

Font.register({
  family: 'IBMPlexSansThai',
  fonts: [
    { src: '/fonts/IBMPlexSansThai-Regular.ttf',  fontWeight: 400 },
    { src: '/fonts/IBMPlexSansThai-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/IBMPlexSansThai-Bold.ttf',     fontWeight: 700 },
  ],
})
Font.registerHyphenationCallback(word => [word])

const F = 'IBMPlexSansThai'
const ACCENT = '#6C63FF', PINK = '#EC4899', TEXT = '#1a1a2e', TEXT3 = '#9ca3af'

const AW_TYPE_LABEL = {
  banner:'Banner', poster:'Poster', logo:'Logo', video:'Video', facebook:'Facebook',
  motion:'Motion', brochure:'Brochure', website:'Website', ui:'UI', mockup:'Mockup', other:'อื่นๆ',
}
const AW_ST_LABEL = { pending:'รอเริ่ม', doing:'กำลังทำ', done:'เสร็จ' }
const AW_ST_COLOR = { pending:'#9ca3af', doing:'#F59E0B', done:'#10B981' }

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
  page: { fontFamily:F, fontSize:10, color:TEXT, backgroundColor:'#FAFBFF', paddingTop:40, paddingBottom:52, paddingHorizontal:42 },
  h1: { fontSize:22, fontWeight:700, color:ACCENT, marginBottom:2 },
  sub: { fontSize:10, color:TEXT3, marginBottom:16 },
  statRow: { flexDirection:'row', gap:8, marginBottom:16 },
  stat: { flex:1, backgroundColor:'#FFFFFF', borderRadius:10, padding:10, borderWidth:1, borderColor:'#EEE9FF' },
  statNum: { fontSize:18, fontWeight:700, color:ACCENT },
  statLabel: { fontSize:8, color:TEXT3, marginTop:2 },
  section: { fontSize:12, fontWeight:700, marginTop:10, marginBottom:8, color:TEXT },
  typeRow: { flexDirection:'row', alignItems:'center', marginBottom:4, gap:6 },
  typeName: { width:70, fontSize:9, color:'#6b7099' },
  typeBarWrap: { flex:1, height:7, backgroundColor:'#EEECFB', borderRadius:4 },
  typeBar: { height:7, borderRadius:4, backgroundColor:ACCENT },
  typeCount: { width:24, fontSize:9, fontWeight:700, color:ACCENT, textAlign:'right' },
  task: { backgroundColor:'#FFFFFF', borderRadius:10, padding:10, marginBottom:8, borderWidth:1, borderColor:'#EEE9FF' },
  taskTitle: { fontSize:11, fontWeight:700, marginBottom:2 },
  taskMeta: { fontSize:8, color:TEXT3, marginBottom:5 },
  awRow: { flexDirection:'row', alignItems:'center', gap:6, paddingVertical:2.5, borderBottomWidth:0.5, borderBottomColor:'#F1EFFB' },
  awThumb: { width:16, height:16, borderRadius:3, objectFit:'cover' },
  awTitle: { flex:1, fontSize:9 },
  awType: { width:56, fontSize:8, color:TEXT3 },
  awSt: { width:44, fontSize:8, fontWeight:700, textAlign:'right' },
  footer: { position:'absolute', bottom:24, left:42, right:42, flexDirection:'row', justifyContent:'space-between' },
  footerText: { fontSize:8, color:TEXT3 },
})

function ArtworkPDF({ logs }){
  const agg = aggregateArtworks(logs)
  const types = Object.entries(agg.byType).map(([id,c])=>({ id, c })).sort((a,b)=>b.c-a.c)
  const maxType = types[0]?.c || 1
  const withAw = logs.filter(l=>(l.artworks||[]).length>0)
  const dstr = new Date().toLocaleDateString('th-TH',{ day:'numeric', month:'long', year:'numeric' })
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.h1}>รายงานชิ้นงาน (Artwork Report)</Text>
        <Text style={S.sub}>StayScape · สร้างเมื่อ {dstr}</Text>
        <View style={S.statRow}>
          <View style={S.stat}><Text style={S.statNum}>{logs.length}</Text><Text style={S.statLabel}>งานทั้งหมด</Text></View>
          <View style={S.stat}><Text style={[S.statNum,{color:PINK}]}>{agg.total}</Text><Text style={S.statLabel}>ชิ้นงานทั้งหมด</Text></View>
          <View style={S.stat}><Text style={[S.statNum,{color:'#10B981'}]}>{agg.done}</Text><Text style={S.statLabel}>เสร็จแล้ว</Text></View>
          <View style={S.stat}><Text style={[S.statNum,{color:'#F59E0B'}]}>{agg.doing}</Text><Text style={S.statLabel}>กำลังทำ</Text></View>
          <View style={S.stat}><Text style={[S.statNum,{color:TEXT3}]}>{agg.pending}</Text><Text style={S.statLabel}>รอเริ่ม</Text></View>
        </View>
        {types.length>0 && (<>
          <Text style={S.section}>ประเภทชิ้นงาน</Text>
          {types.map(t=>(
            <View key={t.id} style={S.typeRow}>
              <Text style={S.typeName}>{AW_TYPE_LABEL[t.id]||t.id}</Text>
              <View style={S.typeBarWrap}><View style={[S.typeBar,{width:`${Math.round(t.c/maxType*100)}%`}]}/></View>
              <Text style={S.typeCount}>{t.c}</Text>
            </View>
          ))}
        </>)}
        <Text style={S.section}>งานและชิ้นงาน ({withAw.length} งานที่มีชิ้นงาน)</Text>
        {withAw.map(l=>(
          <View key={l.id} style={S.task} wrap={false}>
            <Text style={S.taskTitle}>{l.title||'ไม่มีชื่อ'}</Text>
            <Text style={S.taskMeta}>{l.date||''} · {(l.artworks||[]).length} ชิ้นงาน · เสร็จ {(l.artworks||[]).filter(a=>a.status==='done').length}</Text>
            {(l.artworks||[]).map((a,i)=>(
              <View key={a.id||i} style={S.awRow}>
                {a.thumbnail ? <Image src={a.thumbnail} style={S.awThumb}/> : null}
                <Text style={S.awTitle}>{a.title}</Text>
                <Text style={S.awType}>{AW_TYPE_LABEL[a.type]||a.type||'-'}</Text>
                <Text style={[S.awSt,{color:AW_ST_COLOR[a.status]||TEXT3}]}>{AW_ST_LABEL[a.status]||a.status}</Text>
              </View>
            ))}
          </View>
        ))}
        {withAw.length===0 && <Text style={{fontSize:9,color:TEXT3}}>ยังไม่มีงานที่เพิ่มชิ้นงาน — งานเดิมนับเป็นงานละ 1 ชิ้นใน KPI</Text>}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>StayScape · Artwork Report</Text>
          <Text style={S.footerText} render={({pageNumber,totalPages})=>`${pageNumber} / ${totalPages}`}/>
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

export async function downloadArtworkPDF(logs){
  const blob = await pdf(<ArtworkPDF logs={logs}/>).toBlob()
  saveBlob(blob, `artwork-report-${new Date().toISOString().slice(0,10)}.pdf`)
}

export async function downloadArtworkExcel(logs){
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'StayScape'
  const agg = aggregateArtworks(logs)

  const s1 = wb.addWorksheet('สรุป')
  s1.columns = [{ header:'ตัวชี้วัด', key:'k', width:26 }, { header:'ค่า', key:'v', width:14 }]
  s1.addRows([
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
