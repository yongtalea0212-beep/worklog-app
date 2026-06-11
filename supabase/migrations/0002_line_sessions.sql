-- LINE bot multi-step edit sessions (persisted because Vercel serverless
-- doesn't keep in-memory state between invocations).
create table if not exists public.line_sessions (
  line_user_id text primary key,
  state        text,
  data         jsonb default '{}'::jsonb,
  updated_at   timestamptz default now()
);

-- The bot uses the service-role key, which bypasses RLS. Enable RLS with no
-- public policies so anon/auth clients can't read/write others' sessions.
alter table public.line_sessions enable row level security;
