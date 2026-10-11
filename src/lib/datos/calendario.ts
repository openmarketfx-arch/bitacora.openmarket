import { claveDiaLocal } from "@/lib/format";
import { fechaDeCalendario } from "@/lib/datos/operaciones";
import type { TradeCompleto } from "@/lib/types";

export interface DiaCalendario {
  /** YYYY-MM-DD en hora local. */
  clave: string;
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

const FMT_MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });

/** Lunes de la semana a la que pertenece la fecha. */
function lunesDe(fecha: Date): Date {
  const d = new Date(fecha);
  // getDay(): 0 = domingo. En España la semana empieza en lunes.
  const desplazamiento = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - desplazamiento);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Rejilla de 6 semanas para que el calendario no cambie de alto entre meses. */
export function rangoRejilla(anio: number, mes: number): { inicio: Date; fin: Date } {
  const inicio = lunesDe(new Date(anio, mes - 1, 1));
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 41);
  fin.setHours(23, 59, 59, 999);
  return { inicio, fin };
}

export function construirMes(
  anio: number,
  mes: number,
  operaciones: TradeCompleto[],
): MesCalendario {
  const { inicio, fin } = rangoRejilla(anio, mes);

  const porDia = new Map<string, TradeCompleto[]>();
  for (const op of operaciones) {
    const clave = claveDiaLocal(fechaDeCalendario(op));
    const lista = porDia.get(clave);
    if (lista) lista.push(op);
    else porDia.set(clave, [op]);
  }

  const hoy = claveDiaLocal(new Date());
  const dias: DiaCalendario[] = [];
  const totales = { neto: 0, operaciones: 0, abiertas: 0, pendientes: 0 };

  for (let i = 0; i < 42; i++) {
    const fecha = new Date(inicio);
    fecha.setDate(fecha.getDate() + i);
    const clave = claveDiaLocal(fecha);
    const delDia = porDia.get(clave) ?? [];

    const cerradas = delDia.filter((o) => o.estado_operacion === "cerrada");
    const abiertas = delDia.filter((o) => o.estado_operacion === "abierta").length;
    const pendientes = delDia.filter((o) => o.estado_revision === "pendiente").length;

    // Sin operaciones cerradas el día no tiene resultado: queda neutro, que no
    // es lo mismo que un día que cerró exactamente en cero.
    const neto = cerradas.length
      ? cerradas.reduce((suma, o) => suma + Number(o.resultado_dinero ?? 0), 0)
      : null;

    const delMes = fecha.getMonth() === mes - 1 && fecha.getFullYear() === anio;

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

  const etiqueta = FMT_MES.format(new Date(anio, mes - 1, 1));

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

/** "2026-09" -> {anio, mes}. Cae al mes actual si el valor no sirve. */
export function parsearMes(valor: string | undefined): { anio: number; mes: number } {
  const hoy = new Date();
  if (!valor) return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };

  const coincidencia = /^(\d{4})-(\d{2})$/.exec(valor);
  if (!coincidencia) return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  if (mes < 1 || mes > 12 || anio < 2000 || anio > 2100) {
    return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
  }
  return { anio, mes };
}

export function formatearMes(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

export function mesVecino(anio: number, mes: number, delta: number): string {
  const d = new Date(anio, mes - 1 + delta, 1);
  return formatearMes(d.getFullYear(), d.getMonth() + 1);
}
