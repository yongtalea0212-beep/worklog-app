# Social Insight AI — Design & Architecture

A multi-tenant SaaS that turns **publicly available Facebook page data** into
sentiment, trend, competitor and AI business insights — **without Page Admin,
Insights permissions, Page Access Tokens, or Business Manager access**.

> Built to slot into this repo's existing stack: **Next.js 16**, React 19,
> Tailwind 4, Supabase, Recharts, ExcelJS/PptxGenJS/React-PDF, and LINE
> Messaging API (all already in `package.json`).

---

## 0. Data-sourcing reality (read this first)

The spec's premise — "use only public page data, no admin" — has a hard
technical/legal boundary that shapes the whole architecture:

- Facebook **has no open API** to pull arbitrary public pages' posts/comments
  unauthenticated. The old Public Page Content API is retired.
- **Scraping** public pages without permission violates Meta's ToS and is
  legally risky, so it is **not** the product's default.

So the data layer is a **pluggable, compliant Ingestion Adapter**
(`app/lib/social/ingestion.ts`). Everything downstream (storage, AI, dashboards,
LINE, reports) is provider-agnostic and 100% legitimate.

| Adapter | Legitimacy | Notes |
|---|---|---|
| `manual` / `csv` | ✅ Day-one | User imports data they're allowed to use |
| `meta_content_library` | ✅ | Meta Content Library API (research/org access) |
| `graph_ppca` | ✅ | Graph API + **Page Public Content Access** (App Review + business verification) |
| `third_party` | ✅ | Licensed provider (Apify, Brandwatch, …) — provider owns ToS |

Ship with `manual/csv` enabled; gate the API adapters behind config + the
relevant Meta approvals. The schema **never** stores tokens or Insights data.

---

## 1. Complete architecture

```
                 ┌────────────────────────── Vercel ──────────────────────────┐
  Browser  ─────▶│  Next.js 16 App Router (RSC + Server Actions + API Routes)  │
  (SaaS UI)      │   app/(dashboard)/*  ·  app/api/*  ·  middleware (auth)      │
                 └───────┬───────────────────────────────┬────────────────────┘
                         │ supabase-js (RLS, anon key)    │ service-role (cron/jobs)
                         ▼                                 ▼
                 ┌──────────────────┐            ┌──────────────────────────────┐
                 │  Supabase        │            │  Background jobs              │
                 │  Postgres + RLS  │◀──────────▶│  Vercel Cron → /api/cron/*    │
                 │  Auth · Storage  │            │  ingest · analyze · alert ·   │
                 └──────────────────┘            │  rank · report · digest       │
                         ▲                         └─────────┬─────────┬──────────┘
        Ingestion        │                                   │         │
        Adapter ─────────┘                              OpenAI API   LINE API
   (manual/MCL/PPCA/3p)                               (analysis)   (Flex push)
```

- **Frontend**: App Router, server components for data fetching, client
  components for charts (Recharts) and interactions. Tailwind 4 + a small
  ShadCN-style primitives set (Button/Card/Table/Dialog). Framer Motion optional.
- **Backend**: Server Actions for mutations from the UI; API routes for webhooks
  (LINE) and cron entrypoints. No separate server.
- **Jobs**: Vercel Cron hits `/api/cron/*`; each route runs one service with the
  service-role key (bypasses RLS), idempotent and time-boxed.
- **AI**: `OpenAIService.json()` wrapper enforces strict-JSON via
  `response_format`. Prompts live in `app/lib/social/prompts.ts`.
- **Notifications**: `LineService` builds Flex Messages, reusing this repo's
  existing `app/api/line/*` plumbing.

---

## 2. Folder structure

```
app/
  (auth)/login · register · forgot-password · auth/callback
  (dashboard)/
    layout.tsx                 # sidebar shell + org switcher + role guard
    page.tsx                   # Executive dashboard (KPIs)
    pages/                     # tracked pages CRUD
    posts/  comments/  analytics/  keywords/
    competitors/  trends/  reports/  alerts/  settings/
  api/
    cron/{ingest,analyze,alerts,rank,report,digest}/route.js
    line/webhook/route.js      # (exists) extend for OA
    reports/[id]/route.js      # signed download
  lib/social/
    types.ts  prompts.ts  ingestion.ts  services.ts
    services/                  # concrete implementations
    openai.ts  supabase-admin.ts
components/
  ui/                          # shadcn-style primitives
  charts/  kpi/  tables/  layout/
hooks/        actions/         # server actions
supabase/migrations/           # 0003_social_insight_ai.sql (this PR)
sql/  scripts/  types/  docs/social-insight-ai/
```

---

## 3. Database schema

Full DDL: **`supabase/migrations/0003_social_insight_ai.sql`** — 20 tables
covering all requested entities (`users, organizations, tracked_pages, posts,
comments, engagement_stats, keywords, sentiments, alerts, reports, notifications,
line_accounts, activity_logs, competitors, subscriptions, audit_logs`) plus
`keyword_mentions, trends, alert_rules`.

Highlights:
- **Multi-tenant** via `organization_id` on every business table.
- **RLS everywhere**: members `SELECT` their org; analyst+ may write; service
  role bypasses for jobs. Helpers `current_org_id()` / `current_role()`.
- **Indexes**: org+date composites, `pg_trgm` GIN on `posts.content` /
  `comments.content` for keyword search, partial index on unanalyzed comments.
- **Triggers**: auto-provision `public.users` on signup; touch `last_synced_at`.
- **Privacy**: stores `author_hash`, never raw commenter PII; no tokens, no Insights.

---

## 4. API design

| Method | Route | Purpose |
|---|---|---|
| Server Action | `ingestManual(orgId, payload)` | Import RawPageData |
| Server Action | `addTrackedPage / removeTrackedPage` | Page CRUD |
| Server Action | `upsertKeyword / toggleKeyword` | Listening terms |
| Server Action | `createAlertRule / ackAlert` | Alerting |
| Server Action | `requestReport(kind,format,period)` | Enqueue report |
| GET | `/api/reports/[id]` | Signed Storage download |
| POST | `/api/line/webhook` | LINE OA events |
| GET | `/api/cron/ingest` | Sync due pages |
| GET | `/api/cron/analyze` | Sentiment on pending comments |
| GET | `/api/cron/alerts` | Evaluate alert_rules |
| GET | `/api/cron/rank` | Competitor ranking |
| GET | `/api/cron/report` | Scheduled reports |
| GET | `/api/cron/digest` | LINE daily/weekly push |

Cron routes are protected by a `CRON_SECRET` header check; mutations validate
role server-side (defense in depth on top of RLS).

---

## 5. Service layer

Contracts in **`app/lib/social/services.ts`**:
`PageMonitoring, PostAnalysis, CommentAnalysis, Sentiment, KeywordMonitoring,
Competitor, TrendDetection, Alert, Report, Line, OpenAI, Dashboard`.

Data flow: `Ingestion → PageMonitoring.ingestRaw → posts/comments →
CommentAnalysis.analyzePending → Sentiment(OpenAI) → sentiments →
{Trend, Competitor, Alert, Report} → Line/Notifications`.

---

## 6. Dashboard UI

Style: **Apple + Stripe + Notion** — clean white, soft gray, single blue accent,
large KPI cards, generous spacing, rounded-2xl, soft shadows, responsive
(desktop / tablet / mobile sidebar→drawer).

Pages: Dashboard · Pages · Posts · Comments · Analytics · Keywords ·
Competitors · Trends · Reports · Alerts · Settings.

Executive KPIs: Tracked Pages · Posts Collected · Comments Collected ·
Positive % · Negative % · Trending Keywords · Competitor Ranking — each a
`<KpiCard>` with delta vs previous period; charts via Recharts
(area = engagement over time, bar = top posts, donut = sentiment split,
line = keyword trend, horizontal bar = competitor ranking).

---

## 7. Component tree

```
<DashboardLayout>
 ├─ <Sidebar/> <Topbar orgSwitcher userMenu/>
 └─ <Page>
     ├─ <KpiGrid> → <KpiCard×7/>
     ├─ <ChartCard><EngagementAreaChart/></ChartCard>
     ├─ <ChartCard><SentimentDonut/></ChartCard>
     ├─ <TopPostsTable/> <CompetitorRankingBar/>
     └─ <TrendFeed/> <AlertList/>
 ui/: Button Card Badge Table Dialog Tabs Select Skeleton Toast
```

---

## 8. OpenAI integration

`app/lib/social/prompts.ts` ships 8 production prompts (Sentiment,
Classification, Trend, Executive Summary, Competitor, Keyword Intelligence,
Recommendation, Crisis). All force **strict minified JSON**, set a shared
analyst system prompt, and wrap user text in `<data>…</data>` so comment
content can't override instructions (prompt-injection guard). Use
`response_format: {type:'json_object'}` (or `json_schema`) and batch comments
to control cost. Default model: latest capable model; downgrade for cheap
high-volume classification.

---

## 9. Supabase setup

1. Create project → copy `NEXT_PUBLIC_SUPABASE_URL`, `…_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`.
2. Run `supabase/migrations/0003_social_insight_ai.sql` in SQL Editor.
3. Enable **Google** OAuth provider; set redirect to `/auth/callback`.
4. Create a private Storage bucket `reports`.
5. Add a `supabase-admin.ts` server-only client using the service-role key
   (used exclusively by cron/jobs; never imported into client bundles).

---

## 10. Deployment guide (Vercel)

- Env: Supabase keys, `OPENAI_API_KEY`, LINE channel secret/token,
  `CRON_SECRET`, optional ingestion-adapter creds.
- `vercel.json` cron schedule (extend the existing file):

```json
{ "crons": [
  { "path": "/api/cron/ingest",  "schedule": "0 */6 * * *" },
  { "path": "/api/cron/analyze", "schedule": "*/30 * * * *" },
  { "path": "/api/cron/alerts",  "schedule": "*/15 * * * *" },
  { "path": "/api/cron/rank",    "schedule": "0 3 * * *" },
  { "path": "/api/cron/report",  "schedule": "0 7 * * *" },
  { "path": "/api/cron/digest",  "schedule": "30 8 * * *" }
]}
```

- Per AGENTS.md: this is a **modified Next.js 16** — read
  `node_modules/next/dist/docs/` before writing route/page code.

---

## 11. Production roadmap

- **Phase 1 (MVP)** — Auth + orgs/RLS, manual/CSV ingestion, posts/comments
  storage, sentiment job, Executive dashboard, basic LINE daily digest.
- **Phase 2** — Keyword listening + trends, competitor ranking, alert rules,
  PDF/Excel reports, settings.
- **Phase 3** — Meta Content Library / PPCA adapters (after Meta approval),
  AI recommendation engine, PPTX + scheduled reports, billing (Stripe),
  crisis detection real-time alerts.
- **Phase 4** — Audit logging UI, role management, multi-channel (email),
  anomaly detection, white-label.

---

## 12. Production-ready code examples

See sibling files in this PR:
- `supabase/migrations/0003_social_insight_ai.sql` — schema + RLS + triggers
- `app/lib/social/types.ts` — domain types
- `app/lib/social/prompts.ts` — OpenAI prompt library
- `app/lib/social/ingestion.ts` — pluggable adapter + ManualAdapter
- `app/lib/social/services.ts` — service contracts

Reference implementation sketch for the sentiment cron (uses the existing
patterns in `app/api/cron/line-digest` and `app/lib/supabase.js`):

```js
// app/api/cron/analyze/route.js  (template — adapt to Next 16 route API)
export async function GET(req) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET)
    return new Response('forbidden', { status: 403 });
  // 1. admin client (service role) → select comments where analyzed=false limit 50
  // 2. OpenAIService.json(SYSTEM_ANALYST, sentimentPrompt(batch))
  // 3. upsert into sentiments; mark comments.analyzed = true
  return Response.json({ ok: true });
}
```
