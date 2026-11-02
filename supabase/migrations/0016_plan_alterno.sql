-- ============================================================
-- Plan alterno: varias entradas por día (Plan A a E) enlazadas entre sí
--
-- * plan_alterno: la configuración de cada usuario (si está activo y qué planes usa).
-- * trades.numero: número correlativo por usuario, el código de referencia de cada operación.
-- * trades.plan: a qué plan pertenece la operación (opcional).
-- * trades.grupo_plan_id: identificador común de las operaciones enlazadas. Es el id de la
--   primera operación del grupo; no es una clave foránea para que borrar esa operación no
--   rompa al resto del grupo.
-- * Un mismo plan no puede repetirse dentro de un grupo.
--
-- Idempotente: se puede ejecutar más de una vez.
-- ============================================================

create table if not exists public.plan_alterno (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  habilitado  boolean not null default false,
  planes      text[] not null default '{}',
  updated_at  timestamptz not null default now(),
  constraint plan_alterno_planes_validos check (planes <@ array['A', 'B', 'C', 'D', 'E']::text[])
);

alter table public.plan_alterno enable row level security;

drop policy if exists plan_alterno_select on public.plan_alterno;
create policy plan_alterno_select on public.plan_alterno
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists plan_alterno_insert on public.plan_alterno;
create policy plan_alterno_insert on public.plan_alterno
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists plan_alterno_update on public.plan_alterno;
create policy plan_alterno_update on public.plan_alterno
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Columnas nuevas en trades ----------
alter table public.trades add column if not exists numero integer;
alter table public.trades add column if not exists plan text;
alter table public.trades add column if not exists grupo_plan_id uuid;

alter table public.trades drop constraint if exists trades_plan_valido;
alter table public.trades add constraint trades_plan_valido
  check (plan is null or plan in ('A', 'B', 'C', 'D', 'E'));

-- Estar enlazada a un grupo exige tener plan.
alter table public.trades drop constraint if exists trades_grupo_requiere_plan;
alter table public.trades add constraint trades_grupo_requiere_plan
  check (grupo_plan_id is null or plan is not null);

-- Numeración de lo que ya existe, en orden de registro.
with ordenadas as (
  select id, user_id, row_number() over (partition by user_id order by created_at, id) as n
  from public.trades
  where numero is null
), base as (
  select user_id, coalesce(max(numero), 0) as maximo from public.trades group by user_id
)
update public.trades t
set numero = o.n + b.maximo
from ordenadas o
join base b on b.user_id = o.user_id
where t.id = o.id;

create unique index if not exists trades_user_numero_key on public.trades (user_id, numero);

-- Un plan no se repite dentro de un grupo de operaciones enlazadas.
create unique index if not exists trades_grupo_plan_key
  on public.trades (grupo_plan_id, plan)
  where grupo_plan_id is not null and plan is not null;

create index if not exists trades_grupo_idx on public.trades (grupo_plan_id) where grupo_plan_id is not null;

-- El número lo pone la base: nunca se confía en lo que mande el cliente.
create or replace function public.trades_asignar_numero()
returns trigger language plpgsql set search_path = public, pg_temp as $fn$
begin
  -- Serializa las altas del mismo usuario para que dos a la vez no tomen el mismo número.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  select coalesce(max(numero), 0) + 1 into new.numero
  from public.trades where user_id = new.user_id;
  return new;
end $fn$;

drop trigger if exists trg_trades_numero on public.trades;
create trigger trg_trades_numero before insert on public.trades
  for each row execute function public.trades_asignar_numero();

-- El número no cambia nunca después de asignado.
create or replace function public.trades_numero_inmutable()
returns trigger language plpgsql set search_path = public, pg_temp as $fn$
begin
  new.numero := old.numero;
  return new;
end $fn$;

drop trigger if exists trg_trades_numero_inmutable on public.trades;
create trigger trg_trades_numero_inmutable before update on public.trades
  for each row execute function public.trades_numero_inmutable();

-- Solo se ejecutan como triggers, nunca como RPC.
revoke execute on function public.trades_asignar_numero() from public, anon, authenticated;
revoke execute on function public.trades_numero_inmutable() from public, anon, authenticated;
