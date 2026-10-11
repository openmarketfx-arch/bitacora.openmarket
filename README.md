# Open Market

Bitácora de trading analítica. No solo registra si ganaste o perdiste: clasifica
**por qué** cerró cada operación y convierte eso en métricas accionables sobre tu
precisión de entrada, tu lectura de estructura, la ubicación de tus TPs y tu disciplina.

- **Stack**: Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase (Postgres + Auth + RLS + Storage) · Recharts
- **Tema**: oscuro por defecto. Convención de resultado: **verde = positivo, negro = negativo**.
- **Multi-tenant desde el día 1**: toda tabla de usuario lleva `user_id` con RLS activo.

## Puesta en marcha

### 1. Crear el proyecto en Supabase

En [supabase.com](https://supabase.com) crea un proyecto nuevo. Luego, en
**Project Settings → API**, copia la *Project URL* y la *anon public key*.

### 2. Variables de entorno

Crea `open-market/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

La `anon key` está pensada para viajar al navegador; el aislamiento real lo hace
RLS, no el secreto de la llave.

### 3. Migraciones

Desde el **SQL Editor** de Supabase, ejecuta en orden el contenido de:

| Archivo | Qué hace |
|---|---|
| `supabase/migrations/0001_schema.sql` | Tablas, enums, constraints y triggers |
| `supabase/migrations/0002_rls.sql` | Row Level Security por `user_id` |
| `supabase/migrations/0003_seed_instruments.sql` | Catálogo de 74 instrumentos del sistema |
| `supabase/migrations/0004_storage.sql` | Bucket privado `trade-captures` |
| `supabase/migrations/0005_new_user_defaults.sql` | Cuenta de trading por defecto al registrarse |
| `supabase/migrations/0006_hardening.sql` | `search_path` fijo y sin RPC en las funciones de trigger |
| `supabase/migrations/0007_fusionar_tags.sql` | RPC `fusionar_tags` para unir dos tags de forma atómica |
| `supabase/migrations/0008_categorias_y_ordenes.sql` | Categorías de confirmación, tipos de orden y estado `no_activada` |
| `supabase/migrations/0009_estado_no_activada.sql` | Valor de enum nuevo (va entre los pasos 1 y 3 de 0008) |
| `supabase/migrations/0010_pips_y_niveles.sql` | Unidad de medida en todo instrumento, precio de referencia, TP/stop y distancia de activación |
| `supabase/migrations/0011_precios_referencia.sql` | Precios orientativos de los pares que se pudieron anclar a un dato real |

Todas son idempotentes: se pueden re-ejecutar sin duplicar nada.

### 4. Arrancar

```bash
npm install
npm run dev
```

La app queda en `http://localhost:3001`.

## Modelo de datos

`trading_accounts` · `instruments` · `user_instruments` · `tags` · `trades` ·
`trade_tags` · `market_prices` · `economic_events`

Detalles que no son obvios leyendo las tablas:

- **`estado_revision` es derivado, no lo escribe el cliente.** Un trigger lo mantiene:
  `abierta → no_aplica`, `cerrada sin tipo_cierre → pendiente`, `cerrada con tipo_cierre → revisado`.
  Así la cola de revisión nunca se desincroniza.
- **Cada `tipo_cierre` habilita exactamente un campo numérico** y los constraints lo
  imponen: `stop_caceria → margen_error_precio`, `tp_corto` y `cierre_incorrecto →
  no_capturado_precio`, `reversion → devuelto_precio`. El resto no admite ninguno.
- **Los campos de medición se guardan como diferencia de precio cruda.** La conversión
  a pips (forex, dividiendo por `instruments.valor_pip`) o a puntos (cripto, índices,
  acciones) vive solo en `src/lib/format.ts`, nunca en la base de datos.
- **Todo instrumento declara su unidad** en `valor_pip`: el tamaño de un pip en forex y
  metales, el de un punto en el resto. Los promedios de la analítica se dan **por
  instrumento**, nunca mezclados: 8 pips de EURUSD y 430 puntos de BTCUSD no son la misma
  magnitud y su media no significaría nada.
- **`precio_referencia` es orientativo, no una cotización en vivo.** Solo fija los decimales
  y el orden de magnitud en los formularios; es editable y la Fase 3 lo actualizará.
- **El catálogo de instrumentos es compartido**: `user_id IS NULL` marca las filas del
  sistema, visibles para todos y de solo lectura; un usuario puede añadir las suyas.
- **Los tags tienen categoría**: `estructura`, `entrada` o `salida`, y los de salida
  distinguen zona de TP de zona de stop (`subtipo_salida`). La unicidad del nombre es por
  categoría, así que "BOS" puede existir a la vez como estructura y como entrada.
- **`direccion` es una columna generada** a partir de `tipo_orden`: no se escribe nunca a
  mano y no puede desincronizarse.
- **Una orden pendiente que no se activa tiene su propio estado** (`no_activada`), no es una
  operación cerrada. No tiene salida, ni P/L, ni tipo de cierre: no cuenta como pérdida y
  queda fuera del win rate. Lo que mide es la precisión de la entrada.

## Alcance

Fase 1 (MVP) — completa:

1. ✅ Setup y esquema de base de datos con RLS
2. ✅ Autenticación y cuentas de trading
3. ✅ Catálogo de instrumentos y biblioteca de tags
4. ✅ Registro de operaciones (cerrar de una vez / dejar abierta)
5. ✅ Colas de operaciones abiertas y pendientes de revisión
6. ✅ Calendario mensual verde/negro
7. ✅ Dashboard con KPIs y equity curve
8. ✅ Analítica por tag, por tipo de cierre y el cruce entre ambos

Los datos de mercado en vivo y el calendario económico (`/mercados`) quedan para la Fase 3;
las tablas caché ya están creadas.
