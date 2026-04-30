-- ============================================================
-- Migration 001: add role column to profiles
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

-- Backfill existing rows just in case
update public.profiles set role = 'user' where role is null;

-- Update trigger so new signups default to role='user' explicitly
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Admins can read everyone's profile (useful for future admin panel).
-- Own-row policies from the base schema remain in place.
drop policy if exists "admin_select_profiles" on public.profiles;
create policy "admin_select_profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );

-- How to promote a user to admin manually (run once with their user_id):
--   update public.profiles set role = 'admin' where user_id = '<uuid-here>';
