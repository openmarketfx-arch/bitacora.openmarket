-- ============================================================
-- Tipos de cuenta para pruebas de fondeo
--
--   prueba_fondeo  cuenta en prueba: tiene fases con objetivo de ganancia y límites de pérdida
--   fondeada       cuenta que ya aprobó la prueba (solo se llega a ella aprobando)
--
-- Va separada de 0015 porque un valor nuevo de un enum no se puede usar en la misma
-- transacción que lo crea (el mismo motivo por el que 0008 y 0009 están separadas).
-- Idempotente: se puede ejecutar más de una vez.
-- ============================================================

alter type public.account_type add value if not exists 'prueba_fondeo';
alter type public.account_type add value if not exists 'fondeada';
