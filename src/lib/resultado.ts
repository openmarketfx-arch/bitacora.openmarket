import type { Trade } from "@/lib/types";

type ConResultado = Pick<Trade, "resultado_dinero" | "comision" | "swap">;

/**
 * Lo que la operación movió de verdad el saldo: la ganancia o pérdida más la
 * comisión y el swap, que llevan el signo con que los muestra la plataforma
 * (negativo = te lo cobraron). null mientras la operación no tiene resultado.
 *
 * Es la única fuente del "resultado" en dashboard, curva, calendario, saldo y
 * medición de riesgo, para que todas las cifras cuadren entre sí.
 */
export function resultadoNeto(op: ConResultado): number | null {
  if (op.resultado_dinero === null || op.resultado_dinero === undefined) return null;
  return redondear(Number(op.resultado_dinero) + Number(op.comision ?? 0) + Number(op.swap ?? 0));
}

/** Comisión y swap juntos. Negativo = coste. */
export function costosDe(op: Pick<Trade, "comision" | "swap">): number {
  return redondear(Number(op.comision ?? 0) + Number(op.swap ?? 0));
}

/** Evita que 0.1 + 0.2 deje restos como 0.30000000000000004 en cifras de dinero. */
function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
