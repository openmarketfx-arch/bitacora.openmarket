-- ============================================================
-- Open Market — Precios orientativos de referencia
--
-- Solo se siembran los pares que se pudieron anclar a un dato real. El resto
-- queda en null y lo define el usuario desde Configuración, o la integración
-- de datos de mercado de la Fase 3. Estos valores envejecen: su única función
-- es fijar decimales y orden de magnitud en los formularios.
-- ============================================================

update public.instruments i set
  precio_referencia = v.precio,
  referencia_actualizada = now()
from (values
  -- Majors y yen, referencia del 2 de octubre de 2026
  ('EURUSD',    1.12480),
  ('GBPUSD',    1.32070),
  ('USDJPY',  157.86000),
  -- Cruces derivados de los anteriores
  ('EURJPY',  177.56000),
  ('GBPJPY',  208.47000),
  -- Metales
  ('XAUUSD', 4133.40000),
  -- Índices
  ('SPX500', 7818.93000),
  ('US30',  51267.90000),
  -- Cripto
  ('BTCUSD', 85970.00000)
) as v(simbolo, precio)
where i.simbolo = v.simbolo and i.user_id is null;
