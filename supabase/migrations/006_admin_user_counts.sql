-- Migration 006: admin_list_user_counts
-- Sprint Admin Panel Fase 3 — 2026-05-30
--
-- Retorna conteo de recetas e ingredientes por usuario para el filtro
-- "uso minimo" del panel admin. Evita cargar la actividad completa
-- de cada usuario individualmente.
-- Idempotente.

create or replace function public.admin_list_user_counts()
returns table (
  user_id         uuid,
  recipe_count    int,
  ingredient_count int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not _is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  return query
  select
    p.user_id,
    coalesce(
      jsonb_array_length(r.data->'recipes'), 0
    )::int as recipe_count,
    coalesce(
      jsonb_array_length(i.data->'ingredients'), 0
    )::int as ingredient_count
  from public.profiles p
  left join public.user_recipes     r on r.user_id = p.user_id
  left join public.user_ingredients i on i.user_id = p.user_id;
end;
$$;

grant execute on function public.admin_list_user_counts() to authenticated;
