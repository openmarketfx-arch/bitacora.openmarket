-- ============================================================
-- Open Market — Esquema base (Fase 1)
-- Multi-tenant desde el día 1: toda fila de usuario lleva user_id
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tipos enumerados ----------
do $$ begin
  create type asset_class      as enum ('forex', 'crypto', 'index', 'stock');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_type     as enum ('real', 'demo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type direccion_trade  as enum ('compra', 'venta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_operacion as enum ('abierta', 'cerrada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_revision  as enum ('no_aplica', 'pendiente', 'revisado');
exception when duplicate_object then null; end $$;

-- Los 8 tipos de cierre: el diferenciador central de la plataforma
do $$ begin
  create type tipo_cierre as enum (
    'stop_caceria',       -- sacado por pocos pips antes de ir a favor    -> margen_error_precio
    'stop_contra',        -- mala lectura de estructura (inmediato)
    'tp_justo',           -- el precio revierte justo en el TP
    'tp_corto',           -- objetivo corto                               -> no_capturado_precio
    'break_even',         -- vuelve al punto de entrada (inmediato)
    'cierre_correcto',    -- cerrar antes fue lo correcto
    'cierre_incorrecto',  -- ansiedad / indisciplina                      -> no_capturado_precio
    'reversion'           -- devolvió desde el máximo flotante (inmediato) -> devuelto_precio
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type impacto_evento as enum ('alto', 'medio', 'bajo');
exception when duplicate_object then null; end $$;

-- ---------- Utilidad: updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end $fn$;

-- ---------- Cuentas de trading ----------
create table if not exists public.trading_accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  nombre       text not null check (length(btrim(nombre)) between 1 and 80),
  broker       text,
  moneda_base  text not null default 'USD' check (length(moneda_base) between 2 and 8),
  tipo         account_type not null default 'real',
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists trading_accounts_user_idx on public.trading_accounts (user_id, activo);
create unique index if not exists trading_accounts_user_nombre_key
  on public.trading_accounts (user_id, lower(btrim(nombre)));

drop trigger if exists trg_trading_accounts_updated on public.trading_accounts;
create trigger trg_trading_accounts_updated before update on public.trading_accounts
  for each row execute function public.set_updated_at();

-- ---------- Catálogo de instrumentos ----------
-- user_id NULL  = catálogo del sistema (visible para todos, no editable).
-- user_id != NULL = instrumento propio del usuario.
create table if not exists public.instruments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  simbolo          text not null check (length(btrim(simbolo)) between 1 and 24),
  nombre           text not null,
  asset_class      asset_class not null,
  decimales_precio smallint not null default 5 check (decimales_precio between 0 and 10),
  -- Tamaño del pip en unidades de precio (0.0001 en EURUSD, 0.01 en USDJPY).
  -- Solo forex; NULL en el resto de asset_class (ahí se habla de puntos).
  valor_pip        numeric(18, 10),
  created_at       timestamptz not null default now(),
  constraint instruments_valor_pip_solo_forex check (
    (asset_class = 'forex' and valor_pip is not null and valor_pip > 0)
    or (asset_class <> 'forex' and valor_pip is null)
  )
);
create unique index if not exists instruments_sistema_simbolo_key
  on public.instruments (upper(simbolo)) where user_id is null;
create unique index if not exists instruments_usuario_simbolo_key
  on public.instruments (user_id, upper(simbolo)) where user_id is not null;
create index if not exists instruments_asset_class_idx on public.instruments (asset_class);

-- ---------- Instrumentos seguidos por el usuario ----------
create table if not exists public.user_instruments (
  user_id       uuid not null references auth.users(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, instrument_id)
);

-- ---------- Biblioteca de tags (confirmaciones / setups) ----------
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  nombre     text not null check (length(btrim(nombre)) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index if not exists tags_user_nombre_key
  on public.tags (user_id, lower(btrim(nombre)));

-- ---------- Operaciones ----------
create table if not exists public.trades (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  trading_account_id  uuid not null references public.trading_accounts(id) on delete restrict,
  instrument_id       uuid not null references public.instruments(id) on delete restrict,

  direccion           direccion_trade not null,

  fecha_hora_entrada  timestamptz not null,
  fecha_hora_salida   timestamptz,

  precio_entrada      numeric(20, 10) not null check (precio_entrada > 0),
  precio_salida       numeric(20, 10) check (precio_salida > 0),

  lotaje              numeric(18, 6) check (lotaje > 0),
  resultado_dinero    numeric(18, 2),

  estado_operacion    estado_operacion not null default 'abierta',
  estado_revision     estado_revision  not null default 'no_aplica',
  tipo_cierre         tipo_cierre,

  -- Diferencias de precio crudas. La conversión a pips (forex) o puntos
  -- (crypto/index/stock) se resuelve en la capa de presentación, nunca aquí.
  margen_error_precio numeric(20, 10) check (margen_error_precio >= 0),
  no_capturado_precio numeric(20, 10) check (no_capturado_precio >= 0),
  devuelto_precio     numeric(20, 10) check (devuelto_precio >= 0),

  notas               text,
  captura_url         text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Una operación cerrada necesita datos de salida completos
  constraint trades_cierre_completo check (
    estado_operacion = 'abierta'
    or (fecha_hora_salida is not null and precio_salida is not null and resultado_dinero is not null)
  ),
  -- Una operación abierta no puede traer datos de salida ni clasificación
  constraint trades_abierta_sin_salida check (
    estado_operacion = 'cerrada'
    or (fecha_hora_salida is null and precio_salida is null
        and resultado_dinero is null and tipo_cierre is null)
  ),
  constraint trades_salida_posterior check (
    fecha_hora_salida is null or fecha_hora_salida >= fecha_hora_entrada
  ),
  -- Cada tipo de cierre habilita exactamente su campo numérico y ningún otro
  constraint trades_margen_error_solo_caceria check (
    margen_error_precio is null or tipo_cierre = 'stop_caceria'
  ),
  constraint trades_no_capturado_solo_corto_o_incorrecto check (
    no_capturado_precio is null or tipo_cierre in ('tp_corto', 'cierre_incorrecto')
  ),
  constraint trades_devuelto_solo_reversion check (
    devuelto_precio is null or tipo_cierre = 'reversion'
  )
);

create index if not exists trades_user_fecha_idx  on public.trades (user_id, fecha_hora_entrada desc);
create index if not exists trades_user_estado_idx on public.trades (user_id, estado_operacion, estado_revision);
create index if not exists trades_account_idx     on public.trades (trading_account_id);
create index if not exists trades_instrument_idx  on public.trades (instrument_id);
create index if not exists trades_tipo_cierre_idx on public.trades (user_id, tipo_cierre) where tipo_cierre is not null;
create index if not exists trades_cerradas_salida_idx
  on public.trades (user_id, fecha_hora_salida desc) where estado_operacion = 'cerrada';

drop trigger if exists trg_trades_updated on public.trades;
create trigger trg_trades_updated before update on public.trades
  for each row execute function public.set_updated_at();

-- estado_revision es derivado: nunca se confía en lo que mande el cliente.
--   abierta                  -> no_aplica
--   cerrada sin tipo_cierre  -> pendiente  (entra a la cola de revisión)
--   cerrada con tipo_cierre  -> revisado
create or replace function public.trades_sync_estado_revision()
returns trigger language plpgsql as $fn$
begin
  if new.estado_operacion = 'abierta' then
    new.estado_revision := 'no_aplica';
  elsif new.tipo_cierre is null then
    new.estado_revision := 'pendiente';
  else
    new.estado_revision := 'revisado';
  end if;
  return new;
end $fn$;

drop trigger if exists trg_trades_estado_revision on public.trades;
create trigger trg_trades_estado_revision before insert or update on public.trades
  for each row execute function public.trades_sync_estado_revision();

-- La cuenta y el instrumento referenciados deben pertenecer (o ser visibles) al mismo usuario
create or replace function public.trades_validate_ownership()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if not exists (
    select 1 from public.trading_accounts a
    where a.id = new.trading_account_id and a.user_id = new.user_id
  ) then
    raise exception 'La cuenta de trading no pertenece al usuario';
  end if;

  if not exists (
    select 1 from public.instruments i
    where i.id = new.instrument_id and (i.user_id is null or i.user_id = new.user_id)
  ) then
    raise exception 'El instrumento no está disponible para el usuario';
  end if;

  return new;
end $fn$;

drop trigger if exists trg_trades_ownership on public.trades;
create trigger trg_trades_ownership
  before insert or update of trading_account_id, instrument_id, user_id
  on public.trades for each row execute function public.trades_validate_ownership();

-- ---------- Tabla puente operación <-> tag ----------
create table if not exists public.trade_tags (
  trade_id uuid not null references public.trades(id) on delete cascade,
  tag_id   uuid not null references public.tags(id)   on delete cascade,
  primary key (trade_id, tag_id)
);
create index if not exists trade_tags_tag_idx on public.trade_tags (tag_id);

-- ---------- Cachés de datos de mercado (se llenan en Fase 3) ----------
create table if not exists public.market_prices (
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  timestamp     timestamptz not null,
  precio        numeric(20, 10) not null,
  primary key (instrument_id, timestamp)
);

create table if not exists public.economic_events (
  id             uuid primary key default gen_random_uuid(),
  fecha_hora     timestamptz not null,
  pais           text not null,
  evento         text not null,
  impacto        impacto_evento not null,
  valor_previo   text,
  valor_esperado text,
  valor_real     text,
  created_at     timestamptz not null default now()
);
create index if not exists economic_events_fecha_idx on public.economic_events (fecha_hora desc);
create unique index if not exists economic_events_dedup_key
  on public.economic_events (fecha_hora, lower(pais), lower(evento));
