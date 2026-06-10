// AI slide generation + single-slide regeneration + data-driven fallback.
// All content is derived strictly from the month-filtered tasks passed in.
import {
  getCat, SECTIONS, computeStats, buildTaskContext, periodLabel,
  hoursOf, notesOf, isDone, formatDay, logDate, imagesOf,
} from './shared'

export async function callAI(prompt, { maxTokens = 1200, system } = {}) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, max_tokens: maxTokens, system }),
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(d?.error || 'AI request failed')
  return d.text || ''
}

const SYSTEM = 'You are a senior business analyst and presentation designer. You write concise, professional, executive-level monthly work reports. You respond ONLY with valid minified JSON (no markdown, no commentary).'

function contextBlock(logs, stats, year, month, lang) {
  const tasks = buildTaskContext(logs)
  return [
    `REPORT PERIOD: ${periodLabel(year, month, lang)} (use ONLY this month's data)`,
    `AGGREGATE METRICS: totalTasks=${stats.total}, completedTasks=${stats.done}, inProgress=${stats.inProgress}, totalHours=${stats.hours}, avgHoursPerTask=${stats.avgHours}, totalProjects=${stats.projects}, completionRate=${stats.completionRate}%, workDays=${stats.workDays}`,
    `CATEGORY BREAKDOWN: ${stats.topCategories.map(c => `${c.label}=${c.count} tasks/${c.hours}h (${c.pct}%)`).join(', ') || 'none'}`,
    `MOST PRODUCTIVE DAY: ${stats.mostProductiveDay ? formatDay(stats.mostProductiveDay, lang) + ' (' + stats.mostProductiveDayHours + 'h)' : 'n/a'}`,
    `TASKS (JSON): ${JSON.stringify(tasks.slice(0, 60))}`,
  ].join('\n')
}

const SCHEMA = [
  'Return a JSON array of EXACTLY 12 slide objects, in this order and type:',
  '1 {type:"cover",title,subtitle,stats:[{value,label}](4)}',
  '2 {type:"summary",section:"Executive Summary",title,body,badges:[str](4-5)}',
  '3 {type:"stats",section:"KPI Dashboard",title,stats:[{label,value,color,sub}](6)}',
  '4 {type:"chart",section:"Category Analysis",title,bars:[{label,value,unit}]}',
  '5 {type:"content",section:"Top Achievements",title,subtitle,points:[str](4-6)}',
  '6 {type:"two_col",section:"Detailed Work Summary",title,cols:[{heading,points:[str]}](2)}',
  '7 {type:"content",section:"AI Insights",title,subtitle,points:[str](4-6)}',
  '8 {type:"stats",section:"Productivity Analysis",title,stats:[{label,value,color,sub}](4-6)}',
  '9 {type:"timeline",section:"Timeline",title,events:[{title,desc,date}](5-6)}',
  '10 {type:"content",section:"Recommendations",title,subtitle,points:[str](4-6)}',
  '11 {type:"two_col",section:"Next Month Planning",title,cols:[{heading,points:[str]}](2)}',
  '12 {type:"closing",title,subtitle}',
  'Rules: color = 6-hex WITHOUT # (e.g. "6C63FF"). Base EVERY value on the data above — real numbers, real task titles. No placeholders.',
]

function extractJSON(text, open, close) {
  const clean = String(text).replace(/```json|```/g, '').trim()
  const si = clean.indexOf(open), ei = clean.lastIndexOf(close)
  if (si === -1 || ei === -1) throw new Error('no json')
  return JSON.parse(clean.slice(si, ei + 1))
}

export async function generateSlides({ logs, year, month, customPrompt, lang = 'th', brand = 'StayScape' }) {
  const stats = computeStats(logs)
  const prompt = [
    `Create a professional executive monthly work report presentation in ${lang === 'th' ? 'Thai' : 'English'} language.`,
    customPrompt ? `User direction: ${customPrompt}` : '',
    '',
    contextBlock(logs, stats, year, month, lang),
    '',
    SCHEMA.join('\n'),
    `Brand name for cover/closing: ${brand}. Period label: ${periodLabel(year, month, lang)}.`,
    'Respond with the JSON array only.',
  ].filter(Boolean).join('\n')

  try {
    const text = await callAI(prompt, { maxTokens: 8000, system: SYSTEM })
    const arr = extractJSON(text, '[', ']')
    if (!Array.isArray(arr) || arr.length < 8) throw new Error('too few slides')
    return withShowcase(normalize(arr, year, month, lang), logs, lang)
  } catch {
    return withShowcase(fallbackSlides(logs, year, month, lang, brand), logs, lang)
  }
}

// Build 2 showcase slides from the user's own work: a portfolio image grid
// and a "featured work details" list (titles + AI summaries). Inserted right
// before the closing slide. Each carries `points` so PDF/PPTX export still works.
function buildShowcase(logs, lang) {
  const th = lang === 'th'
  const t = (a, b) => (th ? a : b)
  const imgs = []
  for (const l of (logs || [])) {
    for (const url of imagesOf(l)) {
      if (!url) continue
      imgs.push({ url, caption: l.title || t('งาน', 'Work'), catLabel: getCat(l.category).label })
      if (imgs.length >= 6) break
    }
    if (imgs.length >= 6) break
  }
  const notable = [...(logs || [])]
    .sort((a, b) => hoursOf(b) - hoursOf(a))
    .slice(0, 6)
    .map(l => ({
      title: l.title || t('งาน', 'Work'),
      summary: (notesOf(l) || '').slice(0, 170),
      catLabel: getCat(l.category).label,
      hours: hoursOf(l),
      date: formatDay(logDate(l), lang),
    }))
  const slides = []
  if (imgs.length) {
    slides.push({
      type: 'showcase', section: t('ผลงาน', 'Portfolio'),
      title: t('ผลงานเด่นประจำเดือน', 'Portfolio Showcase'),
      subtitle: t(`ตัวอย่างผลงาน ${imgs.length} ชิ้น`, `${imgs.length} featured works this month`),
      images: imgs,
      points: imgs.map(i => i.caption),
    })
  }
  if (notable.length) {
    slides.push({
      type: 'portfolio', section: t('รายละเอียดผลงาน', 'Work Details'),
      title: t('รายละเอียดงานเด่น', 'Featured Work Details'),
      items: notable,
      points: notable.map(n => `${n.title} — ${n.catLabel} · ${n.hours}h${n.summary ? ' · ' + n.summary : ''}`),
    })
  }
  return slides
}

function withShowcase(slides, logs, lang) {
  const extra = buildShowcase(logs, lang)
  if (!extra.length) return slides
  const idx = slides.findIndex(s => s.type === 'closing')
  const at = idx === -1 ? slides.length : idx
  return [...slides.slice(0, at), ...extra, ...slides.slice(at)]
}

// Ensure each slide has its blueprint type/section and inject gallery images.
function normalize(arr, year, month, lang) {
  const out = arr.slice(0, 12).map((s, i) => ({
    ...s,
    type: s.type || SECTIONS[i]?.type || 'content',
    section: s.section || SECTIONS[i]?.section || '',
  }))
  // Guarantee cover/closing carry the period + brand even if the model omitted them.
  if (out[0]) {
    out[0].type = 'cover'
    out[0].subtitle = out[0].subtitle || periodLabel(year, month, lang)
  }
  const last = out[out.length - 1]
  if (last) last.type = last.type === 'closing' ? 'closing' : last.type
  return out
}

export async function regenerateSlide({ slide, index, logs, year, month, customPrompt, lang = 'th' }) {
  const stats = computeStats(logs)
  const blueprint = SECTIONS[index] || { type: slide.type, section: slide.section }
  const prompt = [
    `Regenerate ONE slide (#${index + 1}, section "${slide.section || blueprint.section}", type "${slide.type || blueprint.type}") of a monthly work report.`,
    customPrompt ? `User direction: ${customPrompt}` : 'Improve clarity, professionalism and insight while keeping the same JSON shape.',
    '',
    contextBlock(logs, stats, year, month, lang),
    '',
    `Current slide JSON: ${JSON.stringify(slide)}`,
    `Keep the SAME "type" ("${slide.type || blueprint.type}") and field structure. color = 6-hex without #. Base everything on the data above.`,
    'Respond with a single JSON object only.',
  ].filter(Boolean).join('\n')

  const text = await callAI(prompt, { maxTokens: 1500, system: SYSTEM })
  const updated = extractJSON(text, '{', '}')
  return { ...slide, ...updated, type: slide.type, section: slide.section }
}

// ── Fully data-driven fallback (no mock data — computed from real tasks) ──
export function fallbackSlides(logs, year, month, lang = 'th', brand = 'StayScape') {
  const th = lang === 'th'
  const stats = computeStats(logs)
  const label = periodLabel(year, month, lang)
  const top = stats.topCategories
  const sortedByDate = [...logs].sort((a, b) => String(logDate(a)).localeCompare(String(logDate(b))))
  const achievements = [...logs]
    .sort((a, b) => hoursOf(b) - hoursOf(a))
    .slice(0, 6)
    .map(l => `${l.title || (th ? 'งาน' : 'Task')} — ${getCat(l.category).label} (${hoursOf(l)}h)`)
  const weekdayNames = th ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  let peakDow = 0
  stats.weekday.forEach((h, i) => { if (h > stats.weekday[peakDow]) peakDow = i })

  const t = (thStr, enStr) => (th ? thStr : enStr)

  return [
    {
      type: 'cover', section: 'Cover',
      title: t('รายงานสรุปผลงานประจำเดือน', 'Monthly Work Report'),
      subtitle: label,
      stats: [
        { value: stats.total, label: t('งาน', 'Tasks') },
        { value: stats.hours + 'h', label: t('ชั่วโมง', 'Hours') },
        { value: stats.completionRate + '%', label: t('สำเร็จ', 'Complete') },
        { value: stats.projects, label: t('โปรเจกต์', 'Projects') },
      ],
    },
    {
      type: 'summary', section: 'Executive Summary',
      title: t('บทสรุปผู้บริหาร', 'Executive Summary'),
      body: t(
        `ในเดือน ${label} ทำงานทั้งหมด ${stats.total} งาน รวม ${stats.hours} ชั่วโมง อัตราการทำงานสำเร็จ ${stats.completionRate}% ครอบคลุม ${stats.projects} กลุ่มงานหลัก โดยเน้นที่ ${top[0] ? top[0].label : '-'}`,
        `In ${label}, ${stats.total} tasks were completed across ${stats.projects} work streams, totaling ${stats.hours} hours at a ${stats.completionRate}% completion rate. Focus area: ${top[0] ? top[0].label : '-'}.`),
      badges: [
        `${stats.total} ${t('งาน', 'Tasks')}`,
        `${stats.hours}h`,
        `${stats.completionRate}% ${t('สำเร็จ', 'Done')}`,
        top[0] ? top[0].label : '-',
      ],
    },
    {
      type: 'stats', section: 'KPI Dashboard',
      title: t('แดชบอร์ดตัวชี้วัด', 'KPI Dashboard'),
      stats: [
        { label: t('งานทั้งหมด', 'Total Tasks'), value: stats.total, color: '6C63FF' },
        { label: t('เสร็จแล้ว', 'Completed'), value: stats.done, color: '10B981' },
        { label: t('ชั่วโมงรวม', 'Total Hours'), value: stats.hours, color: '06B6D4' },
        { label: t('โปรเจกต์', 'Projects'), value: stats.projects, color: '8B5CF6' },
        { label: t('อัตราสำเร็จ', 'Completion'), value: stats.completionRate + '%', color: 'F59E0B' },
        { label: t('เฉลี่ย/งาน', 'Avg / Task'), value: stats.avgHours + 'h', color: 'EC4899' },
      ],
    },
    {
      type: 'chart', section: 'Category Analysis',
      title: t('วิเคราะห์ตามหมวดหมู่', 'Category Analysis'),
      bars: top.map(c => ({ label: c.label, value: c.count, unit: ` (${c.pct}%)` })),
    },
    {
      type: 'content', section: 'Top Achievements',
      title: t('ผลงานเด่นประจำเดือน', 'Top Achievements'),
      subtitle: t('งานที่ใช้ความพยายามและสร้างผลกระทบสูงสุด', 'Highest-impact work this month'),
      points: achievements.length ? achievements : [t('ยังไม่มีงานในเดือนนี้', 'No tasks this month')],
    },
    {
      type: 'two_col', section: 'Detailed Work Summary',
      title: t('สรุปงานโดยละเอียด', 'Detailed Work Summary'),
      cols: buildDetailCols(logs, th),
    },
    {
      type: 'content', section: 'AI Insights',
      title: t('ข้อมูลเชิงลึก', 'Insights'),
      subtitle: t('รูปแบบการทำงานและการกระจายภาระงาน', 'Workload distribution and patterns'),
      points: [
        t(`กลุ่มงานหลักคือ ${top[0] ? top[0].label : '-'} คิดเป็น ${top[0] ? top[0].pct : 0}% ของงานทั้งหมด`, `Primary focus is ${top[0] ? top[0].label : '-'} at ${top[0] ? top[0].pct : 0}% of all tasks`),
        t(`เฉลี่ย ${stats.avgHours} ชั่วโมงต่องาน กระจายใน ${stats.workDays} วันทำงาน`, `Averaging ${stats.avgHours}h per task across ${stats.workDays} active days`),
        t(`วันที่ทำงานหนักที่สุดคือ ${stats.mostProductiveDay ? formatDay(stats.mostProductiveDay, lang) : '-'} (${stats.mostProductiveDayHours}h)`, `Peak output on ${stats.mostProductiveDay ? formatDay(stats.mostProductiveDay, lang) : '-'} (${stats.mostProductiveDayHours}h)`),
        t(`อัตราการทำงานสำเร็จอยู่ที่ ${stats.completionRate}%`, `Completion rate stands at ${stats.completionRate}%`),
      ],
    },
    {
      type: 'stats', section: 'Productivity Analysis',
      title: t('วิเคราะห์ประสิทธิภาพ', 'Productivity Analysis'),
      stats: [
        { label: t('เฉลี่ย/งาน', 'Avg Hrs / Task'), value: stats.avgHours + 'h', color: '6C63FF' },
        { label: t('วันทำงาน', 'Work Days'), value: stats.workDays, color: '06B6D4' },
        { label: t('วันที่ผลิตสูงสุด', 'Peak Day'), value: stats.mostProductiveDay ? formatDay(stats.mostProductiveDay, lang) : '-', color: '10B981', sub: stats.mostProductiveDayHours + 'h' },
        { label: t('วันที่ขยันสุด', 'Top Weekday'), value: weekdayNames[peakDow], color: 'F59E0B', sub: Math.round(stats.weekday[peakDow] * 10) / 10 + 'h' },
      ],
    },
    {
      type: 'timeline', section: 'Timeline',
      title: t('ไทม์ไลน์การทำงาน', 'Work Timeline'),
      events: sortedByDate.slice(0, 6).map(l => ({
        title: l.title || t('งาน', 'Task'),
        desc: getCat(l.category).label + (isDone(l) ? '' : t(' · กำลังทำ', ' · in progress')),
        date: formatDay(logDate(l), lang),
      })),
    },
    {
      type: 'content', section: 'Recommendations',
      title: t('ข้อเสนอแนะ', 'Recommendations'),
      subtitle: t('แนวทางพัฒนาประสิทธิภาพการทำงาน', 'Ways to improve workflow and productivity'),
      points: buildRecommendations(stats, top, th),
    },
    {
      type: 'two_col', section: 'Next Month Planning',
      title: t('แผนเดือนถัดไป', 'Next Month Planning'),
      cols: [
        { heading: t('เป้าหมาย & ลำดับความสำคัญ', 'Goals & Priorities'), points: [
          t(`รักษาอัตราสำเร็จให้สูงกว่า ${Math.min(stats.completionRate + 5, 100)}%`, `Sustain completion rate above ${Math.min(stats.completionRate + 5, 100)}%`),
          t(`ต่อยอดงานกลุ่ม ${top[0] ? top[0].label : '-'}`, `Build on ${top[0] ? top[0].label : '-'} momentum`),
          top[1] ? t(`เพิ่มสมดุลให้งาน ${top[1].label}`, `Balance workload toward ${top[1].label}`) : t('กระจายงานให้สมดุล', 'Balance the workload'),
        ] },
        { heading: t('ผลลัพธ์ที่คาดหวัง', 'Expected Deliverables'), points: [
          t('วางแผนงานล่วงหน้ารายสัปดาห์', 'Plan work weekly in advance'),
          t('ติดตามชั่วโมงทำงานต่องานอย่างสม่ำเสมอ', 'Track hours per task consistently'),
          t('ทบทวนผลงานปลายเดือน', 'Review outcomes at month end'),
        ] },
      ],
    },
    {
      type: 'closing', section: 'Closing',
      title: t('ขอบคุณครับ', 'Thank You'),
      subtitle: t(`${brand} · รายงานประจำเดือน ${label}`, `${brand} · Monthly Report · ${label}`),
    },
  ]
}

function buildDetailCols(logs, th) {
  const creative = logs.filter(l => ['graphic', 'branding', 'pos'].includes(l.category))
  const media = logs.filter(l => ['video', 'photo', 'marketing', 'ai'].includes(l.category))
  const other = logs.filter(l => !['graphic', 'branding', 'pos', 'video', 'photo', 'marketing', 'ai'].includes(l.category))
  const line = l => `${l.title || (th ? 'งาน' : 'Task')}${notesOf(l) ? ' — ' + notesOf(l).slice(0, 60) : ''}`
  const colA = creative.length ? creative : other
  const colB = media.length ? media : logs.filter(l => !colA.includes(l))
  return [
    { heading: th ? 'งานออกแบบ & แบรนด์' : 'Creative & Branding', points: colA.slice(0, 6).map(line) },
    { heading: th ? 'คอนเทนต์ & สื่อ' : 'Content & Media', points: colB.slice(0, 6).map(line) },
  ]
}

function buildRecommendations(stats, top, th) {
  const recs = []
  if (stats.completionRate < 80) recs.push(th ? `ยกระดับอัตราการทำงานสำเร็จจาก ${stats.completionRate}% โดยลดงานค้าง` : `Lift completion rate above ${stats.completionRate}% by clearing in-progress tasks`)
  else recs.push(th ? `รักษาอัตราสำเร็จที่ดีเยี่ยม (${stats.completionRate}%) ต่อไป` : `Maintain the strong ${stats.completionRate}% completion rate`)
  if (top[0] && top[0].pct > 50) recs.push(th ? `กระจายภาระงานออกจาก ${top[0].label} เพื่อลดความเสี่ยง` : `Diversify away from over-concentration in ${top[0].label}`)
  recs.push(th ? `วางเป้าชั่วโมงต่องานให้ใกล้เคียง ${stats.avgHours}h เพื่อประเมินงานแม่นยำขึ้น` : `Standardize task estimates around ${stats.avgHours}h for better planning`)
  recs.push(th ? 'จัดบล็อกเวลาทำงานต่อเนื่องในวันที่ผลิตงานได้สูง' : 'Block focused time on your most productive days')
  return recs.slice(0, 6)
}
