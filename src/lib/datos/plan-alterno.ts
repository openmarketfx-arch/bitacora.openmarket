import type { CandidataEnlace } from "@/components/operaciones/formulario-operacion";
import { listarOperaciones } from "@/lib/datos/operaciones";
import { createClient } from "@/lib/supabase/server";
import {
  CONFIG_PLAN_ALTERNO_VACIA,
  PLANES,
  esPlan,
  type ConfigPlanAlterno,
} from "@/lib/plan-alterno";

/** La configuración del plan alterno del usuario; apagado y sin planes si nunca la guardó. */
export async function obtenerConfigPlanAlterno(): Promise<ConfigPlanAlterno> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plan_alterno")
    .select("habilitado, planes")
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar el plan alterno: ${error.message}`);
  if (!data) return CONFIG_PLAN_ALTERNO_VACIA;

  const guardados = ((data.planes ?? []) as string[]).filter(esPlan);
  return {
    habilitado: Boolean(data.habilitado),
    // En el orden A..E, sin importar cómo se guardaron.
    planes: PLANES.filter((p) => guardados.includes(p)),
  };
}

/**
 * Operaciones con plan a las que se puede enlazar una entrada nueva o editada. Las recientes
 * bastan: un plan de entradas se arma en el mismo día o en pocos días.
 */
export async function listarCandidatasEnlace(): Promise<CandidataEnlace[]> {
  const operaciones = await listarOperaciones({ limite: 500 });
  return operaciones
    .filter((o) => o.plan !== null)
    .map((o) => ({
      id: o.id,
      plan: o.plan,
      grupo_plan_id: o.grupo_plan_id,
      numero: o.numero,
      cuentaId: o.account.id,
      simbolo: o.instrument.simbolo,
      fecha: o.fecha_hora_entrada,
    }));
}
