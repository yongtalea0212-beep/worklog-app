-- ─────────────────────────────────────────────────────────────
-- Artwork (ชิ้นงาน) inside each Task (work_logs) — 1:N
-- Run once in Supabase → SQL Editor (safe to re-run; IF NOT EXISTS guards)
--
-- task_id is TEXT (work_logs.id cast to text) so this works whether
-- work_logs.id is bigint or uuid; a delete-trigger on work_logs gives
-- cascade behavior without a typed foreign key.
--
-- Backward compatible: existing tasks simply have no artwork rows; the UI
-- treats a task with zero artworks as 1 piece for KPI counting.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.artworks (
  id          uuid primary key default gen_random_uuid(),
  task_id     text not null,                   -- work_logs.id::text
  user_id     uuid references auth.users(id) on delete cascade,
  title       text not null,
  type        text not null default 'other',   -- banner|poster|logo|video|facebook|motion|brochure|website|ui|mockup|other
  description text default '',
  file_url    text,
  thumbnail   text,
  status      text not null default 'pending', -- pending|doing|done
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists artworks_task_idx on public.artworks(task_id);
create index if not exists artworks_user_idx on public.artworks(user_id);
create index if not exists artworks_type_idx on public.artworks(type);

-- keep updated_at fresh
create or replace function public.touch_artwork_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ begin
  create trigger trg_artworks_touch
    before update on public.artworks
    for each row execute function public.touch_artwork_updated_at();
exception when duplicate_object then null; end $$;

-- cascade: deleting a task removes its artworks (works for any id type)
create or replace function public.cascade_delete_artworks()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.artworks where task_id = old.id::text;
  return old;
end $$;
do $$ begin
  create trigger trg_worklogs_delete_artworks
    after delete on public.work_logs
    for each row execute function public.cascade_delete_artworks();
exception when duplicate_object then null; end $$;

-- RLS: owners manage their own artwork rows (service role bypasses)
alter table public.artworks enable row level security;
do $$ begin
  create policy artworks_select_own on public.artworks
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy artworks_write_own on public.artworks
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
