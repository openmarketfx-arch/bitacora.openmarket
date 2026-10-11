import type { AssetClass, Instrument } from "@/lib/types";

/**
 * Conversión de diferencia de precio a la unidad que el trader entiende.
 * En forex se divide por el tamaño del pip del instrumento; en el resto
 * de asset_class la diferencia de precio ya son puntos. Esta lógica vive
 * solo aquí (capa de presentación), nunca en la base de datos.
 */
export type UnidadMedida = "pips" | "puntos";

export function unidadDe(assetClass: AssetClass): UnidadMedida {
  return assetClass === "forex" ? "pips" : "puntos";
}

type InstrumentoMedible = Pick<Instrument, "asset_class" | "valor_pip" | "decimales_precio">;

/** Diferencia de precio cruda -> pips (forex) o puntos (resto). */
export function aUnidades(
  diferenciaPrecio: number | null | undefined,
  instrumento: InstrumentoMedible | null | undefined,
): number | null {
  if (diferenciaPrecio === null || diferenciaPrecio === undefined) return null;
  if (!instrumento) return diferenciaPrecio;
  if (instrumento.asset_class === "forex" && instrumento.valor_pip) {
    return diferenciaPrecio / Number(instrumento.valor_pip);
  }
  return diferenciaPrecio;
}

/** Pips/puntos que escribe el usuario -> diferencia de precio cruda para guardar. */
export function aPrecio(
  unidades: number | null | undefined,
  instrumento: InstrumentoMedible | null | undefined,
): number | null {
  if (unidades === null || unidades === undefined || Number.isNaN(unidades)) return null;
  if (!instrumento) return unidades;
  if (instrumento.asset_class === "forex" && instrumento.valor_pip) {
    return unidades * Number(instrumento.valor_pip);
  }
  return unidades;
}

/** "12.4 pips" / "85 puntos" listo para pintar. */
export function formatUnidades(
  diferenciaPrecio: number | null | undefined,
  instrumento: InstrumentoMedible | null | undefined,
  opciones: { conUnidad?: boolean; decimales?: number } = {},
): string {
  const valor = aUnidades(diferenciaPrecio, instrumento);
  if (valor === null) return "—";
  const { conUnidad = true, decimales = 1 } = opciones;
  const n = valor.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  });
  if (!conUnidad) return n;
  return `${n} ${instrumento ? unidadDe(instrumento.asset_class) : "puntos"}`;
}

export function formatPrecio(
  precio: number | null | undefined,
  decimales = 5,
): string {
  if (precio === null || precio === undefined) return "—";
  return Number(precio).toLocaleString("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export function formatDinero(
  monto: number | null | undefined,
  moneda = "USD",
  opciones: { signo?: boolean } = {},
): string {
  if (monto === null || monto === undefined) return "—";
  const { signo = true } = opciones;
  const n = Math.abs(Number(monto)).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const simbolo = moneda === "USD" ? "$" : moneda === "EUR" ? "€" : `${moneda} `;
  const prefijo = signo && Number(monto) > 0 ? "+" : Number(monto) < 0 ? "−" : "";
  return `${prefijo}${simbolo}${n}`;
}

export function formatPorcentaje(valor: number | null | undefined, decimales = 1): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return `${valor.toLocaleString("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })}%`;
}

/**
 * Signo de un resultado según la convención de Open Market:
 * verde = positivo, negro = negativo, neutro = cero / sin dato.
 */
export type Tono = "positivo" | "negativo" | "neutro";

export function tonoDe(monto: number | null | undefined): Tono {
  if (monto === null || monto === undefined || Number(monto) === 0) return "neutro";
  return Number(monto) > 0 ? "positivo" : "negativo";
}

// ---------- Fechas ----------
// Todo formato de fecha lleva la zona del usuario de forma explícita: el servidor
// corre en UTC y, sin ella, mostraría (y agruparía) las horas en la zona equivocada.

const formatos = new Map<string, Intl.DateTimeFormat>();

function formato(zona: string, clave: "fecha" | "fechaHora"): Intl.DateTimeFormat {
  const id = `${clave}|${zona}`;
  let f = formatos.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat("es-ES", {
      timeZone: zona,
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(clave === "fechaHora" ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
    formatos.set(id, f);
  }
  return f;
}

export function formatFecha(iso: string | null | undefined, zona: string): string {
  if (!iso) return "—";
  return formato(zona, "fecha").format(new Date(iso));
}

export function formatFechaHora(iso: string | null | undefined, zona: string): string {
  if (!iso) return "—";
  return formato(zona, "fechaHora").format(new Date(iso));
}

/**
 * "1 operación" / "3 operaciones".
 * Existe para no construir plurales pegando sufijos: en español eso produce
 * cosas como "operaciónes", porque el plural pierde la tilde.
 */
export function plural(n: number, singular: string, pluralForma: string): string {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}

// ---------- Distancias en pips entre dos precios ----------

/**
 * Pips (o puntos) que separan dos precios del mismo instrumento.
 * Siempre positivo: la dirección la aporta quien llama.
 */
export function pipsEntre(
  precioA: number | null | undefined,
  precioB: number | null | undefined,
  instrumento: InstrumentoMedible | null | undefined,
): number | null {
  if (precioA === null || precioA === undefined) return null;
  if (precioB === null || precioB === undefined) return null;
  if (Number.isNaN(Number(precioA)) || Number.isNaN(Number(precioB))) return null;
  return aUnidades(Math.abs(Number(precioA) - Number(precioB)), instrumento);
}

/** "12,4 pips" / "85 puntos". Devuelve null si falta algún dato. */
export function formatPips(
  pips: number | null | undefined,
  instrumento: InstrumentoMedible | null | undefined,
  opciones: { conUnidad?: boolean; decimales?: number } = {},
): string {
  if (pips === null || pips === undefined || Number.isNaN(pips)) return "—";
  const { conUnidad = true, decimales = 1 } = opciones;
  const n = pips.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  });
  if (!conUnidad) return n;
  return `${n} ${instrumento ? unidadDe(instrumento.asset_class) : "puntos"}`;
}

export interface PlanOperacion {
  /** Distancia entrada → stop. Es el riesgo asumido. */
  riesgo: number | null;
  /** Distancia entrada → TP. Es el objetivo buscado. */
  objetivo: number | null;
  /** Objetivo dividido entre riesgo. */
  ratio: number | null;
  /** El stop está del lado correcto de la entrada según la dirección. */
  stopCoherente: boolean;
  /** El TP está del lado correcto de la entrada según la dirección. */
  tpCoherente: boolean;
}

/**
 * Riesgo, objetivo y R:R de una operación planificada.
 *
 * Comprueba además que los niveles estén del lado que les toca: en una compra
 * el stop va por debajo de la entrada y el TP por encima, y al revés en una
 * venta. Un nivel del lado equivocado casi siempre es un dedazo, y detectarlo
 * al escribir evita guardar una operación con un R:R sin sentido.
 */
export function calcularPlan(
  entrada: number | null | undefined,
  tp: number | null | undefined,
  stop: number | null | undefined,
  direccion: "compra" | "venta",
  instrumento: InstrumentoMedible | null | undefined,
): PlanOperacion {
  const riesgo = pipsEntre(entrada, stop, instrumento);
  const objetivo = pipsEntre(entrada, tp, instrumento);

  const e = entrada === null || entrada === undefined ? null : Number(entrada);
  const s = stop === null || stop === undefined ? null : Number(stop);
  const t = tp === null || tp === undefined ? null : Number(tp);

  const stopCoherente =
    e === null || s === null ? true : direccion === "compra" ? s < e : s > e;
  const tpCoherente =
    e === null || t === null ? true : direccion === "compra" ? t > e : t < e;

  return {
    riesgo,
    objetivo,
    ratio: riesgo && objetivo && riesgo > 0 ? objetivo / riesgo : null,
    stopCoherente,
    tpCoherente,
  };
}

/** "1:2,4" a partir del ratio. */
export function formatRatio(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return "—";
  return `1:${ratio.toLocaleString("es-ES", { maximumFractionDigits: 2 })}`;
}
