-- ─────────────────────────────────────────────────────────────────────────
-- Social Insight AI — full schema (Module 3)
-- Multi-tenant SaaS for analyzing PUBLIC Facebook page data.
--
-- Compliance: this schema NEVER stores Page Access Tokens or Insights data.
-- All rows originate from a pluggable, compliant ingestion adapter
-- (Meta Content Library API / Graph API + Page Public Content Access /
--  licensed third-party data / manual CSV import). See docs/social-insight-ai.
--
-- Run once in Supabase → SQL Editor. Safe to re-run (IF NOT EXISTS guards).
-- Tenancy: every business row carries organization_id; RLS scopes reads to
-- the caller's org. The ingestion/cron workers use the service-role key,
-- which bypasses RLS by design.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";     -- fuzzy keyword search

-- ── Enums ────────────────────────────────────────────────────────────────
do $$ begin
  create type app_role        as enum ('super_admin','org_admin','analyst','viewer');
  create type sentiment_label  as enum ('positive','neutral','negative');
  create type emotion_label    as enum ('happy','angry','frustrated','excited','neutral');
  create type comment_category as enum ('product','price','delivery','service','promotion','quality','other');
  create type alert_severity   as enum ('info','warning','critical');
  create type alert_status     as enum ('open','acknowledged','resolved');
  create type report_kind      as enum ('daily','weekly','monthly','executive');
  create type report_format    as enum ('pdf','excel','pptx','json');
  create type ingest_source    as enum ('manual','csv','meta_content_library','graph_ppca','third_party');
  create type plan_tier        as enum ('free','starter','growth','enterprise');
exception when duplicate_object then null; end $$;

-- ── organizations ─────────────────────────────────────────────────────────
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  plan        plan_tier not null default 'free',
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ── users (profile mirror of auth.users) ──────────────────────────────────
create table if not exists public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  email           text not null,
  full_name       text,
  avatar_url      text,
  role            app_role not null default 'viewer',
  created_at      timestamptz not null default now()
);
create index if not exists users_org_idx on public.users(organization_id);

-- helper: current user's organization (used by every RLS policy)
create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.users where id = auth.uid()
$$;

create or replace function public.current_role()
returns app_role language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid()
$$;

-- ── tracked_pages (public FB pages we monitor) ────────────────────────────
create table if not exists public.tracked_pages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fb_page_id      text,                 -- numeric/string page id when known
  name            text not null,
  url             text not null,
  category        text,
  follower_count  bigint,               -- only if publicly visible
  profile_image   text,
  cover_image     text,
  is_own_brand    boolean not null default false,  -- own brand vs competitor
  ingest_source   ingest_source not null default 'manual',
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  unique (organization_id, url)
);
create index if not exists tracked_pages_org_idx on public.tracked_pages(organization_id);

-- ── posts ─────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  page_id         uuid not null references public.tracked_pages(id) on delete cascade,
  fb_post_id      text,
  content         text,
  media           jsonb not null default '[]'::jsonb,   -- [{type,url}]
  permalink       text,
  posted_at       timestamptz,
  like_count      bigint default 0,
  comment_count   bigint default 0,
  share_count     bigint default 0,
  reaction_counts jsonb not null default '{}'::jsonb,    -- {love,haha,wow,...}
  content_category text,                                 -- AI/heuristic label
  collected_at    timestamptz not null default now(),
  unique (page_id, fb_post_id)
);
create index if not exists posts_org_idx        on public.posts(organization_id);
create index if not exists posts_page_idx       on public.posts(page_id);
create index if not exists posts_posted_at_idx  on public.posts(posted_at desc);
create index if not exists posts_content_trgm   on public.posts using gin (content gin_trgm_ops);

-- ── comments ───────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  post_id         uuid not null references public.posts(id) on delete cascade,
  fb_comment_id   text,
  author_hash     text,                  -- hashed; never store raw PII
  content         text,
  like_count      bigint default 0,
  commented_at    timestamptz,
  analyzed        boolean not null default false,
  collected_at    timestamptz not null default now(),
  unique (post_id, fb_comment_id)
);
create index if not exists comments_org_idx     on public.comments(organization_id);
create index if not exists comments_post_idx    on public.comments(post_id);
create index if not exists comments_unanalyzed  on public.comments(analyzed) where analyzed = false;
create index if not exists comments_content_trgm on public.comments using gin (content gin_trgm_ops);

-- ── sentiments (AI analysis of a comment) ──────────────────────────────────
create table if not exists public.sentiments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  comment_id      uuid not null references public.comments(id) on delete cascade,
  sentiment       sentiment_label not null,
  emotion         emotion_label   not null default 'neutral',
  category        comment_category not null default 'other',
  confidence      numeric(4,3),
  model           text,
  analyzed_at     timestamptz not null default now(),
  unique (comment_id)
);
create index if not exists sentiments_org_idx    on public.sentiments(organization_id);
create index if not exists sentiments_label_idx  on public.sentiments(sentiment);

-- ── engagement_stats (per-page daily rollups) ─────────────────────────────
create table if not exists public.engagement_stats (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  page_id         uuid not null references public.tracked_pages(id) on delete cascade,
  stat_date       date not null,
  posts_count     int default 0,
  likes_total     bigint default 0,
  comments_total  bigint default 0,
  shares_total    bigint default 0,
  engagement_rate numeric(6,4),          -- (likes+comments+shares)/followers
  follower_count  bigint,
  created_at      timestamptz not null default now(),
  unique (page_id, stat_date)
);
create index if not exists engagement_org_date_idx on public.engagement_stats(organization_id, stat_date desc);

-- ── keywords (listening terms) ─────────────────────────────────────────────
create table if not exists public.keywords (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  term            text not null,
  kind            text not null default 'custom',   -- brand|product|campaign|custom
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (organization_id, term)
);
create index if not exists keywords_org_idx on public.keywords(organization_id);

-- mention rows link a keyword to the post/comment that triggered it
create table if not exists public.keyword_mentions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  keyword_id      uuid not null references public.keywords(id) on delete cascade,
  post_id         uuid references public.posts(id) on delete cascade,
  comment_id      uuid references public.comments(id) on delete cascade,
  sentiment       sentiment_label,
  matched_at      timestamptz not null default now()
);
create index if not exists keyword_mentions_kw_idx   on public.keyword_mentions(keyword_id, matched_at desc);
create index if not exists keyword_mentions_org_idx  on public.keyword_mentions(organization_id);

-- ── competitors (a tracked_page flagged as competitor + scoring) ───────────
create table if not exists public.competitors (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  page_id         uuid not null references public.tracked_pages(id) on delete cascade,
  label           text,
  rank_score      numeric(8,3) default 0,   -- computed by CompetitorService
  last_ranked_at  timestamptz,
  created_at      timestamptz not null default now(),
  unique (organization_id, page_id)
);
create index if not exists competitors_org_idx on public.competitors(organization_id);

-- ── trends (detected emerging topics / viral posts) ────────────────────────
create table if not exists public.trends (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind            text not null,            -- viral|emerging_topic|neg_surge|competitor_campaign
  title           text not null,
  score           numeric(8,3) not null default 0,
  details         jsonb not null default '{}'::jsonb,
  detected_at     timestamptz not null default now()
);
create index if not exists trends_org_idx on public.trends(organization_id, detected_at desc);

-- ── alerts ─────────────────────────────────────────────────────────────────
create table if not exists public.alert_rules (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  metric          text not null,            -- neg_sentiment_pct | keyword_spike | competitor_viral
  operator        text not null default '>',-- > < >= <= ==
  threshold       numeric not null,
  window_minutes  int not null default 1440,
  channels        jsonb not null default '["line"]'::jsonb,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists alert_rules_org_idx on public.alert_rules(organization_id);

create table if not exists public.alerts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id         uuid references public.alert_rules(id) on delete set null,
  severity        alert_severity not null default 'warning',
  status          alert_status   not null default 'open',
  title           text not null,
  message         text,
  context         jsonb not null default '{}'::jsonb,
  triggered_at    timestamptz not null default now()
);
create index if not exists alerts_org_idx    on public.alerts(organization_id, triggered_at desc);
create index if not exists alerts_status_idx on public.alerts(status) where status <> 'resolved';

-- ── reports ─────────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind            report_kind not null,
  format          report_format not null default 'pdf',
  title           text not null,
  period_start    date,
  period_end      date,
  storage_path    text,                  -- supabase storage object key
  summary         jsonb not null default '{}'::jsonb,  -- AI summary payload
  generated_by    uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists reports_org_idx on public.reports(organization_id, created_at desc);

-- ── line_accounts ────────────────────────────────────────────────────────────
create table if not exists public.line_accounts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  line_user_id    text,
  line_group_id   text,
  display_name    text,
  notify_daily    boolean not null default true,
  notify_alerts   boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists line_accounts_org_idx on public.line_accounts(organization_id);

-- ── notifications (delivery log) ─────────────────────────────────────────────
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel         text not null default 'line',  -- line|email|in_app
  kind            text not null,                 -- daily_report|alert|trend
  payload         jsonb not null default '{}'::jsonb,
  delivered       boolean not null default false,
  error           text,
  created_at      timestamptz not null default now()
);
create index if not exists notifications_org_idx on public.notifications(organization_id, created_at desc);

-- ── subscriptions (billing) ──────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  plan                plan_tier not null default 'free',
  status              text not null default 'active',
  provider            text,                 -- stripe|manual
  provider_ref        text,
  current_period_end  timestamptz,
  created_at          timestamptz not null default now(),
  unique (organization_id)
);

-- ── activity_logs (product analytics) & audit_logs (security) ────────────────
create table if not exists public.activity_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id         uuid references public.users(id) on delete set null,
  action          text not null,
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists activity_logs_org_idx on public.activity_logs(organization_id, created_at desc);

create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id        uuid references public.users(id) on delete set null,
  entity          text not null,          -- table/object affected
  entity_id       text,
  change          jsonb not null default '{}'::jsonb,
  ip              inet,
  created_at      timestamptz not null default now()
);
create index if not exists audit_logs_org_idx on public.audit_logs(organization_id, created_at desc);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Pattern: enable RLS on every tenant table; members read rows in their org;
-- writers must be analyst+ in their org. Service role bypasses all of this.
do $$
declare t text;
begin
  foreach t in array array[
    'tracked_pages','posts','comments','sentiments','engagement_stats',
    'keywords','keyword_mentions','competitors','trends','alert_rules',
    'alerts','reports','line_accounts','notifications','subscriptions',
    'activity_logs','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security;', t);

    execute format($f$
      create policy %1$s_select on public.%1$I
        for select using (organization_id = public.current_org_id());
    $f$, t);

    execute format($f$
      create policy %1$s_write on public.%1$I
        for all
        using (organization_id = public.current_org_id()
               and public.current_role() in ('super_admin','org_admin','analyst'))
        with check (organization_id = public.current_org_id());
    $f$, t);
  exception when duplicate_object then null;
  end loop;
end $$;

-- organizations + users get their own policies
alter table public.organizations enable row level security;
alter table public.users enable row level security;
do $$ begin
  create policy organizations_select on public.organizations
    for select using (id = public.current_org_id());
  create policy users_select_self_org on public.users
    for select using (organization_id = public.current_org_id() or id = auth.uid());
  create policy users_update_self on public.users
    for update using (id = auth.uid());
exception when duplicate_object then null; end $$;

-- ── Triggers ────────────────────────────────────────────────────────────────
-- Keep posts.comment_count consistent and roll engagement to daily stats.
create or replace function public.touch_page_sync()
returns trigger language plpgsql as $$
begin
  update public.tracked_pages set last_synced_at = now() where id = new.page_id;
  return new;
end $$;
do $$ begin
  create trigger trg_posts_touch_page
    after insert on public.posts
    for each row execute function public.touch_page_sync();
exception when duplicate_object then null; end $$;

-- auto-provision a public.users row when someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception when duplicate_object then null; end $$;

-- ── Seed (dev only — comment out in prod) ─────────────────────────────────────
insert into public.organizations (id, name, slug, plan)
values ('00000000-0000-0000-0000-000000000001','Demo Org','demo','growth')
on conflict (slug) do nothing;
