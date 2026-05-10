-- ============================================================
-- Migration 004: Admin panel infrastructure
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotente: se puede correr varias veces sin romper nada.
--
-- Crea:
--   1. Tabla public.audit_log (registro de acciones admin)
--   2. Columna profiles.suspended_at
--   3. Helper interno _is_admin()
--   4-10. Funciones RPC SECURITY DEFINER con auth check interno:
--          admin_list_users, admin_get_stats, admin_update_user_plan,
--          admin_update_user_role, admin_suspend_user,
--          admin_get_user_activity, admin_get_audit_log
--
-- Modelo de seguridad: el cliente NO escribe directo a las tablas
-- profiles/audit_log para acciones admin. Llama a las RPC, que validan
-- internamente que el caller tenga role='admin' antes de ejecutar.
-- ============================================================

-- 1. AUDIT LOG TABLE
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  admin_email text,
  action text not null check (action in ('plan_change', 'role_change', 'suspend', 'unsuspend', 'manual')),
  target_user_id uuid references auth.users(id) on delete set null,
  target_email text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);
create index if not exists idx_audit_log_target on public.audit_log(target_user_id);

alter table public.audit_log enable row level security;

drop policy if exists "admin_select_audit_log" on public.audit_log;
create policy "admin_select_audit_log" on public.audit_log
  for select using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  );
-- No INSERT/UPDATE/DELETE policies for clients — only SECURITY DEFINER functions write.

-- 2. SUSPENSION COLUMN
alter table public.profiles
  add column if not exists suspended_at timestamptz;

-- 3. INTERNAL HELPER: check caller is admin
create or replace function public._is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- 4. RPC: List all users
create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  plan text,
  plan_expires_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public._is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  return query
  select
    p.user_id,
    au.email::text,
    p.display_name,
    p.role,
    p.plan,
    p.plan_expires_at,
    p.suspended_at,
    p.created_at,
    au.last_sign_in_at
  from public.profiles p
  join auth.users au on au.id = p.user_id
  order by p.created_at desc;
end;
$$;

-- 5. RPC: Get dashboard stats
create or replace function public.admin_get_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public._is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  select jsonb_build_object(
    'total_users',     (select count(*) from public.profiles),
    'active_7d',       (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'active_30d',      (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'by_plan',         (select jsonb_object_agg(plan, c) from (select plan, count(*) as c from public.profiles group by plan) t),
    'by_role',         (select jsonb_object_agg(role, c) from (select role, count(*) as c from public.profiles group by role) t),
    'suspended',       (select count(*) from public.profiles where suspended_at is not null),
    'signups_last_30d',(select jsonb_object_agg(date::text, c) from (
                          select date_trunc('day', created_at)::date as date, count(*) as c
                          from public.profiles
                          where created_at > now() - interval '30 days'
                          group by 1 order by 1
                        ) t)
  ) into result;

  return result;
end;
$$;

-- 6. RPC: Update user plan
create or replace function public.admin_update_user_plan(
  p_target_user_id uuid,
  p_new_plan text,
  p_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text;
  v_target_email text;
  v_old_plan text;
begin
  if not public._is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  if p_new_plan not in ('free', 'pro', 'admin') then
    raise exception 'invalid plan: %', p_new_plan;
  end if;

  select email into v_admin_email from auth.users where id = auth.uid();
  select email into v_target_email from auth.users where id = p_target_user_id;
  select plan into v_old_plan from public.profiles where user_id = p_target_user_id;

  update public.profiles
  set plan = p_new_plan,
      plan_expires_at = p_expires_at
  where user_id = p_target_user_id;

  insert into public.audit_log (admin_id, admin_email, action, target_user_id, target_email, details)
  values (
    auth.uid(), v_admin_email, 'plan_change', p_target_user_id, v_target_email,
    jsonb_build_object('from', v_old_plan, 'to', p_new_plan, 'expires_at', p_expires_at)
  );
end;
$$;

-- 7. RPC: Update user role
create or replace function public.admin_update_user_role(
  p_target_user_id uuid,
  p_new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text;
  v_target_email text;
  v_old_role text;
begin
  if not public._is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  if p_new_role not in ('user', 'admin') then
    raise exception 'invalid role: %', p_new_role;
  end if;

  -- Prevenir auto-demote (que el unico admin se quite el role).
  if p_target_user_id = auth.uid() and p_new_role <> 'admin' then
    raise exception 'cannot demote your own admin role (use a different admin account)';
  end if;

  select email into v_admin_email from auth.users where id = auth.uid();
  select email into v_target_email from auth.users where id = p_target_user_id;
  select role into v_old_role from public.profiles where user_id = p_target_user_id;

  update public.profiles set role = p_new_role where user_id = p_target_user_id;

  insert into public.audit_log (admin_id, admin_email, action, target_user_id, target_email, details)
  values (
    auth.uid(), v_admin_email, 'role_change', p_target_user_id, v_target_email,
    jsonb_build_object('from', v_old_role, 'to', p_new_role)
  );
end;
$$;

-- 8. RPC: Suspend / Unsuspend
create or replace function public.admin_suspend_user(
  p_target_user_id uuid,
  p_suspend boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text;
  v_target_email text;
begin
  if not public._is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  if p_target_user_id = auth.uid() and p_suspend then
    raise exception 'cannot suspend yourself';
  end if;

  select email into v_admin_email from auth.users where id = auth.uid();
  select email into v_target_email from auth.users where id = p_target_user_id;

  update public.profiles
  set suspended_at = case when p_suspend then now() else null end
  where user_id = p_target_user_id;

  insert into public.audit_log (admin_id, admin_email, action, target_user_id, target_email, details)
  values (
    auth.uid(), v_admin_email,
    case when p_suspend then 'suspend' else 'unsuspend' end,
    p_target_user_id, v_target_email,
    jsonb_build_object('reason', p_reason)
  );
end;
$$;

-- 9. RPC: Get per-user activity (counts of stored items)
-- Asume que cada user_* table tiene `data` JSONB con la forma del store
-- Zustand correspondiente (recipes/ingredients/log/plans/movements).
-- Si la forma cambia en frontend, hay que ajustar las paths aca.
create or replace function public.admin_get_user_activity(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public._is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  select jsonb_build_object(
    'recipes_count', coalesce((
      select jsonb_array_length(coalesce(data->'recipes', '[]'::jsonb))
      from public.user_recipes where user_id = p_target_user_id
    ), 0),
    'ingredients_count', coalesce((
      select jsonb_array_length(coalesce(data->'ingredients', '[]'::jsonb))
      from public.user_ingredients where user_id = p_target_user_id
    ), 0),
    'productions_count', coalesce((
      select jsonb_array_length(coalesce(data->'log', '[]'::jsonb))
      from public.user_productions where user_id = p_target_user_id
    ), 0),
    'plans_count', coalesce((
      select jsonb_array_length(coalesce(data->'plans', '[]'::jsonb))
      from public.user_plans where user_id = p_target_user_id
    ), 0),
    'inventory_movements_count', coalesce((
      select jsonb_array_length(coalesce(data->'movements', '[]'::jsonb))
      from public.user_inventory where user_id = p_target_user_id
    ), 0),
    'last_recipe_update',   (select updated_at from public.user_recipes     where user_id = p_target_user_id),
    'last_inventory_update',(select updated_at from public.user_inventory   where user_id = p_target_user_id)
  ) into result;

  return result;
end;
$$;

-- 10. RPC: Get audit log (paginated, opcionalmente filtrado por target user)
create or replace function public.admin_get_audit_log(
  p_limit int default 50,
  p_offset int default 0,
  p_target_user_id uuid default null
)
returns table (
  id uuid,
  admin_email text,
  action text,
  target_email text,
  details jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public._is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  return query
  select al.id, al.admin_email, al.action, al.target_email, al.details, al.created_at
  from public.audit_log al
  where p_target_user_id is null or al.target_user_id = p_target_user_id
  order by al.created_at desc
  limit greatest(1, least(p_limit, 200))
  offset greatest(0, p_offset);
end;
$$;

-- Permisos: cualquier usuario autenticado puede LLAMAR las funciones,
-- pero ellas validan internamente que sea admin. Si no lo es, raise.
grant execute on function public._is_admin                  to authenticated;
grant execute on function public.admin_list_users           to authenticated;
grant execute on function public.admin_get_stats            to authenticated;
grant execute on function public.admin_update_user_plan     to authenticated;
grant execute on function public.admin_update_user_role     to authenticated;
grant execute on function public.admin_suspend_user         to authenticated;
grant execute on function public.admin_get_user_activity    to authenticated;
grant execute on function public.admin_get_audit_log        to authenticated;
