-- Migration 005: RPC admin_get_churn_30d + admin_get_upgrades_30d
-- Sprint Admin Panel Fase 3 — 2026-05-30
--
-- Retorna datos diarios de churn (pro→free) y upgrades (free→pro)
-- para los charts temporales del panel admin.
-- Usa audit_log.details = {from, to} generado por admin_update_user_plan().
-- Idempotente.

-- Churn diario: downgrades de plan_change con from in (pro,admin) y to = free
create or replace function public.admin_get_churn_30d()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _result jsonb;
begin
  if not _is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  select jsonb_object_agg(day::text, cnt)
  into _result
  from (
    select
      date_trunc('day', created_at)::date as day,
      count(*)                             as cnt
    from public.audit_log
    where action = 'plan_change'
      and created_at >= now() - interval '30 days'
      and (details->>'from') in ('pro', 'admin')
      and (details->>'to')   = 'free'
    group by 1
    order by 1
  ) t;

  return coalesce(_result, '{}'::jsonb);
end;
$$;

-- Upgrades diarios: plan_change con from = free y to in (pro,admin)
create or replace function public.admin_get_upgrades_30d()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _result jsonb;
begin
  if not _is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  select jsonb_object_agg(day::text, cnt)
  into _result
  from (
    select
      date_trunc('day', created_at)::date as day,
      count(*)                             as cnt
    from public.audit_log
    where action = 'plan_change'
      and created_at >= now() - interval '30 days'
      and (details->>'from') = 'free'
      and (details->>'to')   in ('pro', 'admin')
    group by 1
    order by 1
  ) t;

  return coalesce(_result, '{}'::jsonb);
end;
$$;

grant execute on function public.admin_get_churn_30d()    to authenticated;
grant execute on function public.admin_get_upgrades_30d() to authenticated;
