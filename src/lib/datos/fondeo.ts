import { resultadoNeto } from "@/lib/resultado";
import type { EstadoPrueba, TradeCompleto, TradingAccount } from "@/lib/types";
import { claveDia, claveHoy } from "@/lib/zona";

/**
 * Evaluación de una prueba de fondeo.
 *
 * Reglas (las habituales de las empresas de fondeo):
 *  - Todo se mide sobre el CAPITAL INICIAL de la cuenta: un objetivo del 8 % de una
 *    cuenta de 10.000 son 800 de ganancia; un límite diario del 5 % son 500 de pérdida.
 *  - Cada fase es una vuelta a empezar: su ganancia y su pérdida se cuentan desde que
 *    arranca esa fase. Al llegar al objetivo la fase queda superada y pasa a la siguiente.
 *  - Aprobar la última fase aprueba la prueba (la cuenta pasa a "fondeada").
 *  - La prueba se pierde en el momento en que una operación cerrada deja la pérdida del
 *    día o la pérdida total de la fase por ENCIMA de su límite (no basta con igualarlo).
 *  - Solo cuentan operaciones cerradas, con su resultado neto (comisión y swap incluidos).
 *    El resultado flotante de una operación abierta no se conoce, así que no se evalúa.
 *  - El día es el de calendario en la zona horaria del usuario.
 */

export interface FaseEvaluada {
  numero: number;
  objetivoPct: number;
  estado: "superada" | "actual" | "pendiente";
  /** Ganancia de la fase en % del capital. En una superada es el objetivo. */
  progresoPct: number;
  superadaEn: string | null;
}

export interface EvaluacionPrueba {
  cuentaId: string;
  capital: number;
  estado: EstadoPrueba;
  /** La que se está jugando (1 en adelante); en una prueba aprobada, la última. */
  faseActual: number;
  totalFases: number;
  fases: FaseEvaluada[];
  /** Ganancia (o pérdida, si es negativa) de la fase actual, en % del capital. */
  gananciaFasePct: number;
  objetivoFasePct: number;
  /** Pérdida de hoy y de la fase, en % del capital (0 si va en positivo). */
  perdidaDiaPct: number;
  perdidaTotalPct: number;
  limiteDiarioPct: number;
  limiteTotalPct: number;
  /** Qué límite hizo perder la prueba, si se perdió. */
  motivoFallo: "diaria" | "total" | null;
  /** Cuándo se aprobó o se perdió (ISO), si ya se resolvió. */
  resueltaEn: string | null;
}

/** Seguimiento de una cuenta ya fondeada: solo sus límites de pérdida, desde que se fondeó. */
export interface SeguimientoFondeada {
  cuentaId: string;
  capital: number;
  perdidaDiaPct: number;
  perdidaTotalPct: number;
  limiteDiarioPct: number;
  limiteTotalPct: number;
  /** Se superó algún límite desde que se fondeó. */
  limiteSuperado: boolean;
  desde: string | null;
}

const centavos = (n: number) => Math.round(n * 100) / 100;

interface CierreNeto {
  salida: string;
  dia: string;
  neto: number;
}

/** Las operaciones cerradas de una cuenta, en orden cronológico de cierre. */
function cierresDe(cuenta: TradingAccount, operaciones: TradeCompleto[], zona: string): CierreNeto[] {
  const cierres: CierreNeto[] = [];
  for (const op of operaciones) {
    if (op.account.id !== cuenta.id || op.estado_operacion !== "cerrada") continue;
    const neto = resultadoNeto(op);
    const salida = op.fecha_hora_salida;
    if (neto === null || !salida) continue;
    cierres.push({ salida, dia: claveDia(salida, zona), neto });
  }
  return cierres.sort((a, b) => new Date(a.salida).getTime() - new Date(b.salida).getTime());
}

export function evaluarPrueba(
  cuenta: TradingAccount,
  operaciones: TradeCompleto[],
  zona: string,
): EvaluacionPrueba | null {
  const objetivos = (cuenta.prueba_objetivos ?? []).map(Number);
  const capital = Number(cuenta.capital_inicial ?? 0);
  if (
    (cuenta.tipo !== "prueba_fondeo" && cuenta.tipo !== "fondeada") ||
    capital <= 0 ||
    objetivos.length === 0 ||
    cuenta.prueba_limite_diario == null ||
    cuenta.prueba_limite_total == null
  ) {
    return null;
  }

  const limiteDiarioPct = Number(cuenta.prueba_limite_diario);
  const limiteTotalPct = Number(cuenta.prueba_limite_total);
  const limiteDiario = (capital * limiteDiarioPct) / 100;
  const limiteTotal = (capital * limiteTotalPct) / 100;

  const fases: FaseEvaluada[] = objetivos.map((objetivoPct, i) => ({
    numero: i + 1,
    objetivoPct,
    estado: i === 0 ? "actual" : "pendiente",
    progresoPct: 0,
    superadaEn: null,
  }));

  let indice = 0;
  let acumFase = 0;
  const acumDia = new Map<string, number>();
  let estado: EstadoPrueba = "en_curso";
  let motivoFallo: "diaria" | "total" | null = null;
  let resueltaEn: string | null = null;

  for (const c of cierresDe(cuenta, operaciones, zona)) {
    acumFase = centavos(acumFase + c.neto);
    acumDia.set(c.dia, centavos((acumDia.get(c.dia) ?? 0) + c.neto));

    // Primero los límites: una operación que supera una pérdida no puede salvar la fase.
    if (-(acumDia.get(c.dia) ?? 0) > limiteDiario) {
      estado = "fallida";
      motivoFallo = "diaria";
      resueltaEn = c.salida;
      break;
    }
    if (-acumFase > limiteTotal) {
      estado = "fallida";
      motivoFallo = "total";
      resueltaEn = c.salida;
      break;
    }

    if (acumFase >= (capital * objetivos[indice]) / 100) {
      fases[indice] = {
        ...fases[indice],
        estado: "superada",
        progresoPct: objetivos[indice],
        superadaEn: c.salida,
      };
      indice += 1;
      acumFase = 0;

      if (indice >= objetivos.length) {
        estado = "aprobada";
        resueltaEn = c.salida;
        break;
      }
      fases[indice] = { ...fases[indice], estado: "actual" };
    }
  }

  const aprobada = estado === "aprobada";
  const faseActual = aprobada ? objetivos.length : indice + 1;
  if (!aprobada) {
    fases[indice] = { ...fases[indice], progresoPct: (acumFase / capital) * 100 };
  }

  // Un resultado ya guardado en la cuenta manda sobre lo derivado: una prueba perdida o
  // aprobada no se "des-resuelve" porque después se edite una operación.
  const guardado = cuenta.prueba_estado;
  const estadoFinal: EstadoPrueba =
    guardado === "aprobada" || guardado === "fallida" ? guardado : estado;

  const hoy = claveHoy(zona);
  // En una prueba perdida las barras muestran lo que decidió el resultado, no el día de hoy.
  const diaMostrado = estado === "fallida" && resueltaEn ? claveDia(resueltaEn, zona) : hoy;
  const perdidaDia = Math.max(0, -(acumDia.get(diaMostrado) ?? 0));

  return {
    cuentaId: cuenta.id,
    capital,
    estado: estadoFinal,
    faseActual,
    totalFases: objetivos.length,
    fases,
    gananciaFasePct: aprobada ? objetivos[objetivos.length - 1] : (acumFase / capital) * 100,
    objetivoFasePct: objetivos[Math.min(indice, objetivos.length - 1)],
    perdidaDiaPct: aprobada ? 0 : (perdidaDia / capital) * 100,
    perdidaTotalPct: aprobada ? 0 : (Math.max(0, -acumFase) / capital) * 100,
    limiteDiarioPct,
    limiteTotalPct,
    motivoFallo,
    resueltaEn: estado === "en_curso" ? (cuenta.prueba_resuelta_en ?? null) : resueltaEn,
  };
}

/** Los límites de pérdida de una cuenta ya fondeada, medidos desde el día en que se fondeó. */
export function seguirFondeada(
  cuenta: TradingAccount,
  operaciones: TradeCompleto[],
  zona: string,
): SeguimientoFondeada | null {
  const capital = Number(cuenta.capital_inicial ?? 0);
  if (
    cuenta.tipo !== "fondeada" ||
    capital <= 0 ||
    cuenta.prueba_limite_diario == null ||
    cuenta.prueba_limite_total == null
  ) {
    return null;
  }

  const limiteDiarioPct = Number(cuenta.prueba_limite_diario);
  const limiteTotalPct = Number(cuenta.prueba_limite_total);
  const desde = cuenta.prueba_resuelta_en ? new Date(cuenta.prueba_resuelta_en).getTime() : 0;
  const hoy = claveHoy(zona);

  let acum = 0;
  let peorTotal = 0;
  let peorDia = 0;
  const acumDia = new Map<string, number>();

  for (const c of cierresDe(cuenta, operaciones, zona)) {
    if (new Date(c.salida).getTime() <= desde) continue;
    acum = centavos(acum + c.neto);
    acumDia.set(c.dia, centavos((acumDia.get(c.dia) ?? 0) + c.neto));
    peorTotal = Math.max(peorTotal, -acum);
    peorDia = Math.max(peorDia, -(acumDia.get(c.dia) ?? 0));
  }

  const perdidaHoy = Math.max(0, -(acumDia.get(hoy) ?? 0));

  return {
    cuentaId: cuenta.id,
    capital,
    perdidaDiaPct: (perdidaHoy / capital) * 100,
    perdidaTotalPct: (Math.max(0, -acum) / capital) * 100,
    limiteDiarioPct,
    limiteTotalPct,
    limiteSuperado:
      peorDia > (capital * limiteDiarioPct) / 100 || peorTotal > (capital * limiteTotalPct) / 100,
    desde: cuenta.prueba_resuelta_en ?? null,
  };
}
