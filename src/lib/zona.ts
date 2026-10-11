/**
 * Zona horaria del usuario.
 *
 * Los servidores de Cloudflare corren siempre en UTC, así que no se puede
 * confiar en que `getHours()`, `setHours()` o `new Date("2026-10-11T00:20")`
 * hablen en la hora del usuario. Todo cálculo de día, hora o rango pasa por
 * aquí con la zona explícita.
 *
 * Son funciones puras, sin acceso a cookies, para poder usarlas igual en
 * servidor y en cliente. La zona la guarda una cookie (ver `zona-servidor.ts`).
 */

export const ZONA_POR_DEFECTO = "UTC";
export const COOKIE_ZONA = "tz";

/** Devuelve la zona si es un identificador IANA válido; si no, UTC. */
export function zonaValida(zona: string | null | undefined): string {
  if (!zona) return ZONA_POR_DEFECTO;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zona });
    return zona;
  } catch {
    return ZONA_POR_DEFECTO;
  }
}

const cacheFormato = new Map<string, Intl.DateTimeFormat>();

function formatoPartes(zona: string): Intl.DateTimeFormat {
  let f = cacheFormato.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zona,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    cacheFormato.set(zona, f);
  }
  return f;
}

export interface PartesFecha {
  anio: number;
  /** 1-12. */
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  /** 0 = domingo. */
  diaSemana: number;
}

/** Lo que marca el reloj de pared en `zona` en el instante `fecha`. */
export function partesEnZona(fecha: Date | string, zona: string): PartesFecha {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const partes: Record<string, number> = {};
  for (const p of formatoPartes(zona).formatToParts(d)) {
    if (p.type !== "literal") partes[p.type] = Number(p.value);
  }
  const anio = partes.year;
  const mes = partes.month;
  const dia = partes.day;
  return {
    anio,
    mes,
    dia,
    hora: partes.hour % 24,
    minuto: partes.minute,
    diaSemana: new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(),
  };
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD del día que marca el reloj de `zona` en ese instante. */
export function claveDia(fecha: Date | string, zona: string): string {
  const p = partesEnZona(fecha, zona);
  return `${p.anio}-${p2(p.mes)}-${p2(p.dia)}`;
}

/** Hoy en `zona`, como clave YYYY-MM-DD. */
export function claveHoy(zona: string): string {
  return claveDia(new Date(), zona);
}

export function partesDeClave(clave: string): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = clave.split("-").map(Number);
  return { anio, mes, dia };
}

/**
 * Suma días a una clave YYYY-MM-DD. Es aritmética de calendario pura: no hay
 * horas de por medio, así que los cambios de hora no pueden descuadrarla.
 */
export function sumarDias(clave: string, dias: number): string {
  const { anio, mes, dia } = partesDeClave(clave);
  const d = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}

/** Día de la semana (0 = domingo) de una clave YYYY-MM-DD. */
export function diaSemanaDeClave(clave: string): number {
  const { anio, mes, dia } = partesDeClave(clave);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
}

/**
 * Una fecha de calendario como `Date` al mediodía UTC. Sirve para pintarla con
 * `timeZone: "UTC"` y leerla con `getUTC*` sin que ninguna zona la mueva de día.
 */
export function fechaDeClave(clave: string): Date {
  const { anio, mes, dia } = partesDeClave(clave);
  return new Date(Date.UTC(anio, mes - 1, dia, 12));
}

/** Diferencia, en ms, entre la hora de pared de `zona` y UTC en ese instante. */
function desfase(instante: number, zona: string): number {
  // Se trabaja a precisión de segundo: los milisegundos no existen en la hora
  // de pared y arrastrarlos descuadraría la resta.
  const base = Math.floor(instante / 1000) * 1000;
  const p = partesEnZona(new Date(base), zona);
  const comoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, new Date(base).getUTCSeconds());
  return comoUtc - base;
}

/** Instante en que el reloj de `zona` marca esa fecha y hora de pared. */
export function instanteDePared(
  anio: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  zona: string,
  segundo = 0,
  ms = 0,
): Date {
  const pared = Date.UTC(anio, mes - 1, dia, hora, minuto, segundo, ms);
  // Dos pasadas: la segunda corrige el caso en que el desfase cambia entre el
  // primer intento y el instante real (cambio de hora de verano).
  let instante = pared - desfase(pared, zona);
  instante = pared - desfase(instante, zona);
  return new Date(instante);
}

/** Primer instante del día `clave` en `zona`. */
export function inicioDeDia(clave: string, zona: string): Date {
  const { anio, mes, dia } = partesDeClave(clave);
  return instanteDePared(anio, mes, dia, 0, 0, zona);
}

/** Último instante del día `clave` en `zona`. */
export function finDeDia(clave: string, zona: string): Date {
  const { anio, mes, dia } = partesDeClave(clave);
  return instanteDePared(anio, mes, dia, 23, 59, zona, 59, 999);
}

/** Valor para `<input type="datetime-local">`: la hora de pared en `zona`. */
export function paraInputDateTime(zona: string, iso?: string | null): string {
  const p = partesEnZona(iso ? new Date(iso) : new Date(), zona);
  return `${p.anio}-${p2(p.mes)}-${p2(p.dia)}T${p2(p.hora)}:${p2(p.minuto)}`;
}

/**
 * Convierte el valor de un `datetime-local` ("2026-10-11T00:20", sin zona) en el
 * instante real, interpretándolo como hora de pared en `zona`, y lo devuelve en
 * ISO. Si ya viene con zona (`Z` o ±hh:mm) lo respeta.
 */
export function deInputDateTime(valor: string, zona: string): string {
  if (!valor) return "";
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(valor)) return new Date(valor).toISOString();
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(valor);
  if (!m) return valor;
  return instanteDePared(+m[1], +m[2], +m[3], +m[4], +m[5], zona, m[6] ? +m[6] : 0).toISOString();
}
