// Production Excel export (exceljs, lazy-imported). Four sheets with live
// formulas so totals recalculate if the user edits rows in Excel.
import { getCat, hoursOf, notesOf, isDone, safeFileName, formatDay, logDate } from './shared'

const ACCENT = 'FF6C63FF'
const HEADER_BG = 'FF1E1B4B'
const ZEBRA = 'FFF4F4FF'

function styleHeader(row) {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } }
  })
  row.height = 22
}

function styleTitle(sheet, cellRef, text) {
  sheet.getCell(cellRef).value = text
  sheet.getCell(cellRef).font = { bold: true, size: 16, color: { argb: ACCENT } }
}

export async function exportToExcel({ logs, stats, meta }) {
  const mod = await import('exceljs')
  const ExcelJS = (mod.default && mod.default.Workbook) ? mod.default : mod
  const wb = new ExcelJS.Workbook()
  wb.creator = meta?.brand || 'StayScape'
  wb.created = new Date()

  const periodLabel = meta?.periodLabel || ''

  // ── Sheet 2 first conceptually: All Tasks (referenced by formulas) ──
  const tasks = wb.addWorksheet('All Tasks', { views: [{ state: 'frozen', ySplit: 2 }] })
  styleTitle(tasks, 'A1', `All Tasks — ${periodLabel}`)
  tasks.mergeCells('A1:H1')
  const taskHeader = tasks.addRow(['Date', 'Title', 'Project / Category', 'Status', 'Hours', 'Tags', 'Description', 'Notes'])
  styleHeader(taskHeader)
  tasks.columns = [
    { width: 14 }, { width: 36 }, { width: 20 }, { width: 14 },
    { width: 9 }, { width: 22 }, { width: 40 }, { width: 40 },
  ]
  const sorted = [...(logs || [])].sort((a, b) => String(logDate(a)).localeCompare(String(logDate(b))))
  sorted.forEach((l, i) => {
    const r = tasks.addRow([
      logDate(l) || '',
      l.title || '',
      getCat(l.category).label,
      isDone(l) ? 'Completed' : (l.status === 'in_progress' ? 'In Progress' : 'Draft'),
      hoursOf(l),
      (Array.isArray(l.tags) ? l.tags : []).join(', '),
      l.description || '',
      notesOf(l),
    ])
    if (i % 2 === 1) r.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } } })
    r.getCell(5).numFmt = '0.0'
    r.alignment = { vertical: 'top', wrapText: true }
  })
  const firstDataRow = 3
  const lastDataRow = 2 + sorted.length
  const hoursRange = lastDataRow >= firstDataRow ? `E${firstDataRow}:E${lastDataRow}` : 'E3:E3'
  const statusRange = lastDataRow >= firstDataRow ? `D${firstDataRow}:D${lastDataRow}` : 'D3:D3'

  // ── Sheet 1: Monthly Summary (with formulas referencing All Tasks) ──
  const summary = wb.addWorksheet('Monthly Summary')
  summary.columns = [{ width: 28 }, { width: 24 }, { width: 16 }]
  styleTitle(summary, 'A1', `Monthly Work Report — ${periodLabel}`)
  summary.mergeCells('A1:C1')
  summary.getCell('A2').value = meta?.brand || 'StayScape'
  summary.getCell('A2').font = { italic: true, color: { argb: 'FF64748B' } }

  summary.addRow([]) // row 3 spacer
  const mh = summary.addRow(['Metric', 'Value', 'Unit'])
  styleHeader(mh)
  const metrics = [
    ['Total Tasks', { formula: `COUNTA('All Tasks'!B${firstDataRow}:B${lastDataRow})` }, 'tasks'],
    ['Completed Tasks', { formula: `COUNTIF('All Tasks'!${statusRange},"Completed")` }, 'tasks'],
    ['In Progress', { formula: `COUNTIF('All Tasks'!${statusRange},"In Progress")` }, 'tasks'],
    ['Total Hours', { formula: `SUM('All Tasks'!${hoursRange})` }, 'hours'],
    ['Average Hours / Task', { formula: `IFERROR(SUM('All Tasks'!${hoursRange})/COUNTA('All Tasks'!B${firstDataRow}:B${lastDataRow}),0)` }, 'hours'],
    ['Total Projects', stats?.projects ?? 0, 'projects'],
    ['Work Days', stats?.workDays ?? 0, 'days'],
    ['Completion Rate', { formula: `IFERROR(COUNTIF('All Tasks'!${statusRange},"Completed")/COUNTA('All Tasks'!B${firstDataRow}:B${lastDataRow}),0)` }, '%'],
  ]
  metrics.forEach((m, i) => {
    const r = summary.addRow(m)
    r.getCell(1).font = { bold: true, color: { argb: 'FF1E293B' } }
    if (m[0] === 'Completion Rate') r.getCell(2).numFmt = '0%'
    else if (m[2] === 'hours') r.getCell(2).numFmt = '0.0'
    if (i % 2 === 1) r.getCell(1).fill = r.getCell(2).fill = r.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
  })

  // ── Sheet 3: Projects (grouped by category) ──
  const projects = wb.addWorksheet('Projects')
  projects.columns = [{ width: 24 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 14 }]
  styleTitle(projects, 'A1', `Projects — ${periodLabel}`)
  projects.mergeCells('A1:E1')
  const pHeader = projects.addRow(['Project / Category', 'Tasks', 'Hours', 'Completed', 'Share %'])
  styleHeader(pHeader)
  const cats = (stats?.topCategories || [])
  cats.forEach((c, i) => {
    const completedInCat = (logs || []).filter(l => getCat(l.category).label === c.label && isDone(l)).length
    const r = projects.addRow([c.label, c.count, c.hours, completedInCat, null])
    r.getCell(3).numFmt = '0.0'
    // Share % computed live against the column total below.
    r.getCell(5).value = { formula: `IFERROR(B${r.number}/SUM(B${4}:B${3 + cats.length}),0)` }
    r.getCell(5).numFmt = '0%'
    if (i % 2 === 1) r.eachCell(cc => { cc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } } })
  })
  if (cats.length) {
    const totalRow = projects.addRow(['Total', { formula: `SUM(B4:B${3 + cats.length})` }, { formula: `SUM(C4:C${3 + cats.length})` }, { formula: `SUM(D4:D${3 + cats.length})` }, null])
    totalRow.font = { bold: true }
    totalRow.getCell(3).numFmt = '0.0'
  }

  // ── Sheet 4: Analytics ──
  const analytics = wb.addWorksheet('Analytics')
  analytics.columns = [{ width: 28 }, { width: 20 }]
  styleTitle(analytics, 'A1', `Analytics — ${periodLabel}`)
  analytics.mergeCells('A1:B1')
  const aHeader = analytics.addRow(['Insight', 'Value'])
  styleHeader(aHeader)
  const topCat = cats[0]
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const wk = stats?.weekday || []
  let peakDow = 0
  for (let i = 1; i < wk.length; i++) if (wk[i] > wk[peakDow]) peakDow = i
  const rows = [
    ['Completion Rate', { formula: `'Monthly Summary'!B${5 + 7}` }],
    ['Average Hours / Task', stats?.avgHours ?? 0],
    ['Most Productive Day', stats?.mostProductiveDay ? `${formatDay(stats.mostProductiveDay, 'en')} (${stats.mostProductiveDayHours}h)` : '—'],
    ['Peak Weekday', wk.length ? `${weekdayNames[peakDow]} (${Math.round(wk[peakDow] * 10) / 10}h)` : '—'],
    ['Top Category', topCat ? `${topCat.label} (${topCat.count} tasks)` : '—'],
    ['Total Hours', stats?.hours ?? 0],
    ['Total Tasks', stats?.total ?? 0],
  ]
  rows.forEach((row, i) => {
    const r = analytics.addRow(row)
    r.getCell(1).font = { bold: true, color: { argb: 'FF1E293B' } }
    if (row[0] === 'Completion Rate') r.getCell(2).numFmt = '0%'
    if (i % 2 === 1) r.getCell(1).fill = r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
  })

  // Weekday breakdown table
  analytics.addRow([])
  const wkTitleRow = analytics.addRow(['Weekday Distribution (hours)', ''])
  wkTitleRow.getCell(1).font = { bold: true, color: { argb: ACCENT } }
  const wkHeader = analytics.addRow(['Weekday', 'Hours'])
  styleHeader(wkHeader)
  weekdayNames.forEach((name, i) => {
    const r = analytics.addRow([name, Math.round((wk[i] || 0) * 10) / 10])
    r.getCell(2).numFmt = '0.0'
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  downloadBlob(blob, safeFileName(meta?.title) + '.xlsx')
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
