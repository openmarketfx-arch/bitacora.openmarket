# Handoff — Open Market

## 1. Objetivo

Bitácora de trading que no solo registra el resultado sino **por qué** cerró cada operación,
para medir precisión de entrada, lectura de estructura, ubicación de TP/stop y disciplina.
Next.js 14 + Supabase, multi-tenant con RLS desde el día 1.

## 2. Estado actual

**Funciona** (Fase 1 completa, verificado en navegador y contra SQL):

- Auth, cuentas de trading, catálogo de 74 instrumentos, biblioteca de tags
- Registro de operaciones con dos rutas (cerrar de una vez / dejar abierta)
- Colas de abiertas y pendientes de revisión, con cierre y clasificación
- Calendario mensual verde/negro, dashboard con KPIs y equity curve
- Analítica: por confirmación, por tipo de orden, por tipo de cierre, cruce, pips, tiempo y rachas
- Tags en 3 categorías (estructura / entrada / salida, con salida partida en TP y stop)
- 6 tipos de orden; las pendientes registran si se activaron
- TP y stop en la operación, con riesgo / objetivo / R:R calculados en vivo

**Entorno**: `npm run dev --prefix open-market` → puerto 3001 (entrada `open-market` en
`.claude/launch.json`). Supabase ref `ivlzheytigmwyozmjczu`, proyecto "OpenmktBitacora".
11 migraciones aplicadas. `tsc`, `eslint` y `npm run build` limpios.

**Pendiente**:

- `/mercados` (precios en vivo y calendario económico) — Fase 3, tablas caché vacías
- `precio_referencia` sin valor en la mayoría de instrumentos (solo 9 sembrados)
- En la cuenta real quedan 4 operaciones de prueba y 2 tags sin recategorizar
- Confirmación de correo activada en Supabase; el servicio integrado limita a ~2 envíos/hora
- Fase 2 (filtros por fecha e instrumento en todos los reportes) y Fase 4 (Stripe) sin empezar

## 3. Archivos y cambios

**Migraciones** (`supabase/migrations/`, todas aplicadas e idempotentes):
`0001` esquema · `0002` RLS · `0003` seed instrumentos · `0004` storage · `0005` defaults de
usuario · `0006` hardening · `0007` RPC `fusionar_tags` · `0008` categorías de tag + tipos de
orden + estado `no_activada` · `0009` valor de enum (va entre los pasos 1 y 3 de 0008) ·
`0010` unidad de medida en todo instrumento + `precio_referencia` + TP/stop +
`distancia_no_activada` · `0011` precios de referencia.

**Decisiones de modelo que conviene no romper**:

- `trades.estado_revision` lo calcula un trigger, nunca el cliente
- `trades.direccion` es columna **generada** desde `tipo_orden`: no se escribe en los inserts
- Cada `tipo_cierre` habilita exactamente una columna de medición; los constraints lo imponen
- Las mediciones se guardan como diferencia de precio cruda; la conversión a pips/puntos vive
  solo en `src/lib/format.ts`
- `no_activada` es un estado propio: sin salida, sin P/L, fuera del win rate

**Código principal**:

| Archivo | Rol |
|---|---|
| `src/lib/types.ts` | Fuente de verdad: 8 tipos de cierre, 6 tipos de orden, 3 categorías de tag |
| `src/lib/format.ts` | Conversión pips/puntos, `calcularPlan`, `pipsEntre`, `plural` |
| `src/lib/datos/analitica.ts` | Todos los cálculos de la analítica |
| `src/lib/datos/operaciones.ts` | Consultas con relaciones resueltas (`SELECCION`) |
| `src/app/(app)/operaciones/acciones.ts` | Crear, cerrar, clasificar, borrar |
| `src/components/operaciones/formulario-operacion.tsx` | Formulario de registro |
| `src/components/operaciones/resumen-pips.tsx` | Lectura de pips en vivo |
| `src/components/ui/cifra-resultado.tsx` | Convención verde/negro, centralizada |

## 4. Intentos fallidos

No repetir:

- **Heredocs de bash para archivos grandes** → se truncan y dan errores de sintaxis. Usar la
  herramienta Write para cualquier `.tsx`/`.sql` de más de ~30 líneas.
- **`router.refresh()` justo detrás de `router.push()`** → aborta la navegación. Las acciones
  ya llaman a `revalidatePath`.
- **Centrar diálogos con `-translate-x-1/2`** → `tailwindcss-animate` sobrescribe `transform`;
  si la animación no corre, el diálogo queda descentrado y los botones fuera de pantalla.
  Se centra con `inset-0` + `m-auto`.
- **Animación de entrada de Recharts** → destapa la curva con un `clipPath` animado; si no
  corre, el gráfico parece vacío. Va con `isAnimationActive={false}`.
- **Importar `lib/auth.ts` desde un componente cliente** → arrastra `next/headers` y rompe con
  500. Los helpers puros van en `lib/usuario.ts`.
- **`ALTER TYPE ... ADD VALUE` en la misma transacción que usa el valor** → falla. Por eso
  `0009` está separada de `0008`.
- **Añadir un campo al esquema zod de una acción y no al de la otra** → zod descarta las claves
  desconocidas en silencio. Pasó con `distancia` entre crear y cerrar.
- **`tsc --noEmit` con `incremental: true`** → cachea y oculta errores reales. Borrar
  `tsconfig.tsbuildinfo` antes de un typecheck que importe.
- Verificar en el navegador leyendo la consola: los errores de compilaciones intermedias de HMR
  quedan en el buffer y confunden. Mirar `preview_logs` con las últimas líneas.

## 5. Próximos pasos

En orden:

1. **Comprobar que el proyecto Supabase está activo.** El plan gratuito lo pausa tras unos días
   sin uso; si está `INACTIVE`, restaurarlo desde el dashboard antes de nada.
2. **Limpiar los datos de prueba de la cuenta real** (`sebassalgado35@gmail.com`): 4 operaciones
   de prueba del Paso 4, el instrumento propio `EURTRY` y los seguidos `EURUSD`/`GBPJPY` si no
   los quiere. Se borran desde la ficha de cada operación y desde Configuración.
3. **Recategorizar los 2 tags de la cuenta real.** La migración los dejó todos en `entrada` por
   defecto; "BOS alcista" es `estructura`. Se cambia con el lápiz en Configuración → Tags.
4. **Borrar el usuario de prueba `prueba.openmarket@gmail.com`.** Su contraseña está en texto
   plano en el historial de la conversación anterior, así que no debe sobrevivir. Al borrarlo
   desaparecen en cascada sus ~30 operaciones de prueba.
5. **Decidir la confirmación de correo** en Supabase → Authentication → Sign In / Providers.
   Apagarla para uso personal, o configurar SMTP propio (necesario igualmente para la Fase 4).
6. **Rellenar `precio_referencia`** de los instrumentos que se operen de verdad, desde
   Configuración → Instrumentos → editar. Solo hay 9 sembrados (EURUSD, GBPUSD, USDJPY, EURJPY,
   GBPJPY, XAUUSD, SPX500, US30, BTCUSD) y envejecen.
7. **Verificar que el tamaño de pip coincide con el bróker**, sobre todo en XAUUSD (está en 0,1;
   algunos brókers usan 0,01). El diálogo de instrumento muestra un ejemplo con números reales
   para comprobarlo de un vistazo.

Después de eso, lo siguiente del roadmap es la **Fase 2**: filtros por rango de fechas y por
instrumento en todos los reportes.
