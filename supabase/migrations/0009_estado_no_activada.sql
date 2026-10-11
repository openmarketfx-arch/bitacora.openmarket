-- ============================================================
-- Open Market — Estado "no activada"
--
-- Va en su propio archivo porque `alter type ... add value` no puede
-- ejecutarse en la misma transacción en la que se usa el valor nuevo.
-- Ejecútalo ENTRE el paso 1 y el paso 3 de 0008_categorias_y_ordenes.sql.
-- ============================================================

alter type estado_operacion add value if not exists 'no_activada';
