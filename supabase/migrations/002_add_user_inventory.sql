-- ============================================================
-- Migration 002: add user_inventory table for movement sync
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

create table if not exists public.user_inventory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_inventory enable row level security;

-- Owner-only policies (same pattern as the other user_* tables)
drop policy if exists "owner_select_user_inventory" on public.user_inventory;
drop policy if exists "owner_insert_user_inventory" on public.user_inventory;
drop policy if exists "owner_update_user_inventory" on public.user_inventory;
drop policy if exists "owner_delete_user_inventory" on public.user_inventory;

create policy "owner_select_user_inventory" on public.user_inventory
  for select using (auth.uid() = user_id);
create policy "owner_insert_user_inventory" on public.user_inventory
  for insert with check (auth.uid() = user_id);
create policy "owner_update_user_inventory" on public.user_inventory
  for update using (auth.uid() = user_id);
create policy "owner_delete_user_inventory" on public.user_inventory
  for delete using (auth.uid() = user_id);

-- Enable realtime so changes propagate to other devices instantly.
alter publication supabase_realtime add table public.user_inventory;
