-- ─────────────────────────────────────────────────────────────
-- Phase 1: Calendar time-blocking — add scheduling columns
-- Run this once in Supabase → SQL Editor (safe to re-run; uses IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────

alter table public.work_logs
  add column if not exists start_at timestamptz,        -- scheduled start (time block)
  add column if not exists end_at   timestamptz,        -- scheduled end
  add column if not exists due_date date,               -- deadline (heatmap / KPIs)
  add column if not exists priority text default 'medium'; -- low | medium | high

-- Helpful indexes for calendar range queries and deadline widgets
create index if not exists work_logs_start_at_idx on public.work_logs (start_at);
create index if not exists work_logs_due_date_idx on public.work_logs (due_date);

-- Notes:
--   • Existing rows keep start_at = NULL → they show in the new
--     "Unscheduled Tasks" panel until you drag them onto the timeline.
--   • date stays the work/log date; start_at/end_at drive the time grid.
