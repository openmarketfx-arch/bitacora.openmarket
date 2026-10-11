import {
  claveDia,
  claveHoy,
  diaSemanaDeClave,
  fechaDeClave,
  finDeDia,
  inicioDeDia,
  partesDeClave,
  sumarDias,
} from "@/lib/zona";
import { fechaDeCalendario } from "@/lib/datos/operaciones";
import type { TradeCompleto } from "@/lib/types";

export interface DiaCalendario {
  /** YYYY-MM-DD en la zona del usuario. */
  clave: string;
  /** Mediodía UTC de ese día: léase con getUTC* o con timeZone "UTC". */
  fecha: Date;
  /** false para los días de relleno del mes anterior o siguiente. */
  delMes: boolean;
  esHoy: boolean;
  /** Suma del P/L de las operaciones cerradas ese día. null si no hubo. */
  neto: number | null;
  cerradas: number;
  abiertas: number;
  pendientes: number;
  operaciones: TradeCompleto[];
}

export interface MesCalendario {
  anio: number;
  /** 1-12. */
  mes: number;
  etiqueta: string;
  dias: DiaCalendario[];
  /** Rango que abarca la rejilla, incluidos los días de relleno. */
  inicioRejilla: Date;
  finRejilla: Date;
  totales: { neto: number; operaciones: number; abiertas: number; pendientes: number };
}

const FMT_MES = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** Lunes de la semana a la que pertenece el día `clave`. */
function lunesDe(clave: string): string {
  // diaSemana: 0 = domingo. En España la semana empieza en lunes.
  return sumarDias(clave, -((diaSemanaDeClave(clave) + 6) % 7));
}

/** Rejilla de 6 semanas para que el calendario no cambie de alto entre meses. */
export function rangoRejilla(
  anio: number,
  mes: number,
  zona: string,
): { inicio: Date; fin: Date; claveInicio: string } {
  const claveInicio = lunesDe(`${anio}-${String(mes).padStart(2, "0")}-01`);
  return {
    inicio: inicioDeDia(claveInicio, zona),
    fin: finDeDia(sumarDias(claveInicio, 41), zona),
    claveInicio,
  };
}

export function construirMes(
  anio: number,
  mes: number,
  operaciones: TradeCompleto[],
  zona: string,
): MesCalendario {
  const { inicio, fin, claveInicio } = rangoRejilla(anio, mes, zona);

  const porDia = new Map<string, TradeCompleto[]>();
  for (const op of operaciones) {
    const clave = claveDia(fechaDeCalendario(op), zona);
    const lista = porDia.get(clave);
    if (lista) lista.push(op);
    else porDia.set(clave, [op]);
  }

  const hoy = claveHoy(zona);
  const dias: DiaCalendario[] = [];
  const totales = { neto: 0, operaciones: 0, abiertas: 0, pendientes: 0 };

  for (let i = 0; i < 42; i++) {
    const clave = sumarDias(claveInicio, i);
    const fecha = fechaDeClave(clave);
    const delDia = porDia.get(clave) ?? [];

    const cerradas = delDia.filter((o) => o.estado_operacion === "cerrada");
    const abiertas = delDia.filter((o) => o.estado_operacion === "abierta").length;
    const pendientes = delDia.filter((o) => o.estado_revision === "pendiente").length;

    // Sin operaciones cerradas el día no tiene resultado: queda neutro, que no
    // es lo mismo que un día que cerró exactamente en cero.
    const neto = cerradas.length
      ? cerradas.reduce((suma, o) => suma + Number(o.resultado_dinero ?? 0), 0)
      : null;

    const partes = partesDeClave(clave);
    const delMes = partes.mes === mes && partes.anio === anio;

    if (delMes) {
      totales.neto += neto ?? 0;
      totales.operaciones += delDia.length;
      totales.abiertas += abiertas;
      totales.pendientes += pendientes;
    }

    dias.push({
      clave,
      fecha,
      delMes,
      esHoy: clave === hoy,
      neto,
      cerradas: cerradas.length,
      abiertas,
      pendientes,
      operaciones: delDia,
    });
  }

  const etiqueta = FMT_MES.format(fechaDeClave(`${anio}-${String(mes).padStart(2, "0")}-01`));

  return {
    anio,
    mes,
    etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1),
    dias,
    inicioRejilla: inicio,
    finRejilla: fin,
    totales,
  };
}

/** "2026-09" -> {anio, mes}. Cae al mes actual (en la zona del usuario) si el valor no sirve. */
export function parsearMes(
  valor: string | undefined,
  zona: string,
): { anio: number; mes: number } {
  const hoy = partesDeClave(claveHoy(zona));
  const actual = { anio: hoy.anio, mes: hoy.mes };
  if (!valor) return actual;

  const coincidencia = /^(\d{4})-(\d{2})$/.exec(valor);
  if (!coincidencia) return actual;

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  if (mes < 1 || mes > 12 || anio < 2000 || anio > 2100) return actual;
  return { anio, mes };
}

export function formatearMes(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

export function mesVecino(anio: number, mes: number, delta: number): string {
  const d = new Date(Date.UTC(anio, mes - 1 + delta, 1));
  return formatearMes(d.getUTCFullYear(), d.getUTCMonth() + 1);
}
