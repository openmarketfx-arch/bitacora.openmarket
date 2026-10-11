-- ============================================================
-- Open Market — Fusión de tags
-- Unificar dos confirmaciones que resultaron ser la misma ("BOS" y "break of
-- structure") tiene que ser atómico: si se hiciera en dos llamadas desde el
-- cliente, un fallo entre ambas dejaría operaciones huérfanas de tag.
-- ============================================================

create or replace function public.fusionar_tags(p_origen uuid, p_destino uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid       uuid := auth.uid();
  v_movidas   integer;
begin
  if v_uid is null then
    raise exception 'Sin sesión';
  end if;

  if p_origen = p_destino then
    raise exception 'No se puede fusionar un tag consigo mismo';
  end if;

  -- Ambos tags tienen que ser del usuario que llama. SECURITY DEFINER salta
  -- RLS, así que esta comprobación es la única barrera: no se puede omitir.
  if not exists (select 1 from public.tags where id = p_origen  and user_id = v_uid)
     or not exists (select 1 from public.tags where id = p_destino and user_id = v_uid) then
    raise exception 'Tag no encontrado';
  end if;

  -- Reapunta las operaciones del origen al destino. Las que ya tenían ambos
  -- tags se quedan solo con el destino (on conflict do nothing).
  insert into public.trade_tags (trade_id, tag_id)
  select tt.trade_id, p_destino
  from public.trade_tags tt
  where tt.tag_id = p_origen
  on conflict do nothing;

  get diagnostics v_movidas = row_count;

  -- El on delete cascade de trade_tags limpia los vínculos que quedaban.
  delete from public.tags where id = p_origen and user_id = v_uid;

  return v_movidas;
end $fn$;

revoke execute on function public.fusionar_tags(uuid, uuid) from public, anon;
grant  execute on function public.fusionar_tags(uuid, uuid) to authenticated;
