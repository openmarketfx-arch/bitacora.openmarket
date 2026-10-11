import { claveDiaLocal } from "@/lib/format";
import type { TradeCompleto } from "@/lib/types";

export type Periodo = "7d" | "30d" | "90d" | "anio" | "todo";

export const PERIODOS: { valor: Periodo; etiqueta: string; corta: string }[] = [
  { valor: "7d", etiqueta: "Últimos 7 días", corta: "7 días" },
  { valor: "30d", etiqueta: "Últimos 30 días", corta: "30 días" },
  { valor: "90d", etiqueta: "Últimos 90 días", corta: "90 días" },
  { valor: "anio", etiqueta: "Este año", corta: "Este año" },
  { valor: "todo", etiqueta: "Todo el historial", corta: "Todo" },
];

export function parsearPeriodo(valor: string | undefined): Periodo {
  const valido = PERIODOS.some((p) => p.valor === valor);
  return valido ? (valor as Periodo) : "30d";
}

/** Fecha desde la que cuenta el periodo. null = sin límite. */
export function inicioDePeriodo(periodo: Periodo): Date | null {
  const ahora = new Date();
  switch (periodo) {
    case "7d":
    case "30d":
    case "90d": {
      const dias = periodo === "7d" ? 7 : periodo === "30d" ? 30 : 90;
      const d = new Date(ahora);
      d.setDate(d.getDate() - (dias - 1));
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "anio":
      return new Date(ahora.getFullYear(), 0, 1);
    case "todo":
      return null;
  }
}

export interface Kpis {
  plTotal: number;
  /** Porcentaje de ganadoras sobre las cerradas con resultado distinto de cero. */
  winRate: number | null;
  ganadoras: number;
  perdedoras: number;
  breakEven: number;
  cerradas: number;
  abiertas: number;
  pendientes: number;
  mejorDia: { clave: string; neto: number } | null;
  peorDia: { clave: string; neto: number } | null;
  /** Media de lo que gana una ganadora y de lo que pierde una perdedora. */
  gananciaMedia: number | null;
  perdidaMedia: number | null;
  /** Resultado esperado por operación. */
  expectativa: number | null;
  /** Mayor caída desde un máximo de la curva de equity. */
  drawdownMaximo: number;
  /** Monedas distintas encontradas: si hay más de una, las sumas no son comparables. */
  monedas: string[];
}

export interface PuntoEquity {
  /** YYYY-MM-DD */
  clave: string;
  etiqueta: string;
  neto: number;
  acumulado: number;
}

export interface ResumenDia {
  clave: string;
  fecha: Date;
  neto: number | null;
  operaciones: number;
}

const FMT_EJE = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" });

/** Agrupa las cerradas por día de salida y acumula el resultado. */
export function construirEquity(cerradas: TradeCompleto[]): PuntoEquity[] {
  const porDia = new Map<string, number>();

  for (const op of cerradas) {
    const clave = claveDiaLocal(op.fecha_hora_salida ?? op.fecha_hora_entrada);
    porDia.set(clave, (porDia.get(clave) ?? 0) + Number(op.resultado_dinero ?? 0));
  }

  let acumulado = 0;
  return Array.from(porDia.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([clave, neto]) => {
      acumulado += neto;
      // Mediodía para que el desfase horario no mueva el día en el eje.
      const fecha = new Date(`${clave}T12:00:00`);
      return { clave, etiqueta: FMT_EJE.format(fecha), neto, acumulado };
    });
}

export function calcularKpis(
  operaciones: TradeCompleto[],
  equity: PuntoEquity[],
): Kpis {
  const cerradas = operaciones.filter((o) => o.estado_operacion === "cerrada");

  const ganadoras = cerradas.filter((o) => Number(o.resultado_dinero) > 0);
  const perdedoras = cerradas.filter((o) => Number(o.resultado_dinero) < 0);
  const breakEven = cerradas.filter((o) => Number(o.resultado_dinero) === 0);

  const plTotal = cerradas.reduce((s, o) => s + Number(o.resultado_dinero ?? 0), 0);

  // Las que cierran exactamente en cero no son ni acierto ni fallo: incluirlas
  // hundiría el win rate sin que eso signifique que la lectura fue mala.
  const decisivas = ganadoras.length + perdedoras.length;
  const winRate = decisivas > 0 ? (ganadoras.length / decisivas) * 100 : null;

  const suma = (lista: TradeCompleto[]) =>
    lista.reduce((s, o) => s + Number(o.resultado_dinero ?? 0), 0);

  const gananciaMedia = ganadoras.length ? suma(ganadoras) / ganadoras.length : null;
  const perdidaMedia = perdedoras.length ? suma(perdedoras) / perdedoras.length : null;
  const expectativa = cerradas.length ? plTotal / cerradas.length : null;

  let mejorDia: Kpis["mejorDia"] = null;
  let peorDia: Kpis["peorDia"] = null;
  for (const punto of equity) {
    if (!mejorDia || punto.neto > mejorDia.neto) mejorDia = { clave: punto.clave, neto: punto.neto };
    if (!peorDia || punto.neto < peorDia.neto) peorDia = { clave: punto.clave, neto: punto.neto };
  }

  // Drawdown: la peor caída desde un máximo previo de la curva acumulada.
  let pico = 0;
  let drawdownMaximo = 0;
  for (const punto of equity) {
    if (punto.acumulado > pico) pico = punto.acumulado;
    const caida = pico - punto.acumulado;
    if (caida > drawdownMaximo) drawdownMaximo = caida;
  }

  const monedas = Array.from(new Set(operaciones.map((o) => o.account.moneda_base))).sort();

  return {
    plTotal,
    winRate,
    ganadoras: ganadoras.length,
    perdedoras: perdedoras.length,
    breakEven: breakEven.length,
    cerradas: cerradas.length,
    abiertas: operaciones.filter((o) => o.estado_operacion === "abierta").length,
    pendientes: operaciones.filter((o) => o.estado_revision === "pendiente").length,
    mejorDia,
    peorDia,
    gananciaMedia,
    perdidaMedia,
    expectativa,
    drawdownMaximo,
    monedas,
  };
}

/** Los últimos N días naturales, con su neto, para la tira del dashboard. */
export function ultimosDias(cerradas: TradeCompleto[], cantidad = 14): ResumenDia[] {
  const porDia = new Map<string, { neto: number; operaciones: number }>();

  for (const op of cerradas) {
    const clave = claveDiaLocal(op.fecha_hora_salida ?? op.fecha_hora_entrada);
    const actual = porDia.get(clave) ?? { neto: 0, operaciones: 0 };
    actual.neto += Number(op.resultado_dinero ?? 0);
    actual.operaciones += 1;
    porDia.set(clave, actual);
  }

  const dias: ResumenDia[] = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    fecha.setHours(0, 0, 0, 0);
    const clave = claveDiaLocal(fecha);
    const datos = porDia.get(clave);
    dias.push({
      clave,
      fecha,
      neto: datos ? datos.neto : null,
      operaciones: datos?.operaciones ?? 0,
    });
  }
  return dias;
}
