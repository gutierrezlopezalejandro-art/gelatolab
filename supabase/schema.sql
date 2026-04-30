-- ============================================================
-- GelatoLab — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Ensure UUIDs are available
create extension if not exists "uuid-ossp";

-- ─── Tables ────────────────────────────────────────────────
-- One row per user per data type. The `data` column holds the full
-- Zustand state (recipes list, ingredients list, etc.) as JSONB.

create table if not exists public.user_recipes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_ingredients (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_productions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Profile table (subscription plan, preferences, etc.)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan text not null default 'free',         -- 'free' | 'pro' | 'team'
  stripe_customer_id text,
  subscription_id text,
  subscription_status text,                  -- 'active' | 'canceled' | 'past_due' | null
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Row-Level Security (RLS) ──────────────────────────────
-- Each user can only read/write their own rows.

alter table public.user_recipes     enable row level security;
alter table public.user_ingredients enable row level security;
alter table public.user_productions enable row level security;
alter table public.user_plans       enable row level security;
alter table public.profiles         enable row level security;

-- Policies: owner-only access
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'user_recipes', 'user_ingredients', 'user_productions', 'user_plans'
  ] loop
    execute format('drop policy if exists "owner_select_%1$s" on public.%1$s;', tbl);
    execute format('drop policy if exists "owner_insert_%1$s" on public.%1$s;', tbl);
    execute format('drop policy if exists "owner_update_%1$s" on public.%1$s;', tbl);
    execute format('drop policy if exists "owner_delete_%1$s" on public.%1$s;', tbl);

    execute format($f$
      create policy "owner_select_%1$s" on public.%1$s
        for select using (auth.uid() = user_id);
    $f$, tbl);
    execute format($f$
      create policy "owner_insert_%1$s" on public.%1$s
        for insert with check (auth.uid() = user_id);
    $f$, tbl);
    execute format($f$
      create policy "owner_update_%1$s" on public.%1$s
        for update using (auth.uid() = user_id);
    $f$, tbl);
    execute format($f$
      create policy "owner_delete_%1$s" on public.%1$s
        for delete using (auth.uid() = user_id);
    $f$, tbl);
  end loop;
end $$;

-- Profiles policies
drop policy if exists "owner_select_profiles" on public.profiles;
drop policy if exists "owner_update_profiles" on public.profiles;
drop policy if exists "owner_insert_profiles" on public.profiles;

create policy "owner_select_profiles" on public.profiles
  for select using (auth.uid() = user_id);
create policy "owner_insert_profiles" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "owner_update_profiles" on public.profiles
  for update using (auth.uid() = user_id);

-- ─── Auto-create profile on signup ─────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Enable realtime for sync tables ───────────────────────
-- (Run these once from the Supabase Dashboard → Database → Replication
-- if the CLI approach doesn't apply)
alter publication supabase_realtime add table public.user_recipes;
alter publication supabase_realtime add table public.user_ingredients;
alter publication supabase_realtime add table public.user_productions;
alter publication supabase_realtime add table public.user_plans;

-- Done. Your Supabase backend is ready.
