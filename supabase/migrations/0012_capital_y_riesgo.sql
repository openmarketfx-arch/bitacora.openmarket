-- ============================================================
-- Capital de la cuenta, límites de pérdida y costos de las operaciones
--
-- * trading_accounts.capital_inicial: dinero con el que arranca la cuenta. El saldo
--   actual no se guarda: es capital_inicial + el resultado neto de lo cerrado.
-- * limite_riesgo_*: % máximo del saldo que se acepta perder por día, semana y mes.
--   Null = sin límite para ese periodo. La medición vive en la app (src/lib/datos/riesgo.ts).
-- * trades.comision / trades.swap: cobros del bróker sobre una operación cerrada, con
--   el signo que muestra la plataforma (negativo = te lo cobraron, positivo = te lo
--   abonaron). El resultado neto es resultado_dinero + comision + swap.
--
-- La columna broker se conserva (ya no se pide en la app) para no perder datos.
-- Idempotente: se puede ejecutar más de una vez.
-- ============================================================

alter table public.trading_accounts
  add column if not exists capital_inicial        numeric(18, 2),
  add column if not exists limite_riesgo_diario   numeric(5, 2),
  add column if not exists limite_riesgo_semanal  numeric(5, 2),
  add column if not exists limite_riesgo_mensual  numeric(5, 2);

do $$ begin
  alter table public.trading_accounts
    add constraint trading_accounts_capital_no_negativo
    check (capital_inicial is null or capital_inicial >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trading_accounts
    add constraint trading_accounts_limites_validos
    check (
      (limite_riesgo_diario  is null or (limite_riesgo_diario  > 0 and limite_riesgo_diario  <= 100)) and
      (limite_riesgo_semanal is null or (limite_riesgo_semanal > 0 and limite_riesgo_semanal <= 100)) and
      (limite_riesgo_mensual is null or (limite_riesgo_mensual > 0 and limite_riesgo_mensual <= 100))
    );
exception when duplicate_object then null; end $$;

alter table public.trades
  add column if not exists comision numeric(18, 2) not null default 0,
  add column if not exists swap     numeric(18, 2) not null default 0;

-- Los costos solo existen en operaciones cerradas: una abierta o una orden que
-- nunca se activó no tiene cobros que registrar.
do $$ begin
  alter table public.trades
    add constraint trades_costos_solo_cerrada
    check (estado_operacion = 'cerrada' or (comision = 0 and swap = 0));
exception when duplicate_object then null; end $$;
