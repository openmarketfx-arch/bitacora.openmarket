import { aUnidades, pipsEntre, unidadDe, type UnidadMedida } from "@/lib/format";
import {
  TIPOS_CIERRE,
  TIPOS_ORDEN,
  TIPO_CIERRE_MAP,
  TIPO_ORDEN_MAP,
  type CategoriaTag,
  type SubtipoSalida,
  type TagResumen,
  type TipoCierre,
  type TipoOrden,
  type TradeCompleto,
} from "@/lib/types";

// ---------- Bloque común de rendimiento ----------

export interface Rendimiento {
  operaciones: number;
  ganadoras: number;
  perdedoras: number;
  breakEven: number;
  /** Ganadoras sobre las decisivas (excluye las que cierran en cero). */
  winRate: number | null;
  plTotal: number;
  /** Resultado esperado por operación. */
  expectativa: number | null;
}

export function medirRendimiento(operaciones: TradeCompleto[]): Rendimiento {
  const ganadoras = operaciones.filter((o) => Number(o.resultado_dinero) > 0).length;
  const perdedoras = operaciones.filter((o) => Number(o.resultado_dinero) < 0).length;
  const breakEven = operaciones.filter((o) => Number(o.resultado_dinero) === 0).length;
  const decisivas = ganadoras + perdedoras;

  const plTotal = operaciones.reduce((s, o) => s + Number(o.resultado_dinero ?? 0), 0);

  return {
    operaciones: operaciones.length,
    ganadoras,
    perdedoras,
    breakEven,
    winRate: decisivas > 0 ? (ganadoras / decisivas) * 100 : null,
    plTotal,
    expectativa: operaciones.length ? plTotal / operaciones.length : null,
  };
}

// ---------- Por tag ----------

export interface FilaTag extends Rendimiento {
  tagId: string;
  nombre: string;
  categoria: CategoriaTag;
  subtipoSalida: SubtipoSalida | null;
}

export function analizarPorTag(cerradas: TradeCompleto[]): FilaTag[] {
  const porTag = new Map<string, { tag: TagResumen; ops: TradeCompleto[] }>();

  for (const op of cerradas) {
    for (const tag of op.tags) {
      const actual = porTag.get(tag.id);
      if (actual) actual.ops.push(op);
      else porTag.set(tag.id, { tag, ops: [op] });
    }
  }

  return Array.from(porTag.entries())
    .map(([tagId, { tag, ops }]) => ({
      tagId,
      nombre: tag.nombre,
      categoria: tag.categoria,
      subtipoSalida: tag.subtipo_salida,
      ...medirRendimiento(ops),
    }))
    .sort((a, b) => b.plTotal - a.plTotal);
}

/** Las cuatro solapas de confirmación: salida se parte en TP y stop. */
export type GrupoConfirmacion = "estructura" | "entrada" | "salida_tp" | "salida_stop";

export function grupoDe(fila: FilaTag): GrupoConfirmacion {
  if (fila.categoria === "estructura") return "estructura";
  if (fila.categoria === "entrada") return "entrada";
  return fila.subtipoSalida === "stop" ? "salida_stop" : "salida_tp";
}

export function agruparTags(filas: FilaTag[]): Record<GrupoConfirmacion, FilaTag[]> {
  return {
    estructura: filas.filter((f) => grupoDe(f) === "estructura"),
    entrada: filas.filter((f) => grupoDe(f) === "entrada"),
    salida_tp: filas.filter((f) => grupoDe(f) === "salida_tp"),
    salida_stop: filas.filter((f) => grupoDe(f) === "salida_stop"),
  };
}

// ---------- Por tipo de cierre ----------

/**
 * Promedio de la medición de un tipo de cierre, separado por instrumento.
 *
 * No se pueden promediar las mediciones de instrumentos distintos en un solo
 * número: 8 pips de EURUSD y 430 puntos de BTCUSD no son la misma magnitud, y
 * su media no significa nada. Por eso el promedio se da por instrumento, que
 * es la única unidad en la que la cifra es accionable ("amplía el stop 9 pips
 * en EURUSD").
 */
export interface PromedioInstrumento {
  simbolo: string;
  unidad: UnidadMedida;
  promedio: number;
  operaciones: number;
}

export interface FilaTipoCierre extends Rendimiento {
  tipo: TipoCierre;
  /** Porcentaje sobre el total de operaciones clasificadas. */
  porcentaje: number;
  promedios: PromedioInstrumento[];
}

export function analizarPorTipoCierre(clasificadas: TradeCompleto[]): FilaTipoCierre[] {
  const total = clasificadas.length;

  return TIPOS_CIERRE.map((meta) => {
    const ops = clasificadas.filter((o) => o.tipo_cierre === meta.valor);
    const campo = meta.campo;

    const promedios: PromedioInstrumento[] = [];
    if (campo) {
      const porInstrumento = new Map<string, { valores: number[]; op: TradeCompleto }>();

      for (const op of ops) {
        const crudo = op[campo];
        if (crudo === null || crudo === undefined) continue;
        const enUnidades = aUnidades(Number(crudo), op.instrument);
        if (enUnidades === null) continue;

        const clave = op.instrument.simbolo;
        const actual = porInstrumento.get(clave);
        if (actual) actual.valores.push(enUnidades);
        else porInstrumento.set(clave, { valores: [enUnidades], op });
      }

      for (const [simbolo, { valores, op }] of porInstrumento) {
        promedios.push({
          simbolo,
          unidad: unidadDe(op.instrument.asset_class),
          promedio: valores.reduce((s, v) => s + v, 0) / valores.length,
          operaciones: valores.length,
        });
      }
      promedios.sort((a, b) => b.operaciones - a.operaciones);
    }

    return {
      tipo: meta.valor,
      porcentaje: total ? (ops.length / total) * 100 : 0,
      promedios,
      ...medirRendimiento(ops),
    };
  });
}

/** Ratio entre cerrar antes con razón y cerrar antes por ansiedad. */
export interface RatioDisciplina {
  correctos: number;
  incorrectos: number;
  /** % de cierres anticipados que estuvieron justificados. */
  aciertoAlCerrar: number | null;
  /** Lo que costaron los cierres anticipados innecesarios, en dinero. */
  costeIncorrectos: number;
}

export function analizarDisciplina(clasificadas: TradeCompleto[]): RatioDisciplina {
  const correctos = clasificadas.filter((o) => o.tipo_cierre === "cierre_correcto");
  const incorrectos = clasificadas.filter((o) => o.tipo_cierre === "cierre_incorrecto");
  const total = correctos.length + incorrectos.length;

  return {
    correctos: correctos.length,
    incorrectos: incorrectos.length,
    aciertoAlCerrar: total ? (correctos.length / total) * 100 : null,
    costeIncorrectos: incorrectos.reduce((s, o) => s + Math.abs(Number(o.resultado_dinero ?? 0)), 0),
  };
}

// ---------- Cruce tag × tipo de cierre ----------

export interface FilaCruce {
  tagId: string;
  nombre: string;
  categoria: CategoriaTag;
  subtipoSalida: SubtipoSalida | null;
  total: number;
  /** Cuántas operaciones de este tag acabaron en cada tipo. */
  conteos: Record<TipoCierre, number>;
  plTotal: number;
}

export function cruzarTagYCierre(clasificadas: TradeCompleto[]): FilaCruce[] {
  const vacio = () =>
    Object.fromEntries(TIPOS_CIERRE.map((t) => [t.valor, 0])) as Record<TipoCierre, number>;

  const porTag = new Map<string, FilaCruce>();

  for (const op of clasificadas) {
    if (!op.tipo_cierre) continue;
    for (const tag of op.tags) {
      let fila = porTag.get(tag.id);
      if (!fila) {
        fila = {
          tagId: tag.id,
          nombre: tag.nombre,
          categoria: tag.categoria,
          subtipoSalida: tag.subtipo_salida,
          total: 0,
          conteos: vacio(),
          plTotal: 0,
        };
        porTag.set(tag.id, fila);
      }
      fila.total += 1;
      fila.conteos[op.tipo_cierre] += 1;
      fila.plTotal += Number(op.resultado_dinero ?? 0);
    }
  }

  return Array.from(porTag.values()).sort((a, b) => b.total - a.total);
}

/**
 * El hallazgo que persigue la sección 5 del spec: qué confirmación falla más
 * por leer mal la estructura del mercado.
 *
 * Solo mira los tags de categoría "estructura". Un stop en contra significa
 * que la lectura del mercado estuvo equivocada, y esa lectura la describen
 * los tags de estructura — no los de entrada ni los de salida.
 */
export interface Hallazgo {
  nombre: string;
  proporcion: number;
  casos: number;
  total: number;
}

export function peorLectura(cruce: FilaCruce[], minimo = 3): Hallazgo | null {
  const candidatos = cruce
    .filter((f) => f.categoria === "estructura" && f.total >= minimo)
    .map((f) => ({
      nombre: f.nombre,
      casos: f.conteos.stop_contra,
      total: f.total,
      proporcion: (f.conteos.stop_contra / f.total) * 100,
    }))
    .filter((f) => f.casos > 0)
    .sort((a, b) => b.proporcion - a.proporcion);

  return candidatos[0] ?? null;
}

// ---------- Tiempo ----------

export interface FilaTiempo extends Rendimiento {
  clave: string;
  etiqueta: string;
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** Rendimiento por día de la semana, según la fecha de salida. */
export function analizarPorDiaSemana(cerradas: TradeCompleto[]): FilaTiempo[] {
  const grupos = new Map<number, TradeCompleto[]>();

  for (const op of cerradas) {
    const fecha = new Date(op.fecha_hora_salida ?? op.fecha_hora_entrada);
    const dia = fecha.getDay();
    const lista = grupos.get(dia);
    if (lista) lista.push(op);
    else grupos.set(dia, [op]);
  }

  // Lunes primero, domingo al final.
  const orden = [1, 2, 3, 4, 5, 6, 0];
  return orden
    .filter((d) => grupos.has(d))
    .map((d) => ({
      clave: String(d),
      etiqueta: DIAS[d],
      ...medirRendimiento(grupos.get(d) ?? []),
    }));
}

/** Rendimiento por hora de entrada: es la hora en que decides operar. */
export function analizarPorHora(cerradas: TradeCompleto[]): FilaTiempo[] {
  const grupos = new Map<number, TradeCompleto[]>();

  for (const op of cerradas) {
    const hora = new Date(op.fecha_hora_entrada).getHours();
    const lista = grupos.get(hora);
    if (lista) lista.push(op);
    else grupos.set(hora, [op]);
  }

  return Array.from(grupos.keys())
    .sort((a, b) => a - b)
    .map((h) => ({
      clave: String(h),
      etiqueta: `${String(h).padStart(2, "0")}:00`,
      ...medirRendimiento(grupos.get(h) ?? []),
    }));
}

// ---------- Rachas ----------

export interface Rachas {
  mejorRacha: number;
  peorRacha: number;
  rachaActual: number;
  /** "ganando", "perdiendo" o null si la última fue break even. */
  signoActual: "ganando" | "perdiendo" | null;
}

/** Rachas consecutivas de aciertos y de errores, en orden cronológico. */
export function calcularRachas(cerradas: TradeCompleto[]): Rachas {
  const ordenadas = [...cerradas].sort(
    (a, b) =>
      new Date(a.fecha_hora_salida ?? a.fecha_hora_entrada).getTime() -
      new Date(b.fecha_hora_salida ?? b.fecha_hora_entrada).getTime(),
  );

  let mejorRacha = 0;
  let peorRacha = 0;
  let actual = 0;
  let signo: "ganando" | "perdiendo" | null = null;

  for (const op of ordenadas) {
    const resultado = Number(op.resultado_dinero ?? 0);
    // Un break even no rompe la racha ni la alarga: es neutro.
    if (resultado === 0) continue;

    const nuevoSigno = resultado > 0 ? "ganando" : "perdiendo";
    if (nuevoSigno === signo) actual += 1;
    else {
      signo = nuevoSigno;
      actual = 1;
    }

    if (signo === "ganando") mejorRacha = Math.max(mejorRacha, actual);
    else peorRacha = Math.max(peorRacha, actual);
  }

  return { mejorRacha, peorRacha, rachaActual: actual, signoActual: signo };
}

/** Etiqueta legible de un tipo de cierre, para las vistas. */
export function etiquetaCierre(tipo: TipoCierre): string {
  return TIPO_CIERRE_MAP[tipo].etiqueta;
}

// ---------- Por tipo de orden ----------

/**
 * Rendimiento por tipo de orden, con la tasa de activación de las pendientes.
 *
 * El dato que no existía antes: una orden pendiente que nunca se activa no es
 * una pérdida, es una medida de precisión de entrada. Si un buy limit no se
 * llena, la dirección pudo estar bien leída pero el nivel quedó más lejos de
 * donde el mercado realmente reaccionó.
 */
export interface FilaTipoOrden extends Rendimiento {
  tipo: TipoOrden;
  pendiente: boolean;
  /** Registradas con este tipo de orden, incluyendo las no activadas. */
  total: number;
  activadas: number;
  noActivadas: number;
  enCurso: number;
  /** % de las pendientes ya resueltas que llegaron a ejecutarse. */
  tasaActivacion: number | null;
}

export function analizarPorTipoOrden(operaciones: TradeCompleto[]): FilaTipoOrden[] {
  return TIPOS_ORDEN.map((meta) => {
    const delTipo = operaciones.filter((o) => o.tipo_orden === meta.valor);
    const cerradas = delTipo.filter((o) => o.estado_operacion === "cerrada");
    const noActivadas = delTipo.filter((o) => o.estado_operacion === "no_activada").length;
    const enCurso = delTipo.filter((o) => o.estado_operacion === "abierta").length;

    // Las que siguen esperando aún no dicen nada: se excluyen del ratio.
    const resueltas = cerradas.length + noActivadas;

    return {
      tipo: meta.valor,
      pendiente: meta.pendiente,
      total: delTipo.length,
      activadas: cerradas.length,
      noActivadas,
      enCurso,
      tasaActivacion:
        meta.pendiente && resueltas > 0 ? (cerradas.length / resueltas) * 100 : null,
      ...medirRendimiento(cerradas),
    };
  });
}

export interface ResumenOrdenesPendientes {
  total: number;
  activadas: number;
  noActivadas: number;
  enCurso: number;
  tasaActivacion: number | null;
  /** El tipo pendiente que más veces se queda sin llenar. */
  peorPrecision: { tipo: TipoOrden; etiqueta: string; noActivadas: number; total: number } | null;
}

export function resumirOrdenesPendientes(filas: FilaTipoOrden[]): ResumenOrdenesPendientes {
  const pendientes = filas.filter((f) => f.pendiente);

  const total = pendientes.reduce((s, f) => s + f.total, 0);
  const activadas = pendientes.reduce((s, f) => s + f.activadas, 0);
  const noActivadas = pendientes.reduce((s, f) => s + f.noActivadas, 0);
  const enCurso = pendientes.reduce((s, f) => s + f.enCurso, 0);
  const resueltas = activadas + noActivadas;

  const candidatas = pendientes
    .filter((f) => f.noActivadas > 0)
    .sort((a, b) => b.noActivadas / b.total - a.noActivadas / a.total);

  const peor = candidatas[0];

  return {
    total,
    activadas,
    noActivadas,
    enCurso,
    tasaActivacion: resueltas > 0 ? (activadas / resueltas) * 100 : null,
    peorPrecision: peor
      ? {
          tipo: peor.tipo,
          etiqueta: TIPO_ORDEN_MAP[peor.tipo].etiqueta,
          noActivadas: peor.noActivadas,
          total: peor.total,
        }
      : null,
  };
}

// ---------- Series en pips ----------

/**
 * Promedio en pips de una medición, separado por instrumento.
 *
 * Se repite el patrón de `analizarPorTipoCierre` a propósito: promediar
 * mediciones de instrumentos distintos en un solo número no significa nada,
 * porque 8 pips de EURUSD y 430 puntos de BTCUSD no son la misma magnitud.
 */
export function promediarPorInstrumento(
  operaciones: TradeCompleto[],
  campo: "margen_error_precio" | "no_capturado_precio" | "devuelto_precio" | "distancia_no_activada",
): PromedioInstrumento[] {
  const porInstrumento = new Map<string, { valores: number[]; op: TradeCompleto }>();

  for (const op of operaciones) {
    const crudo = op[campo];
    if (crudo === null || crudo === undefined) continue;
    const enUnidades = aUnidades(Number(crudo), op.instrument);
    if (enUnidades === null) continue;

    const actual = porInstrumento.get(op.instrument.simbolo);
    if (actual) actual.valores.push(enUnidades);
    else porInstrumento.set(op.instrument.simbolo, { valores: [enUnidades], op });
  }

  return Array.from(porInstrumento.entries())
    .map(([simbolo, { valores, op }]) => ({
      simbolo,
      unidad: unidadDe(op.instrument.asset_class),
      promedio: valores.reduce((s, v) => s + v, 0) / valores.length,
      operaciones: valores.length,
    }))
    .sort((a, b) => b.operaciones - a.operaciones);
}

export interface PlanPorInstrumento {
  simbolo: string;
  unidad: UnidadMedida;
  operaciones: number;
  /** Media de la distancia entrada → stop. */
  riesgoMedio: number | null;
  /** Media de la distancia entrada → TP. */
  objetivoMedio: number | null;
  /** Media del recorrido realmente hecho hasta la salida. */
  recorridoMedio: number | null;
  /** Objetivo medio dividido entre riesgo medio. */
  ratioMedio: number | null;
  /** Qué parte del objetivo se acabó capturando, en porcentaje. */
  capturaObjetivo: number | null;
}

/**
 * Lo que dicen los niveles planificados frente a lo que pasó: cuánto se
 * arriesga, cuánto se busca y cuánto se termina capturando de verdad.
 */
export function analizarPlanificacion(cerradas: TradeCompleto[]): PlanPorInstrumento[] {
  const porInstrumento = new Map<string, TradeCompleto[]>();

  for (const op of cerradas) {
    // Sin niveles no hay plan que medir.
    if (op.precio_stop === null && op.precio_tp === null) continue;
    const lista = porInstrumento.get(op.instrument.simbolo);
    if (lista) lista.push(op);
    else porInstrumento.set(op.instrument.simbolo, [op]);
  }

  const media = (valores: number[]) =>
    valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null;

  return Array.from(porInstrumento.entries())
    .map(([simbolo, ops]) => {
      const inst = ops[0].instrument;

      const riesgos: number[] = [];
      const objetivos: number[] = [];
      const recorridos: number[] = [];

      for (const op of ops) {
        const r = pipsEntre(op.precio_entrada, op.precio_stop, inst);
        const o = pipsEntre(op.precio_entrada, op.precio_tp, inst);
        const c = pipsEntre(op.precio_entrada, op.precio_salida, inst);
        if (r !== null) riesgos.push(r);
        if (o !== null) objetivos.push(o);
        if (c !== null) recorridos.push(c);
      }

      const riesgoMedio = media(riesgos);
      const objetivoMedio = media(objetivos);
      const recorridoMedio = media(recorridos);

      return {
        simbolo,
        unidad: unidadDe(inst.asset_class),
        operaciones: ops.length,
        riesgoMedio,
        objetivoMedio,
        recorridoMedio,
        ratioMedio: riesgoMedio && objetivoMedio ? objetivoMedio / riesgoMedio : null,
        capturaObjetivo:
          objetivoMedio && recorridoMedio !== null ? (recorridoMedio / objetivoMedio) * 100 : null,
      };
    })
    .sort((a, b) => b.operaciones - a.operaciones);
}
