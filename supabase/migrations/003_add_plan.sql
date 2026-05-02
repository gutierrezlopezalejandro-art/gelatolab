-- ============================================================
-- Migration 003: add subscription plan to profiles
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query
--
-- This is the minimum needed to gate Free vs Pro features. Stripe
-- integration in a later phase will populate these via webhook.
-- ============================================================

alter table public.profiles
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'pro', 'admin'));

alter table public.profiles
  add column if not exists plan_expires_at timestamptz;

-- Stripe IDs for the future Stripe webhook handler. Nullable for now.
alter table public.profiles
  add column if not exists stripe_customer_id text;

alter table public.profiles
  add column if not exists stripe_subscription_id text;

-- Backfill existing rows defensively.
update public.profiles set plan = 'free' where plan is null;

-- Update the new-user trigger so freshly-signed-up accounts start on free.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name, role, plan)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'user',
    'free'
  );
  return new;
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------
-- Admin promotion (run once for the developer / owner accounts):
--   update public.profiles set plan = 'admin' where user_id = '<uuid>';
--
-- Early-adopter / instructor unlock (no expiration, full Pro):
--   update public.profiles set plan = 'pro' where user_id = '<uuid>';
--
-- Time-limited Pro (e.g. trial, course pass):
--   update public.profiles
--     set plan = 'pro', plan_expires_at = now() + interval '30 days'
--     where user_id = '<uuid>';
-- ----------------------------------------------------------------
