import { createClient } from '@supabase/supabase-js'
import PublicPortfolio from './PublicPortfolio'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams
  const name = sp?.n || 'Portfolio'
  return {
    title: `${name} · Portfolio · StayScape`,
    description: sp?.b || `ผลงานของ ${name}`,
  }
}

export default async function PublicPortfolioPage({ params, searchParams }) {
  const { id } = await params
  const sp = (await searchParams) || {}

  let logs = []
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data } = await supabase
      .from('work_logs')
      .select('*')
      .eq('line_user_id', id)
      .order('date', { ascending: false })
    logs = (data || []).map(d => ({
      id: d.id, date: d.date, title: d.title, description: d.description,
      aiSummary: d.ai_summary, category: d.category, hours: d.hours_spent,
      status: d.status, tags: d.tags || [], imageUrls: d.image_urls || [],
    }))
  } catch {}

  const profile = {
    name: sp.n || 'My Portfolio',
    avatar: sp.a || '',
    title: sp.t || '',
    bio: sp.b || '',
    email: sp.e || '',
    phone: sp.ph || '',
    line: sp.ln || '',
  }

  return <PublicPortfolio logs={logs} profile={profile} />
}
