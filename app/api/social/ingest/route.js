// app/api/social/ingest/route.js — manual / CSV ingestion (compliant adapter).
// Accepts normalized RawPageData (see app/lib/social/ingestion.ts) and upserts
// tracked_pages → posts → comments for the caller's org. Idempotent via the
// unique constraints in migration 0003. No FB tokens / Insights involved.
import { resolveOrg, hashAuthor, logActivity } from '../../../lib/social/server'

const nowIso = () => new Date().toISOString()

export async function POST(request) {
  let ctx
  try { ctx = await resolveOrg(request) }
  catch (e) { return Response.json({ error: e.message }, { status: e.status || 500 }) }
  const { db, orgId } = ctx

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'invalid JSON body' }, { status: 400 }) }

  const page = body?.page
  const posts = Array.isArray(body?.posts) ? body.posts : []
  if (!page?.name || !page?.url) return Response.json({ error: 'page.name and page.url are required' }, { status: 400 })

  // 1) upsert the tracked page (unique on organization_id,url)
  const { data: pageRow, error: pErr } = await db.from('tracked_pages').upsert({
    organization_id: orgId,
    fb_page_id: page.fbPageId || null,
    name: page.name, url: page.url, category: page.category || null,
    follower_count: page.followerCount ?? null,
    profile_image: page.profileImage || null, cover_image: page.coverImage || null,
    is_own_brand: !!page.isOwnBrand, ingest_source: 'manual', last_synced_at: nowIso(),
  }, { onConflict: 'organization_id,url' }).select().single()
  if (pErr) return Response.json({ error: 'page upsert failed: ' + pErr.message }, { status: 500 })

  // 2) upsert posts (unique on page_id,fb_post_id) — synthesize id when missing
  const stamp = Date.now()
  const postRows = posts.map((p, i) => ({
    organization_id: orgId, page_id: pageRow.id,
    fb_post_id: String(p.fbPostId || `manual-${stamp}-${i}`),
    content: p.content || null,
    media: Array.isArray(p.media) ? p.media : [],
    permalink: p.permalink || page.url,
    posted_at: p.postedAt || null,
    like_count: p.likeCount ?? 0, comment_count: p.commentCount ?? (p.comments?.length || 0),
    share_count: p.shareCount ?? 0,
    reaction_counts: p.reactionCounts || {},
    content_category: p.contentCategory || null,
  }))

  let insertedPosts = []
  if (postRows.length) {
    const { data, error } = await db.from('posts')
      .upsert(postRows, { onConflict: 'page_id,fb_post_id' }).select()
    if (error) return Response.json({ error: 'posts upsert failed: ' + error.message }, { status: 500 })
    insertedPosts = data
  }

  // 3) upsert comments (unique on post_id,fb_comment_id)
  const byFbId = new Map(insertedPosts.map((r) => [r.fb_post_id, r.id]))
  const commentRows = []
  posts.forEach((p, i) => {
    const postId = byFbId.get(String(p.fbPostId || `manual-${stamp}-${i}`))
    if (!postId || !Array.isArray(p.comments)) return
    p.comments.forEach((c, j) => {
      commentRows.push({
        organization_id: orgId, post_id: postId,
        fb_comment_id: String(c.fbCommentId || `manual-${stamp}-${i}-${j}`),
        author_hash: hashAuthor(c.author),
        content: c.content || null,
        like_count: c.likeCount ?? 0,
        commented_at: c.commentedAt || p.postedAt || null,
        analyzed: false,
      })
    })
  })
  let insertedComments = 0
  if (commentRows.length) {
    const { data, error } = await db.from('comments')
      .upsert(commentRows, { onConflict: 'post_id,fb_comment_id' }).select('id')
    if (error) return Response.json({ error: 'comments upsert failed: ' + error.message }, { status: 500 })
    insertedComments = data.length
  }

  await logActivity(db, orgId, ctx.user.id, 'ingest', { page: pageRow.name, posts: insertedPosts.length, comments: insertedComments })
  return Response.json({
    ok: true, pageId: pageRow.id,
    counts: { pages: 1, posts: insertedPosts.length, comments: insertedComments },
  })
}
