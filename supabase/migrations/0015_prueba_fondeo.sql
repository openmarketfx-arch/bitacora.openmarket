-- ============================================================
-- Datos de una prueba de fondeo
--
-- Una cuenta de tipo prueba_fondeo declara:
--   · prueba_fases        cuántas fases tiene la prueba (1 a 4)
--   · prueba_objetivos    el objetivo de ganancia, en % del capital inicial, de cada fase
--   · prueba_limite_*     la pérdida máxima permitida en un día y en total, en % del capital
--                         inicial. Sobrepasar cualquiera de las dos da la prueba por perdida.
--   · prueba_estado       en_curso | aprobada | fallida
--   · prueba_resuelta_en  cuándo se aprobó o se perdió
--
-- Al aprobar la última fase la cuenta pasa a tipo 'fondeada' (lo hace la app). Los datos
-- de la prueba se conservan en la cuenta fondeada: sus límites de pérdida siguen vigentes.
--
-- La evaluación (fase actual, progreso, límites) vive en la app: src/lib/datos/fondeo.ts.
-- Idempotente: se puede ejecutar más de una vez.
-- ============================================================

alter table public.trading_accounts
  add column if not exists prueba_fases          smallint,
  add column if not exists prueba_objetivos      numeric(5, 2)[],
  add column if not exists prueba_limite_diario  numeric(5, 2),
  add column if not exists prueba_limite_total   numeric(5, 2),
  add column if not exists prueba_estado         text,
  add column if not exists prueba_resuelta_en    timestamptz;

do $$ begin
  alter table public.trading_accounts
    add constraint trading_accounts_prueba_valores
    check (
      (prueba_fases is null or prueba_fases between 1 and 4)
      and (prueba_limite_diario is null or (prueba_limite_diario > 0 and prueba_limite_diario <= 100))
      and (prueba_limite_total  is null or (prueba_limite_total  > 0 and prueba_limite_total  <= 100))
      and (prueba_estado is null or prueba_estado in ('en_curso', 'aprobada', 'fallida'))
      -- Un objetivo por fase, cada uno entre 0 (excluido) y 100 %.
      and (
        prueba_objetivos is null
        or (
          prueba_fases is not null
          and cardinality(prueba_objetivos) = prueba_fases
          and 0 < all (prueba_objetivos)
          and 100 >= all (prueba_objetivos)
        )
      )
    );
exception when duplicate_object then null; end $$;

-- Las cuentas de prueba y las fondeadas traen todos los datos; las demás, ninguno.
do $$ begin
  alter table public.trading_accounts
    add constraint trading_accounts_prueba_coherente
    check (
      case
        when tipo in ('prueba_fondeo', 'fondeada') then
          prueba_fases is not null
          and prueba_objetivos is not null
          and prueba_limite_diario is not null
          and prueba_limite_total is not null
          and prueba_estado is not null
        else
          prueba_fases is null
          and prueba_objetivos is null
          and prueba_limite_diario is null
          and prueba_limite_total is null
          and prueba_estado is null
          and prueba_resuelta_en is null
      end
    );
exception when duplicate_object then null; end $$;

-- Solo se es "fondeada" habiendo aprobado la prueba, y una prueba aprobada es una fondeada.
do $$ begin
  alter table public.trading_accounts
    add constraint trading_accounts_fondeada_aprobada
    check (
      (tipo <> 'fondeada' or prueba_estado = 'aprobada')
      and (tipo <> 'prueba_fondeo' or prueba_estado in ('en_curso', 'fallida'))
    );
exception when duplicate_object then null; end $$;
