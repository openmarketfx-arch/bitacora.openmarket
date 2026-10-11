import { createClient } from "@/lib/supabase/server";
import type {
  EstadoOperacion,
  EstadoRevision,
  TagResumen,
  TradeCompleto,
} from "@/lib/types";

/**
 * Columnas de una operación con sus relaciones resueltas. Se usa igual en la
 * lista, el calendario y la analítica para que todos vean la misma forma.
 */
const SELECCION = `
  *,
  instrument:instruments!inner (
    id, simbolo, nombre, asset_class, decimales_precio, valor_pip, precio_referencia
  ),
  account:trading_accounts!inner ( id, nombre, moneda_base, tipo ),
  trade_tags ( tag:tags ( id, nombre, categoria, subtipo_salida ) )
`;

type FilaCruda = Omit<TradeCompleto, "tags"> & {
  trade_tags: { tag: TagResumen | null }[] | null;
};

function normalizar(fila: FilaCruda): TradeCompleto {
  const { trade_tags, ...resto } = fila;
  return {
    ...resto,
    tags: (trade_tags ?? [])
      .map((tt) => tt.tag)
      .filter((t): t is TagResumen => t !== null)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  };
}

export interface FiltrosOperaciones {
  estado?: EstadoOperacion;
  revision?: EstadoRevision;
  /** Rango sobre la fecha de entrada, en ISO. */
  desde?: string;
  hasta?: string;
  cuentaId?: string;
  limite?: number;
}

export async function listarOperaciones(
  filtros: FiltrosOperaciones = {},
): Promise<TradeCompleto[]> {
  const supabase = createClient();

  let consulta = supabase
    .from("trades")
    .select(SELECCION)
    .order("fecha_hora_entrada", { ascending: false });

  if (filtros.estado) consulta = consulta.eq("estado_operacion", filtros.estado);
  if (filtros.revision) consulta = consulta.eq("estado_revision", filtros.revision);
  if (filtros.cuentaId) consulta = consulta.eq("trading_account_id", filtros.cuentaId);
  if (filtros.desde) consulta = consulta.gte("fecha_hora_entrada", filtros.desde);
  if (filtros.hasta) consulta = consulta.lte("fecha_hora_entrada", filtros.hasta);
  if (filtros.limite) consulta = consulta.limit(filtros.limite);

  const { data, error } = await consulta;
  if (error) throw new Error(`No se pudieron cargar las operaciones: ${error.message}`);

  return ((data ?? []) as unknown as FilaCruda[]).map(normalizar);
}

/**
 * Operaciones que le tocan a una rejilla de calendario.
 *
 * El día que le corresponde a cada operación no es el mismo según su estado:
 * una cerrada cuenta el día en que se realizó el P/L (la salida), mientras que
 * una abierta todavía no tiene resultado y se ancla al día en que se abrió.
 * Por eso la consulta mira dos columnas distintas según el estado.
 */
export async function listarParaCalendario(
  desde: Date,
  hasta: Date,
): Promise<TradeCompleto[]> {
  const supabase = createClient();
  const ini = desde.toISOString();
  const fin = hasta.toISOString();

  const { data, error } = await supabase
    .from("trades")
    .select(SELECCION)
    .or(
      `and(estado_operacion.eq.cerrada,fecha_hora_salida.gte.${ini},fecha_hora_salida.lte.${fin}),` +
        `and(estado_operacion.eq.abierta,fecha_hora_entrada.gte.${ini},fecha_hora_entrada.lte.${fin})`,
    )
    .order("fecha_hora_entrada", { ascending: true });

  if (error) throw new Error(`No se pudo cargar el calendario: ${error.message}`);

  return ((data ?? []) as unknown as FilaCruda[]).map(normalizar);
}

/** Día bajo el que una operación aparece en el calendario. */
export function fechaDeCalendario(op: TradeCompleto): string {
  return op.estado_operacion === "cerrada" && op.fecha_hora_salida
    ? op.fecha_hora_salida
    : op.fecha_hora_entrada;
}

export async function obtenerOperacion(id: string): Promise<TradeCompleto | null> {
  const supabase = createClient();

  const { data, error } = await supabase.from("trades").select(SELECCION).eq("id", id).maybeSingle();

  if (error) throw new Error(`No se pudo cargar la operación: ${error.message}`);
  if (!data) return null;

  return normalizar(data as unknown as FilaCruda);
}

/** Conteos para los badges de navegación y los KPIs del dashboard. */
export async function contarPorEstado(): Promise<{ abiertas: number; pendientes: number }> {
  const supabase = createClient();

  const [abiertas, pendientes] = await Promise.all([
    supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("estado_operacion", "abierta"),
    supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("estado_revision", "pendiente"),
  ]);

  return { abiertas: abiertas.count ?? 0, pendientes: pendientes.count ?? 0 };
}
