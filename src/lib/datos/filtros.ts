import {
  PERIODOS,
  inicioDePeriodo,
  type Periodo,
} from "@/lib/datos/metricas";
import type { TradeCompleto } from "@/lib/types";
import { fechaDeClave, finDeDia, inicioDeDia } from "@/lib/zona";

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

/** El valor es una fecha YYYY-MM-DD que existe en el calendario (no un 31 de febrero). */
function claveValida(valor: string | undefined): string | null {
  if (!valor || !FECHA.test(valor)) return null;
  const [a, m, d] = valor.split("-").map(Number);
  const real = new Date(Date.UTC(a, m - 1, d));
  return real.getUTCMonth() === m - 1 && real.getUTCDate() === d ? valor : null;
}

const FMT = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function parsearFiltro(
  params: ParametrosFiltro,
  periodoPorDefecto: Periodo,
  zona: string,
): FiltroReporte {
  const instrumento = params.instrumento?.trim() || null;
  const claveDesde = claveValida(params.desde);
  const claveHasta = claveValida(params.hasta);

  if (claveDesde || claveHasta) {
    const etiqueta = (clave: string) => FMT.format(fechaDeClave(clave));
    const etiquetaRango =
      claveDesde && claveHasta
        ? `del ${etiqueta(claveDesde)} al ${etiqueta(claveHasta)}`
        : claveDesde
          ? `desde el ${etiqueta(claveDesde)}`
          : `hasta el ${etiqueta(claveHasta!)}`;
    return {
      periodo: null,
      desde: claveDesde ? inicioDeDia(claveDesde, zona) : null,
      hasta: claveHasta ? finDeDia(claveHasta, zona) : null,
      instrumento,
      etiquetaRango,
    };
  }

  const periodo = PERIODOS.some((p) => p.valor === params.periodo)
    ? (params.periodo as Periodo)
    : periodoPorDefecto;

  return {
    periodo,
    desde: inicioDePeriodo(periodo, zona),
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
