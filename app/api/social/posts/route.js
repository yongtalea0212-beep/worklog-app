// app/api/social/posts/route.js — posts list with engagement + page info.
import { resolveOrg } from '../../../lib/social/server'

const SORTS = { likes: 'like_count', comments: 'comment_count', shares: 'share_count', recent: 'posted_at' }

export async function GET(request) {
  let ctx
  try { ctx = await resolveOrg(request) } catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }

  const sort = SORTS[new URL(request.url).searchParams.get('sort')] || 'like_count'
  const { data, error } = await ctx.db.from('posts')
    .select('id, content, posted_at, like_count, comment_count, share_count, content_category, tracked_pages(name, is_own_brand)')
    .eq('organization_id', ctx.orgId)
    .order(sort, { ascending: false })
    .limit(100)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const posts = (data || []).map((p) => ({
    id: p.id, content: p.content, postedAt: p.posted_at,
    likeCount: p.like_count, commentCount: p.comment_count, shareCount: p.share_count,
    category: p.content_category,
    page: p.tracked_pages?.name || '-', isOwn: !!p.tracked_pages?.is_own_brand,
    engagement: Number(p.like_count) + Number(p.comment_count) + Number(p.share_count),
  }))
  return Response.json({ posts })
}
