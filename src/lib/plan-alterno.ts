/**
 * Plan alterno: un trader puede tener varias entradas el mismo día según su plan de trading
 * (Plan A, Plan B…). Cada operación puede marcarse con su plan y enlazarse con las demás del
 * mismo plan de entradas. Reglas puras, compartidas por el formulario y las acciones.
 */

export const PLANES = ["A", "B", "C", "D", "E"] as const;
export type Plan = (typeof PLANES)[number];

export interface ConfigPlanAlterno {
  habilitado: boolean;
  /** Los planes que el usuario decidió usar, en orden. */
  planes: Plan[];
}

export const CONFIG_PLAN_ALTERNO_VACIA: ConfigPlanAlterno = { habilitado: false, planes: [] };

export function esPlan(valor: unknown): valor is Plan {
  return typeof valor === "string" && (PLANES as readonly string[]).includes(valor);
}

export function etiquetaPlan(plan: Plan): string {
  return `Plan ${plan}`;
}

/** Cuántas operaciones lleva cada prefijo: del 000001 al 999999. */
export const OPERACIONES_POR_PREFIJO = 999_999;

/** Prefijos posibles: A…Z y luego AA…ZZ. */
const TOTAL_PREFIJOS = 26 + 26 * 26;

/** Prefijo número `indice` (desde 0): A…Z, AA, AB… ZZ. */
function prefijoDe(indice: number): string {
  const letra = (n: number) => String.fromCharCode(65 + n);
  if (indice < 26) return letra(indice);
  const resto = indice - 26;
  return letra(Math.floor(resto / 26)) + letra(resto % 26);
}

/**
 * Código de referencia de una operación a partir de su número correlativo por usuario.
 * Cada prefijo admite 999.999 operaciones: A-000001 … A-999999, B-000001 … Z-999999,
 * AA-000001 … ZZ-999999.
 */
export function codigoOperacion(numero: number | null | undefined): string {
  if (numero === null || numero === undefined || numero < 1) return "—";
  const posicion = numero - 1;
  const indice = Math.floor(posicion / OPERACIONES_POR_PREFIJO);
  if (indice >= TOTAL_PREFIJOS) return `#${numero}`;
  const n = (posicion % OPERACIONES_POR_PREFIJO) + 1;
  return `${prefijoDe(indice)}-${String(n).padStart(6, "0")}`;
}

/** Lo mínimo de una operación para razonar sobre grupos de planes. */
export interface OperacionDePlan {
  id: string;
  plan: Plan | null;
  grupo_plan_id: string | null;
}

/**
 * ¿Se puede poner `plan` a una operación enlazada con las del grupo `miembros`?
 * Un plan no se repite dentro del grupo (A con A, o A + B + B). Devuelve el mensaje de error
 * o null si está bien. `propiaId` excluye a la propia operación al editarla.
 */
export function conflictoDePlan(
  plan: Plan,
  miembros: OperacionDePlan[],
  propiaId: string | null,
): string | null {
  const repetido = miembros.find((m) => m.id !== propiaId && m.plan === plan);
  if (!repetido) return null;
  return `${etiquetaPlan(plan)} ya está en este grupo de operaciones enlazadas. No se puede repetir el mismo plan.`;
}

/** Los miembros de un grupo, incluida la operación a la que se enlaza. */
export function miembrosDelGrupo<T extends OperacionDePlan>(destino: T, todas: T[]): T[] {
  const grupo = destino.grupo_plan_id;
  if (!grupo) return [destino];
  const resto = todas.filter((o) => o.grupo_plan_id === grupo && o.id !== destino.id);
  return [destino, ...resto];
}
