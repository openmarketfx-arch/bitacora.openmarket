-- ============================================================
-- Open Market — Unidad de medida, precio de referencia y niveles
--
-- Tres cosas que faltaban para poder razonar en pips:
--   1. Todo instrumento declara cuánto vale un pip o un punto. Antes solo
--      forex lo tenía y el resto se medía en "diferencia de precio cruda",
--      lo que impedía comparar: 430 en BTCUSD y 430 en NAS100 no son lo mismo.
--   2. Un precio orientativo por par, para que el formulario sepa los
--      decimales y el orden de magnitud que espera cada campo.
--   3. Los niveles planificados (TP y stop) en la operación, que son los que
--      permiten calcular riesgo, objetivo y R:R sin preguntar nada.
-- ============================================================

alter table public.instruments drop constraint if exists instruments_valor_pip_solo_forex;

update public.instruments set valor_pip = case
  when asset_class = 'index' then 1.0
  when asset_class = 'stock' then 1.0
  when asset_class = 'crypto' and decimales_precio <= 2 then 1.0
  when asset_class = 'crypto' and decimales_precio = 3 then 0.1
  when asset_class = 'crypto' and decimales_precio = 4 then 0.001
  when asset_class = 'crypto' then 0.0001
  else valor_pip
end
where valor_pip is null;

alter table public.instruments alter column valor_pip set not null;

alter table public.instruments drop constraint if exists instruments_valor_pip_positivo;
alter table public.instruments add constraint instruments_valor_pip_positivo check (valor_pip > 0);

-- Orientativo: NO es una cotización en vivo. Eso llega en la Fase 3.
alter table public.instruments add column if not exists precio_referencia numeric(20, 10)
  check (precio_referencia is null or precio_referencia > 0);
alter table public.instruments add column if not exists referencia_actualizada timestamptz;

-- ---------- Niveles planificados ----------
alter table public.trades add column if not exists precio_tp numeric(20, 10)
  check (precio_tp is null or precio_tp > 0);
alter table public.trades add column if not exists precio_stop numeric(20, 10)
  check (precio_stop is null or precio_stop > 0);

-- Cuánto le faltó al precio para tocar una orden pendiente que no se activó.
-- Es la medida de precisión de entrada que da sentido al estado no_activada.
alter table public.trades add column if not exists distancia_no_activada numeric(20, 10)
  check (distancia_no_activada is null or distancia_no_activada >= 0);

alter table public.trades drop constraint if exists trades_distancia_solo_no_activada;
alter table public.trades add constraint trades_distancia_solo_no_activada check (
  distancia_no_activada is null or estado_operacion = 'no_activada'
);
