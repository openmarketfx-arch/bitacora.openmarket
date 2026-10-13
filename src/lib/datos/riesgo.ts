import { resultadoNeto } from "@/lib/resultado";
import type { Retiro, TradeCompleto, TradingAccount } from "@/lib/types";
import { claveDia, claveHoy, diaSemanaDeClave, partesDeClave, sumarDias } from "@/lib/zona";

/**
 * Medición de la gestión del riesgo.
 *
 * Cada cuenta fija el % de su saldo que acepta perder en un día, una semana y un
 * mes. Un periodo se incumple cuando su resultado neto (ganancia o pérdida más
 * comisiones y swaps de lo cerrado en él) es una pérdida mayor que ese %.
 *
 *  - El % se aplica sobre el saldo con que arrancó el periodo: capital inicial más
 *    el resultado neto acumulado hasta entonces, menos lo retirado. Así la medición
 *    parte siempre del capital real: retirar ganancias baja la base de los límites
 *    siguientes, pero un retiro nunca cuenta como pérdida.
 *  - Día, semana (lunes a domingo) y mes son de calendario en la zona del usuario.
 *  - Una operación cuenta en el periodo en que se cerró.
 *  - Cada periodo se evalúa por separado: dos días dentro de su límite diario
 *    pueden sumar una semana fuera del límite semanal, y eso es un incumplimiento.
 */

export type TipoPeriodo = "diario" | "semanal" | "mensual";

export const TIPOS_PERIODO: {
  tipo: TipoPeriodo;
  etiqueta: string;
  /** "día", "semana", "mes": para frases como "el día en que...". */
  unidad: string;
  campo: "limite_riesgo_diario" | "limite_riesgo_semanal" | "limite_riesgo_mensual";
}[] = [
  { tipo: "diario", etiqueta: "Diario", unidad: "día", campo: "limite_riesgo_diario" },
  { tipo: "semanal", etiqueta: "Semanal", unidad: "semana", campo: "limite_riesgo_semanal" },
  { tipo: "mensual", etiqueta: "Mensual", unidad: "mes", campo: "limite_riesgo_mensual" },
];

export interface Incumplimiento {
  cuentaId: string;
  cuenta: string;
  moneda: string;
  tipo: TipoPeriodo;
  /** Primer y último día del periodo, YYYY-MM-DD en la zona del usuario. */
  inicio: string;
  fin: string;
  /** Pérdida neta del periodo (positiva). */
  perdida: number;
  /** Lo máximo que se podía perder, en dinero. */
  limite: number;
  limitePct: number;
  /** Saldo con el que arrancó el periodo. */
  base: number;
  /** Pérdida como % de ese saldo. null si el saldo ya era cero o negativo. */
  pctReal: number | null;
  /** El periodo todavía no ha terminado. */
  enCurso: boolean;
}

/** Cuánto lleva consumido de su límite el periodo actual. */
export interface EstadoLimite {
  tipo: TipoPeriodo;
  limitePct: number;
  limite: number;
  /** Pérdida neta hasta ahora (0 si va en positivo). */
  perdida: number;
  neto: number;
  base: number;
  /** 0-1 y más: 1 = justo en el límite, por encima = incumplido. */
  uso: number;
  superado: boolean;
  inicio: string;
  fin: string;
}

export interface RiesgoCuenta {
  cuenta: TradingAccount;
  /** Tiene capital y al menos un límite: sin eso no hay nada que medir. */
  configurada: boolean;
  /** Capital inicial más el resultado neto de todo lo cerrado, menos los retiros. */
  saldo: number | null;
  /** Total retirado de la cuenta. */
  retirado: number;
  estados: EstadoLimite[];
}

export interface ConteoPeriodo {
  incumplidos: number;
  /** Periodos con operaciones cerradas, que son los que se pudieron incumplir. */
  evaluados: number;
}

export interface ResumenRiesgo {
  cuentas: RiesgoCuenta[];
  /** Más recientes primero. */
  incumplimientos: Incumplimiento[];
  total: number;
  porTipo: Record<TipoPeriodo, ConteoPeriodo>;
  /** El/los periodos con más incumplimientos. Vacío si no hay ninguno. */
  masIncumplidos: TipoPeriodo[];
  /** Cuentas con operaciones a las que les falta capital o límites. */
  sinConfigurar: TradingAccount[];
}

export interface RangoRiesgo {
  desde: Date | null;
  hasta: Date | null;
}

function lunesDe(clave: string): string {
  return sumarDias(clave, -((diaSemanaDeClave(clave) + 6) % 7));
}

function primeroDelMes(clave: string): string {
  const { anio, mes } = partesDeClave(clave);
  return `${anio}-${String(mes).padStart(2, "0")}-01`;
}

function ultimoDelMes(clave: string): string {
  const { anio, mes } = partesDeClave(clave);
  const siguiente = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, "0")}-01`;
  return sumarDias(siguiente, -1);
}

/** Primer y último día del periodo de `tipo` al que pertenece el día `clave`. */
export function limitesDePeriodo(tipo: TipoPeriodo, clave: string): { inicio: string; fin: string } {
  switch (tipo) {
    case "diario":
      return { inicio: clave, fin: clave };
    case "semanal": {
      const inicio = lunesDe(clave);
      return { inicio, fin: sumarDias(inicio, 6) };
    }
    case "mensual":
      return { inicio: primeroDelMes(clave), fin: ultimoDelMes(clave) };
  }
}

const centavos = (n: number) => Math.round(n * 100) / 100;

export function calcularRiesgo(
  cuentas: TradingAccount[],
  operaciones: TradeCompleto[],
  retiros: Retiro[],
  zona: string,
  rango: RangoRiesgo = { desde: null, hasta: null },
): ResumenRiesgo {
  const hoy = claveHoy(zona);
  const desdeClave = rango.desde ? claveDia(rango.desde, zona) : null;
  const hastaClave = rango.hasta ? claveDia(rango.hasta, zona) : null;

  const seSolapa = (inicio: string, fin: string) =>
    (desdeClave === null || fin >= desdeClave) && (hastaClave === null || inicio <= hastaClave);

  const incumplimientos: Incumplimiento[] = [];
  const porTipo: Record<TipoPeriodo, ConteoPeriodo> = {
    diario: { incumplidos: 0, evaluados: 0 },
    semanal: { incumplidos: 0, evaluados: 0 },
    mensual: { incumplidos: 0, evaluados: 0 },
  };
  const resultadoCuentas: RiesgoCuenta[] = [];
  const sinConfigurar: TradingAccount[] = [];

  for (const cuenta of cuentas) {
    const capital = Number(cuenta.capital_inicial ?? 0);
    const limites = TIPOS_PERIODO.flatMap((t) => {
      const pct = cuenta[t.campo];
      return pct !== null && pct !== undefined && Number(pct) > 0
        ? [{ tipo: t.tipo, pct: Number(pct) }]
        : [];
    });

    // Neto de cada día de calendario, contando solo lo cerrado en esta cuenta.
    const netoPorDia = new Map<string, number>();
    for (const op of operaciones) {
      if (op.account.id !== cuenta.id || op.estado_operacion !== "cerrada") continue;
      const neto = resultadoNeto(op);
      if (neto === null) continue;
      const dia = claveDia(op.fecha_hora_salida ?? op.fecha_hora_entrada, zona);
      netoPorDia.set(dia, (netoPorDia.get(dia) ?? 0) + neto);
    }
    const dias = Array.from(netoPorDia.keys()).sort();
    const total = dias.reduce((s, d) => s + (netoPorDia.get(d) ?? 0), 0);

    // Lo retirado de esta cuenta, por día. No es resultado de trading: solo mueve el saldo.
    const retiradoPorDia = new Map<string, number>();
    for (const r of retiros) {
      if (r.trading_account_id !== cuenta.id) continue;
      const dia = claveDia(r.fecha_hora, zona);
      retiradoPorDia.set(dia, (retiradoPorDia.get(dia) ?? 0) + Number(r.monto));
    }
    const diasRetiro = Array.from(retiradoPorDia.keys());
    const retirado = diasRetiro.reduce((s, d) => s + (retiradoPorDia.get(d) ?? 0), 0);
    const retiradoAntesDe = (a: string) =>
      diasRetiro.reduce((s, d) => (d < a ? s + (retiradoPorDia.get(d) ?? 0) : s), 0);

    const netoEntre = (a: string, b: string) =>
      dias.reduce((s, d) => (d >= a && d <= b ? s + (netoPorDia.get(d) ?? 0) : s), 0);
    const netoAntesDe = (a: string) =>
      dias.reduce((s, d) => (d < a ? s + (netoPorDia.get(d) ?? 0) : s), 0);

    const configurada = capital > 0 && limites.length > 0;
    if (!configurada) {
      if (dias.length > 0) sinConfigurar.push(cuenta);
      resultadoCuentas.push({
        cuenta,
        configurada: false,
        saldo: cuenta.capital_inicial === null ? null : centavos(capital + total - retirado),
        retirado: centavos(retirado),
        estados: [],
      });
      continue;
    }

    const estados: EstadoLimite[] = [];

    for (const { tipo, pct } of limites) {
      const periodos = new Map<string, string>();
      for (const dia of dias) {
        const { inicio, fin } = limitesDePeriodo(tipo, dia);
        periodos.set(inicio, fin);
      }

      for (const [inicio, fin] of periodos) {
        if (!seSolapa(inicio, fin)) continue;
        porTipo[tipo].evaluados += 1;

        const neto = centavos(netoEntre(inicio, fin));
        const base = centavos(capital + netoAntesDe(inicio) - retiradoAntesDe(inicio));
        const limite = base > 0 ? centavos((pct / 100) * base) : 0;
        const perdida = neto < 0 ? -neto : 0;

        if (perdida > limite) {
          porTipo[tipo].incumplidos += 1;
          incumplimientos.push({
            cuentaId: cuenta.id,
            cuenta: cuenta.nombre,
            moneda: cuenta.moneda_base,
            tipo,
            inicio,
            fin,
            perdida,
            limite,
            limitePct: pct,
            base,
            pctReal: base > 0 ? (perdida / base) * 100 : null,
            enCurso: hoy >= inicio && hoy <= fin,
          });
        }
      }

      // Estado del periodo en que estamos hoy, aunque aún no tenga operaciones.
      const actual = limitesDePeriodo(tipo, hoy);
      const neto = centavos(netoEntre(actual.inicio, actual.fin));
      const base = centavos(capital + netoAntesDe(actual.inicio) - retiradoAntesDe(actual.inicio));
      const limite = base > 0 ? centavos((pct / 100) * base) : 0;
      const perdida = neto < 0 ? -neto : 0;
      estados.push({
        tipo,
        limitePct: pct,
        limite,
        perdida,
        neto,
        base,
        uso: limite > 0 ? perdida / limite : perdida > 0 ? Number.POSITIVE_INFINITY : 0,
        superado: perdida > limite,
        inicio: actual.inicio,
        fin: actual.fin,
      });
    }

    resultadoCuentas.push({
      cuenta,
      configurada: true,
      saldo: centavos(capital + total - retirado),
      retirado: centavos(retirado),
      estados,
    });
  }

  incumplimientos.sort(
    (a, b) => b.inicio.localeCompare(a.inicio) || a.tipo.localeCompare(b.tipo),
  );

  const maximo = Math.max(...TIPOS_PERIODO.map((t) => porTipo[t.tipo].incumplidos));
  const masIncumplidos =
    maximo > 0 ? TIPOS_PERIODO.filter((t) => porTipo[t.tipo].incumplidos === maximo).map((t) => t.tipo) : [];

  return {
    cuentas: resultadoCuentas,
    incumplimientos,
    total: incumplimientos.length,
    porTipo,
    masIncumplidos,
    sinConfigurar,
  };
}
