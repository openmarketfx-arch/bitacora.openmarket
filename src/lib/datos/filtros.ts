import {
  PERIODOS,
  inicioDePeriodo,
  type Periodo,
} from "@/lib/datos/metricas";
import type { TradeCompleto } from "@/lib/types";

/** Parámetros de URL que entienden dashboard, analítica y calendario. */
export interface ParametrosFiltro {
  periodo?: string;
  desde?: string;
  hasta?: string;
  instrumento?: string;
}

export interface FiltroReporte {
  /** null cuando el rango es personalizado. */
  periodo: Periodo | null;
  desde: Date | null;
  hasta: Date | null;
  /** Símbolo del instrumento, o null para todos. */
  instrumento: string | null;
  /** Texto corto del rango activo, para mostrar en descripciones. */
  etiquetaRango: string;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function parsearDia(valor: string | undefined, finDeDia: boolean): Date | null {
  if (!valor || !FECHA.test(valor)) return null;
  const [a, m, d] = valor.split("-").map(Number);
  const fecha = finDeDia ? new Date(a, m - 1, d, 23, 59, 59, 999) : new Date(a, m - 1, d);
  // Rechaza fechas imposibles (31 de febrero) que Date desplaza en silencio.
  return fecha.getMonth() === m - 1 ? fecha : null;
}

const FMT = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" });

export function parsearFiltro(
  params: ParametrosFiltro,
  periodoPorDefecto: Periodo,
): FiltroReporte {
  const instrumento = params.instrumento?.trim() || null;
  const desdePersonal = parsearDia(params.desde, false);
  const hastaPersonal = parsearDia(params.hasta, true);

  if (desdePersonal || hastaPersonal) {
    const etiquetaRango =
      desdePersonal && hastaPersonal
        ? `del ${FMT.format(desdePersonal)} al ${FMT.format(hastaPersonal)}`
        : desdePersonal
          ? `desde el ${FMT.format(desdePersonal)}`
          : `hasta el ${FMT.format(hastaPersonal!)}`;
    return { periodo: null, desde: desdePersonal, hasta: hastaPersonal, instrumento, etiquetaRango };
  }

  const periodo = PERIODOS.some((p) => p.valor === params.periodo)
    ? (params.periodo as Periodo)
    : periodoPorDefecto;

  return {
    periodo,
    desde: inicioDePeriodo(periodo),
    hasta: null,
    instrumento,
    etiquetaRango: PERIODOS.find((p) => p.valor === periodo)!.etiqueta.toLowerCase(),
  };
}

/** Fecha que ubica una operación en el tiempo: cuándo se realizó el P/L. */
function fechaDe(op: TradeCompleto): Date {
  return new Date(op.fecha_hora_salida ?? op.fecha_hora_entrada);
}

export function filtrarPorInstrumento(
  operaciones: TradeCompleto[],
  instrumento: string | null,
): TradeCompleto[] {
  return instrumento ? operaciones.filter((o) => o.instrument.simbolo === instrumento) : operaciones;
}

export function filtrarOperaciones(
  operaciones: TradeCompleto[],
  filtro: FiltroReporte,
): TradeCompleto[] {
  return filtrarPorInstrumento(operaciones, filtro.instrumento).filter((o) => {
    const f = fechaDe(o);
    if (filtro.desde && f < filtro.desde) return false;
    if (filtro.hasta && f > filtro.hasta) return false;
    return true;
  });
}

/** Instrumentos con al menos una operación, ordenados, para el selector. */
export function instrumentosUsados(operaciones: TradeCompleto[]): string[] {
  return Array.from(new Set(operaciones.map((o) => o.instrument.simbolo))).sort();
}
