-- ============================================================
-- Open Market — Categorías de confirmación y tipos de orden
--
-- Tres cambios de fondo:
--   1. Los tags dejan de ser una lista plana: pertenecen a estructura,
--      entrada o salida, y los de salida distinguen zona de TP de zona de stop.
--   2. La dirección deja de escribirse a mano: se deriva del tipo de orden,
--      que ahora distingue entradas a mercado de órdenes pendientes.
--   3. Una orden pendiente que nunca se activó necesita su propio estado:
--      no es una operación cerrada porque no tiene salida ni resultado.
--
-- Se aplica en cuatro pasos porque `alter type ... add value` no puede
-- convivir en la misma transacción con el uso de ese valor.
-- ============================================================

-- ---------- Paso 1: enums nuevos ----------
do $$ begin
  create type categoria_tag as enum ('estructura', 'entrada', 'salida');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subtipo_salida as enum ('tp', 'stop');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_orden as enum ('buy', 'sell', 'buy_stop', 'sell_stop', 'buy_limit', 'sell_limit');
exception when duplicate_object then null; end $$;

-- ---------- Paso 2 (transacción aparte): nuevo estado ----------
-- alter type estado_operacion add value if not exists 'no_activada';

-- ---------- Paso 3: tags categorizados ----------
alter table public.tags add column if not exists categoria categoria_tag not null default 'entrada';
alter table public.tags add column if not exists subtipo_salida subtipo_salida;

alter table public.tags drop constraint if exists tags_subtipo_solo_en_salida;
alter table public.tags add constraint tags_subtipo_solo_en_salida check (
  (categoria = 'salida' and subtipo_salida is not null)
  or (categoria <> 'salida' and subtipo_salida is null)
);

-- El mismo nombre puede existir en categorías distintas ("BOS" sirve para
-- describir la estructura y para justificar la entrada), así que la unicidad
-- pasa a ser por categoría.
drop index if exists public.tags_user_nombre_key;
create unique index if not exists tags_user_categoria_nombre_key
  on public.tags (user_id, categoria, lower(btrim(nombre)));

create index if not exists tags_user_categoria_idx on public.tags (user_id, categoria);

-- ---------- Paso 4: tipo de orden y activación ----------
alter table public.trades add column if not exists tipo_orden tipo_orden;

-- Lo registrado hasta ahora eran entradas a mercado.
update public.trades set tipo_orden =
  (case when direccion = 'compra' then 'buy' else 'sell' end)::tipo_orden
where tipo_orden is null;

alter table public.trades alter column tipo_orden set not null;

-- direccion pasa a derivarse de tipo_orden: no puede desincronizarse, y toda
-- la analítica de largo/corto que ya existía sigue funcionando igual.
alter table public.trades drop column if exists direccion;
alter table public.trades add column direccion direccion_trade
  generated always as (
    case
      when tipo_orden in ('buy', 'buy_stop', 'buy_limit') then 'compra'::direccion_trade
      else 'venta'::direccion_trade
    end
  ) stored;

-- Si la orden esperaba a que el precio llegara, importa saber si llegó.
alter table public.trades add column if not exists orden_activada boolean;

alter table public.trades drop constraint if exists trades_activacion_solo_pendientes;
alter table public.trades add constraint trades_activacion_solo_pendientes check (
  orden_activada is null
  or tipo_orden in ('buy_stop', 'sell_stop', 'buy_limit', 'sell_limit')
);

-- ---------- Los tres estados posibles ----------
alter table public.trades drop constraint if exists trades_cierre_completo;
alter table public.trades add constraint trades_cierre_completo check (
  estado_operacion <> 'cerrada'
  or (fecha_hora_salida is not null and precio_salida is not null and resultado_dinero is not null)
);

alter table public.trades drop constraint if exists trades_abierta_sin_salida;
alter table public.trades drop constraint if exists trades_sin_cerrar_sin_resultado;
alter table public.trades add constraint trades_sin_cerrar_sin_resultado check (
  estado_operacion = 'cerrada'
  or (fecha_hora_salida is null and precio_salida is null
      and resultado_dinero is null and tipo_cierre is null)
);

alter table public.trades drop constraint if exists trades_no_activada_coherente;
alter table public.trades add constraint trades_no_activada_coherente check (
  estado_operacion <> 'no_activada'
  or (tipo_orden in ('buy_stop', 'sell_stop', 'buy_limit', 'sell_limit')
      and orden_activada is false)
);

create index if not exists trades_tipo_orden_idx on public.trades (user_id, tipo_orden);
create index if not exists trades_no_activadas_idx
  on public.trades (user_id) where estado_operacion = 'no_activada';

-- ---------- El trigger reconoce el estado nuevo ----------
create or replace function public.trades_sync_estado_revision()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  -- Una orden que no se activó nunca llegó a ser una operación: no hay nada
  -- que clasificar, así que no entra en la cola de revisión.
  if new.estado_operacion <> 'cerrada' then
    new.estado_revision := 'no_aplica';
  elsif new.tipo_cierre is null then
    new.estado_revision := 'pendiente';
  else
    new.estado_revision := 'revisado';
  end if;
  return new;
end $fn$;

revoke execute on function public.trades_sync_estado_revision() from public, anon, authenticated;
