// Shared data, themes and pure helpers for the Monthly Report Generator.
// Kept free of React so it can be imported by both the UI and the export modules.

export const CATS = [
  { id: 'graphic',   label: 'Graphic Design', color: '6C63FF', icon: '🎨' },
  { id: 'video',     label: 'Video Editing',  color: '06B6D4', icon: '🎬' },
  { id: 'photo',     label: 'Photography',    color: 'F59E0B', icon: '📷' },
  { id: 'marketing', label: 'Marketing',      color: 'EF4444', icon: '📢' },
  { id: 'ai',        label: 'AI Content',     color: '8B5CF6', icon: '🤖' },
  { id: 'branding',  label: 'Branding',       color: 'EC4899', icon: '✨' },
  { id: 'pos',       label: 'POS Design',     color: '10B981', icon: '🏪' },
  { id: 'other',     label: 'อื่นๆ',          color: '64748B', icon: '📌' },
]

export function getCat(id) {
  return CATS.find(c => c.id === id) || CATS[CATS.length - 1]
}

export const THEMES = [
  { id: 'purple', name: 'Purple Glass', bg: '1E1B4B', accent: 'A78BFA', dark: true },
  { id: 'dark',   name: 'Dark Premium', bg: '0F172A', accent: '818CF8', dark: true },
  { id: 'ocean',  name: 'Ocean Depth',  bg: '0C4A6E', accent: '38BDF8', dark: true },
  { id: 'forest', name: 'Forest',       bg: '14532D', accent: '4ADE80', dark: true },
  { id: 'white',  name: 'Clean White',  bg: 'FFFFFF', accent: '6C63FF', dark: false },
  { id: 'slate',  name: 'Slate Pro',    bg: '1E293B', accent: '94A3B8', dark: true },
]

export const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

export const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Section blueprint — the fixed 12-slide executive report structure.
export const SECTIONS = [
  { type: 'cover',     section: 'Cover' },
  { type: 'summary',   section: 'Executive Summary' },
  { type: 'stats',     section: 'KPI Dashboard' },
  { type: 'chart',     section: 'Category Analysis' },
  { type: 'content',   section: 'Top Achievements' },
  { type: 'two_col',   section: 'Detailed Work Summary' },
  { type: 'content',   section: 'AI Insights' },
  { type: 'stats',     section: 'Productivity Analysis' },
  { type: 'timeline',  section: 'Timeline' },
  { type: 'content',   section: 'Recommendations' },
  { type: 'two_col',   section: 'Next Month Planning' },
  { type: 'closing',   section: 'Closing' },
]

// Parse a YYYY-MM-DD (or ISO) string into a {y,m,d} without timezone drift.
function parseDateParts(value) {
  if (!value) return null
  const s = String(value)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return { y: +m[1], m: +m[2], d: +m[3] }
  const dt = new Date(s)
  if (Number.isNaN(dt.getTime())) return null
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }
}

// Best-effort date for a log: explicit work date, else any timestamp present.
export function logDate(log) {
  return log?.date || log?.createdAt || log?.created_at || log?.completedAt || log?.completed_at || null
}

// month is 1-12, year is full. Returns true if the log falls inside that month.
export function isInMonth(log, year, month) {
  const p = parseDateParts(logDate(log))
  if (!p) return false
  return p.y === year && p.m === month
}

export function filterByMonth(logs, year, month) {
  return (logs || []).filter(l => isInMonth(l, year, month))
}

// Distinct {year, month} pairs present in the data, newest first.
export function availablePeriods(logs) {
  const seen = new Map()
  for (const l of logs || []) {
    const p = parseDateParts(logDate(l))
    if (!p) continue
    const key = p.y * 100 + p.m
    if (!seen.has(key)) seen.set(key, { year: p.y, month: p.m })
  }
  return Array.from(seen.values()).sort((a, b) => (b.year - a.year) || (b.month - a.month))
}

export const hoursOf = l => Number(l?.hours ?? l?.workedHours ?? l?.hours_spent ?? 0) || 0
export const notesOf = l => l?.notes || l?.aiSummary || l?.ai_summary || ''
export const imagesOf = l => l?.imageUrls || l?.image_urls || []
export const isDone = l => l?.status === 'done'

// Compute the full analytics bundle for a set of (already month-filtered) logs.
export function computeStats(logs) {
  const list = logs || []
  const total = list.length
  const hours = Math.round(list.reduce((s, l) => s + hoursOf(l), 0) * 10) / 10
  const done = list.filter(isDone).length
  const inProgress = list.filter(l => l.status === 'in_progress').length
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0
  const avgHours = total > 0 ? Math.round((hours / total) * 10) / 10 : 0

  const byCategory = {}
  const hoursByCategory = {}
  for (const l of list) {
    const c = l.category || 'other'
    byCategory[c] = (byCategory[c] || 0) + 1
    hoursByCategory[c] = (hoursByCategory[c] || 0) + hoursOf(l)
  }
  const topCategories = Object.entries(byCategory)
    .map(([id, count]) => ({ id, count, hours: Math.round((hoursByCategory[id] || 0) * 10) / 10, label: getCat(id).label, pct: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)

  // "Projects" in this app are category-driven work streams.
  const projects = topCategories.length

  // Per-day aggregation for productivity insight.
  const byDay = {}
  for (const l of list) {
    const d = logDate(l)
    if (!d) continue
    byDay[d] = (byDay[d] || 0) + hoursOf(l)
  }
  const workDays = Object.keys(byDay).length
  let mostProductiveDay = null
  let peak = -1
  for (const [d, h] of Object.entries(byDay)) {
    if (h > peak) { peak = h; mostProductiveDay = d }
  }

  // Weekday distribution (0=Sun..6=Sat) by hours.
  const weekday = [0, 0, 0, 0, 0, 0, 0]
  for (const l of list) {
    const p = parseDateParts(logDate(l))
    if (!p) continue
    const dow = new Date(p.y, p.m - 1, p.d).getDay()
    weekday[dow] += hoursOf(l)
  }

  return {
    total, hours, done, inProgress, completionRate, avgHours,
    projects, byCategory, hoursByCategory, topCategories,
    workDays, mostProductiveDay, mostProductiveDayHours: Math.round(peak * 10) / 10,
    weekday, byDay,
  }
}

// Build a compact, full-context task list for the AI (and exports).
export function buildTaskContext(logs) {
  return (logs || []).map(l => ({
    title: l.title || '',
    description: l.description || '',
    notes: notesOf(l),
    tags: Array.isArray(l.tags) ? l.tags : [],
    project: getCat(l.category).label,
    category: getCat(l.category).label,
    status: l.status || 'draft',
    workedHours: hoursOf(l),
    createdAt: logDate(l) || '',
    completedAt: isDone(l) ? (l.completedAt || l.completed_at || logDate(l) || '') : '',
  }))
}

export function periodLabel(year, month, lang = 'th') {
  const name = (lang === 'th' ? MONTHS_TH : MONTHS_EN)[month - 1] || ''
  const yr = lang === 'th' ? year + 543 : year // Buddhist era for Thai
  return `${name} ${yr}`
}

export function formatDay(value, lang = 'th') {
  const p = parseDateParts(value)
  if (!p) return ''
  const months = (lang === 'th' ? MONTHS_TH : MONTHS_EN).map(m => m.slice(0, 3))
  return `${p.d} ${months[p.m - 1]}`
}

export function safeFileName(name) {
  return String(name || 'WorkLog-Report').replace(/[^a-zA-Z0-9ก-๙ _.-]/g, '_').trim() || 'WorkLog-Report'
}
